import { useEffect, useState } from "react";
import { scoreColor } from "./ui";

function ScoreRing({ value = 0, max = 10, size = 120, label = "/ 10" }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setShown(Number(value) || 0), 80);
    return () => clearTimeout(t);
  }, [value]);

  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(shown, max) / max) * circumference;

  return (
    <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth="10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={scoreColor(value)}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: size * 0.3, fontWeight: 800, lineHeight: 1 }}>{value}</span>
        <span className="muted" style={{ fontSize: 12 }}>{label}</span>
      </div>
    </div>
  );
}

export default ScoreRing;