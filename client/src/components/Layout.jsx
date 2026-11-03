import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { getUser, logout } from "../auth";

const LINKS = [
  { to: "/", label: "Practice", icon: "🏠", end: true },
  { to: "/mock", label: "Mock", icon: "🎯" },
  { to: "/dashboard", label: "Progress", icon: "📊" },
  { to: "/history", label: "History", icon: "🕘" },
  { to: "/resume", label: "Resume", icon: "📄" },
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("theme", theme);
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    function onClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const initial = (user?.name || "?").trim().charAt(0).toUpperCase();

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link
            to="/"
            className="flex items-center gap-2"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            <span className="logo-mark">AI</span>
            <span className="font-bold text-lg hidden sm:inline">Interview Prep</span>
          </Link>

          <nav className="nav-pills">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className="nav-link">
                <span>{l.icon}</span>
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title="Switch light / dark theme"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>

            <div className="menu-wrap" ref={menuRef}>
              <button
                className="avatar"
                style={{ border: "none", cursor: "pointer", font: "inherit" }}
                onClick={() => setMenuOpen(!menuOpen)}
                title="Account"
              >
                {initial}
              </button>
              {menuOpen && (
                <div className="menu">
                  <p className="muted text-sm" style={{ margin: "6px 12px 8px" }}>
                    Signed in as <b>{user?.name}</b>
                  </p>
                  <Link to="/add-question" className="menu-item">
                    ➕ Add a question
                  </Link>
                  <button className="menu-item" onClick={handleLogout}>
                    🚪 Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main key={location.pathname} className="page fade-in">
        {children}
      </main>
    </>
  );
}

export default Layout;