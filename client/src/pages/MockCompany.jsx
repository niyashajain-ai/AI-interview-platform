import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getToken, logout } from "../auth";
import ScoreRing from "../components/ScoreRing";
import { alertClass, scoreColor, verdict } from "../components/ui";

const API = "http://localhost:5000";
const QUESTION_SECONDS = 180;

function MockCompany() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [company, setCompany] = useState("");
  const [session, setSession] = useState(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [review, setReview] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [summary, setSummary] = useState(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_SECONDS);

  function authHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    };
  }

  useEffect(() => {
    fetch(`${API}/api/mock/companies`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setCompanies(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (!session || summary || answered || timeLeft <= 0) return;
    const timer = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [session, summary, answered, timeLeft]);

  useEffect(() => {
    if (session && !summary && !answered && !working && timeLeft === 0) {
      if (answer.trim()) {
        submitAnswer();
      } else {
        skipQuestion();
      }
    }
  }, [timeLeft]);

  async function startMock() {
    setMessage("");
    setWorking(true);
    try {
      const res = await fetch(`${API}/api/mock/company/start`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ company }),
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
      setSession(data);
      setIndex(0);
      setAnswer("");
      setReview(null);
      setAnswered(false);
      setSummary(null);
      setTimeLeft(QUESTION_SECONDS);
    } catch {
      setMessage("Cannot reach the server");
    } finally {
      setWorking(false);
    }
  }

  async function submitAnswer() {
    setMessage("");
    setWorking(true);
    try {
      const res = await fetch(`${API}/api/attempts`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          questionId: session.questions[index].id,
          answer,
          sessionId: session.sessionId,
        }),
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
      setAnswered(true);
      if (data.review) {
        setReview(data.review);
      } else {
        setMessage(
          "Your answer was saved, but the AI review failed: " +
            (data.aiError || "please try again later")
        );
      }
    } catch {
      setMessage("Cannot reach the server");
    } finally {
      setWorking(false);
    }
  }

  function skipQuestion() {
    setAnswered(true);
    setMessage("Time's up! This question was skipped.");
  }

  async function goNext() {
    const isLast = index === session.questions.length - 1;
    if (!isLast) {
      setIndex(index + 1);
      setAnswer("");
      setReview(null);
      setAnswered(false);
      setMessage("");
      setTimeLeft(QUESTION_SECONDS);
      return;
    }

    setMessage("");
    setWorking(true);
    try {
      const res = await fetch(`${API}/api/mock/${session.sessionId}/finish`, {
        method: "POST",
        headers: authHeaders(),
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
      setSummary(data);
    } catch {
      setMessage("Cannot reach the server");
    } finally {
      setWorking(false);
    }
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = String(timeLeft % 60).padStart(2, "0");
  const timePercent = (timeLeft / QUESTION_SECONDS) * 100;
  const timeColor =
    timeLeft <= 30 ? "var(--danger)" : timeLeft <= 90 ? "var(--warning)" : "var(--success)";
  const total = session ? session.questions.length : 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-extrabold" style={{ margin: 0 }}>
          🏢 Company <span className="gradient-text">Mock Round</span>
        </h1>
        <p className="muted" style={{ margin: "4px 0 0" }}>
          Practice a company's questions against the clock.
        </p>
      </div>

      {!session && (
        <div className="card p-6 fade-in">
          <p className="font-bold" style={{ margin: "0 0 6px" }}>Pick a company</p>
          <p className="muted text-sm" style={{ margin: "0 0 16px" }}>
            You get up to 5 of its questions, with 3 minutes each. When time ends, your answer is
            sent automatically (or the question is skipped if the box is empty). Skipped questions
            count as 0.
          </p>

          {companies.length === 0 ? (
            <div className="alert alert-info">
              No company has enough questions yet (a company needs at least 2).
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {companies.map((c) => (
                <button
                  key={c.company}
                  onClick={() => setCompany(c.company)}
                  className={company === c.company ? "card card-hover selected p-4" : "card card-hover p-4"}
                >
                  <div className="font-bold">🏢 {c.company}</div>
                  <div className="muted text-sm">{c.total} questions</div>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={startMock}
            disabled={working || !company}
            className="btn btn-primary mt-5"
          >
            {working ? (<><span className="spinner" /> Starting...</>) : "Start mock round 🚀"}
          </button>
          {message && <div className={`${alertClass(message)} mt-3`}>{message}</div>}
        </div>
      )}

      {session && !summary && (
        <div className="flex flex-col gap-4 fade-in">
          <div className="card p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">
                {session.company} • Question {index + 1} of {total}
              </span>
              {!answered && (
                <span className="text-xl font-extrabold" style={{ color: timeColor }}>
                  ⏱ {minutes}:{seconds}
                </span>
              )}
            </div>
            <div className="progress">
              <div
                style={{
                  width: answered ? "0%" : `${timePercent}%`,
                  background: timeColor,
                  transition: "width 1s linear, background .3s",
                }}
              />
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-xl font-bold" style={{ margin: 0, lineHeight: 1.4 }}>
              {session.questions[index].title}
            </h2>
            <textarea
              className="input mt-4"
              style={{ height: 160 }}
              placeholder="Type your answer here..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={answered}
            />
            {!answered && (
              <button
                onClick={submitAnswer}
                disabled={working || !answer.trim()}
                className="btn btn-primary mt-3"
              >
                {working ? (<><span className="spinner" /> AI is reviewing...</>) : "Submit answer"}
              </button>
            )}
            {message && <div className={`${alertClass(message)} mt-3`}>{message}</div>}
          </div>

          {review && (
            <div className="card p-5 fade-in">
              <div className="flex flex-wrap items-center gap-5 mb-4">
                <ScoreRing value={review.score} size={100} />
                <p className="text-xl font-extrabold" style={{ margin: 0 }}>{verdict(review.score)}</p>
              </div>
              <div className="flex flex-col gap-3">
                <div className="review-box review-good"><h4>👍 What was good</h4><p>{review.good}</p></div>
                <div className="review-box review-bad"><h4>⚠️ What to improve</h4><p>{review.wrong}</p></div>
                <div className="review-box review-better"><h4>✨ A better answer</h4><p>{review.better_answer}</p></div>
              </div>
            </div>
          )}

          {answered && (
            <button onClick={goNext} disabled={working} className="btn btn-success" style={{ alignSelf: "flex-start" }}>
              {index === total - 1
                ? working ? "Finishing..." : "Finish and see my score 🏁"
                : "Next question →"}
            </button>
          )}
        </div>
      )}

      {summary && (
        <div className="card p-6 fade-in">
          <div className="flex flex-wrap items-center gap-6 mb-5">
            <ScoreRing value={summary.overall_score ?? 0} size={140} />
            <div>
              <p className="muted text-sm" style={{ margin: 0 }}>{session.company} mock round</p>
              <p className="text-2xl font-extrabold" style={{ margin: "2px 0 0" }}>{verdict(summary.overall_score)}</p>
            </div>
          </div>
          <p className="font-bold" style={{ margin: "0 0 8px" }}>Your answers</p>
          {summary.results.map((r, i) => (
            <div key={i} className="flex justify-between gap-3 p-3 mb-2" style={{ borderRadius: 12, background: "var(--surface-2)" }}>
              <span>{r.title}</span>
              <b style={{ color: scoreColor(r.score) }}>{r.score ?? "-"} / 10</b>
            </div>
          ))}
          {summary.results.length < total && (
            <p className="muted text-sm">
              Skipped: {total - summary.results.length} (counted as 0)
            </p>
          )}
          <div className="flex flex-wrap gap-3 mt-4">
            <button onClick={startMock} disabled={working} className="btn btn-primary">Try another round</button>
            <Link to="/dashboard" className="btn btn-ghost">📊 See my progress</Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default MockCompany;