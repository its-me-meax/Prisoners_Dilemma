import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Swords } from "lucide-react";
import gsap from "gsap";

const MatchVisualizer = ({ match, progress }) => {
  const teamAScoreRef = useRef(null);
  const teamBScoreRef = useRef(null);
  const teamCScoreRef = useRef(null);
  const teamAMoveRef = useRef(null);
  const teamBMoveRef = useRef(null);
  const teamCMoveRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (match && containerRef.current) {
      // Animate container entrance
      gsap.fromTo(
        containerRef.current,
        { scale: 0.9, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(1.7)" }
      );
    }
  }, [match]);

  useEffect(() => {
    if (progress) {
      // Animate score updates with bounce effect
      if (teamAScoreRef.current) {
        gsap.fromTo(
          teamAScoreRef.current,
          { scale: 1.3, color: "#00FF94" },
          { scale: 1, color: "#00FF94", duration: 0.5, ease: "elastic.out(1, 0.5)" }
        );
      }
      if (teamBScoreRef.current) {
        gsap.fromTo(
          teamBScoreRef.current,
          { scale: 1.3, color: "#00FF94" },
          { scale: 1, color: "#00FF94", duration: 0.5, ease: "elastic.out(1, 0.5)" }
        );
      }
      if (teamCScoreRef.current) {
        gsap.fromTo(
          teamCScoreRef.current,
          { scale: 1.3, color: "#00FF94" },
          { scale: 1, color: "#00FF94", duration: 0.5, ease: "elastic.out(1, 0.5)" }
        );
      }

      // Animate move indicators with pulse
      const moveRefs = [teamAMoveRef, teamBMoveRef, teamCMoveRef];
      moveRefs.forEach((ref) => {
        if (ref.current) {
          gsap.fromTo(
            ref.current,
            { scale: 0, rotate: -180 },
            { scale: 1, rotate: 0, duration: 0.6, ease: "back.out(2)" }
          );
        }
      });
    }
  }, [progress]);

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
    <div 
      ref={containerRef}
      className="cyber-card p-8"
      data-testid="match-visualizer"
    >
      <div className="text-center mb-6">
        <span className="text-muted-foreground font-mono text-sm">
          MATCH {match.match_number || progress?.match_number || '?'}
        </span>
      </div>

      {/* Three Teams in Horizontal Layout */}
      <div className="grid grid-cols-3 gap-4 items-start mb-8">
        {/* Team A */}
        <div className="text-center">
          <motion.h3 
            className="font-display text-2xl mb-3 truncate"
            animate={{ 
              color: progress?.team_a?.last_move === 'C' ? '#00FF94' : '#FF0055',
              textShadow: progress?.team_a?.last_move === 'C' 
                ? '0 0 20px #00FF94' 
                : '0 0 20px #FF0055'
            }}
            transition={{ duration: 0.3 }}
          >
            {progress?.team_a?.name || match.team_a}
          </motion.h3>
          <div 
            ref={teamAScoreRef}
            className="text-5xl font-display font-black neon-green mb-3" 
            data-testid="team-a-score"
          >
            {progress?.team_a?.score || 0}
          </div>
          {progress && (
            <div className="flex flex-col items-center gap-2">
              <span 
                ref={teamAMoveRef}
                className={`move-icon text-2xl ${progress.team_a?.last_move === 'C' ? 'move-c' : 'move-d'}`}
              >
                {progress.team_a?.last_move || '?'}
              </span>
              <span className="text-xs text-muted-foreground">
                {progress.a_coop_pct}% Coop
              </span>
            </div>
          )}
        </div>

        {/* Team B */}
        <div className="text-center">
          <motion.h3 
            className="font-display text-2xl mb-3 truncate"
            animate={{ 
              color: progress?.team_b?.last_move === 'C' ? '#00FF94' : '#FF0055',
              textShadow: progress?.team_b?.last_move === 'C' 
                ? '0 0 20px #00FF94' 
                : '0 0 20px #FF0055'
            }}
            transition={{ duration: 0.3 }}
          >
            {progress?.team_b?.name || match.team_b}
          </motion.h3>
          <div 
            ref={teamBScoreRef}
            className="text-5xl font-display font-black neon-green mb-3" 
            data-testid="team-b-score"
          >
            {progress?.team_b?.score || 0}
          </div>
          {progress && (
            <div className="flex flex-col items-center gap-2">
              <span 
                ref={teamBMoveRef}
                className={`move-icon text-2xl ${progress.team_b?.last_move === 'C' ? 'move-c' : 'move-d'}`}
              >
                {progress.team_b?.last_move || '?'}
              </span>
              <span className="text-xs text-muted-foreground">
                {progress.b_coop_pct}% Coop
              </span>
            </div>
          )}
        </div>

        {/* Team C */}
        <div className="text-center">
          <motion.h3 
            className="font-display text-2xl mb-3 truncate"
            animate={{ 
              color: progress?.team_c?.last_move === 'C' ? '#00FF94' : '#FF0055',
              textShadow: progress?.team_c?.last_move === 'C' 
                ? '0 0 20px #00FF94' 
                : '0 0 20px #FF0055'
            }}
            transition={{ duration: 0.3 }}
          >
            {progress?.team_c?.name || match.team_c}
          </motion.h3>
          <div 
            ref={teamCScoreRef}
            className="text-5xl font-display font-black neon-green mb-3" 
            data-testid="team-c-score"
          >
            {progress?.team_c?.score || 0}
          </div>
          {progress && (
            <div className="flex flex-col items-center gap-2">
              <span 
                ref={teamCMoveRef}
                className={`move-icon text-2xl ${progress.team_c?.last_move === 'C' ? 'move-c' : 'move-d'}`}
              >
                {progress.team_c?.last_move || '?'}
              </span>
              <span className="text-xs text-muted-foreground">
                {progress.c_coop_pct}% Coop
              </span>
            </div>
          )}
        </div>
      </div>

      {/* VS Indicator */}
      <div className="text-center mb-6">
        <motion.div 
          className="text-4xl font-display font-black"
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <span className="neon-cyan">⚔️ 3-WAY BATTLE ⚔️</span>
        </motion.div>
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
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
};

export default MatchVisualizer;
