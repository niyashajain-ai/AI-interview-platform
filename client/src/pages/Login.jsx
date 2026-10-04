import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { saveAuth } from "../auth";

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      saveAuth(data);
      navigate("/");
    } catch {
      setError("Cannot reach the server. Is it running?");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6">Log in</h1>

        {error && <p className="text-red-600 mb-4">{error}</p>}

        <input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          className="w-full border rounded p-2 mb-3"
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          className="w-full border rounded p-2 mb-4"
        />

        <button className="w-full bg-blue-600 text-white rounded p-2 font-semibold hover:bg-blue-700">
          Log in
        </button>

        <p className="mt-4 text-sm text-center">
          New here?{" "}
          <Link to="/signup" className="text-blue-600 underline">
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}

export default Login;