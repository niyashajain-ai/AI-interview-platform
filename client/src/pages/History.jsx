import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getToken, logout } from "../auth";

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
    fetch("http://localhost:5000/api/history", {
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
    <div className="max-w-2xl mx-auto p-6">
      <Link to="/" className="text-blue-600 underline">
        ← Back to questions
      </Link>
      <h1 className="text-2xl font-bold mt-4 mb-6">🕘 Your history</h1>

      {error && <p className="text-red-600">{error}</p>}

      {items && items.length === 0 && (
        <p className="text-gray-600">
          You haven't answered any questions yet. Go practice one and come back!
        </p>
      )}

      {items &&
        items.map((item) => {
          const feedback = parseFeedback(item.feedback);
          const isOpen = openId === item.id;
          return (
            <div key={item.id} className="border rounded-lg mb-3">
              <button
                onClick={() => setOpenId(isOpen ? null : item.id)}
                className="w-full flex justify-between gap-3 p-3 text-left hover:bg-gray-50"
              >
                <span>
                  {item.title}
                  {item.session_id && (
                    <span className="text-xs text-gray-500"> (mock round)</span>
                  )}
                </span>
                <span className="text-sm text-gray-600 whitespace-nowrap">
                  {item.score ?? "-"} / 10 • {new Date(item.created_at).toLocaleString()}
                </span>
              </button>

              {isOpen && (
                <div className="p-3 border-t bg-gray-50">
                  <h3 className="font-semibold">Your answer</h3>
                  <p className="whitespace-pre-wrap">{item.answer}</p>

                  {feedback ? (
                    <>
                      <h3 className="font-semibold mt-3">👍 What was good</h3>
                      <p>{feedback.good}</p>
                      <h3 className="font-semibold mt-3">⚠️ What to improve</h3>
                      <p>{feedback.wrong}</p>
                      <h3 className="font-semibold mt-3">✨ A better answer</h3>
                      <p>{feedback.better_answer}</p>
                    </>
                  ) : (
                    <p className="mt-3 text-gray-600">No AI review was saved for this answer.</p>
                  )}

                  <Link
                    to={`/question/${item.question_id}`}
                    className="text-blue-600 underline block mt-3"
                  >
                    Open this question
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