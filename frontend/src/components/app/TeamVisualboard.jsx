import { useEffect, useRef, useState } from "react";

const TeamVisualboard = ({
  teams = [],
  currentMatch = null, // { teams: ["A","B","C"] }
  matchProgress = null,
  minimized = false,
}) => {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const timeRef = useRef(0);

  const lastMatchRef = useRef(null);
  const matchStartTimeRef = useRef(null);
  const displayTimeoutRef = useRef(null);

  const [displayedMatch, setDisplayedMatch] = useState(null);

  /* -------------------------------------------
     Match persistence (minimum 5s display)
  ------------------------------------------- */
  useEffect(() => {
    if (displayTimeoutRef.current) {
      clearTimeout(displayTimeoutRef.current);
      displayTimeoutRef.current = null;
    }

    if (currentMatch) {
      matchStartTimeRef.current = Date.now();
      lastMatchRef.current = currentMatch;
      setDisplayedMatch(currentMatch);
    } else if (lastMatchRef.current && matchStartTimeRef.current) {
      const elapsed = Date.now() - matchStartTimeRef.current;
      const minDisplay = 5000;

      if (elapsed < minDisplay) {
        displayTimeoutRef.current = setTimeout(() => {
          setDisplayedMatch(null);
          lastMatchRef.current = null;
          matchStartTimeRef.current = null;
        }, minDisplay - elapsed);
      } else {
        setDisplayedMatch(null);
        lastMatchRef.current = null;
        matchStartTimeRef.current = null;
      }
    }

    return () => {
      if (displayTimeoutRef.current) {
        clearTimeout(displayTimeoutRef.current);
      }
    };
  }, [currentMatch]);

  /* -------------------------------------------
     Canvas Rendering
  ------------------------------------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    const CENTER = { x: width / 2, y: height / 2 };
    const BASE_RADIUS = Math.min(width, height) * 0.4;
    const RADIUS = minimized ? BASE_RADIUS * 0.85 : BASE_RADIUS;

    /* ---- Team positions ---- */
    const teamPositions = teams.map((team, i) => {
      const angle = (i / teams.length) * Math.PI * 2 - Math.PI / 2;
      return {
        x: CENTER.x + Math.cos(angle) * RADIUS,
        y: CENTER.y + Math.sin(angle) * RADIUS,
        team,
        index: i,
      };
    });

    const activeMatch = displayedMatch || currentMatch;
    const activeTeams = activeMatch?.teams?.map(t =>
      typeof t === "string" ? t.toLowerCase() : t
    ) || [];

    /* ---- Connections (supports N-team clashes) ---- */
    const getConnections = () => {
      const connections = [];

      for (let i = 0; i < teamPositions.length; i++) {
        for (let j = i + 1; j < teamPositions.length; j++) {
          const nameA = teamPositions[i].team?.name;
          const nameB = teamPositions[j].team?.name;

          const isActive =
            activeTeams.includes(nameA?.toLowerCase()) &&
            activeTeams.includes(nameB?.toLowerCase());

          connections.push({
            a: i,
            b: j,
            active: isActive,
          });
        }
      }
      return connections;
    };

    /* ---- Drawing helpers ---- */
    const drawConnection = (A, B, phase, active) => {
      if (active) {
        const alpha = 0.75 + 0.25 * Math.abs(Math.sin(phase * 2));
        ctx.strokeStyle = `rgba(255, 80, 80, ${alpha})`;
        ctx.lineWidth = 6;
        ctx.shadowBlur = 25;
        ctx.shadowColor = "rgba(255,80,80,0.9)";
      } else {
        const alpha = 0.15 + 0.25 * Math.abs(Math.sin(phase));
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 6;
        ctx.shadowColor = "rgba(255,255,255,0.3)";
      }

      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    const drawTeam = (pos, team, active=false) => {
      if (active) {
        ctx.shadowBlur = 25;
        ctx.shadowColor = "#FF5050";

        const pulse =
          0.3 + 0.2 * Math.abs(Math.sin(timeRef.current * 0.1));
        ctx.strokeStyle = `rgba(255,80,80,${pulse})`;
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 18, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = active ? "#FF5050" : "#fff";
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#030303";
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;

      if (team && (!minimized || active)) {
        ctx.fillStyle = active ? "#FF5050" : "#fff";
        ctx.font = `bold ${
          minimized ? (active ? 10 : 9) : active ? 13 : 12
        }px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        const label =
          minimized && !active
            ? team.name.substring(0, 4)
            : team.name;

        ctx.fillText(label, pos.x, pos.y + 22);
      }
    };

    /* ---- Animation loop ---- */
    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      if (!teams.length) {
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "20px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Waiting for teams...", CENTER.x, CENTER.y);
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const connections = getConnections();

      connections.forEach((c, i) => {
        drawConnection(
          teamPositions[c.a],
          teamPositions[c.b],
          timeRef.current * 0.08 + i,
          c.active
        );
      });

      teamPositions.forEach((pos) => {
        drawTeam(
          pos,
          pos.team,
          activeTeams.includes(pos.team?.name)
        );
      });

      timeRef.current++;
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [teams, currentMatch, displayedMatch, minimized]);

  const canvasSize = minimized ? 400 : 700;

  return (
    <div className={`cyber-card ${minimized ? "p-1" : "p-4"}`}>
      <div className="text-center mb-1">
        <span className="text-muted-foreground font-display neon-cyan text-xl">
          WAR PLAYGROUND
        </span>
      </div>

      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        style={{
          width: "100%",
          maxWidth: canvasSize,
          margin: "0 auto",
          display: "block",
          background: "transparent",
          transition: "width 0.8s ease, height 0.8s ease",
        }}
      />
    </div>
  );
};

export default TeamVisualboard;
