import { useEffect, useMemo, useState } from "react";

const COLORS = ["#5b5bf0", "#8b5cf6", "#ec4899", "#f59e0b", "#22c55e", "#06b6d4"];

function Confetti({ pieces = 60, duration = 3500 }) {
  const [visible, setVisible] = useState(true);

  const items = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        time: 2 + Math.random() * 1.8,
        dx: (Math.random() - 0.5) * 200,
        color: COLORS[i % COLORS.length],
      })),
    [pieces]
  );

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(t);
  }, [duration]);

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!visible || reduceMotion) return null;

  return (
    <div className="confetti-wrap">
      {items.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDuration: `${p.time}s`,
            animationDelay: `${p.delay}s`,
            "--dx": `${p.dx}px`,
          }}
        />
      ))}
    </div>
  );
}

export default Confetti;