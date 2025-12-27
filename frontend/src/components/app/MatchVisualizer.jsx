import {motion} from "framer-motion";
import {Swords} from "lucide-react";
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

export default MatchVisualizer;