import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getToken, logout } from "../auth";

function Question() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [question, setQuestion] = useState(null);
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`http://localhost:5000/api/questions/${id}`, {
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
        if (data) setQuestion(data);
      })
      .catch(() => setError("Cannot reach the server"));
  }, [id, navigate]);

  async function handleSubmit() {
    setMessage("");
    setSaving(true);
    try {
      const res = await fetch("http://localhost:5000/api/attempts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ questionId: id, answer }),
      });

      if (res.status === 401) {
        logout();
        navigate("/login");
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Something went wrong");
      } else {
        setMessage("Answer saved! ✅");
        setAnswer("");
      }
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

      {error && <p className="text-red-600 mt-4">{error}</p>}

      {question && (
        <div className="mt-4">
          <p className="text-sm text-gray-600 mb-2">
            {question.topic} • {question.difficulty} • {question.company}
          </p>
          <h1 className="text-2xl font-bold">{question.title}</h1>
          <textarea
            className="w-full border rounded p-3 mt-6 h-40"
            placeholder="Type your answer here..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="mt-3 bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {saving ? "Saving..." : "Submit answer"}
          </button>
          {message && <p className="mt-3">{message}</p>}
        </div>
      )}
    </div>
  );
}

export default Question;