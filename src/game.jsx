import React, { useState, useEffect } from "react";
import "./Game.css";

/**
 * Game.jsx (fixed)
 * - setRerender used to force re-render after mutating LEVELS
 * - exit locked -> unlocks after all power-ups collected & answered
 * - power-ups disappear when collected
 * - WASD + Arrow keys movement (no holding)
 * - neon design compatible with provided CSS
 */

// helper to get a random exit position inside 300x300 room (leave margins)
const randomExit = () => {
  const margin = 40;
  const max = 300 - margin;
  return {
    x: Math.floor(Math.random() * (max - margin)) + margin,
    y: Math.floor(Math.random() * (max - margin)) + margin
  };
};

// LEVELS TEMPLATE (random exit positions assigned at module load)
const LEVELS_TEMPLATE = [
  {
    exit: { ...randomExit(), locked: true, code: "unlockDoor()" },
    obstacles: [
      { x: 90, y: 100, w: 60, h: 18 },
      { x: 160, y: 200, w: 18, h: 60 }
    ],
    enemies: [{ x: 200, y: 80, w: 28, h: 28 }],
    moving: [],
    powerups: [
      {
        id: "l1p1",
        type: "time",
        x: 40,
        y: 220,
        w: 26,
        h: 26,
        question: "What is 2 + 3 in JavaScript?",
        answer: "5",
        collected: false
      },
      {
        id: "l1p2",
        type: "life",
        x: 220,
        y: 30,
        w: 26,
        h: 26,
        question: "Which keyword declares a variable in JS?",
        answer: "let",
        collected: false
      }
    ]
  },
  {
    exit: { ...randomExit(), locked: true, code: "unlockDoor()" },
    obstacles: [{ x: 50, y: 50, w: 140, h: 18 }],
    enemies: [{ x: 200, y: 150, w: 28, h: 28 }],
    moving: [{ x: 150, y: 100, w: 40, h: 16, dx: 2 }],
    powerups: [
      {
        id: "l2p1",
        type: "time",
        x: 120,
        y: 200,
        w: 26,
        h: 26,
        question: "Which operator is strict equality in JS?",
        answer: "===",
        collected: false
      },
      {
        id: "l2p2",
        type: "life",
        x: 60,
        y: 180,
        w: 26,
        h: 26,
        question: "What is 1 + 1?",
        answer: "2",
        collected: false
      }
    ]
  }
];

// Clone template once so we can mutate collected flags safely
const LEVELS = JSON.parse(JSON.stringify(LEVELS_TEMPLATE));

