import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getToken, logout } from "../auth";

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://localhost:5000/api/stats", {
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
        if (data) setStats(data);
      })
      .catch(() => setError("Cannot reach the server"));
  }, [navigate]);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Link to="/" className="text-blue-600 underline">
        ← Back to questions
      </Link>
      <h1 className="text-2xl font-bold mt-4 mb-6">Your progress</h1>

      {error && <p className="text-red-600">{error}</p>}

      {stats && stats.attempts === 0 && (
        <p className="text-gray-600">
          You haven't answered any questions yet. Go practice one and come back! 💪
        </p>
      )}

      {stats && stats.attempts > 0 && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="border rounded-lg p-4 text-center">
              <p className="text-3xl font-bold">{stats.attempts}</p>
              <p className="text-sm text-gray-600">Answers given</p>
            </div>
            <div className="border rounded-lg p-4 text-center">
              <p className="text-3xl font-bold">{stats.questions_practiced}</p>
              <p className="text-sm text-gray-600">Questions practiced</p>
            </div>
            <div className="border rounded-lg p-4 text-center">
              <p className="text-3xl font-bold">{stats.avg_score ?? "-"}</p>
              <p className="text-sm text-gray-600">Average score / 10</p>
            </div>
          </div>

          <h2 className="text-lg font-semibold mb-3">Topics (weakest first)</h2>
          {stats.byTopic.map((t) => (
            <div key={t.topic} className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span>{t.topic}</span>
                <span>{t.avg_score} / 10 • {t.attempts} attempts</span>
              </div>
              <div className="bg-gray-200 rounded h-3">
                <div
                  className="bg-blue-600 h-3 rounded"
                  style={{ width: `${Number(t.avg_score) * 10}%` }}
                />
              </div>
            </div>
          ))}

          <h2 className="text-lg font-semibold mt-8 mb-3">Recent attempts</h2>
          {stats.recent.map((r) => (
            <Link
              key={r.id}
              to={`/question/${r.question_id}`}
              className="flex justify-between border rounded-lg p-3 mb-2 hover:bg-gray-50"
            >
              <span>{r.title}</span>
              <span className="text-sm text-gray-600">
                {r.score ?? "-"} / 10 • {new Date(r.created_at).toLocaleDateString()}
              </span>
            </Link>
          ))}
        </>
      )}
    </div>
  );
}

export default Dashboard;