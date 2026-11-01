import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { getUser, logout } from "../auth";

const LINKS = [
  { to: "/", label: "Practice", icon: "🏠", end: true },
  { to: "/dashboard", label: "Dashboard", icon: "📊" },
  { to: "/history", label: "History", icon: "🕘" },
  { to: "/mock/hr", label: "HR Mock", icon: "🎤" },
  { to: "/mock/company", label: "Company Mock", icon: "🏢" },
  { to: "/resume", label: "Resume", icon: "📄" },
  { to: "/add-question", label: "Add Question", icon: "➕" },
];

function getInitialTheme() {
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    // ignore
  }
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("theme", theme);
    } catch {
      // ignore
    }
  }, [theme]);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const initial = (user?.name || "?").trim().charAt(0).toUpperCase();

  return (
    <>
      <header className="topbar">
        <div
          className="flex items-center justify-between gap-3 px-4 py-3 mx-auto"
          style={{ maxWidth: 1080 }}
        >
          <Link
            to="/"
            className="flex items-center gap-2"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            <span className="logo-mark">AI</span>
            <span className="font-bold text-lg hidden sm:inline">Interview Prep</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title="Switch light / dark theme"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <span className="avatar">{initial}</span>
            <span className="font-semibold hidden sm:inline">{user?.name}</span>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>

        <nav
          className="mx-auto px-4 pb-2 flex gap-1 overflow-x-auto"
          style={{ maxWidth: 1080 }}
        >
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className="nav-link">
              <span>{l.icon}</span>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main key={location.pathname} className="page fade-in">
        {children}
      </main>
    </>
  );
}

export default Layout;