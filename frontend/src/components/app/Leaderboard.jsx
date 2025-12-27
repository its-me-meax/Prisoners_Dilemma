import {Trophy, Crown} from "lucide-react";
import { motion } from "framer-motion";
import { ScrollArea } from "../ui/scroll-area";

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
export default Leaderboard;