import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, logout } from "../auth";
import ScoreRing from "../components/ScoreRing";
import { alertClass, verdict } from "../components/ui";

function Resume() {
  const navigate = useNavigate();
  const [targetRole, setTargetRole] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [file, setFile] = useState(null);
  const [review, setReview] = useState(null);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [dragging, setDragging] = useState(false);

  function processFile(picked) {
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

  function handleFileInput(e) {
    const picked = e.target.files[0];
    e.target.value = "";
    processFile(picked);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    processFile(e.dataTransfer.files[0]);
  }

  async function handleReview() {
    setMessage("");
    setReview(null);
    setWorking(true);
    try {
      const res = await fetch("/api/resume", {
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

  const canReview = targetRole.trim() && (file || resumeText.trim().length >= 100);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-extrabold" style={{ margin: 0 }}>
          📄 Resume <span className="gradient-text">Review</span>
        </h1>
        <p className="muted" style={{ margin: "4px 0 0" }}>
          Upload your resume and get instant feedback for the role you want.
        </p>
      </div>

      <div className="card p-6 fade-in">
        <label className="font-semibold text-sm">Target role</label>
        <input
          value={targetRole}
          onChange={(e) => setTargetRole(e.target.value)}
          placeholder="e.g. Frontend Developer Intern"
          className="input mt-2 mb-4"
        />

        {file ? (
          <div className="flex justify-between items-center p-4" style={{ borderRadius: 14, background: "var(--primary-soft)" }}>
            <span className="font-semibold">📄 {file.name}</span>
            <button onClick={() => setFile(null)} className="btn btn-danger btn-sm">Remove</button>
          </div>
        ) : (
          <>
            <label
              className={dragging ? "dropzone drag block" : "dropzone block"}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <div className="text-4xl">📎</div>
              <p className="font-semibold" style={{ margin: "6px 0 2px" }}>
                Drag your resume here, or click to browse
              </p>
              <p className="muted text-sm" style={{ margin: 0 }}>PDF, DOCX or TXT • up to 5 MB</p>
              <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileInput} className="hidden" />
            </label>

            <p className="muted text-sm mt-4 mb-2">Or paste your resume text:</p>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste your resume text here..."
              className="input"
              style={{ height: 200 }}
            />
          </>
        )}

        <p className="muted text-xs mt-3" style={{ marginBottom: 0 }}>
          🔒 Your file is sent to an AI service (Google Gemini) to be read, and only the feedback is
          saved in our database. You can remove your phone number, email and address first.
        </p>

        <button
          onClick={handleReview}
          disabled={working || !canReview}
          className="btn btn-primary mt-4"
        >
          {working ? (<><span className="spinner" /> AI is reading your resume...</>) : "Review my resume ✨"}
        </button>
        {message && <div className={`${alertClass(message)} mt-3`}>{message}</div>}
      </div>

      {review && (
        <div className="card p-6 fade-in">
          <div className="flex flex-wrap items-center gap-6 mb-5">
            <ScoreRing value={review.score} size={130} />
            <div style={{ flex: 1, minWidth: 220 }}>
              <p className="text-2xl font-extrabold" style={{ margin: 0 }}>{verdict(review.score)}</p>
              <p style={{ margin: "6px 0 0", lineHeight: 1.55 }}>{review.summary}</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="review-box review-good">
              <h4>👍 Strengths</h4>
              <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                {list(review.strengths).map((s, i) => (<li key={i}>{s}</li>))}
              </ul>
            </div>
            <div className="review-box review-bad">
              <h4>⚠️ What to improve</h4>
              <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                {list(review.improvements).map((s, i) => (<li key={i}>{s}</li>))}
              </ul>
            </div>
          </div>

          <p className="font-bold" style={{ margin: "18px 0 8px" }}>🔑 Keywords to add</p>
          <div className="flex flex-wrap gap-2">
            {list(review.missing_keywords).map((k, i) => (
              <span key={i} className="badge badge-primary" style={{ fontSize: ".85rem", padding: "5px 12px" }}>
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