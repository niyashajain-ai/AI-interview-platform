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
  const [review, setReview] = useState(null);
  const [note, setNote] = useState("");
  const [noteMessage, setNoteMessage] = useState("");

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

  useEffect(() => {
    fetch(`http://localhost:5000/api/notes/${id}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => (res.ok ? res.json() : { content: "" }))
      .then((data) => setNote(data.content))
      .catch((err) => console.error(err));
  }, [id]);

  async function saveNote() {
    setNoteMessage("");
    try {
      const res = await fetch(`http://localhost:5000/api/notes/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ content: note }),
      });
      setNoteMessage(res.ok ? "Note saved ✅" : "Could not save the note");
    } catch {
      setNoteMessage("Cannot reach the server");
    }
  }

  async function handleSubmit() {
    setMessage("");
    setReview(null);
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
      } else if (data.review) {
        setReview(data.review);
      } else {
        setMessage(
          "Your answer was saved, but the AI review failed: " +
          (data.aiError || "please try again in a minute")
        );
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
            {saving ? "AI is reviewing your answer..." : "Submit answer"}
          </button>
          {message && <p className="mt-3">{message}</p>}
          {review && (
            <div className="mt-6 border rounded p-4 bg-gray-50">
              <p className="text-xl font-bold">Score: {review.score} / 10</p>

              <h3 className="font-semibold mt-4">👍 What was good</h3>
              <p>{review.good}</p>

              <h3 className="font-semibold mt-4">⚠️ What to improve</h3>
              <p>{review.wrong}</p>

              <h3 className="font-semibold mt-4">✨ A better answer</h3>
              <p>{review.better_answer}</p>

              <h3 className="font-semibold mt-4">❓ Follow-up question</h3>
              <p>{review.follow_up}</p>
            </div>
          )}
          <div className="mt-8">
            <h3 className="font-semibold">📝 My notes</h3>
            <textarea
              className="w-full border rounded p-3 mt-2 h-28"
              placeholder="Write anything you want to remember about this question..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button
              onClick={saveNote}
              className="mt-2 border border-blue-600 text-blue-600 px-4 py-2 rounded"
            >
              Save note
            </button>
            {noteMessage && <p className="mt-2">{noteMessage}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default Question;