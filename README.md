# AlgoWar: Prisoner's Dilemma Tournament Platform

A competitive tournament platform for testing AI strategies in the Prisoner's Dilemma game. Teams submit Python strategies that compete in a round-robin tournament to achieve the highest scores through cooperative or defective moves.

## 🎯 Features

- **Strategy Submission**: Teams submit Python-based strategies that execute in a sandboxed environment
- **Tournament Management**: Run full round-robin tournaments with real-time match tracking
- **Live Dashboard**: Real-time leaderboard updates and match visualization via WebSocket
- **Admin Panel**: Secure admin interface to manage teams, control tournaments, and configure payoff matrices
- **Match History**: Complete match results and statistics export (CSV)
- **Showdown Mode**: Final competition between the top 4 teams
- **Cross-Platform**: Works on Windows, macOS, and Linux

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Strategy Development](#strategy-development)
- [Tournament Rules](#tournament-rules)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Node.js 14+
- npm or yarn

### Setup (5 minutes)

**1. Clone the repository:**
```bash
git clone https://github.com/CSP-UHS/Prisoners_Dilemma.git
cd Prisoners_Dilemma
```

**2. Backend Setup:**
```bash
cd app/backend
pip install -r requirements.txt
python server.py
```
Backend runs on `http://localhost:8000`

**3. Frontend Setup (New Terminal):**
```bash
cd app/frontend
npm install
npm start
```
Frontend runs on `http://localhost:3000`

**4. Access the Application:**
- **Public Dashboard**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin
- **Default Admin Password**: `algowar2026` (change in `.env`)

## 📁 Project Structure

```
Prisoners_Dilemma/
├── app/
│   ├── backend/
│   │   ├── server.py              # FastAPI application
│   │   ├── requirements.txt       # Python dependencies
│   │   └── .env                   # Environment variables
│   │
│   └── frontend/
│       ├── src/
│       │   ├── App.js             # Main React component
│       │   ├── index.js           # Entry point
│       │   └── components/        # Reusable UI components
│       ├── public/
│       │   └── index.html         # HTML template
│       ├── package.json           # Node dependencies
│       └── .env                   # Frontend environment
│
├── README.md                      # This file
└── backend_test.py               # Backend testing utilities
```

## 🔧 Installation

### Backend Installation

```bash
cd app/backend

# Install Python dependencies
pip install -r requirements.txt

# Create .env file (optional)
cat > .env << EOF
ADMIN_PASSWORD=algowar2026
CORS_ORIGINS=*
HOST=0.0.0.0
PORT=8000
EOF

# Run the server
python server.py
```

**Backend Dependencies:**
- `fastapi==0.104.1` - Web framework
- `uvicorn==0.24.0` - ASGI server
- `pydantic==2.5.0` - Data validation
- `python-dotenv==1.0.0` - Environment variables

### Frontend Installation

```bash
cd app/frontend

# Install Node dependencies
npm install

# Create .env file (optional)
cat > .env << EOF
REACT_APP_BACKEND_URL=http://localhost:8000
WDS_SOCKET_PORT=3000
ENABLE_HEALTH_CHECK=false
EOF

# Start development server
npm start

# Build for production
npm run build
```

**Frontend Stack:**
- React 18+
- Tailwind CSS - Styling
- Axios - HTTP client
- Recharts - Data visualization
- shadcn/ui - Component library

## ⚙️ Configuration

### Backend (.env)

```env
# Admin authentication
ADMIN_PASSWORD=algowar2026

# CORS settings (allow all origins for development)
CORS_ORIGINS=*

# Server settings
HOST=0.0.0.0
PORT=8000
```

### Frontend (.env)

```env
# Backend API URL
REACT_APP_BACKEND_URL=http://localhost:8000

# Development server socket port
WDS_SOCKET_PORT=3000

# Health check feature
ENABLE_HEALTH_CHECK=false
```

## 💻 Usage

### 1. Access Admin Panel

1. Navigate to http://localhost:3000/admin
2. Enter admin password: `algowar2026`
3. Click "Login"

### 2. Create Teams

**Via Admin Panel:**
1. Go to "Teams" section
2. Enter team name and strategy code
3. Click "Validate Strategy"
4. Click "Create Team"

**Strategy Code Example:**
```python
def strategy(opponent_history, my_history):
    # opponent_history: list of opponent's moves ['C' or 'D']
    # my_history: list of your moves ['C' or 'D']
    
    if len(opponent_history) == 0:
        return 'C'  # Start cooperating
    
    # Tit-for-tat: copy opponent's last move
    return opponent_history[-1]
```

### 3. Run Tournament

1. Click "Start Tournament"
2. Watch real-time match progress on the public dashboard
3. Monitor leaderboard updates via WebSocket
4. Export results when complete

### 4. View Results

- **Leaderboard**: Total scores, win rates, cooperation rates
- **Match History**: Detailed match results with timestamps
- **Export**: Download tournament results as CSV

## 📡 API Documentation

### Base URL
```
http://localhost:8000/api
```

### Authentication
Include admin password in header:
```
X-Admin-Password: algowar2026
```

### Endpoints

#### Teams
```
GET    /teams              # List all teams
POST   /teams              # Create team
PUT    /teams/{team_id}    # Update team
DELETE /teams/{team_id}    # Delete team
POST   /teams/validate     # Validate strategy code
```

#### Tournament
```
GET    /tournament/status  # Get tournament status
POST   /tournament/start   # Start tournament
POST   /tournament/pause   # Pause tournament
POST   /tournament/resume  # Resume tournament
POST   /tournament/reset   # Reset tournament
POST   /tournament/showdown # Run top 4 showdown
```

#### Data
```
GET    /leaderboard        # Get leaderboard
GET    /matches            # Get match results
GET    /export/csv         # Export as CSV
GET    /payoff-matrix      # Get payoff matrix
PUT    /payoff-matrix      # Update payoff matrix
GET    /sample-strategies  # Get sample strategies
```

#### WebSocket
```
ws://localhost:8000/api/ws  # Real-time tournament updates
```

## 🎮 Strategy Development

### Strategy Requirements

Your strategy function must:
1. Accept two parameters: `opponent_history` and `my_history`
2. Return either `'C'` (cooperate) or `'D'` (defect)
3. Complete execution in < 5ms

### Available Functions

```python
# Allowed built-in functions
len(), range(), list(), str(), int(), float(), bool()
max(), min(), sum(), abs(), round()
```

### Security Restrictions

Forbidden patterns (for security):
- `import`, `from` statements
- File operations (`open()`)
- Dynamic code execution (`eval()`, `exec()`)
- System access (`os`, `sys`, `subprocess`)
- Reflection (`getattr()`, `setattr()`, `__dict__`)

### Example Strategies

**1. Always Cooperate**
```python
def strategy(opponent_history, my_history):
    return 'C'
```

**2. Tit-for-Tat**
```python
def strategy(opponent_history, my_history):
    if len(opponent_history) == 0:
        return 'C'
    return opponent_history[-1]
```

**3. Random Strategy**
```python
def strategy(opponent_history, my_history):
    import random
    return 'C' if random.random() > 0.5 else 'D'
```

**4. Grudger**
```python
def strategy(opponent_history, my_history):
    if 'D' in opponent_history:
        return 'D'
    return 'C'
```

## 🏆 Tournament Rules

### Payoff Matrix (Default)

|  | Cooperate | Defect |
|---|-----------|--------|
| **Cooperate** | (3, 3) | (0, 5) |
| **Defect** | (5, 0) | (1, 1) |

### Match Format

- **Round-robin**: Every team plays every other team once
- **Rounds per match**: 100 (configurable)
- **Scoring**: Sum of points across all matches
- **Tiebreaker**: Cooperation rate (higher is better)

### Tournament Stages

1. **Initial**: All teams vs all teams
2. **Showdown** (optional): Top 4 teams play final round

## 🐛 Troubleshooting

### WebSocket Connection Failed

**Error**: `WebSocket connection to 'ws://localhost:443/ws' failed`

**Solution**:
1. Verify backend is running: `python server.py`
2. Check frontend `.env` has `REACT_APP_BACKEND_URL=http://localhost:8000`
3. Ensure `WDS_SOCKET_PORT=3000` (not 443)
4. Restart frontend: `npm start`

### Strategy Validation Error

**Error**: `Strategy code contains forbidden patterns`

**Solution**:
- Remove `import` statements
- Don't use file operations
- Use only allowed built-in functions
- Check syntax: must define `strategy()` function

### Connection Refused (Backend)

**Error**: `Connection refused on localhost:8000`

**Solution**:
1. Check if port 8000 is in use:
   ```bash
   # Windows
   netstat -ano | findstr :8000
   
   # Linux/Mac
   lsof -i :8000
   ```
2. Kill the process or use different port
3. Verify Python is installed: `python --version`

### CORS Errors

**Error**: `Access to XMLHttpRequest has been blocked by CORS policy`

**Solution**:
1. Ensure backend is running
2. Check `CORS_ORIGINS` in backend `.env`
3. Set `CORS_ORIGINS=*` for development
4. For production, specify allowed origins

## 📦 Building for Production

### Backend

```bash
cd app/backend

# Install dependencies
pip install -r requirements.txt

# Run with production settings
python server.py
```

### Frontend

```bash
cd app/frontend

# Install dependencies
npm install

# Build optimized bundle
npm run build

# Output is in build/ directory
```

### Deployment Options

- **Heroku**: Use `Procfile` and `runtime.txt`
- **Docker**: Create Dockerfile for both services
- **AWS/Azure**: Use AppService or EC2
- **Vercel** (Frontend only): Upload `build/` folder

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -am 'Add my feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Submit a Pull Request

## 📝 License

This project is licensed under the MIT License - see LICENSE file for details.

## 🔗 Links

- **Repository**: https://github.com/harshbpathak/Prisoners_Dilemma
- **Issues**: https://github.com/CSP-UHS/Prisoners_Dilemma/issues
- **Discussions**: https://github.com/CSP-UHS/Prisoners_Dilemma/discussions

## 👥 Authors

- https:/github.com/harshbpathak

---


## 🙏 Acknowledgments

- Inspired by Robert Axelrod's Prisoner's Dilemma tournaments
- Built with FastAPI and React
- Community feedback and contributions

---

**Last Updated**: December 2025
