import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { useTheme } from '../hooks/useTheme.jsx';

const THEME_ICON = { light: '☀️', dark: '🌙', system: '🖥️' };

export function Navbar() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const cycleTheme = () => {
    const order = ['system', 'light', 'dark'];
    setTheme(order[(order.indexOf(theme) + 1) % order.length]);
  };

  return (
    <header className="no-print border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10">
      <nav className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="font-semibold text-lg tracking-tight">
          SGBAU <span className="text-brand-600">Result Watch</span>
        </Link>

        <div className="flex items-center gap-4 text-sm">
          <button
            onClick={cycleTheme}
            aria-label="Toggle color theme"
            className="rounded-md px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            title={`Theme: ${theme}`}
          >
            {THEME_ICON[theme]}
          </button>

          <Link
            to="/instant-check"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-medium hover:bg-brand-100 dark:hover:bg-brand-900/60 transition-colors text-xs sm:text-sm"
          >
            <span>⚡</span> Check Result
          </Link>

          <Link
            to="/range-check"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors text-xs sm:text-sm"
          >
            <span>📋</span> Range Check (Max 15)
          </Link>

          {user ? (
            <>
              <Link to="/dashboard" className="hover:text-brand-600">Dashboard</Link>
              <Link to="/profiles" className="hover:text-brand-600">Profiles</Link>
              <Link to="/results" className="hover:text-brand-600">Results</Link>
              <Link to="/settings" className="hover:text-brand-600">Settings</Link>
              {user.role === 'admin' && (
                <Link to="/admin" className="hover:text-brand-600">Admin</Link>
              )}
              <button
                onClick={async () => {
                  await logout();
                  navigate('/');
                }}
                className="rounded-md bg-gray-100 dark:bg-gray-800 px-3 py-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-brand-600">Login</Link>
              <Link
                to="/register"
                className="rounded-md bg-brand-600 text-white px-3 py-1.5 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