export default function Game() {
  const [levelIndex, setLevelIndex] = useState(0);
  const level = LEVELS[levelIndex];

  const [player, setPlayer] = useState({ x: 10, y: 10 });
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameOver, setGameOver] = useState(false);

  // question modal state
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [answerInput, setAnswerInput] = useState("");

  // small rerender state used when mutating LEVELS
  const [, setRerender] = useState(0);

  // Timer
  useEffect(() => {
    if (gameOver || activeQuestion) return;
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onDeath();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [gameOver, activeQuestion]);

  // Moving obstacles
  useEffect(() => {
    const mv = setInterval(() => {
      const L = level.moving;
      for (let m of L) {
        m.x += m.dx;
        if (m.x <= 0 || m.x + m.w >= 300) m.dx *= -1;
      }
      // force re-render
      setRerender(r => r + 1);
    }, 50);
    return () => clearInterval(mv);
  }, [levelIndex]);

  // hitbox helper
  const hit = (p, o) =>
    p.x < o.x + o.w && p.x + 30 > o.x && p.y < o.y + o.h && p.y + 30 > o.y;

  // detect powerup at position
  const detectPowerup = (p) => {
    for (let pu of level.powerups) {
      if (!pu.collected && hit(p, pu)) return pu;
    }
    return null;
  };

  // movement handler (WASD + arrows) — ignore repeated key events
  useEffect(() => {
    const step = 20;
    const handleKey = (e) => {
      if (e.repeat) return;
      if (gameOver || activeQuestion) return;

      const k = e.key.toLowerCase();
      let nx = player.x;
      let ny = player.y;

      if (k === "arrowup" || k === "w") ny -= step;
      if (k === "arrowdown" || k === "s") ny += step;
      if (k === "arrowleft" || k === "a") nx -= step;
      if (k === "arrowright" || k === "d") nx += step;

      // clamp
      nx = Math.max(0, Math.min(270, nx));
      ny = Math.max(0, Math.min(270, ny));

      const newP = { x: nx, y: ny };

      // enemy collision => onDeath
      const enemyHit = level.enemies.some(en => hit(newP, en));
      if (enemyHit) {
        onDeath();
        return;
      }

      // obstacle or moving block => block movement
      const obstacleHit = level.obstacles.some(ob => hit(newP, ob)) || level.moving.some(mov => hit(newP, mov));
      if (obstacleHit) {
        return;
      }

      // powerup check: open modal for the found pu (do NOT mark collected until answered correctly)
      const pu = detectPowerup(newP);
      if (pu) {
        setActiveQuestion(pu);
        setAnswerInput("");
        return;
      }

      // exit check
      const ex = level.exit;
      if (hit(newP, { x: ex.x, y: ex.y, w: 32, h: 32 })) {
        const remaining = level.powerups.filter(p => !p.collected).length;
        if (ex.locked) {
          if (remaining > 0) {
            alert(`Door is locked. Collect all power-ups first (${remaining} left).`);
            return;
          } else {
            // prompt code to unlock
            const code = prompt("Enter code to unlock door:");
            if (code === ex.code) {
              ex.locked = false;
              setRerender(r => r + 1);
              alert("Door unlocked!");
              return;
            } else {
              alert("Wrong code.");
              return;
            }
          }
        } else {
          // unlocked: advance or finish
          if (levelIndex + 1 < LEVELS.length) {
            setLevelIndex(levelIndex + 1);
            setPlayer({ x: 10, y: 10 });
            setTimeLeft(30);
            return;
          } else {
            alert("You finished all levels! 🎉");
            return;
          }
        }
      }

      // finally move player
      setPlayer(newP);
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [player, levelIndex, gameOver, activeQuestion, timeLeft]);

  // death handling
  const onDeath = () => {
    setLives(l => {
      const next = Math.max(0, l - 1);
      if (next === 0) setGameOver(true);
      return next;
    });
    setPlayer({ x: 10, y: 10 });
    setTimeLeft(30);
  };

  // submit answer for activeQuestion
  const submitAnswer = () => {
    if (!activeQuestion) return;

    const correct = String(answerInput).trim().toLowerCase() === String(activeQuestion.answer).trim().toLowerCase();
    if (correct) {
      // apply power-up
      if (activeQuestion.type === "time") setTimeLeft(t => t + 10);
      if (activeQuestion.type === "life") setLives(l => l + 1);

      // mark collected
      for (let p of level.powerups) {
        if (p.id === activeQuestion.id) {
          p.collected = true;
          break;
        }
      }

      // if all collected → unlock exit
      const remaining = level.powerups.filter(p => !p.collected).length;
      if (remaining === 0) {
        level.exit.locked = false;
        setRerender(r => r + 1);
      }

      alert("Correct! Power-up applied.");
    } else {
      alert("Wrong answer.");
    }

    setActiveQuestion(null);
    setAnswerInput("");
  };

  // render
  return (
    <div className="neon-game-root">
      <h1 className="neon-title">Escape The Program</h1>
      <div className="hud">
        <div className="hud-item">❤️ {lives}</div>
        <div className="hud-item">⏳ {timeLeft}s</div>
        <div className="hud-item">Level {levelIndex + 1}</div>
      </div>

      <div className="room neon-room">
        {/* Player */}
        <div
          className="player neon-player"
          style={{ left: player.x, top: player.y }}
        />

        {/* Obstacles */}
        {level.obstacles.map((o, i) => (
          <div
            key={`obs-${i}`}
            className="obstacle"
            style={{ left: o.x, top: o.y, width: o.w, height: o.h }}
          />
        ))}

        {/* Moving */}
        {level.moving.map((m, i) => (
          <div
            key={`mov-${i}`}
            className="moving"
            style={{ left: m.x, top: m.y, width: m.w, height: m.h }}
          />
        ))}

        {/* Enemies */}
        {level.enemies.map((e, i) => (
          <div
            key={`en-${i}`}
            className="enemy"
            style={{ left: e.x, top: e.y, width: e.w, height: e.h }}
          />
        ))}

        {/* Power-ups */}
        {level.powerups.filter(p => !p.collected).map(p => (
          <div
            key={p.id}
            className={`powerup ${p.type}`}
            style={{ left: p.x, top: p.y, width: p.w, height: p.h }}
          />
        ))}

        {/* Exit (always in front) */}
        <div
          className={`exit ${level.exit.locked ? "locked" : "unlocked"}`}
          style={{ left: level.exit.x, top: level.exit.y }}
        >
          {level.exit.locked ? "🔒" : "🚪"}
        </div>
      </div>

      {/* Active question modal */}
      {activeQuestion && (
        <>
          <div className="modal-overlay" />
          <div className="question-modal">
            <p className="question-text">{activeQuestion.question}</p>
            <input
              value={answerInput}
              onChange={e => setAnswerInput(e.target.value)}
              placeholder="Type answer..."
            />
            <div style={{ marginTop: 10 }}>
              <button onClick={submitAnswer}>Submit</button>
              <button onClick={() => { setActiveQuestion(null); setAnswerInput(""); }} style={{ marginLeft: 8 }}>
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      {/* Game Over */}
      {gameOver && (
        <>
          <div className="modal-overlay" />
          <div className="question-modal">
            <h2>GAME OVER</h2>
            <p>You ran out of lives. Go Back To Module</p>
            <button onClick={() => window.location.reload()}>Restart</button>
          </div>
        </>
      )}
    </div>
  );
}
