from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends, Header
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
import asyncio
import io
import csv
import re
import signal
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
from contextlib import contextmanager
import threading
import uvicorn

# Load environment variables

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Admin password (simple auth)
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'algowar2026')

# In-memory storage
teams: Dict[str, dict] = {}
tournament_state = {
    "status": "idle",  # idle, running, paused, finished
    "current_match": None,
    "matches_completed": [],
    "total_matches": 0,
    "current_match_index": 0,
}
match_results: List[dict] = []
leaderboard: List[dict] = []

# Default payoff matrix
payoff_matrix = {
    "CC": (3, 3),
    "CD": (0, 5),
    "DC": (5, 0),
    "DD": (1, 1),
}

# WebSocket connections
websocket_connections: List[WebSocket] = []

# Pydantic Models
class Team(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    strategy_code: str
    total_score: int = 0
    cooperations: int = 0
    defections: int = 0
    matches_played: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TeamCreate(BaseModel):
    name: str
    strategy_code: str

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    strategy_code: Optional[str] = None

class PayoffMatrixUpdate(BaseModel):
    cc_a: int = 3
    cc_b: int = 3
    cd_a: int = 0
    cd_b: int = 5
    dc_a: int = 5
    dc_b: int = 0
    dd_a: int = 1
    dd_b: int = 1

class MatchResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    team_a_id: str
    team_a_name: str
    team_b_id: str
    team_b_name: str
    team_a_score: int
    team_b_score: int
    team_a_cooperations: int
    team_a_defections: int
    team_b_cooperations: int
    team_b_defections: int
    rounds: int
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Auth dependency
async def verify_admin(x_admin_password: str = Header(None)):
    if x_admin_password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin password")
    return True

# Timeout context manager for strategy execution
class TimeoutError(Exception):
    pass

@contextmanager
def timeout(seconds):
    """Cross-platform timeout context manager"""
    result = {'timed_out': False}
    
    def target():
        result['timed_out'] = True
    
    timer = threading.Timer(seconds, target)
    timer.daemon = True
    timer.start()
    
    try:
        yield result
    finally:
        timer.cancel()

# Update execute_strategy to use the new timeout:

def execute_strategy(strategy_code: str, opponent_history: List[str], my_history: List[str]) -> str:
    """Execute strategy in a sandboxed environment"""
    # Check for forbidden patterns
    forbidden_patterns = [
        r'\bimport\b', r'\bfrom\b', r'\bopen\b', r'\beval\b', r'\bexec\b',
        r'\b__\w+__\b', r'\bos\b', r'\bsys\b', r'\bsubprocess\b',
        r'\bglobals\b', r'\blocals\b', r'\bcompile\b', r'\bgetattr\b',
        r'\bsetattr\b', r'\bdelattr\b', r'\bhasattr\b', r'\bbreakpoint\b',
    ]
    
    for pattern in forbidden_patterns:
        if re.search(pattern, strategy_code):
            return 'D'  # Return defect for invalid strategies
    
    # Create safe execution environment
    safe_globals = {
        '__builtins__': {
            'len': len,
            'range': range,
            'list': list,
            'str': str,
            'int': int,
            'float': float,
            'bool': bool,
            'True': True,
            'False': False,
            'None': None,
            'max': max,
            'min': min,
            'sum': sum,
            'abs': abs,
            'round': round,
        }
    }
    
    safe_locals = {
        'opponent_history': list(opponent_history),
        'my_history': list(my_history),
    }
    
    try:
        # Compile and execute the strategy
        exec(strategy_code, safe_globals, safe_locals)
        
        # Call the strategy function
        if 'strategy' not in safe_locals:
            return 'D'
        
        # Execute with timeout protection
        with timeout(0.005) as t:  # 5ms timeout
            result = safe_locals['strategy'](list(opponent_history), list(my_history))
            
            # Check if timeout occurred
            if t.get('timed_out'):
                logger.warning("Strategy execution timed out")
                return 'D'
        
        if result in ['C', 'D']:
            return result
        return 'D'
        
    except Exception as e:
        logger.warning(f"Strategy execution error: {e}")
        return 'D'
    

def validate_strategy(strategy_code: str) -> tuple[bool, str]:
    """Validate strategy code before allowing tournament"""
    # Check for forbidden patterns
    forbidden_patterns = [
        (r'\bimport\b', "Import statements are not allowed"),
        (r'\bfrom\b', "From imports are not allowed"),
        (r'\bopen\b', "File operations are not allowed"),
        (r'\beval\b', "eval() is not allowed"),
        (r'\bexec\b', "exec() is not allowed (except in sandbox)"),
        (r'\b__\w+__\b', "Dunder methods are not allowed"),
        (r'\bos\.\b', "os module access is not allowed"),
        (r'\bsys\.\b', "sys module access is not allowed"),
        (r'\bsubprocess\b', "subprocess is not allowed"),
    ]
    
    for pattern, message in forbidden_patterns:
        if re.search(pattern, strategy_code):
            return False, message
    
    # Check if strategy function exists
    if 'def strategy' not in strategy_code:
        return False, "Strategy must define a 'strategy(opponent_history, my_history)' function"
    
    # Test execution
    try:
        result = execute_strategy(strategy_code, [], [])
        if result not in ['C', 'D']:
            return False, "Strategy must return 'C' or 'D'"
    except Exception as e:
        return False, f"Strategy execution failed: {str(e)}"
    
    return True, "Strategy is valid"

# Broadcast to all WebSocket clients
async def broadcast(message: dict):
    for ws in websocket_connections[:]:
        try:
            await ws.send_json(message)
        except:
            try:
                websocket_connections.remove(ws)
            except:
                pass

def update_leaderboard():
    """Update and sort leaderboard"""
    global leaderboard
    leaderboard = []
    for team_id, team in teams.items():
        total_moves = team['cooperations'] + team['defections']
        coop_pct = (team['cooperations'] / total_moves * 100) if total_moves > 0 else 0
        leaderboard.append({
            "id": team_id,
            "name": team['name'],
            "total_score": team['total_score'],
            "cooperation_pct": round(coop_pct, 1),
            "matches_played": team['matches_played'],
            "cooperations": team['cooperations'],
            "defections": team['defections'],
        })
    leaderboard.sort(key=lambda x: x['total_score'], reverse=True)
    for i, entry in enumerate(leaderboard):
        entry['rank'] = i + 1

async def run_match(team_a_id: str, team_b_id: str, rounds: int = 100) -> MatchResult:
    """Run a match between two teams"""
    team_a = teams[team_a_id]
    team_b = teams[team_b_id]
    
    a_history: List[str] = []
    b_history: List[str] = []
    a_score = 0
    b_score = 0
    a_coops = 0
    a_defects = 0
    b_coops = 0
    b_defects = 0
    
    for round_num in range(rounds):
        # Execute both strategies
        a_move = execute_strategy(team_a['strategy_code'], b_history, a_history)
        b_move = execute_strategy(team_b['strategy_code'], a_history, b_history)
        
        # Calculate scores
        key = f"{a_move}{b_move}"
        a_points, b_points = payoff_matrix[key]
        a_score += a_points
        b_score += b_points
        
        # Track cooperations/defections
        if a_move == 'C':
            a_coops += 1
        else:
            a_defects += 1
        if b_move == 'C':
            b_coops += 1
        else:
            b_defects += 1
        
        a_history.append(a_move)
        b_history.append(b_move)
        
        # Broadcast progress every 5 rounds
        if (round_num + 1) % 5 == 0:
            await broadcast({
                "type": "match_progress",
                "data": {
                    "team_a": {"id": team_a_id, "name": team_a['name'], "score": a_score, "last_move": a_move},
                    "team_b": {"id": team_b_id, "name": team_b['name'], "score": b_score, "last_move": b_move},
                    "round": round_num + 1,
                    "total_rounds": rounds,
                    "a_coop_pct": round(a_coops / (round_num + 1) * 100, 1),
                    "b_coop_pct": round(b_coops / (round_num + 1) * 100, 1),
                }
            })
            await asyncio.sleep(0.05)  # Small delay for visualization
    
    # Update team stats
    teams[team_a_id]['total_score'] += a_score
    teams[team_a_id]['cooperations'] += a_coops
    teams[team_a_id]['defections'] += a_defects
    teams[team_a_id]['matches_played'] += 1
    
    teams[team_b_id]['total_score'] += b_score
    teams[team_b_id]['cooperations'] += b_coops
    teams[team_b_id]['defections'] += b_defects
    teams[team_b_id]['matches_played'] += 1
    
    result = MatchResult(
        team_a_id=team_a_id,
        team_a_name=team_a['name'],
        team_b_id=team_b_id,
        team_b_name=team_b['name'],
        team_a_score=a_score,
        team_b_score=b_score,
        team_a_cooperations=a_coops,
        team_a_defections=a_defects,
        team_b_cooperations=b_coops,
        team_b_defections=b_defects,
        rounds=rounds,
    )
    
    return result

# Tournament runner
tournament_task = None

async def run_tournament():
    """Run round-robin tournament"""
    global tournament_state, match_results
    
    team_ids = list(teams.keys())
    if len(team_ids) < 2:
        tournament_state['status'] = 'idle'
        await broadcast({"type": "tournament_error", "message": "Need at least 2 teams"})
        return
    
    # Generate all match pairs
    matches = []
    for i, team_a in enumerate(team_ids):
        for team_b in team_ids[i+1:]:
            matches.append((team_a, team_b))
    
    tournament_state['total_matches'] = len(matches)
    tournament_state['status'] = 'running'
    
    await broadcast({"type": "tournament_started", "total_matches": len(matches)})
    
    for idx, (team_a_id, team_b_id) in enumerate(matches):
        # Check if paused or stopped
        while tournament_state['status'] == 'paused':
            await asyncio.sleep(0.5)
        
        if tournament_state['status'] == 'idle':
            break
        
        tournament_state['current_match_index'] = idx
        tournament_state['current_match'] = {
            "team_a": teams[team_a_id]['name'],
            "team_b": teams[team_b_id]['name'],
            "match_number": idx + 1,
        }
        
        await broadcast({
            "type": "match_started",
            "data": tournament_state['current_match']
        })
        
        result = await run_match(team_a_id, team_b_id)
        match_results.append(result.model_dump())
        tournament_state['matches_completed'].append(result.model_dump())
        
        update_leaderboard()
        
        await broadcast({
            "type": "match_completed",
            "result": result.model_dump(),
            "leaderboard": leaderboard,
        })
        
        await asyncio.sleep(0.5)  # Brief pause between matches
    
    tournament_state['status'] = 'finished'
    tournament_state['current_match'] = None
    
    await broadcast({
        "type": "tournament_finished",
        "leaderboard": leaderboard,
    })

# API Endpoints
@api_router.get("/")
async def root():
    return {"message": "AlgoWar Prisoner's Dilemma API"}

@api_router.post("/admin/login")
async def admin_login(password: str):
    if password == ADMIN_PASSWORD:
        return {"success": True, "message": "Login successful"}
    raise HTTPException(status_code=401, detail="Invalid password")

# Team Management
@api_router.get("/teams")
async def get_teams():
    return list(teams.values())

@api_router.post("/teams")
async def create_team(team: TeamCreate, _: bool = Depends(verify_admin)):
    # Validate strategy
    is_valid, message = validate_strategy(team.strategy_code)
    if not is_valid:
        raise HTTPException(status_code=400, detail=message)
    
    new_team = Team(name=team.name, strategy_code=team.strategy_code)
    teams[new_team.id] = new_team.model_dump()
    return teams[new_team.id]

@api_router.put("/teams/{team_id}")
async def update_team(team_id: str, team: TeamUpdate, _: bool = Depends(verify_admin)):
    if team_id not in teams:
        raise HTTPException(status_code=404, detail="Team not found")
    
    if team.strategy_code:
        is_valid, message = validate_strategy(team.strategy_code)
        if not is_valid:
            raise HTTPException(status_code=400, detail=message)
        teams[team_id]['strategy_code'] = team.strategy_code
    
    if team.name:
        teams[team_id]['name'] = team.name
    
    return teams[team_id]

@api_router.delete("/teams/{team_id}")
async def delete_team(team_id: str, _: bool = Depends(verify_admin)):
    if team_id not in teams:
        raise HTTPException(status_code=404, detail="Team not found")
    del teams[team_id]
    return {"success": True}

@api_router.post("/teams/validate")
async def validate_team_strategy(team: TeamCreate):
    is_valid, message = validate_strategy(team.strategy_code)
    return {"valid": is_valid, "message": message}

# Tournament Control
@api_router.get("/tournament/status")
async def get_tournament_status():
    return {
        **tournament_state,
        "teams_count": len(teams),
        "leaderboard": leaderboard,
    }

@api_router.post("/tournament/start")
async def start_tournament(_: bool = Depends(verify_admin)):
    global tournament_task, tournament_state, match_results
    
    if tournament_state['status'] == 'running':
        raise HTTPException(status_code=400, detail="Tournament already running")
    
    if len(teams) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 teams to start")
    
    # Reset stats
    for team_id in teams:
        teams[team_id]['total_score'] = 0
        teams[team_id]['cooperations'] = 0
        teams[team_id]['defections'] = 0
        teams[team_id]['matches_played'] = 0
    
    match_results = []
    tournament_state = {
        "status": "running",
        "current_match": None,
        "matches_completed": [],
        "total_matches": 0,
        "current_match_index": 0,
    }
    
    tournament_task = asyncio.create_task(run_tournament())
    return {"success": True, "message": "Tournament started"}

@api_router.post("/tournament/pause")
async def pause_tournament(_: bool = Depends(verify_admin)):
    if tournament_state['status'] != 'running':
        raise HTTPException(status_code=400, detail="Tournament not running")
    tournament_state['status'] = 'paused'
    await broadcast({"type": "tournament_paused"})
    return {"success": True}

@api_router.post("/tournament/resume")
async def resume_tournament(_: bool = Depends(verify_admin)):
    if tournament_state['status'] != 'paused':
        raise HTTPException(status_code=400, detail="Tournament not paused")
    tournament_state['status'] = 'running'
    await broadcast({"type": "tournament_resumed"})
    return {"success": True}

@api_router.post("/tournament/reset")
async def reset_tournament(_: bool = Depends(verify_admin)):
    global tournament_state, match_results, leaderboard, tournament_task
    
    if tournament_task and not tournament_task.done():
        tournament_task.cancel()
    
    for team_id in teams:
        teams[team_id]['total_score'] = 0
        teams[team_id]['cooperations'] = 0
        teams[team_id]['defections'] = 0
        teams[team_id]['matches_played'] = 0
    
    match_results = []
    leaderboard = []
    tournament_state = {
        "status": "idle",
        "current_match": None,
        "matches_completed": [],
        "total_matches": 0,
        "current_match_index": 0,
    }
    
    await broadcast({"type": "tournament_reset"})
    return {"success": True}

# Leaderboard
@api_router.get("/leaderboard")
async def get_leaderboard():
    return leaderboard

# Match Results
@api_router.get("/matches")
async def get_matches():
    return match_results

# Payoff Matrix
@api_router.get("/payoff-matrix")
async def get_payoff_matrix():
    return {
        "CC": payoff_matrix["CC"],
        "CD": payoff_matrix["CD"],
        "DC": payoff_matrix["DC"],
        "DD": payoff_matrix["DD"],
    }

@api_router.put("/payoff-matrix")
async def update_payoff_matrix(matrix: PayoffMatrixUpdate, _: bool = Depends(verify_admin)):
    global payoff_matrix
    payoff_matrix = {
        "CC": (matrix.cc_a, matrix.cc_b),
        "CD": (matrix.cd_a, matrix.cd_b),
        "DC": (matrix.dc_a, matrix.dc_b),
        "DD": (matrix.dd_a, matrix.dd_b),
    }
    return payoff_matrix

# Export Results
@api_router.get("/export/csv")
async def export_csv(_: bool = Depends(verify_admin)):
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(['Rank', 'Team Name', 'Total Score', 'Cooperation %', 'Matches Played', 'Cooperations', 'Defections'])
    
    # Write data
    for entry in leaderboard:
        writer.writerow([
            entry['rank'],
            entry['name'],
            entry['total_score'],
            entry['cooperation_pct'],
            entry['matches_played'],
            entry['cooperations'],
            entry['defections'],
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=algowar_results.csv"}
    )

# Top 4 Showdown
@api_router.post("/tournament/showdown")
async def start_showdown(_: bool = Depends(verify_admin)):
    global tournament_task, tournament_state, match_results
    
    if tournament_state['status'] == 'running':
        raise HTTPException(status_code=400, detail="Tournament already running")
    
    if len(leaderboard) < 4:
        raise HTTPException(status_code=400, detail="Need at least 4 teams with scores for showdown")
    
    # Get top 4 teams
    top_4 = [entry['id'] for entry in leaderboard[:4]]
    
    # Reset stats for showdown
    for team_id in top_4:
        teams[team_id]['total_score'] = 0
        teams[team_id]['cooperations'] = 0
        teams[team_id]['defections'] = 0
        teams[team_id]['matches_played'] = 0
    
    match_results = []
    tournament_state = {
        "status": "running",
        "current_match": None,
        "matches_completed": [],
        "total_matches": 6,  # 4 choose 2 = 6 matches
        "current_match_index": 0,
        "is_showdown": True,
    }
    
    await broadcast({"type": "showdown_started", "teams": [teams[tid]['name'] for tid in top_4]})
    
    async def run_showdown():
        matches = []
        for i, team_a in enumerate(top_4):
            for team_b in top_4[i+1:]:
                matches.append((team_a, team_b))
        
        for idx, (team_a_id, team_b_id) in enumerate(matches):
            tournament_state['current_match_index'] = idx
            tournament_state['current_match'] = {
                "team_a": teams[team_a_id]['name'],
                "team_b": teams[team_b_id]['name'],
                "match_number": idx + 1,
            }
            
            await broadcast({"type": "match_started", "data": tournament_state['current_match']})
            
            result = await run_match(team_a_id, team_b_id)
            match_results.append(result.model_dump())
            
            update_leaderboard()
            await broadcast({"type": "match_completed", "result": result.model_dump(), "leaderboard": leaderboard})
            await asyncio.sleep(0.5)
        
        tournament_state['status'] = 'finished'
        await broadcast({"type": "showdown_finished", "leaderboard": leaderboard})
    
    tournament_task = asyncio.create_task(run_showdown())
    return {"success": True, "teams": [teams[tid]['name'] for tid in top_4]}

# Sample Strategies
@api_router.get("/sample-strategies")
async def get_sample_strategies():
    return [
        {
            "name": "Always Cooperate",
            "code": """def strategy(opponent_history, my_history):
    return 'C'"""
        },
        {
            "name": "Always Defect",
            "code": """def strategy(opponent_history, my_history):
    return 'D'"""
        },
        {
            "name": "Tit-for-Tat",
            "code": """def strategy(opponent_history, my_history):
    if len(opponent_history) == 0:
        return 'C'
    return opponent_history[-1]"""
        },
        {
            "name": "Grudger",
            "code": """def strategy(opponent_history, my_history):
    if 'D' in opponent_history:
        return 'D'
    return 'C'"""
        },
        {
            "name": "Random",
            "code": """def strategy(opponent_history, my_history):
    return 'C' if len(opponent_history) % 2 == 0 else 'D'"""
        },
    ]

# WebSocket endpoint
@api_router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    websocket_connections.append(websocket)
    
    try:
        # Send current state
        await websocket.send_json({
            "type": "initial_state",
            "tournament": tournament_state,
            "leaderboard": leaderboard,
            "teams_count": len(teams),
        })
        
        while True:
            # Keep connection alive
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30)
                if data == "ping":
                    await websocket.send_json({"type": "pong"})
            except asyncio.TimeoutError:
                await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        pass
    finally:
        if websocket in websocket_connections:
            websocket_connections.remove(websocket)

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown():
    global tournament_task
    if tournament_task and not tournament_task.done():
        tournament_task.cancel()

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8000))
    host = os.environ.get('HOST', '0.0.0.0')
    uvicorn.run(
        "server:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )