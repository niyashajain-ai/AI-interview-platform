import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getToken, logout } from "../auth";
import { scoreColor } from "../components/ui";

function parseFeedback(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function History() {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    fetch("/api/history", {
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
        if (data) setItems(data);
      })
      .catch(() => setError("Cannot reach the server"));
  }, [navigate]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-extrabold" style={{ margin: 0 }}>
          🕘 Your <span className="gradient-text">history</span>
        </h1>
        <p className="muted" style={{ margin: "4px 0 0" }}>
          Click any answer to see your feedback again.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!items && !error && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((n) => (<div key={n} className="skeleton" style={{ height: 70 }} />))}
        </div>
      )}

      {items && items.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-4xl" style={{ margin: 0 }}>📭</p>
          <p className="font-semibold" style={{ margin: "8px 0 2px" }}>Nothing here yet</p>
          <p className="muted" style={{ margin: "0 0 14px" }}>Answer a question and it will show up here.</p>
          <Link to="/" className="btn btn-primary">Start practicing</Link>
        </div>
      )}

      {items &&
        items.map((item, i) => {
          const feedback = parseFeedback(item.feedback);
          const isOpen = openId === item.id;
          return (
            <div
              key={item.id}
              className="card fade-in"
              style={{ animationDelay: `${Math.min(i, 10) * 30}ms`, overflow: "hidden" }}
            >
              <button
                onClick={() => setOpenId(isOpen ? null : item.id)}
                className="w-full flex items-center gap-4 p-4 text-left"
                style={{ background: "transparent", border: "none", color: "inherit", font: "inherit", cursor: "pointer" }}
              >
                <span
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 800,
                    flexShrink: 0,
                    color: "#fff",
                    background: item.score == null ? "var(--muted)" : scoreColor(item.score),
                  }}
                >
                  {item.score ?? "-"}
                </span>
                <span style={{ flex: 1 }}>
                  <span className="font-semibold">{item.title}</span>
                  {item.session_id && <span className="badge badge-primary" style={{ marginLeft: 8 }}>mock round</span>}
                  <br />
                  <span className="muted text-sm">{new Date(item.created_at).toLocaleString()}</span>
                </span>
                <span className="muted">{isOpen ? "▲" : "▼"}</span>
              </button>

              {isOpen && (
                <div className="p-4 fade-in" style={{ borderTop: "1px solid var(--border)", background: "var(--surface-2)" }}>
                  <p className="font-bold" style={{ margin: "0 0 6px" }}>Your answer</p>
                  <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{item.answer}</p>

                  {feedback ? (
                    <div className="flex flex-col gap-3 mt-4">
                      <div className="review-box review-good"><h4>👍 What was good</h4><p>{feedback.good}</p></div>
                      <div className="review-box review-bad"><h4>⚠️ What to improve</h4><p>{feedback.wrong}</p></div>
                      <div className="review-box review-better"><h4>✨ A better answer</h4><p>{feedback.better_answer}</p></div>
                    </div>
                  ) : (
                    <p className="muted mt-3">No AI review was saved for this answer.</p>
                  )}

                  <Link to={`/question/${item.question_id}`} className="btn btn-ghost btn-sm mt-4">
                    Open this question →
                  </Link>
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}

export default History;