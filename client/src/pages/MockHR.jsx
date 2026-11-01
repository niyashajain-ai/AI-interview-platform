import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getToken, logout } from "../auth";

const API = "http://localhost:5000";
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

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
      setVoiceMessage(
        "Voice input is not supported in this browser. Please use Chrome or Edge."
      );
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

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Link to="/" className="text-blue-600 underline">
        ← Back to questions
      </Link>
      <h1 className="text-2xl font-bold mt-4 mb-6">🎤 HR Mock Round</h1>

      {!session && (
        <div className="border rounded-lg p-4">
          <p className="mb-3">
            You will get up to 5 HR questions, one after another. Answer each
            one by typing or by speaking, get AI feedback, and see your overall
            score at the end.
          </p>
          <button
            onClick={startMock}
            disabled={working}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {working ? "Starting..." : "Start HR mock"}
          </button>
        </div>
      )}

      {session && !summary && (
        <div>
          <p className="text-sm text-gray-600 mb-2">
            Question {index + 1} of {session.questions.length}
          </p>
          <h2 className="text-xl font-bold">{session.questions[index].title}</h2>

          <div className="flex flex-wrap items-center gap-3 mt-3">
            <button
              onClick={speakQuestion}
              className="border rounded px-3 py-1 hover:bg-gray-100"
            >
              🔊 Read question aloud
            </button>
            {!answered && (
              <button
                onClick={listening ? stopListening : startListening}
                className={
                  listening
                    ? "border border-red-600 text-red-600 rounded px-3 py-1"
                    : "border rounded px-3 py-1 hover:bg-gray-100"
                }
              >
                {listening ? "⏹ Stop recording" : "🎙 Speak your answer"}
              </button>
            )}
            {listening && (
              <span className="text-red-600 text-sm">● Listening...</span>
            )}
          </div>
          {voiceMessage && (
            <p className="text-sm text-red-600 mt-2">{voiceMessage}</p>
          )}

          <textarea
            className="w-full border rounded p-3 mt-3 h-40"
            placeholder="Type your answer here, or click Speak your answer..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={answered}
          />

          {!answered && (
            <button
              onClick={submitAnswer}
              disabled={working || !answer.trim()}
              className="mt-3 bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {working ? "AI is reviewing your answer..." : "Submit answer"}
            </button>
          )}

          {review && (
            <div className="mt-6 border rounded p-4 bg-gray-50">
              <p className="text-xl font-bold">Score: {review.score} / 10</p>

              <h3 className="font-semibold mt-4">👍 What was good</h3>
              <p>{review.good}</p>

              <h3 className="font-semibold mt-4">⚠️ What to improve</h3>
              <p>{review.wrong}</p>

              <h3 className="font-semibold mt-4">✨ A better answer</h3>
              <p>{review.better_answer}</p>
            </div>
          )}

          {answered && (
            <button
              onClick={goNext}
              disabled={working}
              className="mt-4 bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {index === session.questions.length - 1
                ? working
                  ? "Finishing..."
                  : "Finish and see my score"
                : "Next question →"}
            </button>
          )}
        </div>
      )}

      {summary && (
        <div className="border rounded-lg p-4">
          <p className="text-3xl font-bold">
            Overall: {summary.overall_score ?? "-"} / 10
          </p>
          <h3 className="font-semibold mt-4 mb-2">Your answers</h3>
          {summary.results.map((r, i) => (
            <div key={i} className="flex justify-between border-b py-2">
              <span>{r.title}</span>
              <span className="text-gray-600">{r.score ?? "-"} / 10</span>
            </div>
          ))}
          <button
            onClick={startMock}
            disabled={working}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Try another round
          </button>
        </div>
      )}

      {message && <p className="mt-4 text-red-600">{message}</p>}
    </div>
  );
}

export default MockHR;