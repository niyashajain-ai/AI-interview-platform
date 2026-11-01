import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getToken, logout } from "../auth";
import CountUp from "../components/CountUp";
import { scoreColor, topicIcon } from "../components/ui";

function dayKey(d) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function getStreak(times) {
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

function last7Days(times) {
  const counts = {};
  times.forEach((t) => {
    const k = dayKey(new Date(t));
    counts[k] = (counts[k] || 0) + 1;
  });
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      label: d.toLocaleDateString(undefined, { weekday: "short" }),
      date: d.toLocaleDateString(),
      count: counts[dayKey(d)] || 0,
    });
  }
  return days;
}

function StatCard({ icon, label, value, decimals = 0, delay = 0 }) {
  return (
    <div className="card p-5 fade-in" style={{ animationDelay: `${delay}ms` }}>
      <div className="text-2xl">{icon}</div>
      <p className="text-3xl font-extrabold" style={{ margin: "8px 0 2px" }}>
        {value === null ? "-" : <CountUp value={value} decimals={decimals} />}
      </p>
      <p className="muted text-sm" style={{ margin: 0 }}>{label}</p>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("http://localhost:5000/api/stats", {
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

  useEffect(() => {
    if (!stats) return;
    const t = setTimeout(() => setReady(true), 150);
    return () => clearTimeout(t);
  }, [stats]);

  const week = stats ? last7Days(stats.attemptTimes || []) : [];
  const maxCount = Math.max(1, ...week.map((d) => d.count));
  const weakest = stats && stats.byTopic.length > 0 ? stats.byTopic[0] : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold" style={{ margin: 0 }}>
          Your <span className="gradient-text">progress</span>
        </h1>
        <p className="muted" style={{ margin: "4px 0 0" }}>
          See how you are doing and where to practice next.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!stats && !error && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="skeleton" style={{ height: 110 }} />
          ))}
        </div>
      )}

      {stats && stats.attempts === 0 && (
        <div className="card p-8 text-center">
          <p className="text-4xl" style={{ margin: 0 }}>🚀</p>
          <p className="font-semibold" style={{ margin: "8px 0 2px" }}>No answers yet</p>
          <p className="muted" style={{ margin: "0 0 14px" }}>
            Answer a question and your progress will show up here.
          </p>
          <Link to="/" className="btn btn-primary">Start practicing</Link>
        </div>
      )}

      {stats && stats.attempts > 0 && (
        <>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard icon="📝" label="Answers given" value={stats.attempts} delay={0} />
            <StatCard icon="🎯" label="Questions practiced" value={stats.questions_practiced} delay={60} />
            <StatCard
              icon="⭐"
              label="Average score / 10"
              value={stats.avg_score === null ? null : Number(stats.avg_score)}
              decimals={1}
              delay={120}
            />
            <StatCard icon="🔥" label="Day streak" value={getStreak(stats.attemptTimes || [])} delay={180} />
          </div>

          {weakest && (
            <div className="alert alert-info fade-in" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
              <span>
                🎯 Focus area: <b>{weakest.topic}</b> (average {weakest.avg_score} / 10). A few more
                answers here will lift your score.
              </span>
              <Link to="/" className="btn btn-primary btn-sm">Practice now</Link>
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="card p-5">
              <p className="font-bold" style={{ margin: "0 0 14px" }}>📚 Topics (weakest first)</p>
              {stats.byTopic.map((t) => (
                <div key={t.topic} className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold">
                      {topicIcon(t.topic)} {t.topic}
                    </span>
                    <span className="muted">
                      {t.avg_score} / 10 • {t.attempts} {t.attempts === 1 ? "answer" : "answers"}
                    </span>
                  </div>
                  <div className="progress">
                    <div
                      style={{
                        width: ready ? `${Number(t.avg_score) * 10}%` : "0%",
                        background: scoreColor(t.avg_score),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="card p-5">
              <p className="font-bold" style={{ margin: "0 0 14px" }}>📅 Last 7 days</p>
              <div className="flex gap-2" style={{ height: 170, alignItems: "flex-end" }}>
                {week.map((d, i) => (
                  <div key={i} className="bar-col" title={`${d.date}: ${d.count} answers`}>
                    <span className="muted text-xs">{d.count}</span>
                    <div
                      className="bar"
                      style={{ height: ready ? `${(d.count / maxCount) * 110 + 4}px` : "4px" }}
                    />
                    <span className="muted text-xs">{d.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card p-5">
            <p className="font-bold" style={{ margin: "0 0 12px" }}>🕘 Recent attempts</p>
            <div className="flex flex-col gap-2">
              {stats.recent.map((r) => (
                <Link
                  key={r.id}
                  to={`/question/${r.question_id}`}
                  className="flex items-center justify-between gap-3 p-3"
                  style={{
                    color: "inherit",
                    textDecoration: "none",
                    borderRadius: 12,
                    background: "var(--surface-2)",
                  }}
                >
                  <span>{r.title}</span>
                  <span className="text-sm whitespace-nowrap">
                    <b style={{ color: scoreColor(r.score) }}>{r.score ?? "-"} / 10</b>
                    <span className="muted"> • {new Date(r.created_at).toLocaleDateString()}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;