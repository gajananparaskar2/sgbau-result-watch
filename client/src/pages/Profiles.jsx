import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout.jsx';
import { api } from '../services/api.js';

const INTERVAL_OPTIONS = [
  [2, '2 minutes (⚡ Ultra Fast)'],
  [5, '5 minutes (Fast)'],
  [15, '15 minutes'],
  [30, '30 minutes'],
  [60, '1 hour'],
  [360, '6 hours'],
  [720, '12 hours'],
  [1440, '24 hours']
];

export function Profiles() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [editForm, setEditForm] = useState({
    monitoring_interval: 2,
    active_window_enabled: false,
    active_window_start: '16:00',
    active_window_end: '20:00'
  });
  const [saving, setSaving] = useState(false);

  const load = () => api.listProfiles().then(({ profiles: p }) => {
    setProfiles(p);
    setSelectedIds(new Set());
  }).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isAllSelected = profiles.length > 0 && selectedIds.size === profiles.length;
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(profiles.map((p) => p.id)));
    }
  };

  const handleBatchDelete = async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    if (!confirm(`Are you sure you want to delete ${count} selected profile(s) and their saved results? This cannot be undone.`)) {
      return;
    }
    setIsBatchDeleting(true);
    try {
      await api.deleteProfilesBatch(Array.from(selectedIds));
      await load();
    } catch (err) {
      alert(err.message || 'Failed to delete selected profiles.');
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const handleBatchToggleMonitoring = async (enable) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      await Promise.all(ids.map((id) => api.updateProfile(id, { monitoring_enabled: enable ? 1 : 0 })));
      await load();
    } catch (err) {
      alert(err.message || 'Failed to update monitoring status.');
    }
  };

  const toggleMonitoring = async (p) => {
    await api.updateProfile(p.id, { monitoring_enabled: p.monitoring_enabled ? 0 : 1 });
    load();
  };

  const remove = async (p) => {
    if (!confirm(`Remove profile for roll ${p.roll_number}? This cannot be undone.`)) return;
    await api.deleteProfile(p.id);
    load();
  };

  const openEdit = (p) => {
    setEditingProfile(p);
    setEditForm({
      monitoring_interval: p.monitoring_interval || 2,
      active_window_enabled: !!p.active_window_enabled,
      active_window_start: p.active_window_start || '16:00',
      active_window_end: p.active_window_end || '20:00'
    });
  };

  const saveSchedule = async (e) => {
    e.preventDefault();
    if (!editingProfile) return;
    setSaving(true);
    try {
      await api.updateProfile(editingProfile.id, {
        monitoring_interval: parseInt(editForm.monitoring_interval, 10),
        active_window_enabled: editForm.active_window_enabled ? 1 : 0,
        active_window_start: editForm.active_window_start,
        active_window_end: editForm.active_window_end
      });
      setEditingProfile(null);
      await load();
    } catch (err) {
      alert(err.message || 'Failed to update schedule');
    } finally {
      setSaving(false);
    }
  };

  const formatSchedule = (p) => {
    const intervalStr = `${p.monitoring_interval || 2}m`;
    if (p.active_window_enabled) {
      return (
        <span className="inline-flex items-center gap-1">
          <span className="font-semibold text-brand-600 dark:text-brand-400">{intervalStr}</span>
          <span className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
            ⏰ {p.active_window_start || '16:00'}–{p.active_window_end || '20:00'}
          </span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1">
        <span className="font-semibold text-brand-600 dark:text-brand-400">{intervalStr}</span>
        <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
          24/7
        </span>
      </span>
    );
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Student Profiles</h1>
          <p className="text-sm text-gray-500">Manage registered roll numbers, automated monitoring, and batch actions.</p>
        </div>
        <Link to="/profiles/new" className="text-sm rounded-md bg-brand-600 text-white px-4 py-2 hover:bg-brand-700 shadow-sm">
          + Add Profile
        </Link>
      </div>

      {/* Multi-Selection Batch Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-sm shadow-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-amber-900 dark:text-amber-200">
              Selected: {selectedIds.size} of {profiles.length} profile(s)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBatchToggleMonitoring(true)}
              className="px-3 py-1.5 rounded-md bg-white dark:bg-gray-800 text-xs font-medium border border-gray-300 dark:border-gray-600 hover:bg-gray-50 text-green-700 dark:text-green-400 shadow-2xs"
            >
              ▶️ Resume All
            </button>
            <button
              onClick={() => handleBatchToggleMonitoring(false)}
              className="px-3 py-1.5 rounded-md bg-white dark:bg-gray-800 text-xs font-medium border border-gray-300 dark:border-gray-600 hover:bg-gray-50 text-gray-700 dark:text-gray-300 shadow-2xs"
            >
              ⏸️ Pause All
            </button>
            <button
              onClick={handleBatchDelete}
              disabled={isBatchDeleting}
              className="px-4 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs disabled:opacity-60 flex items-center gap-1.5"
            >
              <span>🗑️</span> {isBatchDeleting ? 'Deleting…' : `Delete Selected (${selectedIds.size})`}
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-2 py-1"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    title="Select all profiles"
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                  />
                </th>
                <th className="p-3">Roll No</th>
                <th className="p-3">Course / Branch</th>
                <th className="p-3">Semester</th>
                <th className="p-3">Exam</th>
                <th className="p-3">Status</th>
                <th className="p-3">Check Schedule</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {profiles.map((p) => {
                const isChecked = selectedIds.has(p.id);
                return (
                  <tr
                    key={p.id}
                    className={`transition-colors ${
                      isChecked
                        ? 'bg-amber-50/60 dark:bg-amber-950/30'
                        : 'hover:bg-gray-50/50 dark:hover:bg-gray-800/40'
                    }`}
                  >
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectOne(p.id)}
                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      />
                    </td>
                    <td className="p-3 font-mono font-medium">{p.roll_number}</td>
                    <td className="p-3">{p.course} — {p.branch}</td>
                    <td className="p-3">Sem {p.semester}</td>
                    <td className="p-3">{p.exam_type} {p.exam_session}</td>
                    <td className="p-3">
                      <button
                        onClick={() => toggleMonitoring(p)}
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          p.monitoring_enabled
                            ? 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300 hover:bg-green-200'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        {p.monitoring_enabled ? 'Active' : 'Paused'}
                      </button>
                    </td>
                    <td className="p-3">
                      {formatSchedule(p)}
                    </td>
                    <td className="p-3 text-right space-x-3">
                      <button
                        onClick={() => openEdit(p)}
                        className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium"
                      >
                        ⚙️ Edit Schedule
                      </button>
                      <button
                        onClick={() => remove(p)}
                        className="text-xs text-red-600 hover:underline font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {profiles.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-gray-500">No profiles yet. Click "+ Add Profile" to start.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Schedule Modal */}
      {editingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                Edit Schedule ({editingProfile.roll_number})
              </h3>
              <button
                onClick={() => setEditingProfile(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={saveSchedule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Check Interval</label>
                <select
                  value={editForm.monitoring_interval}
                  onChange={(e) => setEditForm({ ...editForm, monitoring_interval: e.target.value })}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                >
                  {INTERVAL_OPTIONS.map(([val, lbl]) => (
                    <option key={val} value={val}>{lbl}</option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.active_window_enabled}
                    onChange={(e) => setEditForm({ ...editForm, active_window_enabled: e.target.checked })}
                    className="mt-0.5 rounded border-gray-300 text-brand-600"
                  />
                  <div>
                    <span className="text-sm font-medium block">Restrict to specific time range</span>
                    <span className="text-xs text-gray-500 block">Check only during chosen hours in a day (e.g. 4 PM - 8 PM).</span>
                  </div>
                </label>

                {editForm.active_window_enabled && (
                  <div className="pl-6 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">Start Time (IST)</label>
                        <input
                          type="time"
                          value={editForm.active_window_start}
                          onChange={(e) => setEditForm({ ...editForm, active_window_start: e.target.value })}
                          className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">End Time (IST)</label>
                        <input
                          type="time"
                          value={editForm.active_window_end}
                          onChange={(e) => setEditForm({ ...editForm, active_window_end: e.target.value })}
                          className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, active_window_enabled: true, active_window_start: '16:00', active_window_end: '20:00' })}
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium hover:underline"
                    >
                      ⚡ Set SGBAU Peak Hours (4:00 PM – 8:00 PM)
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProfile(null)}
                  className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
