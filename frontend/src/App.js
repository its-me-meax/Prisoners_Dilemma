import { useState, useEffect, useRef, useCallback } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, Swords, Trophy, Users, Settings, Play, Pause, 
  RotateCcw, Download, Plus, Trash2, Edit, Check, X, 
  Zap, Target, Eye, Lock, ChevronRight, Crown
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Progress } from "./components/ui/progress";
import { ScrollArea } from "./components/ui/scroll-area";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000' ;
const API = `${BACKEND_URL}/api`;

// WebSocket hook
const useWebSocket = (onMessage) => {
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);

  const connect = useCallback(() => {
    const wsUrl = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    ws.current = new WebSocket(`${wsUrl}/api/ws`);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected, reconnecting...');
      reconnectTimeout.current = setTimeout(connect, 3000);
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [onMessage]);

  useEffect(() => {
    connect();
    
    const pingInterval = setInterval(() => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send('ping');
      }
    }, 25000);

    return () => {
      clearInterval(pingInterval);
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (ws.current) ws.current.close();
    };
  }, [connect]);

  return ws;
};

// Leaderboard Component
const Leaderboard = ({ data, compact = false }) => {
  return (
    <div className="cyber-card p-6" data-testid="leaderboard">
      <h2 className="font-display text-2xl neon-cyan mb-6 flex items-center gap-3">
        <Trophy className="w-6 h-6" />
        LEADERBOARD
      </h2>
      <ScrollArea className={compact ? "h-[300px]" : "h-[500px]"}>
        <table className="cyber-table">
          <thead>
            <tr>
              <th>RANK</th>
              <th>TEAM</th>
              <th>SCORE</th>
              <th>COOP %</th>
            </tr>
          </thead>
          <tbody>
            {data.map((entry, idx) => (
              <motion.tr
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`leaderboard-row ${entry.rank <= 3 ? `rank-${entry.rank}` : ''}`}
                data-testid={`leaderboard-row-${entry.rank}`}
              >
                <td>
                  <span className={`font-display text-xl ${entry.rank === 1 ? 'neon-gold' : entry.rank === 2 ? 'text-gray-300' : entry.rank === 3 ? 'text-amber-600' : ''}`}>
                    {entry.rank === 1 && <Crown className="inline w-5 h-5 mr-1" />}
                    #{entry.rank}
                  </span>
                </td>
                <td className="font-display text-lg">{entry.name}</td>
                <td className="text-2xl font-bold neon-green">{entry.total_score}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-muted rounded overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${entry.cooperation_pct}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">{entry.cooperation_pct}%</span>
                  </div>
                </td>
              </motion.tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-muted-foreground py-8">
                  No teams yet. Waiting for tournament to start...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ScrollArea>
    </div>
  );
};

// Match Visualizer Component
const MatchVisualizer = ({ match, progress }) => {
  if (!match) {
    return (
      <div className="cyber-card p-8 text-center" data-testid="match-visualizer-idle">
        <div className="text-muted-foreground font-display text-xl">
          <Swords className="w-16 h-16 mx-auto mb-4 opacity-30" />
          WAITING FOR MATCH...
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="cyber-card p-8"
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      data-testid="match-visualizer"
    >
      <div className="text-center mb-4">
        <span className="text-muted-foreground font-mono text-sm">
          MATCH {match.match_number || progress?.match_number || '?'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-8 items-center mb-8">
        {/* Team A */}
        <div className="text-center">
          <motion.h3 
            className="font-display text-3xl mb-4 truncate"
            animate={{ color: progress?.team_a?.last_move === 'C' ? '#00FF94' : '#FF0055' }}
          >
            {progress?.team_a?.name || match.team_a}
          </motion.h3>
          <div className="text-6xl font-display font-black neon-green" data-testid="team-a-score">
            {progress?.team_a?.score || 0}
          </div>
          {progress && (
            <div className="mt-4 flex justify-center gap-2">
              <span className={`move-icon ${progress.team_a?.last_move === 'C' ? 'move-c' : 'move-d'}`}>
                {progress.team_a?.last_move || '?'}
              </span>
              <span className="text-sm text-muted-foreground">
                {progress.a_coop_pct}% Coop
              </span>
            </div>
          )}
        </div>

        {/* VS */}
        <div className="text-center">
          <div className="vs-text">VS</div>
        </div>

        {/* Team B */}
        <div className="text-center">
          <motion.h3 
            className="font-display text-3xl mb-4 truncate"
            animate={{ color: progress?.team_b?.last_move === 'C' ? '#00FF94' : '#FF0055' }}
          >
            {progress?.team_b?.name || match.team_b}
          </motion.h3>
          <div className="text-6xl font-display font-black neon-green" data-testid="team-b-score">
            {progress?.team_b?.score || 0}
          </div>
          {progress && (
            <div className="mt-4 flex justify-center gap-2">
              <span className={`move-icon ${progress.team_b?.last_move === 'C' ? 'move-c' : 'move-d'}`}>
                {progress.team_b?.last_move || '?'}
              </span>
              <span className="text-sm text-muted-foreground">
                {progress.b_coop_pct}% Coop
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm font-mono text-muted-foreground">
          <span>ROUND {progress?.round || 0}</span>
          <span>{progress?.total_rounds || 100} TOTAL</span>
        </div>
        <div className="cyber-progress">
          <motion.div 
            className="cyber-progress-bar bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${((progress?.round || 0) / (progress?.total_rounds || 100)) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    </motion.div>
  );
};

// Audience View (Main public dashboard)
const AudienceView = () => {
  const [tournament, setTournament] = useState({ status: 'idle' });
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentMatch, setCurrentMatch] = useState(null);
  const [matchProgress, setMatchProgress] = useState(null);

  const handleWsMessage = useCallback((data) => {
    switch (data.type) {
      case 'initial_state':
        setTournament(data.tournament);
        setLeaderboard(data.leaderboard || []);
        break;
      case 'tournament_started':
      case 'showdown_started':
        setTournament(prev => ({ ...prev, status: 'running' }));
        toast.success('Tournament Started!');
        break;
      case 'match_started':
        setCurrentMatch(data.data);
        setMatchProgress(null);
        break;
      case 'match_progress':
        setMatchProgress(data.data);
        break;
      case 'match_completed':
        setLeaderboard(data.leaderboard);
        setMatchProgress(null);
        break;
      case 'tournament_finished':
      case 'showdown_finished':
        setTournament(prev => ({ ...prev, status: 'finished' }));
        setLeaderboard(data.leaderboard);
        setCurrentMatch(null);
        toast.success('Tournament Finished!');
        break;
      case 'tournament_paused':
        setTournament(prev => ({ ...prev, status: 'paused' }));
        break;
      case 'tournament_resumed':
        setTournament(prev => ({ ...prev, status: 'running' }));
        break;
      case 'tournament_reset':
        setTournament({ status: 'idle' });
        setLeaderboard([]);
        setCurrentMatch(null);
        setMatchProgress(null);
        break;
      default:
        break;
    }
  }, []);

  useWebSocket(handleWsMessage);

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statusRes, lbRes] = await Promise.all([
          axios.get(`${API}/tournament/status`),
          axios.get(`${API}/leaderboard`)
        ]);
        setTournament(statusRes.data);
        setLeaderboard(lbRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen p-8" data-testid="audience-view">
      {/* Header */}
      <motion.header 
        className="text-center mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-display text-6xl md:text-8xl font-black tracking-tighter mb-4">
          <span className="neon-green">ALGO</span>
          <span className="neon-red">WAR</span>
        </h1>
        <p className="font-mono text-muted-foreground text-lg">
          PRISONER'S DILEMMA TOURNAMENT
        </p>
        <div className="mt-4 flex items-center justify-center gap-4">
          <span className={`px-4 py-2 font-mono text-sm rounded ${
            tournament.status === 'running' ? 'bg-green-500/20 text-green-400 pulse-glow' :
            tournament.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
            tournament.status === 'finished' ? 'bg-blue-500/20 text-blue-400' :
            'bg-gray-500/20 text-gray-400'
          }`} data-testid="tournament-status">
            {tournament.status?.toUpperCase()}
          </span>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Match Visualizer */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <MatchVisualizer match={currentMatch} progress={matchProgress} />
        </motion.div>

        {/* Leaderboard */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Leaderboard data={leaderboard} />
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="mt-12 text-center">
        <a 
          href="/admin" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-mono text-sm"
        >
          <Lock className="w-4 h-4" />
          ADMIN PANEL
        </a>
      </footer>
    </div>
  );
};

// Admin Panel
const AdminPanel = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [teams, setTeams] = useState([]);
  const [tournament, setTournament] = useState({ status: 'idle' });
  const [leaderboard, setLeaderboard] = useState([]);
  const [sampleStrategies, setSampleStrategies] = useState([]);
  const [payoffMatrix, setPayoffMatrix] = useState({
    cc_a: 3, cc_b: 3,
    cd_a: 0, cd_b: 5,
    dc_a: 5, dc_b: 0,
    dd_a: 1, dd_b: 1,
  });

  // Team form state
  const [newTeam, setNewTeam] = useState({ name: '', strategy_code: '' });
  const [editingTeam, setEditingTeam] = useState(null);
  const [validationResult, setValidationResult] = useState(null);

  const adminHeaders = { 'X-Admin-Password': password };

  // WebSocket handler
  const handleWsMessage = useCallback((data) => {
    if (data.type === 'initial_state') {
      setTournament(data.tournament);
      setLeaderboard(data.leaderboard || []);
    } else if (data.leaderboard) {
      setLeaderboard(data.leaderboard);
    }
    if (data.tournament) {
      setTournament(prev => ({ ...prev, ...data.tournament }));
    }
  }, []);

  useWebSocket(handleWsMessage);

  // Check stored auth
  useEffect(() => {
    const stored = localStorage.getItem('algowar_admin_password');
    if (stored) {
      setPassword(stored);
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
    }
  }, [isAuthenticated]);

  const fetchAllData = async () => {
    try {
      const [teamsRes, statusRes, lbRes, strategiesRes, matrixRes] = await Promise.all([
        axios.get(`${API}/teams`),
        axios.get(`${API}/tournament/status`),
        axios.get(`${API}/leaderboard`),
        axios.get(`${API}/sample-strategies`),
        axios.get(`${API}/payoff-matrix`),
      ]);
      setTeams(teamsRes.data);
      setTournament(statusRes.data);
      setLeaderboard(lbRes.data);
      setSampleStrategies(strategiesRes.data);
      
      const m = matrixRes.data;
      setPayoffMatrix({
        cc_a: m.CC[0], cc_b: m.CC[1],
        cd_a: m.CD[0], cd_b: m.CD[1],
        dc_a: m.DC[0], dc_b: m.DC[1],
        dd_a: m.DD[0], dd_b: m.DD[1],
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/admin/login?password=${encodeURIComponent(password)}`);
      localStorage.setItem('algowar_admin_password', password);
      setIsAuthenticated(true);
      toast.success('Logged in successfully');
    } catch (error) {
      toast.error('Invalid password');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('algowar_admin_password');
    setIsAuthenticated(false);
    setPassword('');
  };

  // Team operations
  const validateStrategy = async () => {
    try {
      const res = await axios.post(`${API}/teams/validate`, newTeam);
      setValidationResult(res.data);
      if (res.data.valid) {
        toast.success('Strategy is valid!');
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      toast.error('Validation failed');
    }
  };

  const createTeam = async () => {
    try {
      await axios.post(`${API}/teams`, newTeam, { headers: adminHeaders });
      toast.success('Team created!');
      setNewTeam({ name: '', strategy_code: '' });
      setValidationResult(null);
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create team');
    }
  };

  const updateTeam = async () => {
    if (!editingTeam) return;
    try {
      await axios.put(`${API}/teams/${editingTeam.id}`, {
        name: editingTeam.name,
        strategy_code: editingTeam.strategy_code,
      }, { headers: adminHeaders });
      toast.success('Team updated!');
      setEditingTeam(null);
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update team');
    }
  };

  const deleteTeam = async (teamId) => {
    if (!window.confirm('Delete this team?')) return;
    try {
      await axios.delete(`${API}/teams/${teamId}`, { headers: adminHeaders });
      toast.success('Team deleted');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to delete team');
    }
  };

  // Tournament operations
  const startTournament = async () => {
    try {
      await axios.post(`${API}/tournament/start`, {}, { headers: adminHeaders });
      toast.success('Tournament started!');
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start');
    }
  };

  const pauseTournament = async () => {
    try {
      await axios.post(`${API}/tournament/pause`, {}, { headers: adminHeaders });
      toast.success('Tournament paused');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to pause');
    }
  };

  const resumeTournament = async () => {
    try {
      await axios.post(`${API}/tournament/resume`, {}, { headers: adminHeaders });
      toast.success('Tournament resumed');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to resume');
    }
  };

  const resetTournament = async () => {
    if (!window.confirm('Reset the tournament? All scores will be cleared.')) return;
    try {
      await axios.post(`${API}/tournament/reset`, {}, { headers: adminHeaders });
      toast.success('Tournament reset');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to reset');
    }
  };

  const startShowdown = async () => {
    try {
      await axios.post(`${API}/tournament/showdown`, {}, { headers: adminHeaders });
      toast.success('Top 4 Showdown started!');
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start showdown');
    }
  };

  const exportCSV = async () => {
    try {
      const response = await axios.get(`${API}/export/csv`, {
        headers: adminHeaders,
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'algowar_results.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('CSV exported');
    } catch (error) {
      toast.error('Failed to export');
    }
  };

  const updatePayoffMatrix = async () => {
    try {
      await axios.put(`${API}/payoff-matrix`, payoffMatrix, { headers: adminHeaders });
      toast.success('Payoff matrix updated');
    } catch (error) {
      toast.error('Failed to update matrix');
    }
  };

  // Login form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" data-testid="admin-login">
        <motion.div 
          className="cyber-card p-8 w-full max-w-md"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <h1 className="font-display text-3xl neon-cyan text-center mb-8">
            <Lock className="inline w-8 h-8 mr-2" />
            ADMIN LOGIN
          </h1>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="cyber-input w-full mb-6"
              data-testid="admin-password-input"
            />
            <button type="submit" className="cyber-btn w-full" data-testid="admin-login-btn">
              ACCESS PANEL
            </button>
          </form>
          <p className="text-center mt-6 text-muted-foreground text-sm">
            Default password: algowar2026
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" data-testid="admin-panel">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl">
            <span className="neon-green">ALGO</span>
            <span className="neon-red">WAR</span>
            <span className="text-muted-foreground ml-4">ADMIN</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <a href="/" className="cyber-btn flex items-center gap-2">
            <Eye className="w-4 h-4" />
            VIEW LIVE
          </a>
          <button onClick={handleLogout} className="cyber-btn cyber-btn-danger">
            LOGOUT
          </button>
        </div>
      </header>

      {/* Tournament Controls */}
      <div className="cyber-card p-6 mb-8" data-testid="tournament-controls">
        <h2 className="font-display text-xl neon-cyan mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5" />
          TOURNAMENT CONTROL
        </h2>
        <div className="flex flex-wrap gap-4 items-center">
          <span className={`px-4 py-2 font-mono text-sm rounded ${
            tournament.status === 'running' ? 'bg-green-500/20 text-green-400' :
            tournament.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
            tournament.status === 'finished' ? 'bg-blue-500/20 text-blue-400' :
            'bg-gray-500/20 text-gray-400'
          }`}>
            STATUS: {tournament.status?.toUpperCase()}
          </span>
          <span className="font-mono text-muted-foreground">
            {teams.length} TEAMS
          </span>
          
          <div className="flex gap-2 ml-auto">
            {tournament.status === 'idle' && (
              <button onClick={startTournament} className="cyber-btn flex items-center gap-2" data-testid="start-tournament-btn">
                <Play className="w-4 h-4" />
                START
              </button>
            )}
            {tournament.status === 'running' && (
              <button onClick={pauseTournament} className="cyber-btn flex items-center gap-2" data-testid="pause-tournament-btn">
                <Pause className="w-4 h-4" />
                PAUSE
              </button>
            )}
            {tournament.status === 'paused' && (
              <button onClick={resumeTournament} className="cyber-btn flex items-center gap-2" data-testid="resume-tournament-btn">
                <Play className="w-4 h-4" />
                RESUME
              </button>
            )}
            {tournament.status === 'finished' && (
              <button onClick={startShowdown} className="cyber-btn flex items-center gap-2" data-testid="showdown-btn">
                <Crown className="w-4 h-4" />
                TOP 4 SHOWDOWN
              </button>
            )}
            <button onClick={resetTournament} className="cyber-btn cyber-btn-danger flex items-center gap-2" data-testid="reset-tournament-btn">
              <RotateCcw className="w-4 h-4" />
              RESET
            </button>
            <button onClick={exportCSV} className="cyber-btn flex items-center gap-2" data-testid="export-csv-btn">
              <Download className="w-4 h-4" />
              EXPORT CSV
            </button>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="teams" className="space-y-6">
        <TabsList className="bg-muted p-1">
          <TabsTrigger value="teams" className="font-mono" data-testid="tab-teams">
            <Users className="w-4 h-4 mr-2" />
            TEAMS
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="font-mono" data-testid="tab-leaderboard">
            <Trophy className="w-4 h-4 mr-2" />
            LEADERBOARD
          </TabsTrigger>
          <TabsTrigger value="settings" className="font-mono" data-testid="tab-settings">
            <Settings className="w-4 h-4 mr-2" />
            SETTINGS
          </TabsTrigger>
        </TabsList>

        {/* Teams Tab */}
        <TabsContent value="teams" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Add Team Form */}
            <div className="cyber-card p-6" data-testid="add-team-form">
              <h3 className="font-display text-xl neon-green mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5" />
                ADD NEW TEAM
              </h3>
              
              <div className="space-y-4">
                <input
                  type="text"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                  placeholder="Team Name"
                  className="cyber-input w-full"
                  data-testid="new-team-name"
                />
                
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">
                    STRATEGY CODE
                  </label>
                  <textarea
                    value={newTeam.strategy_code}
                    onChange={(e) => setNewTeam({ ...newTeam, strategy_code: e.target.value })}
                    placeholder="def strategy(opponent_history, my_history):&#10;    return 'C'"
                    className="code-editor w-full h-48"
                    data-testid="new-team-code"
                  />
                </div>

                {/* Sample strategies */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-muted-foreground">Templates:</span>
                  {sampleStrategies.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => setNewTeam({ ...newTeam, strategy_code: s.code })}
                      className="text-xs px-2 py-1 bg-accent hover:bg-primary hover:text-black transition-colors rounded"
                    >
                      {s.name}
                    </button>
                  ))}
                </div>

                {validationResult && (
                  <div className={`p-3 rounded ${validationResult.valid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {validationResult.message}
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={validateStrategy} className="cyber-btn flex-1" data-testid="validate-strategy-btn">
                    <Target className="w-4 h-4 mr-2 inline" />
                    VALIDATE
                  </button>
                  <button 
                    onClick={createTeam} 
                    className="cyber-btn flex-1"
                    disabled={!newTeam.name || !newTeam.strategy_code}
                    data-testid="create-team-btn"
                  >
                    <Plus className="w-4 h-4 mr-2 inline" />
                    CREATE
                  </button>
                </div>
              </div>
            </div>

            {/* Team List */}
            <div className="cyber-card p-6" data-testid="team-list">
              <h3 className="font-display text-xl neon-cyan mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                REGISTERED TEAMS ({teams.length})
              </h3>
              
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {teams.map((team) => (
                    <motion.div
                      key={team.id}
                      className="p-4 bg-accent/50 rounded border border-border hover:border-primary/50 transition-colors"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {editingTeam?.id === team.id ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={editingTeam.name}
                            onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
                            className="cyber-input w-full"
                          />
                          <textarea
                            value={editingTeam.strategy_code}
                            onChange={(e) => setEditingTeam({ ...editingTeam, strategy_code: e.target.value })}
                            className="code-editor w-full h-32"
                          />
                          <div className="flex gap-2">
                            <button onClick={updateTeam} className="cyber-btn text-xs">
                              <Check className="w-3 h-3 mr-1 inline" />
                              SAVE
                            </button>
                            <button onClick={() => setEditingTeam(null)} className="cyber-btn cyber-btn-danger text-xs">
                              <X className="w-3 h-3 mr-1 inline" />
                              CANCEL
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-display text-lg">{team.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">
                              Score: {team.total_score} | Matches: {team.matches_played}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setEditingTeam(team)}
                              className="p-2 hover:bg-primary/20 rounded transition-colors"
                              data-testid={`edit-team-${team.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => deleteTeam(team.id)}
                              className="p-2 hover:bg-destructive/20 rounded transition-colors"
                              data-testid={`delete-team-${team.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                  {teams.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No teams registered yet
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard">
          <Leaderboard data={leaderboard} />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <div className="cyber-card p-6 max-w-2xl" data-testid="payoff-matrix-settings">
            <h3 className="font-display text-xl neon-cyan mb-6 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              PAYOFF MATRIX
            </h3>
            
            <div className="overflow-x-auto">
              <table className="cyber-table mb-6">
                <thead>
                  <tr>
                    <th></th>
                    <th className="text-center">OPPONENT C</th>
                    <th className="text-center">OPPONENT D</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-display">YOU C</td>
                    <td>
                      <div className="flex items-center gap-2 justify-center">
                        <input
                          type="number"
                          value={payoffMatrix.cc_a}
                          onChange={(e) => setPayoffMatrix({ ...payoffMatrix, cc_a: parseInt(e.target.value) || 0 })}
                          className="cyber-input w-16 text-center"
                          data-testid="matrix-cc-a"
                        />
                        <span>,</span>
                        <input
                          type="number"
                          value={payoffMatrix.cc_b}
                          onChange={(e) => setPayoffMatrix({ ...payoffMatrix, cc_b: parseInt(e.target.value) || 0 })}
                          className="cyber-input w-16 text-center"
                          data-testid="matrix-cc-b"
                        />
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 justify-center">
                        <input
                          type="number"
                          value={payoffMatrix.cd_a}
                          onChange={(e) => setPayoffMatrix({ ...payoffMatrix, cd_a: parseInt(e.target.value) || 0 })}
                          className="cyber-input w-16 text-center"
                          data-testid="matrix-cd-a"
                        />
                        <span>,</span>
                        <input
                          type="number"
                          value={payoffMatrix.cd_b}
                          onChange={(e) => setPayoffMatrix({ ...payoffMatrix, cd_b: parseInt(e.target.value) || 0 })}
                          className="cyber-input w-16 text-center"
                          data-testid="matrix-cd-b"
                        />
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="font-display">YOU D</td>
                    <td>
                      <div className="flex items-center gap-2 justify-center">
                        <input
                          type="number"
                          value={payoffMatrix.dc_a}
                          onChange={(e) => setPayoffMatrix({ ...payoffMatrix, dc_a: parseInt(e.target.value) || 0 })}
                          className="cyber-input w-16 text-center"
                          data-testid="matrix-dc-a"
                        />
                        <span>,</span>
                        <input
                          type="number"
                          value={payoffMatrix.dc_b}
                          onChange={(e) => setPayoffMatrix({ ...payoffMatrix, dc_b: parseInt(e.target.value) || 0 })}
                          className="cyber-input w-16 text-center"
                          data-testid="matrix-dc-b"
                        />
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 justify-center">
                        <input
                          type="number"
                          value={payoffMatrix.dd_a}
                          onChange={(e) => setPayoffMatrix({ ...payoffMatrix, dd_a: parseInt(e.target.value) || 0 })}
                          className="cyber-input w-16 text-center"
                          data-testid="matrix-dd-a"
                        />
                        <span>,</span>
                        <input
                          type="number"
                          value={payoffMatrix.dd_b}
                          onChange={(e) => setPayoffMatrix({ ...payoffMatrix, dd_b: parseInt(e.target.value) || 0 })}
                          className="cyber-input w-16 text-center"
                          data-testid="matrix-dd-b"
                        />
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Format: (Your Score, Opponent Score) | Default: C-C (3,3), D-C (5,0), C-D (0,5), D-D (1,1)
            </p>

            <button onClick={updatePayoffMatrix} className="cyber-btn" data-testid="update-matrix-btn">
              UPDATE MATRIX
            </button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AudienceView />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" theme="dark" />
    </div>
  );
}

export default App;
