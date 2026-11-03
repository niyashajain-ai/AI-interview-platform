import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getToken, logout } from "../auth";
import ScoreRing from "../components/ScoreRing";
import Confetti from "../components/Confetti";
import { alertClass, scoreColor, verdict } from "../components/ui";

const API = "";
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function MockHR() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [review, setReview] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [summary, setSummary] = useState(null);
  const [listening, setListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  function authHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    };
  }

  function startListening() {
    if (!SpeechRecognition) {
      setVoiceMessage("Voice input is not supported in this browser. Please use Chrome or Edge.");
      return;
    }
    setVoiceMessage("");

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          text += event.results[i][0].transcript + " ";
        }
      }
      if (text.trim()) {
        setAnswer((prev) => (prev ? prev.trimEnd() + " " : "") + text.trim());
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed") {
        setVoiceMessage(
          "The microphone is blocked. Click the lock icon next to the address bar and allow the microphone."
        );
      } else if (event.error === "no-speech") {
        setVoiceMessage("I did not hear anything. Please try again.");
      } else {
        setVoiceMessage("Voice problem: " + event.error);
      }
      setListening(false);
    };

    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  function stopListening() {
    if (recognitionRef.current) recognitionRef.current.stop();
    setListening(false);
  }

  function speakQuestion() {
    if (!("speechSynthesis" in window)) {
      setVoiceMessage("Reading aloud is not supported in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(session.questions[index].title);
    utterance.lang = "en-IN";
    window.speechSynthesis.speak(utterance);
  }

  async function startMock() {
    setMessage("");
    setWorking(true);
    try {
      const res = await fetch(`${API}/api/mock/start`, {
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
      setSession(data);
      setIndex(0);
      setAnswer("");
      setReview(null);
      setAnswered(false);
      setSummary(null);
      setVoiceMessage("");
    } catch {
      setMessage("Cannot reach the server");
    } finally {
      setWorking(false);
    }
  }

  async function submitAnswer() {
    stopListening();
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

  async function goNext() {
    stopListening();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setVoiceMessage("");

    const isLast = index === session.questions.length - 1;
    if (!isLast) {
      setIndex(index + 1);
      setAnswer("");
      setReview(null);
      setAnswered(false);
      setMessage("");
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

  const total = session ? session.questions.length : 0;
  const progress = session ? ((index + (answered ? 1 : 0)) / total) * 100 : 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-extrabold" style={{ margin: 0 }}>
          🎤 HR <span className="gradient-text">Mock Round</span>
        </h1>
        <p className="muted" style={{ margin: "4px 0 0" }}>
          Answer like it is a real interview. You can type or speak.
        </p>
      </div>

      {!session && (
        <div className="card p-6 fade-in">
          <p style={{ margin: "0 0 6px" }} className="font-bold">How it works</p>
          <div className="grid gap-3 sm:grid-cols-3 mb-5">
            <div className="review-box review-follow"><h4>1️⃣ Get questions</h4><p>Up to 5 random HR questions.</p></div>
            <div className="review-box review-follow"><h4>2️⃣ Answer</h4><p>Type it, or click the mic and speak.</p></div>
            <div className="review-box review-follow"><h4>3️⃣ Get your score</h4><p>AI feedback on each answer and an overall score.</p></div>
          </div>
          <button onClick={startMock} disabled={working} className="btn btn-primary">
            {working ? (<><span className="spinner" /> Starting...</>) : "Start HR mock 🚀"}
          </button>
        </div>
      )}

      {session && !summary && (
        <div className="flex flex-col gap-4 fade-in">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-semibold">Question {index + 1} of {total}</span>
              <span className="muted">{Math.round(progress)}% done</span>
            </div>
            <div className="progress"><div style={{ width: `${progress}%` }} /></div>
          </div>

          <div className="card p-6">
            <h2 className="text-xl font-bold" style={{ margin: 0, lineHeight: 1.4 }}>
              {session.questions[index].title}
            </h2>

            <div className="flex flex-wrap items-center gap-3 mt-4">
              <button onClick={speakQuestion} className="btn btn-ghost btn-sm">
                🔊 Read question aloud
              </button>
              {!answered && (
                <button
                  onClick={listening ? stopListening : startListening}
                  className={listening ? "btn btn-ghost btn-sm mic-active" : "btn btn-ghost btn-sm"}
                >
                  {listening ? "⏹ Stop recording" : "🎙 Speak your answer"}
                </button>
              )}
              {listening && <span className="text-sm" style={{ color: "var(--danger)" }}>● Listening...</span>}
            </div>
            {voiceMessage && <div className="alert alert-error mt-3">{voiceMessage}</div>}

            <textarea
              className="input mt-4"
              style={{ height: 160 }}
              placeholder="Type your answer here, or click Speak your answer..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={answered}
            />

            {!answered && (
              <button
                onClick={submitAnswer}
                disabled={working || !answer.trim()}
                className="btn btn-primary mt-3"
              >
                {working ? (<><span className="spinner" /> AI is reviewing...</>) : "Submit answer"}
              </button>
            )}
            {message && <div className={`${alertClass(message)} mt-3`}>{message}</div>}
          </div>

          {review && (
            <div className="card p-5 fade-in">
              <div className="flex flex-wrap items-center gap-5 mb-4">
                <ScoreRing value={review.score} size={100} />
                <p className="text-xl font-extrabold" style={{ margin: 0 }}>{verdict(review.score)}</p>
              </div>
              <div className="flex flex-col gap-3">
                <div className="review-box review-good"><h4>👍 What was good</h4><p>{review.good}</p></div>
                <div className="review-box review-bad"><h4>⚠️ What to improve</h4><p>{review.wrong}</p></div>
                <div className="review-box review-better"><h4>✨ A better answer</h4><p>{review.better_answer}</p></div>
              </div>
            </div>
          )}

          {answered && (
            <button onClick={goNext} disabled={working} className="btn btn-success" style={{ alignSelf: "flex-start" }}>
              {index === total - 1
                ? working ? "Finishing..." : "Finish and see my score 🏁"
                : "Next question →"}
            </button>
          )}
        </div>
      )}

      {summary && (
        <div className="card p-6 fade-in">
          <div className="flex flex-wrap items-center gap-6 mb-5">
            <ScoreRing value={summary.overall_score ?? 0} size={140} />
            <div>
              <p className="text-2xl font-extrabold" style={{ margin: 0 }}>{verdict(summary.overall_score)}</p>
              <p className="muted" style={{ margin: "4px 0 0" }}>Your overall HR mock score</p>
            </div>
          </div>
          {Number(summary.overall_score) >= 8 && <Confetti />}
          <p className="font-bold" style={{ margin: "0 0 8px" }}>Your answers</p>
          {summary.results.map((r, i) => (
            <div key={i} className="flex justify-between gap-3 p-3 mb-2" style={{ borderRadius: 12, background: "var(--surface-2)" }}>
              <span>{r.title}</span>
              <b style={{ color: scoreColor(r.score) }}>{r.score ?? "-"} / 10</b>
            </div>
          ))}
          <div className="flex flex-wrap gap-3 mt-4">
            <button onClick={startMock} disabled={working} className="btn btn-primary">Try another round</button>
            <Link to="/dashboard" className="btn btn-ghost">📊 See my progress</Link>
          </div>
        </div>
      )}

      {!session && message && <div className={alertClass(message)}>{message}</div>}
    </div>
  );
}

export default MockHR;