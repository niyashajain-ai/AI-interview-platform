import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getToken, getUser, logout } from "../auth";
import Modal from "../components/Modal";
import ScoreRing from "../components/ScoreRing";
import { alertClass, difficultyBadge, topicIcon } from "../components/ui";
import {
  DAILY_GOAL,
  computeXP,
  getStreak,
  greeting,
  levelInfo,
  levelTitle,
  motivation,
  todayCount,
  useStats,
} from "../components/gamify";

const PAGE_SIZE = 10;

function Home() {
  const navigate = useNavigate();
  const user = getUser();
  const firstName = (user?.name || "there").split(" ")[0];
  const { stats } = useStats();

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [search, setSearch] = useState("");
  const [bookmarks, setBookmarks] = useState([]);
  const [savedOnly, setSavedOnly] = useState(false);
  const [popId, setPopId] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showGen, setShowGen] = useState(false);
  const [genTopic, setGenTopic] = useState("");
  const [genDifficulty, setGenDifficulty] = useState("Medium");
  const [generating, setGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState("");

  useEffect(() => {
    fetch("/api/questions", {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => {
        if (res.status === 401) {
          logout();
          navigate("/login");
          return [];
        }
        return res.json();
      })
      .then((data) => setQuestions(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [navigate]);

  useEffect(() => {
    fetch("/api/bookmarks", {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setBookmarks(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [topic, difficulty, search, savedOnly]);

  async function toggleBookmark(questionId) {
    const isSaved = bookmarks.includes(questionId);
    try {
      const res = await fetch(`/api/bookmarks/${questionId}`, {
        method: isSaved ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        setBookmarks(
          isSaved ? bookmarks.filter((b) => b !== questionId) : [...bookmarks, questionId]
        );
        if (!isSaved) {
          setPopId(questionId);
          setTimeout(() => setPopId(null), 450);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleGenerate() {
    setGenMessage("");
    setGenerating(true);
    try {
      const res = await fetch("/api/questions/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ topic: genTopic, difficulty: genDifficulty, count: 3 }),
      });

      if (res.status === 401) {
        logout();
        navigate("/login");
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setGenMessage(data.error || "Something went wrong");
        return;
      }

      const listRes = await fetch("/api/questions", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (listRes.ok) setQuestions(await listRes.json());

      setGenMessage(`Added ${data.added} new questions ✅`);
      setGenTopic("");
    } catch {
      setGenMessage("Cannot reach the server");
    } finally {
      setGenerating(false);
    }
  }

  function clearFilters() {
    setTopic("All");
    setDifficulty("All");
    setSearch("");
    setSavedOnly(false);
  }

  const times = stats ? stats.attemptTimes || [] : [];
  const streak = getStreak(times);
  const today = todayCount(times);
  const xp = stats ? computeXP(stats) : 0;
  const lvl = levelInfo(xp);

  const topics = [...new Set(questions.map((q) => q.topic))].filter(Boolean);
  const term = search.trim().toLowerCase();
  const filtered = questions.filter(
    (q) =>
      (topic === "All" || q.topic === topic) &&
      (difficulty === "All" || q.difficulty === difficulty) &&
      (!savedOnly || bookmarks.includes(q.id)) &&
      (!term ||
        q.title.toLowerCase().includes(term) ||
        (q.company || "").toLowerCase().includes(term))
  );
  const shown = filtered.slice(0, visibleCount);
  const filtersActive = topic !== "All" || difficulty !== "All" || savedOnly || term;

  const qotd =
    questions.length > 0
      ? questions[Math.floor(Date.now() / 86400000) % questions.length]
      : null;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <p className="muted" style={{ margin: 0 }}>{greeting()}</p>
        <h1 className="text-3xl font-extrabold" style={{ margin: "2px 0 6px" }}>
          Hi, {firstName} <span className="wave">👋</span>
        </h1>
        <p className="muted" style={{ margin: 0 }}>{motivation(streak, today)}</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {!stats ? (
          [1, 2, 3].map((n) => <div key={n} className="skeleton" style={{ height: 104 }} />)
        ) : (
          <>
            <div className="card tile fade-in">
              <ScoreRing
                value={Math.min(today, DAILY_GOAL)}
                max={DAILY_GOAL}
                size={72}
                label={`/ ${DAILY_GOAL}`}
                color={today >= DAILY_GOAL ? "var(--success)" : "var(--primary)"}
              />
              <div>
                <p className="font-bold" style={{ margin: 0 }}>Daily goal</p>
                <p className="muted text-sm" style={{ margin: "2px 0 0" }}>
                  {today >= DAILY_GOAL ? "Done for today 🎉" : `${DAILY_GOAL - today} more to go`}
                </p>
              </div>
            </div>

            <div className="card tile fade-in" style={{ animationDelay: "60ms" }}>
              <span className="text-4xl floaty">🔥</span>
              <div>
                <p className="tile-value" style={{ margin: 0 }}>{streak}</p>
                <p className="muted text-sm" style={{ margin: 0 }}>day streak</p>
              </div>
            </div>

            <div className="card tile fade-in" style={{ animationDelay: "120ms" }}>
              <span className="level-orb" style={{ width: 52, height: 52, fontSize: "1.1rem" }}>
                {lvl.level}
              </span>
              <div style={{ flex: 1 }}>
                <p className="font-bold" style={{ margin: 0 }}>
                  Level {lvl.level} · {levelTitle(lvl.level)}
                </p>
                <div className="progress mt-2">
                  <div style={{ width: `${lvl.percent}%` }} />
                </div>
                <p className="muted text-xs" style={{ margin: "4px 0 0" }}>
                  {lvl.into} / {lvl.per} XP
                </p>
              </div>
            </div>
          </>
        )}
      </section>

      {qotd && (
        <section className="hero p-6">
          <p className="text-sm font-semibold" style={{ opacity: 0.85, margin: 0 }}>
            ⭐ QUESTION OF THE DAY
          </p>
          <h2
            className="text-xl font-bold"
            style={{ margin: "8px 0 16px", lineHeight: 1.4, maxWidth: 620 }}
          >
            {qotd.title}
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <Link to={`/question/${qotd.id}`} className="btn btn-light">
              Answer it →
            </Link>
            <span className="badge" style={{ background: "rgba(255,255,255,.2)", color: "#fff" }}>
              {topicIcon(qotd.topic)} {qotd.topic} • {qotd.difficulty}
            </span>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <div className="section-head">
          <h2 className="text-xl font-bold" style={{ margin: 0 }}>Practice</h2>
          <div className="flex gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowGen(true)}>
              ✨ Generate with AI
            </button>
            <Link to="/add-question" className="btn btn-ghost btn-sm">
              ➕ Add
            </Link>
          </div>
        </div>

        <div className="toolbar">
          <input
            className="input grow"
            placeholder="🔍 Search questions or companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="input" value={topic} onChange={(e) => setTopic(e.target.value)}>
            <option value="All">All topics</option>
            {topics.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            className="input"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="All">Any difficulty</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
          <button className={savedOnly ? "chip active" : "chip"} onClick={() => setSavedOnly(!savedOnly)}>
            ⭐ Saved
          </button>
          {filtersActive && (
            <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
              Clear
            </button>
          )}
        </div>

        {!loading && (
          <p className="muted text-sm" style={{ margin: 0 }}>
            {filtered.length} {filtered.length === 1 ? "question" : "questions"}
          </p>
        )}

        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="skeleton" style={{ height: 76 }} />
            ))}
          </div>
        )}

        {!loading && (
          <div className="flex flex-col gap-3">
            {shown.map((q, i) => (
              <div
                key={q.id}
                className="row-card fade-in"
                style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
              >
                <Link to={`/question/${q.id}`} className="row-main">
                  <span className="row-icon">{topicIcon(q.topic)}</span>
                  <span className="row-text">
                    <span className="row-title">{q.title}</span>
                    <span className="row-meta">
                      <span className={difficultyBadge(q.difficulty)}>{q.difficulty}</span>
                      <span>{q.topic}</span>
                      {q.company && <span>• {q.company}</span>}
                    </span>
                  </span>
                </Link>
                <button
                  onClick={() => toggleBookmark(q.id)}
                  className={popId === q.id ? "icon-btn star-pop" : "icon-btn"}
                  title={bookmarks.includes(q.id) ? "Remove bookmark" : "Bookmark this question"}
                >
                  {bookmarks.includes(q.id) ? "⭐" : "☆"}
                </button>
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length > shown.length && (
          <button
            className="btn btn-ghost"
            style={{ alignSelf: "center" }}
            onClick={() => setVisibleCount(visibleCount + PAGE_SIZE)}
          >
            Show more ({filtered.length - shown.length} left)
          </button>
        )}

        {!loading && filtered.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-4xl" style={{ margin: 0 }}>🔎</p>
            <p className="font-semibold" style={{ margin: "8px 0 2px" }}>No questions found</p>
            <p className="muted" style={{ margin: 0 }}>
              Try a different filter, or generate new questions with AI.
            </p>
          </div>
        )}
      </section>

      {showGen && (
        <Modal title="✨ Generate questions with AI" onClose={() => setShowGen(false)}>
          <p className="muted text-sm" style={{ marginTop: 0 }}>
            Type a topic and the AI writes 3 new questions with model answers.
          </p>
          <input
            list="topic-options"
            value={genTopic}
            onChange={(e) => setGenTopic(e.target.value)}
            placeholder="Topic, e.g. React"
            className="input"
          />
          <datalist id="topic-options">
            {topics.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
          <div className="flex gap-2 mt-3">
            {["Easy", "Medium", "Hard"].map((d) => (
              <button
                key={d}
                className={genDifficulty === d ? "chip active" : "chip"}
                onClick={() => setGenDifficulty(d)}
              >
                {d}
              </button>
            ))}
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating || !genTopic.trim()}
            className="btn btn-primary mt-4"
            style={{ width: "100%" }}
          >
            {generating ? (
              <>
                <span className="spinner" /> Generating...
              </>
            ) : (
              "Generate 3 questions"
            )}
          </button>
          {genMessage && <div className={`${alertClass(genMessage)} mt-3`}>{genMessage}</div>}
          <p className="muted text-xs mt-3" style={{ marginBottom: 0 }}>
            AI-made questions can have mistakes, so double-check the answers.
          </p>
        </Modal>
      )}
    </div>
  );
}

export default Home;