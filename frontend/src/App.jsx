import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { SessionProvider, useSession } from './context/SessionContext.jsx';
import { applyEraTheme } from './theme.js';
import Landing from './pages/Landing.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Results from './pages/Results.jsx';
import About from './pages/About.jsx';

function Nav() {
  const { authenticated, displayName, logout } = useSession();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-10 era-surface border-b border-opacity-20" style={{ borderColor: 'var(--era-primary)' }}>
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-display text-xl font-bold tracking-wide" style={{ color: 'var(--era-text)' }}>
          ✦ SwiftSwap
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <NavLink to="/about" className={({ isActive }) => (isActive ? 'font-semibold' : '')} style={{ color: 'var(--era-text)' }}>
            About
          </NavLink>
          {authenticated ? (
            <>
              <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'font-semibold' : '')} style={{ color: 'var(--era-text)' }}>
                Dashboard
              </NavLink>
              <span className="era-text-muted hidden sm:inline">Hi, {displayName || 'there'}</span>
              <button onClick={handleLogout} className="era-btn-ghost !px-4 !py-1.5">
                Log out
              </button>
            </>
          ) : (
            <NavLink to="/" className="era-btn !px-4 !py-1.5">
              Connect
            </NavLink>
          )}
        </div>
      </div>
    </nav>
  );
}

function RequireAuth({ children }) {
  const { authenticated, loading } = useSession();
  if (loading) return <div className="max-w-5xl mx-auto px-4 py-16 era-text-muted">Checking session…</div>;
  return authenticated ? children : <Navigate to="/" replace />;
}

export default function App() {
  // Set a neutral default theme on first load.
  useEffect(() => {
    applyEraTheme('1989');
  }, []);

  return (
    <BrowserRouter>
      <SessionProvider>
        <Nav />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<About />} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/results"
            element={
              <RequireAuth>
                <Results />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <footer className="max-w-5xl mx-auto px-4 py-10 text-center text-sm era-text-muted">
          SwiftSwap is a fan-built tool. Not affiliated with Taylor Swift, TAS Rights Management, or Spotify.
        </footer>
      </SessionProvider>
    </BrowserRouter>
  );
}
