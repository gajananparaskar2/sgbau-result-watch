import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout.jsx';
import { api } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.jsx';

function StatusBadge({ enabled }) {
  return enabled ? (
    <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400 text-sm font-medium">
      🟢 Monitoring Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-gray-500 text-sm font-medium">⏸️ Monitoring Paused</span>
  );
}

function ProfileCard({ profile, onChecked }) {
  const [checking, setChecking] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const [latestResult, setLatestResult] = useState(null);

  useEffect(() => {
    api
      .listResults()
      .then(({ results }) => {
        const r = results.find((x) => x.student_profile_id === profile.id);
        if (r) setLatestResult(r);
      })
      .catch(() => {});
  }, [profile.id]);

  const checkNow = async () => {
    setChecking(true);
    setOutcome(null);
    try {
      const { outcome: o } = await api.checkNow(profile.id);
      setOutcome(o);
      onChecked?.();
      if (o.status === 'RESULT_FOUND') {
        const { result } = await api.getResult(o.resultId);
        setLatestResult(result);
      }
    } catch (err) {
      setOutcome({ status: 'RESULT_FAILED', message: err.message });
    } finally {
      setChecking(false);
    }
  };

  const deleteProfile = async () => {
    if (!confirm(`Delete monitoring profile for roll ${profile.roll_number} and its saved results?`)) return;
    try {
      await api.deleteProfile(profile.id);
      onChecked?.();
    } catch (err) {
      alert(err.message || 'Failed to delete profile');
    }
  };

  const deleteLatestResult = async () => {
    if (!latestResult) return;
    if (!confirm(`Delete this result from history?`)) return;
    try {
      await api.deleteResult(latestResult.id);
      setLatestResult(null);
      onChecked?.();
    } catch (err) {
      alert(err.message || 'Failed to delete result');
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs relative">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold text-lg">
            {profile.semester}{ordSuffix(profile.semester)} Semester – {shortBranch(profile.branch)}
          </h2>
          <p className="text-sm text-gray-500">{profile.exam_type} {profile.exam_session}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge enabled={!!profile.monitoring_enabled} />
          <button
            onClick={deleteProfile}
            className="text-xs text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-colors"
            title="Delete this profile and result"
          >
            🗑️ Delete
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-500 mt-2">
        Roll No: <span className="font-mono">{maskRoll(profile.roll_number)}</span>
      </p>

      <div className="flex flex-wrap items-center gap-2 mt-2">
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
          ⚡ Every {profile.monitoring_interval || 2} min
        </span>
        {profile.active_window_enabled ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            ⏰ {profile.active_window_start || '16:00'} – {profile.active_window_end || '20:00'} IST
          </span>
        ) : (
          <span className="inline-flex items-center text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
            24/7 All Day
          </span>
        )}
      </div>

      <div className="text-xs text-gray-400 mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <span>Last checked: {fmtDate(profile.last_checked_at)}</span>
        <span>Next check: {fmtDate(profile.next_check_at)}</span>
      </div>

      {latestResult ? (
        <div className="mt-4 rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 p-4">
          <div className="flex justify-between items-center">
            <p className="font-semibold text-green-800 dark:text-green-300">🎉 RESULT DECLARED</p>
            <button
              onClick={deleteLatestResult}
              className="text-xs text-red-500 hover:text-red-700 hover:underline"
            >
              Delete Result
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
            <div><span className="text-gray-500">SGPA</span><div className="font-semibold">{latestResult.sgpa ?? '—'}</div></div>
            <div><span className="text-gray-500">CGPA</span><div className="font-semibold">{latestResult.cgpa ?? '—'}</div></div>
            <div><span className="text-gray-500">Status</span><div className="font-semibold">{latestResult.result_status}</div></div>
          </div>
          <div className="flex gap-3 mt-3">
            <Link to={`/results/${latestResult.id}`} className="text-sm text-brand-600 hover:underline">View Result</Link>
            <a href={api.resultPdfUrl(latestResult.id)} className="text-sm text-brand-600 hover:underline">Download PDF</a>
            <Link to={`/results/${latestResult.id}/print`} className="text-sm text-brand-600 hover:underline">Print</Link>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 p-4 text-sm text-gray-600 dark:text-gray-400">
          ⏳ Result Not Declared — we are automatically monitoring the SGBAU result portal. You don't need to keep checking manually.
        </div>
      )}

      {outcome && !latestResult && (
        <p className="text-sm mt-3">
          {outcome.status === 'RESULT_NOT_DECLARED' && 'No result found yet. The result may not have been declared. Automatic monitoring remains active.'}
          {outcome.status === 'RESULT_FAILED' && `Unable to check the result right now: ${outcome.message}`}
          {outcome.status === 'RESULT_REQUIRES_VERIFICATION' && 'A result was found but could not be verified against this profile.'}
        </p>
      )}

      <button
        onClick={checkNow}
        disabled={checking}
        className="mt-4 rounded-md bg-brand-600 text-white text-sm px-4 py-2 hover:bg-brand-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        {checking ? 'Checking SGBAU result…' : 'Check Now'}
      </button>
    </div>
  );
}

function ordSuffix(n) {
  const v = parseInt(n, 10) % 100;
  if (v >= 11 && v <= 13) return 'th';
  switch (parseInt(n, 10) % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}
function shortBranch(b) {
  return /computer science/i.test(b || '') ? 'CSE' : b;
}
function maskRoll(r) {
  if (!r) return '';
  return r.length > 6 ? `${r.slice(0, 4)}****${r.slice(-2)}` : r;
}
function fmtDate(d) {
  if (!d) return '—';
  const isoStr = String(d).replace(' ', 'T');
  const dt = new Date(isoStr.endsWith('Z') ? isoStr : `${isoStr}Z`);
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function Dashboard() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    api.listProfiles().then(({ profiles: p }) => setProfiles(p)).finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold">Hello, {user?.name?.split(' ')[0] || 'Student'} 👋</h1>
        <div className="flex items-center gap-3">
          <Link
            to="/instant-check"
            className="text-sm rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 font-medium flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <span>⚡</span> Check Declared Result
          </Link>
          <Link to="/profiles/new" className="text-sm rounded-md bg-brand-600 text-white px-4 py-2 hover:bg-brand-700 font-medium">
            + Add Profile
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : profiles.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
          <p className="text-gray-500 mb-4">You aren't monitoring any results yet.</p>
          <div className="flex justify-center gap-3">
            <Link to="/instant-check" className="rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 font-medium">
              ⚡ Check Declared Result
            </Link>
            <Link to="/profiles/new" className="rounded-md bg-brand-600 text-white px-4 py-2 hover:bg-brand-700">
              Add your first profile
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {profiles.map((p) => (
            <ProfileCard key={p.id} profile={p} onChecked={load} />
          ))}
        </div>
      )}
    </AppLayout>
  );
}
