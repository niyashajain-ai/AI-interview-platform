import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CountUp from "../components/CountUp";
import { scoreColor, topicIcon } from "../components/ui";
import {
  badgesFor,
  computeXP,
  dayKey,
  getStreak,
  levelInfo,
  levelTitle,
  useStats,
} from "../components/gamify";

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
  const { stats, error } = useStats();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!stats) return;
    const t = setTimeout(() => setReady(true), 150);
    return () => clearTimeout(t);
  }, [stats]);

  const times = stats ? stats.attemptTimes || [] : [];
  const streak = getStreak(times);
  const week = last7Days(times);
  const maxCount = Math.max(1, ...week.map((d) => d.count));
  const xp = stats ? computeXP(stats) : 0;
  const lvl = levelInfo(xp);
  const badges = stats ? badgesFor(stats, streak) : [];
  const earned = badges.filter((b) => b.earned).length;
  const weakest = stats && stats.byTopic.length > 0 ? stats.byTopic[0] : null;

  return (
    <div className="flex flex-col gap-8">
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
        <div className="flex flex-col gap-4">
          <div className="skeleton" style={{ height: 110 }} />
          <div className="skeleton" style={{ height: 110 }} />
        </div>
      )}

      {stats && stats.attempts === 0 && (
        <div className="card p-8 text-center">
          <p className="text-4xl" style={{ margin: 0 }}>🚀</p>
          <p className="font-semibold" style={{ margin: "8px 0 2px" }}>No answers yet</p>
          <p className="muted" style={{ margin: "0 0 14px" }}>
            Answer a question and your level, streak and badges will show up here.
          </p>
          <Link to="/" className="btn btn-primary">Start practicing</Link>
        </div>
      )}

      {stats && stats.attempts > 0 && (
        <>
          <div className="card p-6 flex flex-wrap items-center gap-5 fade-in">
            <span className="level-orb">{lvl.level}</span>
            <div style={{ flex: 1, minWidth: 220 }}>
              <p className="text-xl font-extrabold" style={{ margin: 0 }}>
                Level {lvl.level} · {levelTitle(lvl.level)}
              </p>
              <p className="muted text-sm" style={{ margin: "2px 0 10px" }}>
                {xp} XP total • {lvl.per - lvl.into} XP to the next level
              </p>
              <div className="progress">
                <div style={{ width: ready ? `${lvl.percent}%` : "0%" }} />
              </div>
              <p className="muted text-xs" style={{ margin: "8px 0 0" }}>
                You earn 10 XP for every answer, plus points for your scores.
              </p>
            </div>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <StatCard icon="📝" label="Answers given" value={stats.attempts} delay={0} />
            <StatCard
              icon="⭐"
              label="Average score / 10"
              value={stats.avg_score === null ? null : Number(stats.avg_score)}
              decimals={1}
              delay={60}
            />
            <StatCard icon="🔥" label="Day streak" value={streak} delay={120} />
          </div>

          {weakest && (
            <div
              className="alert alert-info fade-in"
              style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, justifyContent: "space-between" }}
            >
              <span>
                🎯 Focus area: <b>{weakest.topic}</b> (average {weakest.avg_score} / 10)
              </span>
              <Link to="/" className="btn btn-primary btn-sm">Practice now</Link>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card p-6">
              <p className="font-bold" style={{ margin: "0 0 16px" }}>📚 Topics (weakest first)</p>
              {stats.byTopic.slice(0, 6).map((t) => (
                <div key={t.topic} className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold">
                      {topicIcon(t.topic)} {t.topic}
                    </span>
                    <span className="muted">{t.avg_score} / 10</span>
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

            <div className="card p-6">
              <p className="font-bold" style={{ margin: "0 0 16px" }}>📅 Last 7 days</p>
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

          <div>
            <div className="section-head mb-4">
              <h2 className="text-xl font-bold" style={{ margin: 0 }}>🏆 Badges</h2>
              <span className="muted text-sm">{earned} of {badges.length} unlocked</span>
            </div>
            <div className="badge-grid">
              {badges.map((b) => (
                <div key={b.id} className={b.earned ? "achv earned" : "achv locked"}>
                  <div className="achv-icon">{b.icon}</div>
                  <p className="font-bold text-sm" style={{ margin: "6px 0 2px" }}>{b.name}</p>
                  <p className="muted text-xs" style={{ margin: 0 }}>{b.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold" style={{ margin: "0 0 12px" }}>🕘 Recent attempts</h2>
            <div className="flex flex-col gap-2">
              {stats.recent.map((r) => (
                <Link
                  key={r.id}
                  to={`/question/${r.question_id}`}
                  className="flex items-center justify-between gap-3 p-4"
                  style={{ color: "inherit", textDecoration: "none", borderRadius: 14, background: "var(--surface)", border: "1px solid var(--border)" }}
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