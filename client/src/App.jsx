import { useEffect, useState } from "react";

function App() {
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/questions")
      .then((res) => res.json())
      .then((data) => setQuestions(data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: 20 }}>
      <h1>AI Interview Prep</h1>
      {questions.map((q) => (
        <div
          key={q.id}
          style={{ border: "1px solid #ccc", borderRadius: 8, padding: 12, marginBottom: 12 }}
        >
          <h3>{q.title}</h3>
          <p>
            {q.topic} • {q.difficulty} • {q.company}
          </p>
        </div>
      ))}
    </div>
  );
}

export default App;