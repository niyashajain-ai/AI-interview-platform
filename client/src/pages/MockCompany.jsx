import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getToken, logout } from "../auth";

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
      .then((data) => setCompanies(data))
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

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Link to="/" className="text-blue-600 underline">
        ← Back to questions
      </Link>
      <h1 className="text-2xl font-bold mt-4 mb-6">🏢 Company Mock Round</h1>

      {!session && (
        <div className="border rounded-lg p-4">
          <p className="mb-3">
            Pick a company. You will get up to 5 of its questions, with 3
            minutes for each one. When the time ends, your answer is sent
            automatically (or the question is skipped if the box is empty).
            Skipped questions count as 0.
          </p>
          {companies.length === 0 ? (
            <p className="text-gray-600">
              No company has enough questions yet (a company needs at least 2).
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              <select
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="border rounded px-3 py-2"
              >
                <option value="">Choose a company</option>
                {companies.map((c) => (
                  <option key={c.company} value={c.company}>
                    {c.company} ({c.total} questions)
                  </option>
                ))}
              </select>
              <button
                onClick={startMock}
                disabled={working || !company}
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {working ? "Starting..." : "Start mock round"}
              </button>
            </div>
          )}
        </div>
      )}

      {session && !summary && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm text-gray-600">
              {session.company} • Question {index + 1} of {session.questions.length}
            </p>
            {!answered && (
              <p
                className={
                  timeLeft <= 30
                    ? "text-xl font-bold text-red-600"
                    : "text-xl font-bold"
                }
              >
                ⏱ {minutes}:{seconds}
              </p>
            )}
          </div>
          <h2 className="text-xl font-bold">{session.questions[index].title}</h2>

          <textarea
            className="w-full border rounded p-3 mt-4 h-40"
            placeholder="Type your answer here..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={answered}
          />

          {!answered && (
            <button
              onClick={submitAnswer}
              disabled={working || !answer.trim()}
              className="mt-3 bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {working ? "AI is reviewing your answer..." : "Submit answer"}
            </button>
          )}

          {review && (
            <div className="mt-6 border rounded p-4 bg-gray-50">
              <p className="text-xl font-bold">Score: {review.score} / 10</p>

              <h3 className="font-semibold mt-4">👍 What was good</h3>
              <p>{review.good}</p>

              <h3 className="font-semibold mt-4">⚠️ What to improve</h3>
              <p>{review.wrong}</p>

              <h3 className="font-semibold mt-4">✨ A better answer</h3>
              <p>{review.better_answer}</p>
            </div>
          )}

          {answered && (
            <button
              onClick={goNext}
              disabled={working}
              className="mt-4 bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {index === session.questions.length - 1
                ? working
                  ? "Finishing..."
                  : "Finish and see my score"
                : "Next question →"}
            </button>
          )}
        </div>
      )}

      {summary && (
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-600">{session.company} mock round</p>
          <p className="text-3xl font-bold">
            Overall: {summary.overall_score ?? "-"} / 10
          </p>
          <h3 className="font-semibold mt-4 mb-2">Your answers</h3>
          {summary.results.map((r, i) => (
            <div key={i} className="flex justify-between border-b py-2">
              <span>{r.title}</span>
              <span className="text-gray-600">{r.score ?? "-"} / 10</span>
            </div>
          ))}
          {summary.results.length < session.questions.length && (
            <p className="text-sm text-gray-600 mt-2">
              Skipped: {session.questions.length - summary.results.length} (counted as 0)
            </p>
          )}
          <button
            onClick={startMock}
            disabled={working}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Try another round
          </button>
        </div>
      )}

      {message && <p className="mt-4 text-red-600">{message}</p>}
    </div>
  );
}

export default MockCompany;