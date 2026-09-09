import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout.jsx';
import { api } from '../services/api.js';
import { ALL_COURSES, ALL_NEP_BE_VALUE, SESSIONS, SEMESTERS } from '../constants/courses.js';

export function InstantCheck() {
  const [form, setForm] = useState({
    session: 'Summer 2026',
    course: ALL_NEP_BE_VALUE,
    semester: '4',
    examType: 'Regular',
    rollNumber: '25BD310555'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultOutcome, setResultOutcome] = useState(null);

  const setField = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
  };

  const onSearch = async (e) => {
    e.preventDefault();
    setError('');
    setResultOutcome(null);
    setLoading(true);

    try {
      const res = await api.checkInstant({
        roll_number: form.rollNumber,
        exam_session: form.session,
        course: form.course,
        semester: form.semester,
        exam_type: form.examType
      });

      setResultOutcome(res);
      if (res.status !== 'RESULT_FOUND' && res.message) {
        setError(res.message);
      }
    } catch (err) {
      setError(err.message || 'Failed to query SGBAU result.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const student = resultOutcome?.data;
  const subjects = student?.subjects || [];

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* Navigation Tabs between Single and Range Check */}
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          <div
            className="py-3 px-6 text-sm font-semibold text-brand-600 dark:text-brand-400 border-b-2 border-brand-600 flex items-center gap-2"
          >
            <span>🔍</span> Single Roll Number
          </div>
          <Link
            to="/range-check"
            className="py-3 px-6 text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border-b-2 border-transparent flex items-center gap-2"
          >
            <span>📋</span> Roll Range Check (Max 15)
            <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-bold">
              Safe Mode
            </span>
          </Link>
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Check Declared Result</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Directly search SGBAU for officially declared results and instantly download the verified PDF scorecard.
          </p>
        </div>

        {/* Search Box */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <form onSubmit={onSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Exam Session</label>
                <select
                  value={form.session}
                  onChange={setField('session')}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
                >
                  {SESSIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 flex items-center justify-between">
                  <span>Course & Branch</span>
                  {form.course === ALL_NEP_BE_VALUE && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300 font-semibold">
                      ⚡ Auto-Detect Mode
                    </span>
                  )}
                </label>
                <select
                  value={form.course}
                  onChange={setField('course')}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 font-medium"
                >
                  {ALL_COURSES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                {form.course === ALL_NEP_BE_VALUE && (
                  <p className="text-xs text-brand-600 dark:text-brand-400 mt-1">
                    Auto-scans all SGBAU NEP B.E branches (CSE, AI&DS, Data Science, IT, ETC, Electrical, Mechanical, Civil, Chemical, IoT) to find the result automatically.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Semester</label>
                <select
                  value={form.semester}
                  onChange={setField('semester')}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
                >
                  {SEMESTERS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Result / Exam Type</label>
                <select
                  value={form.examType}
                  onChange={setField('examType')}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Regular">Regular</option>
                  <option value="Back">Back</option>
                  <option value="Reval">Reval</option>
                  <option value="EVS">EVS</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Roll Number <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  required
                  placeholder="e.g. 25BD310555"
                  value={form.rollNumber}
                  onChange={setField('rollNumber')}
                  className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm focus:ring-2 focus:ring-brand-500 font-mono font-medium"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm transition-colors disabled:opacity-60 flex items-center gap-2 shadow-sm"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Checking Portal…
                    </>
                  ) : (
                    <>
                      <span>🔍</span> Check Result
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Error / Not Declared notification */}
        {error && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-sm flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div className="space-y-1">
              <p className="font-semibold">SGBAU Portal Status</p>
              <p>{error}</p>
              {resultOutcome?.status === 'RESULT_NOT_DECLARED' && (
                <div className="pt-2">
                  <Link
                    to={`/profiles/new`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-600 text-white text-xs font-medium hover:bg-brand-700"
                  >
                    Set Up Background Monitoring for this Roll Number →
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Found Result Card */}
        {student && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700 pb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300">
                      OFFICIAL RESULT VERIFIED
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {form.session}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {student.student_name || 'Student Result'}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                    Roll No: <span className="font-semibold text-gray-900 dark:text-white">{student.roll_number}</span>
                  </p>
                </div>

                {/* Score and Quick Actions */}
                <div className="flex flex-wrap items-center gap-3">
                  {student.sgpa && (
                    <div className="px-4 py-2 rounded-lg bg-brand-50 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-800 text-center">
                      <div className="text-xs text-brand-600 dark:text-brand-400 font-semibold uppercase tracking-wider">
                        SGPA
                      </div>
                      <div className="text-2xl font-black text-brand-700 dark:text-brand-300">
                        {student.sgpa}
                      </div>
                    </div>
                  )}

                  {student.result_status_text && (
                    <div className={`px-4 py-2 rounded-lg border text-center ${
                      student.result_status_text === 'PASS'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                        : 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                    }`}>
                      <div className="text-xs font-semibold uppercase tracking-wider">
                        Result
                      </div>
                      <div className="text-2xl font-black">
                        {student.result_status_text}
                      </div>
                    </div>
                  )}

                  {/* Direct PDF Download Button */}
                  {resultOutcome.pdfDownloadUrl && (
                    <a
                      href={resultOutcome.pdfDownloadUrl}
                      download={resultOutcome.pdfFilename || 'SGBAU_Result.pdf'}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm transition-all shadow-sm cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download PDF
                    </a>
                  )}

                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium text-sm transition-all"
                  >
                    🖨️ Print
                  </button>

                  <button
                    onClick={() => { setResultOutcome(null); setError(''); }}
                    className="inline-flex items-center gap-1 px-3 py-2.5 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-sm transition-all font-medium"
                    title="Clear and remove this result from view"
                  >
                    🗑️ Clear
                  </button>
                </div>
              </div>

              {/* Meta details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block text-xs">Branch / Course</span>
                  <span className="font-medium">{student.branch || student.course || form.course}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block text-xs">Semester</span>
                  <span className="font-medium">Sem {student.semester || form.semester}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block text-xs">Backlogs</span>
                  <span className="font-medium">{student.backlogs ?? 0}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block text-xs">Declaration Date</span>
                  <span className="font-medium">{student.result_date || 'Declared'}</span>
                </div>
              </div>
            </div>

            {/* Subject Marks Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 dark:text-white">Subject-wise Scorecard</h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">{subjects.length} Subjects Evaluated</span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-left">
                    <tr>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Subject Name</th>
                      <th className="px-4 py-3 text-center">Credits</th>
                      <th className="px-4 py-3 text-center">Internal (IA)</th>
                      <th className="px-4 py-3 text-center">External (Theory/PR)</th>
                      <th className="px-4 py-3 text-center font-bold">Total</th>
                      <th className="px-4 py-3 text-center">Grade</th>
                      <th className="px-4 py-3 text-center">Grade Point</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {subjects.map((s, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                          {s.subject_code || '—'}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                          {s.subject_name}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">
                          {s.credits ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">
                          {s.internal_marks ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">
                          {s.external_marks ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-gray-900 dark:text-white">
                          {s.total_marks ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-brand-600 dark:text-brand-400">
                          {s.grade || '—'}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">
                          {s.grade_point ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                              s.status === 'PASS'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                            }`}
                          >
                            {s.status || 'PASS'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
