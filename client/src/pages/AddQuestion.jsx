import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getToken, logout } from "../auth";

function AddQuestion() {
  const navigate = useNavigate();
  const [topics, setTopics] = useState([]);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("http://localhost:5000/api/questions", {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setTopics([...new Set(data.map((q) => q.topic))].filter(Boolean)))
      .catch((err) => console.error(err));
  }, []);

  async function handleSave() {
    setMessage("");
    setSaving(true);
    try {
      const res = await fetch("http://localhost:5000/api/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ title, topic, difficulty, answer }),
      });

      if (res.status === 401) {
        logout();
        navigate("/login");
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Something went wrong");
        return;
      }
      setMessage("Question added ✅ You can find it on the home page.");
      setTitle("");
      setAnswer("");
    } catch {
      setMessage("Cannot reach the server");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Link to="/" className="text-blue-600 underline">
        ← Back to questions
      </Link>
      <h1 className="text-2xl font-bold mt-4 mb-2">➕ Add a question</h1>
      <p className="text-sm text-gray-600 mb-4">
        Your question will be visible to everyone using the app. Adding a model
        answer helps the AI give better feedback.
      </p>

      <textarea
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="The interview question"
        className="w-full border rounded p-3 h-24"
      />

      <div className="flex flex-wrap gap-3 mt-3">
        <input
          list="add-topic-options"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Topic, e.g. React"
          className="border rounded px-3 py-2 flex-1 min-w-40"
        />
        <datalist id="add-topic-options">
          {topics.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>
      </div>

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Model answer (optional)"
        className="w-full border rounded p-3 h-32 mt-3"
      />

      <button
        onClick={handleSave}
        disabled={saving || !title.trim() || !topic.trim()}
        className="mt-3 bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {saving ? "Saving..." : "Add question"}
      </button>

      {message && <p className="mt-3">{message}</p>}
    </div>
  );
}

export default AddQuestion;