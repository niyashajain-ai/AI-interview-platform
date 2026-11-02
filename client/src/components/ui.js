export function difficultyBadge(d) {
  if (d === "Easy") return "badge badge-success";
  if (d === "Medium") return "badge badge-warning";
  if (d === "Hard") return "badge badge-danger";
  return "badge badge-muted";
}

const ICONS = {
  JavaScript: "🟨",
  React: "⚛️",
  DSA: "🧮",
  DBMS: "🗄️",
  HR: "🤝",
  OOP: "🧩",
  Java: "☕",
  Programming: "💻",
  "Operating Systems": "🖥️",
  "Web Development": "🌐",
  "System Design": "🏗️",
  "Software Engineering": "🛠️",
};

export function topicIcon(topic) {
  return ICONS[topic] || "💡";
}

export function alertClass(message) {
  return message && message.includes("✅") ? "alert alert-success" : "alert alert-error";
}

export function scoreColor(score) {
  const n = Number(score);
  if (n >= 7) return "var(--success)";
  if (n >= 4) return "var(--warning)";
  return "var(--danger)";
}

export function verdict(score) {
  const n = Number(score);
  if (n >= 8) return "Excellent! 🎉";
  if (n >= 6) return "Good job 👍";
  if (n >= 4) return "Getting there 💪";
  return "Keep practicing 📚";
}