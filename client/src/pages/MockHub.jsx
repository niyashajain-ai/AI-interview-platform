import { Link } from "react-router-dom";

const CARD_STYLE = { color: "inherit", textDecoration: "none", display: "block" };

function MockHub() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-extrabold" style={{ margin: 0 }}>
          🎯 Mock <span className="gradient-text">interviews</span>
        </h1>
        <p className="muted" style={{ margin: "4px 0 0" }}>
          Practice like it is the real thing. Pick a round to start.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Link to="/mock/hr" className="card card-hover p-6 fade-in" style={CARD_STYLE}>
          <span className="hub-icon">🎤</span>
          <h2 className="text-xl font-bold" style={{ margin: "16px 0 6px" }}>HR round</h2>
          <p className="muted" style={{ margin: 0, lineHeight: 1.55 }}>
            5 random HR questions, one after another. Answer by typing or by speaking.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="badge badge-primary">🎙 Voice answers</span>
            <span className="badge badge-primary">🤖 AI feedback</span>
          </div>
          <p className="font-semibold" style={{ margin: "18px 0 0", color: "var(--primary)" }}>
            Start HR round →
          </p>
        </Link>

        <Link
          to="/mock/company"
          className="card card-hover p-6 fade-in"
          style={{ ...CARD_STYLE, animationDelay: "80ms" }}
        >
          <span className="hub-icon">🏢</span>
          <h2 className="text-xl font-bold" style={{ margin: "16px 0 6px" }}>Company round</h2>
          <p className="muted" style={{ margin: 0, lineHeight: 1.55 }}>
            Pick a company and answer its questions against the clock, 3 minutes each.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="badge badge-primary">⏱ Timed</span>
            <span className="badge badge-primary">🤖 AI feedback</span>
          </div>
          <p className="font-semibold" style={{ margin: "18px 0 0", color: "var(--primary)" }}>
            Start company round →
          </p>
        </Link>
      </div>

      <div className="card p-6">
        <p className="font-bold" style={{ margin: "0 0 10px" }}>💡 Tips for a good round</p>
        <ul className="muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
          <li>Answer in full sentences, like you would say it to an interviewer.</li>
          <li>Use real examples from your projects and college work.</li>
          <li>Score 8 or more and you will get a little surprise 🎉</li>
        </ul>
      </div>
    </div>
  );
}

export default MockHub;