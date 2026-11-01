import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getToken, getUser, logout } from "../auth";
import { alertClass, difficultyBadge, topicIcon } from "../components/ui";

function Home() {
  const navigate = useNavigate();
  const user = getUser();
  const firstName = (user?.name || "there").split(" ")[0];

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [search, setSearch] = useState("");
  const [bookmarks, setBookmarks] = useState([]);
  const [savedOnly, setSavedOnly] = useState(false);
  const [popId, setPopId] = useState(null);
  const [showGen, setShowGen] = useState(false);
  const [genTopic, setGenTopic] = useState("");
  const [genDifficulty, setGenDifficulty] = useState("Medium");
  const [generating, setGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState("");

  useEffect(() => {
    fetch("http://localhost:5000/api/questions", {
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
    fetch("http://localhost:5000/api/bookmarks", {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setBookmarks(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err));
  }, []);

  async function toggleBookmark(questionId) {
    const isSaved = bookmarks.includes(questionId);
    try {
      const res = await fetch(`http://localhost:5000/api/bookmarks/${questionId}`, {
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
      const res = await fetch("http://localhost:5000/api/questions/generate", {
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

      const listRes = await fetch("http://localhost:5000/api/questions", {
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

  const topics = [...new Set(questions.map((q) => q.topic))].filter(Boolean);
  const difficulties = ["Easy", "Medium", "Hard"].filter((d) =>
    questions.some((q) => q.difficulty === d)
  );

  const term = search.trim().toLowerCase();
  const visibleQuestions = questions.filter(
    (q) =>
      (topic === "All" || q.topic === topic) &&
      (difficulty === "All" || q.difficulty === difficulty) &&
      (!savedOnly || bookmarks.includes(q.id)) &&
      (!term ||
        q.title.toLowerCase().includes(term) ||
        (q.company || "").toLowerCase().includes(term))
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="hero p-6 sm:p-8">
        <p style={{ opacity: 0.85, margin: 0 }}>Welcome back</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold" style={{ margin: "4px 0 8px" }}>
          Hi, {firstName} 👋
        </h1>
        <p style={{ opacity: 0.9, maxWidth: 520, margin: 0 }}>
          Practice interview questions, get instant AI feedback, and watch your score grow.
        </p>
        <div className="flex flex-wrap gap-3 mt-5">
          <Link to="/mock/hr" className="btn btn-light">🎤 Start HR mock</Link>
          <Link to="/mock/company" className="btn btn-outline-light">🏢 Company mock</Link>
          <Link to="/dashboard" className="btn btn-outline-light">📊 My progress</Link>
        </div>
        <div className="flex flex-wrap gap-2 mt-6">
          <span className="badge" style={{ background: "rgba(255,255,255,.18)", color: "#fff" }}>
            📚 {questions.length} questions
          </span>
          <span className="badge" style={{ background: "rgba(255,255,255,.18)", color: "#fff" }}>
            🏷️ {topics.length} topics
          </span>
          <span className="badge" style={{ background: "rgba(255,255,255,.18)", color: "#fff" }}>
            ⭐ {bookmarks.length} saved
          </span>
        </div>
      </section>

      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-bold" style={{ margin: 0 }}>✨ Generate questions with AI</p>
            <p className="muted text-sm" style={{ margin: "2px 0 0" }}>
              Type a topic and the AI writes 3 new questions with model answers.
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowGen(!showGen)}>
            {showGen ? "Hide" : "Open"}
          </button>
        </div>

        {showGen && (
          <div className="fade-in mt-4">
            <div className="flex flex-wrap gap-3">
              <input
                list="topic-options"
                value={genTopic}
                onChange={(e) => setGenTopic(e.target.value)}
                placeholder="Topic, e.g. React"
                className="input flex-1"
                style={{ minWidth: 180 }}
              />
              <datalist id="topic-options">
                {topics.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
              <div className="flex gap-2">
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
                className="btn btn-primary"
              >
                {generating ? (
                  <>
                    <span className="spinner" /> Generating...
                  </>
                ) : (
                  "Generate 3 questions"
                )}
              </button>
            </div>
            {genMessage && <div className={`${alertClass(genMessage)} mt-3`}>{genMessage}</div>}
            <p className="muted text-xs mt-2" style={{ marginBottom: 0 }}>
              AI-made questions can have mistakes, so double-check the answers.
            </p>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <input
          className="input"
          placeholder="🔍 Search questions or companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <button
            className={topic === "All" ? "chip active" : "chip"}
            onClick={() => setTopic("All")}
          >
            All topics
          </button>
          {topics.map((t) => (
            <button
              key={t}
              className={topic === t ? "chip active" : "chip"}
              onClick={() => setTopic(t)}
            >
              {topicIcon(t)} {t}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            className={difficulty === "All" ? "chip active" : "chip"}
            onClick={() => setDifficulty("All")}
          >
            Any difficulty
          </button>
          {difficulties.map((d) => (
            <button
              key={d}
              className={difficulty === d ? "chip active" : "chip"}
              onClick={() => setDifficulty(d)}
            >
              {d}
            </button>
          ))}
          <button
            className={savedOnly ? "chip active" : "chip"}
            onClick={() => setSavedOnly(!savedOnly)}
          >
            ⭐ Saved only
          </button>
          <span className="muted text-sm" style={{ marginLeft: "auto" }}>
            Showing {visibleQuestions.length} of {questions.length}
          </span>
        </div>
      </section>

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="skeleton" style={{ height: 120 }} />
          ))}
        </div>
      )}

      {!loading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {visibleQuestions.map((q, i) => (
            <div
              key={q.id}
              className="card card-hover fade-in relative"
              style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
            >
              <Link
                to={`/question/${q.id}`}
                className="block p-5"
                style={{ color: "inherit", textDecoration: "none", paddingRight: 60 }}
              >
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="badge badge-primary">
                    {topicIcon(q.topic)} {q.topic}
                  </span>
                  <span className={difficultyBadge(q.difficulty)}>{q.difficulty}</span>
                </div>
                <h3 className="font-semibold" style={{ margin: 0, lineHeight: 1.4 }}>
                  {q.title}
                </h3>
                {q.company && (
                  <p className="muted text-sm" style={{ margin: "10px 0 0" }}>
                    🏢 {q.company}
                  </p>
                )}
              </Link>
              <button
                onClick={() => toggleBookmark(q.id)}
                className={popId === q.id ? "star-btn star-pop" : "star-btn"}
                title={bookmarks.includes(q.id) ? "Remove bookmark" : "Bookmark this question"}
              >
                {bookmarks.includes(q.id) ? "⭐" : "☆"}
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && visibleQuestions.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-4xl" style={{ margin: 0 }}>🔎</p>
          <p className="font-semibold" style={{ margin: "8px 0 2px" }}>No questions found</p>
          <p className="muted" style={{ margin: 0 }}>
            Try a different filter, or generate new questions with AI.
          </p>
        </div>
      )}
    </div>
  );
}

export default Home;