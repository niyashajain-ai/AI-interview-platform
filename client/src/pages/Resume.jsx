import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getToken, logout } from "../auth";

function Resume() {
  const navigate = useNavigate();
  const [targetRole, setTargetRole] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [review, setReview] = useState(null);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  async function handleReview() {
    setMessage("");
    setReview(null);
    setWorking(true);
    try {
      const res = await fetch("http://localhost:5000/api/resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ targetRole, resumeText }),
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
      setReview(data.review);
    } catch {
      setMessage("Cannot reach the server");
    } finally {
      setWorking(false);
    }
  }

  function list(items) {
    return Array.isArray(items) ? items : [];
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Link to="/" className="text-blue-600 underline">
        ← Back to questions
      </Link>
      <h1 className="text-2xl font-bold mt-4 mb-2">📄 Resume Review</h1>
      <p className="text-sm text-gray-600 mb-4">
        Paste the text of your resume. For privacy, remove your phone number,
        email and home address first, because the text is sent to an AI service.
      </p>

      <input
        value={targetRole}
        onChange={(e) => setTargetRole(e.target.value)}
        placeholder="Target role, e.g. Frontend Developer Intern"
        className="w-full border rounded px-3 py-2 mb-3"
      />
      <textarea
        value={resumeText}
        onChange={(e) => setResumeText(e.target.value)}
        placeholder="Paste your resume text here..."
        className="w-full border rounded p-3 h-64"
      />
      <button
        onClick={handleReview}
        disabled={working || !targetRole.trim() || resumeText.trim().length < 100}
        className="mt-3 bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {working ? "AI is reviewing your resume..." : "Review my resume"}
      </button>

      {message && <p className="mt-4 text-red-600">{message}</p>}

      {review && (
        <div className="mt-6 border rounded p-4 bg-gray-50">
          <p className="text-xl font-bold">Score: {review.score} / 10</p>
          <p className="mt-2">{review.summary}</p>

          <h3 className="font-semibold mt-4">👍 Strengths</h3>
          <ul className="list-disc ml-6">
            {list(review.strengths).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>

          <h3 className="font-semibold mt-4">⚠️ What to improve</h3>
          <ul className="list-disc ml-6">
            {list(review.improvements).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>

          <h3 className="font-semibold mt-4">🔑 Keywords to add</h3>
          <div className="flex flex-wrap gap-2 mt-2">
            {list(review.missing_keywords).map((k, i) => (
              <span key={i} className="border rounded-full px-3 py-1 text-sm bg-white">
                {k}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Resume;