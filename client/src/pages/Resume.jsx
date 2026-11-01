import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getToken, logout } from "../auth";

function Resume() {
  const navigate = useNavigate();
  const [targetRole, setTargetRole] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [file, setFile] = useState(null);
  const [review, setReview] = useState(null);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  function handleFile(e) {
    const picked = e.target.files[0];
    e.target.value = "";
    setMessage("");
    if (!picked) return;

    const name = picked.name.toLowerCase();
    if (picked.size > 5 * 1024 * 1024) {
      setMessage("The file must be smaller than 5 MB");
      return;
    }

    if (name.endsWith(".txt")) {
      const reader = new FileReader();
      reader.onload = () => {
        setResumeText(String(reader.result));
        setFile(null);
      };
      reader.readAsText(picked);
      return;
    }

    if (name.endsWith(".pdf") || name.endsWith(".docx")) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = String(reader.result).split(",")[1];
        setFile({
          name: picked.name,
          type: name.endsWith(".pdf") ? "pdf" : "docx",
          data: base64,
        });
      };
      reader.readAsDataURL(picked);
      return;
    }

    setMessage("Please choose a PDF, Word (.docx) or .txt file");
  }

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
        body: JSON.stringify({
          targetRole,
          resumeText,
          fileType: file ? file.type : undefined,
          fileData: file ? file.data : undefined,
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

  const canReview =
    targetRole.trim() && (file || resumeText.trim().length >= 100);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Link to="/" className="text-blue-600 underline">
        ← Back to questions
      </Link>
      <h1 className="text-2xl font-bold mt-4 mb-2">📄 Resume Review</h1>
      <p className="text-sm text-gray-600 mb-4">
        Upload your resume (PDF or Word) or paste its text. Your file is sent to
        an AI service (Google Gemini) to be read, and only the feedback is saved
        in our database. For privacy, you can remove your phone number, email and
        home address first.
      </p>

      <input
        value={targetRole}
        onChange={(e) => setTargetRole(e.target.value)}
        placeholder="Target role, e.g. Frontend Developer Intern"
        className="w-full border rounded px-3 py-2 mb-3"
      />

      <label className="inline-block border rounded px-4 py-2 cursor-pointer hover:bg-gray-100">
        📎 Upload resume (PDF, DOCX or TXT)
        <input
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={handleFile}
          className="hidden"
        />
      </label>

      {file ? (
        <div className="mt-3 border rounded p-3 flex justify-between items-center bg-gray-50">
          <span>📄 {file.name}</span>
          <button
            onClick={() => setFile(null)}
            className="text-red-600 underline text-sm"
          >
            Remove
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-600 mt-3 mb-1">Or paste your resume text:</p>
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste your resume text here..."
            className="w-full border rounded p-3 h-64"
          />
        </>
      )}

      <div>
        <button
          onClick={handleReview}
          disabled={working || !canReview}
          className="mt-3 bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {working ? "AI is reviewing your resume..." : "Review my resume"}
        </button>
      </div>

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