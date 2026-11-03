import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, logout } from "../auth";
import { alertClass } from "../components/ui";

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
    fetch("/api/questions", {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) =>
        setTopics(
          Array.isArray(data) ? [...new Set(data.map((q) => q.topic))].filter(Boolean) : []
        )
      )
      .catch((err) => console.error(err));
  }, []);

  async function handleSave() {
    setMessage("");
    setSaving(true);
    try {
      const res = await fetch("/api/questions", {
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
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-extrabold" style={{ margin: 0 }}>
          ➕ Add a <span className="gradient-text">question</span>
        </h1>
        <p className="muted" style={{ margin: "4px 0 0" }}>
          Your question will be visible to everyone. A model answer helps the AI give better feedback.
        </p>
      </div>

      <div className="card p-6 fade-in">
        <label className="font-semibold text-sm">The interview question</label>
        <textarea
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. What is the difference between props and state?"
          className="input mt-2"
          style={{ height: 90 }}
        />

        <label className="font-semibold text-sm block mt-4">Topic</label>
        <input
          list="add-topic-options"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. React"
          className="input mt-2"
        />
        <datalist id="add-topic-options">
          {topics.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <div className="flex flex-wrap gap-2 mt-2">
          {topics.slice(0, 8).map((t) => (
            <button key={t} className={topic === t ? "chip active" : "chip"} onClick={() => setTopic(t)}>
              {t}
            </button>
          ))}
        </div>

        <label className="font-semibold text-sm block mt-4">Difficulty</label>
        <div className="flex gap-2 mt-2">
          {["Easy", "Medium", "Hard"].map((d) => (
            <button key={d} className={difficulty === d ? "chip active" : "chip"} onClick={() => setDifficulty(d)}>
              {d}
            </button>
          ))}
        </div>

        <label className="font-semibold text-sm block mt-4">Model answer (optional)</label>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="A short, correct answer the AI can compare with..."
          className="input mt-2"
          style={{ height: 120 }}
        />

        <button
          onClick={handleSave}
          disabled={saving || !title.trim() || !topic.trim()}
          className="btn btn-primary mt-5"
        >
          {saving ? (<><span className="spinner" /> Saving...</>) : "Add question"}
        </button>
        {message && <div className={`${alertClass(message)} mt-3`}>{message}</div>}
      </div>
    </div>
  );
}

export default AddQuestion;