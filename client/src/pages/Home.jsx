import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getToken, getUser, logout } from "../auth";

function Home() {
  const navigate = useNavigate();
  const user = getUser();
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/questions", {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => {
        if (res.status === 401) {
          logout();
          navigate("/login");
          return [];
        }
        return res.json();
      })
      .then((data) => setQuestions(data))
      .catch((err) => console.error(err));
  }, [navigate]);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">AI Interview Prep</h1>
        <div className="flex items-center gap-3">
          <span>Hi, {user?.name}</span>
          <button onClick={handleLogout} className="border rounded px-3 py-1 hover:bg-gray-100">
            Log out
          </button>
        </div>
      </div>

      {questions.map((q) => (
        <Link
          to={`/question/${q.id}`}
          key={q.id}
          className="block border rounded-lg p-4 mb-3 shadow-sm hover:bg-gray-50"
        >
          <h3 className="font-semibold">{q.title}</h3>
          <p className="text-sm text-gray-600">
            {q.topic} • {q.difficulty} • {q.company}
          </p>
        </Link>
      ))}
    </div>
  );
}

export default Home;