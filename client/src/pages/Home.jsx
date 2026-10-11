import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getToken, getUser, logout } from "../auth";

function Home() {
  const navigate = useNavigate();
  const user = getUser();
  const [questions, setQuestions] = useState([]);
  const [topic, setTopic] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [bookmarks, setBookmarks] = useState([]);
  const [savedOnly, setSavedOnly] = useState(false);

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
      .then((data) => setQuestions(data))
      .catch((err) => console.error(err));
  }, [navigate]);

  useEffect(() => {
    fetch("http://localhost:5000/api/bookmarks", {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setBookmarks(data))
      .catch((err) => console.error(err));
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
  }
  async function toggleBookmark(questionId) {
    const isSaved = bookmarks.includes(questionId);
    try {
      const res = await fetch(`http://localhost:5000/api/bookmarks/${questionId}`, {
        method: isSaved ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        setBookmarks(
          isSaved
            ? bookmarks.filter((b) => b !== questionId)
            : [...bookmarks, questionId]
        );
      }
    } catch (err) {
      console.error(err);
    }
  }
  const topics = [...new Set(questions.map((q) => q.topic))].filter(Boolean);
  const difficulties = [...new Set(questions.map((q) => q.difficulty))].filter(Boolean);

  const visibleQuestions = questions.filter(
    (q) =>
      (topic === "All" || q.topic === topic) &&
      (difficulty === "All" || q.difficulty === difficulty) &&
      (!savedOnly || bookmarks.includes(q.id))
  );

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">AI Interview Prep</h1>
        <div className="flex items-center gap-3">
          <span>Hi, {user?.name}</span>
          <button onClick={handleLogout} className="border rounded px-3 py-1 hover:bg-gray-100">
            Log out
          </button>
        </div>
      </div>
      <div className="flex gap-3 mb-4">
        <select

          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="All">All topics</option>
          {topics.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="All">All difficulties</option>
          {difficulties.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={savedOnly}
            onChange={(e) => setSavedOnly(e.target.checked)}
          />
          Saved only
        </label>
      </div>

      {visibleQuestions.map((q) => (
        <div
          key={q.id}
          className="flex items-center border rounded-lg mb-3 shadow-sm hover:bg-gray-50"
        >
          <Link to={`/question/${q.id}`} className="block flex-1 p-4">
            <h3 className="font-semibold">{q.title}</h3>
            <p className="text-sm text-gray-600">
              {q.topic} • {q.difficulty} • {q.company}
            </p>
          </Link>
          <button
            onClick={() => toggleBookmark(q.id)}
            className="text-2xl px-4"
            title={bookmarks.includes(q.id) ? "Remove bookmark" : "Bookmark this question"}
          >
            {bookmarks.includes(q.id) ? "⭐" : "☆"}
          </button>
        </div>
      ))}
    </div>
  );
}

export default Home;