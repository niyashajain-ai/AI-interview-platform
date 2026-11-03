import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getToken, logout } from "../auth";
import Confetti from "../components/Confetti";
import ScoreRing from "../components/ScoreRing";
import { alertClass, difficultyBadge, topicIcon, verdict } from "../components/ui";

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
  const [notesOpen, setNotesOpen] = useState(false);
  const reviewRef = useRef(null);

  useEffect(() => {
    setQuestion(null);
    setReview(null);
    setAnswer("");
    setMessage("");
    setError("");

    fetch(`/api/questions/${id}`, {
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
    setNotesOpen(false);
    setNoteMessage("");
    fetch(`/api/notes/${id}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => (res.ok ? res.json() : { content: "" }))
      .then((data) => {
        setNote(data.content || "");
        if (data.content) setNotesOpen(true);
      })
      .catch((err) => console.error(err));
  }, [id]);

  useEffect(() => {
    if (review && reviewRef.current) {
      reviewRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [review]);

  async function handleSubmit() {
    setMessage("");
    setReview(null);
    setSaving(true);
    try {
      const res = await fetch("/api/attempts", {
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

  async function saveNote() {
    setNoteMessage("");
    try {
      const res = await fetch(`/api/notes/${id}`, {
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

  return (
    <div className="flex flex-col gap-6" style={{ maxWidth: 760, margin: "0 auto" }}>
      <Link to="/" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }}>
        ← All questions
      </Link>

      {error && <div className="alert alert-error">{error}</div>}
      {!question && !error && <div className="skeleton" style={{ height: 140 }} />}

      {question && (
        <div className="card p-6 fade-in">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="badge badge-primary">
              {topicIcon(question.topic)} {question.topic}
            </span>
            <span className={difficultyBadge(question.difficulty)}>{question.difficulty}</span>
            {question.company && <span className="badge badge-muted">🏢 {question.company}</span>}
          </div>
          <h1 className="text-2xl font-extrabold" style={{ margin: 0, lineHeight: 1.35 }}>
            {question.title}
          </h1>
          {question.link && (
            <div className="mt-4">
              <a href={question.link} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                Open the full problem on Codeforces ↗
              </a>
              <p className="muted text-sm" style={{ margin: "8px 0 0" }}>
                Read the problem there, then explain your approach in words below.
              </p>
            </div>
          )}
        </div>
      )}

      {question && (
        <div className="card p-6 fade-in">
          <p className="font-bold" style={{ margin: "0 0 10px" }}>✍️ Your answer</p>
          <textarea
            className="input"
            style={{ height: 190 }}
            placeholder="Type your answer here... (Ctrl + Enter to submit)"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && answer.trim() && !saving) {
                handleSubmit();
              }
            }}
          />
          <div className="flex items-center justify-between gap-3 mt-3">
            <span className="muted text-sm">{answer.length} characters</span>
            <button onClick={handleSubmit} disabled={saving || !answer.trim()} className="btn btn-primary">
              {saving ? (
                <>
                  <span className="spinner" /> AI is reviewing...
                </>
              ) : (
                "Submit answer 🚀"
              )}
            </button>
          </div>
          {message && <div className={`${alertClass(message)} mt-3`}>{message}</div>}
        </div>
      )}

      {saving && (
        <div className="card p-5 text-center fade-in">
          <p style={{ margin: 0 }}>🤖 The AI is reading your answer</p>
          <div className="dots muted">
            <span>●</span> <span>●</span> <span>●</span>
          </div>
        </div>
      )}

      {review && (
        <div ref={reviewRef} className="card p-6 fade-in" style={{ scrollMarginTop: 120 }}>
          {Number(review.score) >= 8 && <Confetti />}
          <div className="flex flex-wrap items-center gap-5 mb-5">
            <ScoreRing value={review.score} />
            <div>
              <p className="text-xl font-extrabold" style={{ margin: 0 }}>
                {verdict(review.score)}
              </p>
              <p className="muted" style={{ margin: "4px 0 0" }}>Here is your AI feedback</p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="review-box review-good"><h4>👍 What was good</h4><p>{review.good}</p></div>
            <div className="review-box review-bad"><h4>⚠️ What to improve</h4><p>{review.wrong}</p></div>
            <div className="review-box review-better"><h4>✨ A better answer</h4><p>{review.better_answer}</p></div>
            <div className="review-box review-follow"><h4>❓ Follow-up question</h4><p>{review.follow_up}</p></div>
          </div>
          <div className="flex flex-wrap gap-3 mt-5">
            <Link to="/" className="btn btn-primary">More questions →</Link>
            <Link to="/dashboard" className="btn btn-ghost">📊 My progress</Link>
          </div>
        </div>
      )}

      {question && (
        <div className="card fade-in" style={{ overflow: "hidden" }}>
          <button
            onClick={() => setNotesOpen(!notesOpen)}
            className="w-full flex items-center justify-between p-5"
            style={{ background: "transparent", border: "none", color: "inherit", font: "inherit", cursor: "pointer" }}
          >
            <span className="font-bold">📝 My notes {note ? "•" : ""}</span>
            <span className="muted">{notesOpen ? "▲" : "▼"}</span>
          </button>
          {notesOpen && (
            <div className="px-5 pb-5 fade-in">
              <textarea
                className="input"
                style={{ height: 130 }}
                placeholder="Write anything you want to remember about this question..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <button onClick={saveNote} className="btn btn-ghost mt-3">
                Save note
              </button>
              {noteMessage && <div className={`${alertClass(noteMessage)} mt-3`}>{noteMessage}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Question;