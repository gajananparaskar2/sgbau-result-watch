import React, { useEffect, useState } from 'react';
import { AppLayout } from '../layouts/AppLayout.jsx';
import { api } from '../services/api.js';

export function Admin() {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.adminDashboard().then(setStats);
    api.adminLogs().then(({ logs: l }) => setLogs(l));
  }, []);

  return (
    <AppLayout>
      <h1 className="text-2xl font-semibold mb-6">Admin Dashboard</h1>

      {stats && (
        <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Stat label="Total Users" value={stats.totalUsers} />
          <Stat label="Active Profiles" value={stats.activeProfiles} />
          <Stat label="Results Detected" value={stats.resultsDetected} />
          <Stat label="Successful Checks" value={stats.successfulChecks} />
          <Stat label="Failed Checks" value={stats.failedChecks} />
          <Stat label="Mock Mode" value={stats.mockMode ? 'ON ⚠️' : 'off'} />
        </div>
      )}

      <h2 className="font-semibold mb-3">Recent Monitoring Logs</h2>
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/60 text-left">
            <tr>
              <th className="p-2">Checked At</th>
              <th className="p-2">Roll No</th>
              <th className="p-2">Status</th>
              <th className="p-2">Message</th>
              <th className="p-2">Duration</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="p-2 whitespace-nowrap">{new Date(`${l.checked_at}Z`).toLocaleString('en-IN')}</td>
                <td className="p-2 font-mono">{l.roll_number || '—'}</td>
                <td className="p-2">{l.status}</td>
                <td className="p-2 max-w-sm truncate" title={l.message}>{l.message}</td>
                <td className="p-2">{l.duration_ms} ms</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-gray-500">No monitoring runs yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-center">
      <div className="text-2xl font-bold">{value ?? '—'}</div>
      <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">{label}</div>
    </div>
  );
}
