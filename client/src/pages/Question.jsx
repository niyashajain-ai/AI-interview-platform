import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getToken, logout } from "../auth";
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
  const reviewRef = useRef(null);

  useEffect(() => {
    setQuestion(null);
    setReview(null);
    setAnswer("");
    setMessage("");
    setError("");

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
      .then((data) => setNote(data.content || ""))
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

  return (
    <div className="flex flex-col gap-5">
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
              <a
                href={question.link}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost btn-sm"
              >
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
        <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-5">
            <div className="card p-5">
              <p className="font-bold" style={{ margin: "0 0 10px" }}>✍️ Your answer</p>
              <textarea
                className="input"
                style={{ height: 180 }}
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
                <button
                  onClick={handleSubmit}
                  disabled={saving || !answer.trim()}
                  className="btn btn-primary"
                >
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

            {saving && (
              <div className="card p-5 text-center fade-in">
                <p style={{ margin: 0 }}>🤖 The AI is reading your answer</p>
                <div className="dots muted">
                  <span>●</span> <span>●</span> <span>●</span>
                </div>
              </div>
            )}

            {review && (
              <div ref={reviewRef} className="card p-5 fade-in" style={{ scrollMarginTop: 120 }}>
                <div className="flex flex-wrap items-center gap-5 mb-4">
                  <ScoreRing value={review.score} />
                  <div>
                    <p className="text-xl font-extrabold" style={{ margin: 0 }}>
                      {verdict(review.score)}
                    </p>
                    <p className="muted" style={{ margin: "4px 0 0" }}>
                      Here is your AI feedback
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="review-box review-good">
                    <h4>👍 What was good</h4>
                    <p>{review.good}</p>
                  </div>
                  <div className="review-box review-bad">
                    <h4>⚠️ What to improve</h4>
                    <p>{review.wrong}</p>
                  </div>
                  <div className="review-box review-better">
                    <h4>✨ A better answer</h4>
                    <p>{review.better_answer}</p>
                  </div>
                  <div className="review-box review-follow">
                    <h4>❓ Follow-up question</h4>
                    <p>{review.follow_up}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="card p-5" style={{ alignSelf: "start" }}>
            <p className="font-bold" style={{ margin: "0 0 10px" }}>📝 My notes</p>
            <textarea
              className="input"
              style={{ height: 150 }}
              placeholder="Write anything you want to remember about this question..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button onClick={saveNote} className="btn btn-ghost mt-3" style={{ width: "100%" }}>
              Save note
            </button>
            {noteMessage && <div className={`${alertClass(noteMessage)} mt-3`}>{noteMessage}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default Question;