import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, logout } from "../auth";

export const DAILY_GOAL = 3;

const TITLES = ["Rookie", "Learner", "Challenger", "Pro", "Expert", "Legend"];

export function dayKey(d) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function getStreak(times) {
  const days = new Set(times.map((t) => dayKey(new Date(t))));
  let streak = 0;
  const day = new Date();
  if (!days.has(dayKey(day))) day.setDate(day.getDate() - 1);
  while (days.has(dayKey(day))) {
    streak++;
    day.setDate(day.getDate() - 1);
  }
  return streak;
}

export function todayCount(times) {
  const key = dayKey(new Date());
  return times.filter((t) => dayKey(new Date(t)) === key).length;
}

export function computeXP(stats) {
  const byTopic = stats.byTopic || [];
  const scorePoints = byTopic.reduce(
    (sum, t) => sum + Number(t.avg_score) * t.attempts,
    0
  );
  return Math.round((stats.attempts || 0) * 10 + scorePoints);
}

export function levelInfo(xp) {
  const per = 100;
  const level = Math.floor(xp / per) + 1;
  const into = xp % per;
  return { level, into, per, percent: (into / per) * 100 };
}

export function levelTitle(level) {
  return TITLES[Math.min(level - 1, TITLES.length - 1)];
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function motivation(streak, today) {
  if (today >= DAILY_GOAL) return "Goal reached today. Amazing work! 🎉";
  if (today > 0) {
    const left = DAILY_GOAL - today;
    return `${left} more answer${left === 1 ? "" : "s"} to hit today's goal.`;
  }
  if (streak > 0) return `Keep your ${streak}-day streak alive: answer one question today.`;
  return "Answer a question today to start your streak.";
}

export function badgesFor(stats, streak) {
  const attempts = stats.attempts || 0;
  const avg = Number(stats.avg_score) || 0;
  const topics = (stats.byTopic || []).length;
  return [
    { id: "first", icon: "🌱", name: "First step", desc: "Answer your first question", earned: attempts >= 1 },
    { id: "five", icon: "🚀", name: "On a roll", desc: "Give 5 answers", earned: attempts >= 5 },
    { id: "twentyfive", icon: "🏅", name: "Dedicated", desc: "Give 25 answers", earned: attempts >= 25 },
    { id: "streak3", icon: "🔥", name: "Hot streak", desc: "Practice 3 days in a row", earned: streak >= 3 },
    { id: "streak7", icon: "⚡", name: "Week warrior", desc: "Practice 7 days in a row", earned: streak >= 7 },
    { id: "sharp", icon: "🧠", name: "Sharp mind", desc: "Average score 7+ (5 answers)", earned: attempts >= 5 && avg >= 7 },
    { id: "explorer", icon: "🧭", name: "Explorer", desc: "Practice 4 different topics", earned: topics >= 4 },
  ];
}

export function useStats() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/stats", {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(async (res) => {
        if (res.status === 401) {
          logout();
          navigate("/login");
          return null;
        }
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Something went wrong");
          return null;
        }
        return data;
      })
      .then((data) => {
        if (data) setStats(data);
      })
      .catch(() => setError("Cannot reach the server"));
  }, [navigate]);

  return { stats, error };
}