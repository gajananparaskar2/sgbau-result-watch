import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout.jsx';
import { api } from '../services/api.js';
import { ALL_COURSES, ALL_NEP_BE_VALUE, SESSIONS, SEMESTERS } from '../constants/courses.js';

const DEFAULTS = {
  university: 'Sant Gadge Baba Amravati University',
  roll_number: '',
  student_name: '',
  course: ALL_NEP_BE_VALUE,
  branch: 'Engineering',
  curriculum: 'NEP',
  semester: '4',
  exam_type: 'Regular',
  exam_session: 'Summer 2026',
  academic_year: '',
  monitoring_interval: 2,
  active_window_enabled: false,
  active_window_start: '16:00',
  active_window_end: '20:00'
};

const INTERVALS = [
  [2, '2 minutes (⚡ Ultra Fast)'],
  [5, '5 minutes (Fast)'],
  [15, '15 minutes'],
  [30, '30 minutes'],
  [60, '1 hour'],
  [360, '6 hours'],
  [720, '12 hours'],
  [1440, '24 hours']
];

export function AddProfile() {
  const navigate = useNavigate();
  const [form, setForm] = useState(DEFAULTS);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setChecked = (k) => (e) => setForm({ ...form, [k]: e.target.checked });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { profile } = await api.createProfile({
        ...form,
        monitoring_interval: parseInt(form.monitoring_interval, 10),
        active_window_enabled: form.active_window_enabled ? 1 : 0
      });
      navigate(`/dashboard?created=${profile.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const applyPeakHours = () => {
    setForm((f) => ({
      ...f,
      active_window_enabled: true,
      active_window_start: '16:00',
      active_window_end: '20:00'
    }));
  };

  const field = (key, label, opts = {}) => (
    <div>
      <label htmlFor={key} className="block text-sm font-medium mb-1">{label}</label>
      {opts.select ? (
        <select
          id={key}
          value={form[key]}
          onChange={set(key)}
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
        >
          {opts.options.map((o) => {
            const [value, label] = Array.isArray(o) ? o : [o, o];
            return (
              <option key={value} value={value}>{label}</option>
            );
          })}
        </select>
      ) : (
        <input
          id={key}
          type={opts.type || 'text'}
          required={opts.required}
          value={form[key]}
          onChange={set(key)}
          placeholder={opts.placeholder}
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
        />
      )}
    </div>
  );

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto pb-12">
        <h1 className="text-2xl font-semibold mb-1">Add Result Profile</h1>
        <p className="text-sm text-gray-500 mb-6">
          Configure automated background monitoring for your roll number.
        </p>
        <form onSubmit={onSubmit} className="space-y-5">
          {field('university', 'University')}
          {field('roll_number', 'Roll Number', { required: true, placeholder: 'e.g. 25BD310555' })}
          {field('student_name', 'Student Name (optional, for reference only)')}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {field('course', 'Course', {
              select: true,
              options: ALL_COURSES.map((c) => [c.value, c.label])
            })}
            {field('branch', 'Branch (optional, e.g. CSE / IT)')}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {field('curriculum', 'Curriculum')}
            {field('semester', 'Semester', {
              select: true,
              options: SEMESTERS.map((s) => [s.value, s.label])
            })}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {field('exam_type', 'Exam Type', { select: true, options: ['Regular', 'Back', 'Reval', 'EVS'] })}
            {field('exam_session', 'Exam Session', {
              select: true,
              options: SESSIONS.map((s) => [s, s])
            })}
          </div>
          {field('academic_year', 'Academic Year (optional)')}

          {/* Monitoring Schedule Section */}
          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 space-y-4">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2">
              <span>⏱️</span> Monitoring Schedule & Active Hours
            </h3>

            {field('monitoring_interval', 'Check Interval', {
              select: true,
              options: INTERVALS
            })}

            <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active_window_enabled}
                  onChange={setChecked('active_window_enabled')}
                  className="mt-0.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <span className="text-sm font-medium block">
                    Check only during specific hours in a day
                  </span>
                  <span className="text-xs text-gray-500 block">
                    Restrict background portal checks to a custom time range (e.g. 4:00 PM – 8:00 PM).
                  </span>
                </div>
              </label>

              {form.active_window_enabled && (
                <div className="mt-3 pl-6 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Start Time (IST)
                      </label>
                      <input
                        type="time"
                        value={form.active_window_start}
                        onChange={set('active_window_start')}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        End Time (IST)
                      </label>
                      <input
                        type="time"
                        value={form.active_window_end}
                        onChange={set('active_window_end')}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={applyPeakHours}
                    className="text-xs text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1 hover:underline"
                  >
                    ⚡ Use SGBAU Peak Declaration Window (4:00 PM – 8:00 PM)
                  </button>
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-brand-600 text-white py-2 font-medium hover:bg-brand-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
          >
            {submitting ? 'Starting monitoring…' : 'Start Monitoring'}
          </button>
        </form>
      </div>
    </AppLayout>
  );
}
