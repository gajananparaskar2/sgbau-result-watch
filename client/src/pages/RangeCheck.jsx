import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout.jsx';
import { api } from '../services/api.js';
import { ALL_COURSES, ALL_NEP_BE_VALUE, SESSIONS, SEMESTERS } from '../constants/courses.js';

const MAX_ROLLS = 15;

function parseRange(startStr, endStr) {
  const start = String(startStr || '').trim().toUpperCase();
  const end = String(endStr || '').trim().toUpperCase();

  if (!start || !end) return { valid: false, count: 0, rolls: [], error: null };

  const startMatch = start.match(/^(.*?)(\d+)$/);
  const endMatch = end.match(/^(.*?)(\d+)$/);

  if (!startMatch || !endMatch) {
    return { valid: false, count: 0, rolls: [], error: 'Roll numbers must end with numeric digits (e.g. 25BD310550).' };
  }

  const [_, prefixStart, numStartStr] = startMatch;
  const [__, prefixEnd, numEndStr] = endMatch;

  if (prefixStart !== prefixEnd) {
    return { valid: false, count: 0, rolls: [], error: `Prefix mismatch: "${prefixStart}" vs "${prefixEnd}". Both roll numbers must share the exact same prefix.` };
  }

  const numStart = parseInt(numStartStr, 10);
  const numEnd = parseInt(numEndStr, 10);

  if (numEnd < numStart) {
    return { valid: false, count: 0, rolls: [], error: 'End roll number must be greater than or equal to start roll number.' };
  }

  const count = numEnd - numStart + 1;
  if (count > MAX_ROLLS) {
    return { valid: false, count, rolls: [], error: `Selected range has ${count} roll numbers. Maximum allowed is ${MAX_ROLLS} roll numbers per batch to prevent university firewall limits.` };
  }

  const padLength = numStartStr.length;
  const rolls = [];
  for (let i = numStart; i <= numEnd; i++) {
    rolls.push(prefixStart + String(i).padStart(padLength, '0'));
  }

  return { valid: true, count, rolls, error: null };
}

export function RangeCheck() {
  const [form, setForm] = useState({
    session: 'Summer 2026',
    course: ALL_NEP_BE_VALUE,
    semester: '4',
    examType: 'Regular',
    startRoll: '25BD310550',
    endRoll: '25BD310560'
  });

  const [isRunning, setIsRunning] = useState(false);
  const [currentChecking, setCurrentChecking] = useState('');
  const [progressIndex, setProgressIndex] = useState(0);
  const [resultsList, setResultsList] = useState([]);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);
  const stopRequested = useRef(false);

  const parsed = parseRange(form.startRoll, form.endRoll);

  const setField = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
  };

  const startBatchCheck = async (e) => {
    e.preventDefault();
    if (!parsed.valid) return;

    setIsRunning(true);
    stopRequested.current = false;
    setResultsList([]);
    setProgressIndex(0);

    const rollsToCheck = parsed.rolls;

    for (let i = 0; i < rollsToCheck.length; i++) {
      if (stopRequested.current) {
        break;
      }

      const roll = rollsToCheck[i];
      setCurrentChecking(roll);
      setProgressIndex(i + 1);

      try {
        const res = await api.checkInstant({
          roll_number: roll,
          exam_session: form.session,
          course: form.course,
          semester: form.semester,
          exam_type: form.examType
        });

        const entry = {
          rollNumber: roll,
          status: res.status,
          message: res.message || '',
          data: res.data || null,
          pdfDownloadUrl: res.pdfDownloadUrl || null,
          pdfFilename: res.pdfFilename || null
        };

        setResultsList((prev) => [...prev, entry]);
      } catch (err) {
        setResultsList((prev) => [
          ...prev,
          {
            rollNumber: roll,
            status: 'RESULT_FAILED',
            message: err.message || 'Network error or portal timeout',
            data: null
          }
        ]);
      }

      // Polite delay between queries (1.5s) to protect IP from SGBAU rate-limiting
      if (i < rollsToCheck.length - 1 && !stopRequested.current) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    setIsRunning(false);
    setCurrentChecking('');
  };

  const handleStop = () => {
    stopRequested.current = true;
    setIsRunning(false);
  };

  // Export Results to CSV
  const exportToCSV = () => {
    if (resultsList.length === 0) return;
    const headers = ['Roll Number', 'Student Name', 'SGPA', 'Status', 'Backlogs', 'Semester', 'Course'];
    const rows = resultsList.map((r) => [
      `"${r.rollNumber}"`,
      `"${r.data?.student_name || 'N/A'}"`,
      `"${r.data?.sgpa ?? ''}"`,
      `"${r.data?.result_status_text || r.status}"`,
      `"${r.data?.backlogs ?? ''}"`,
      `"Sem ${form.semester}"`,
      `"${form.course}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SGBAU_Range_Results_${form.startRoll}_to_${form.endRoll}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Summary statistics
  const totalChecked = resultsList.length;
  const totalPassed = resultsList.filter((r) => r.data?.result_status_text === 'PASS').length;
  const totalBacklogs = resultsList.filter((r) => (r.data?.backlogs || 0) > 0).length;
  const sgpas = resultsList.map((r) => parseFloat(r.data?.sgpa)).filter((v) => !isNaN(v));
  const avgSgpa = sgpas.length > 0 ? (sgpas.reduce((a, b) => a + b, 0) / sgpas.length).toFixed(2) : null;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-16">
        {/* Navigation Tabs between Single and Range Check */}
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          <Link
            to="/instant-check"
            className="py-3 px-6 text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border-b-2 border-transparent"
          >
            🔍 Single Roll Number
          </Link>
          <div
            className="py-3 px-6 text-sm font-semibold text-brand-600 dark:text-brand-400 border-b-2 border-brand-600 flex items-center gap-2"
          >
            <span>📋</span> Roll Range Check (Max 15)
            <span className="px-2 py-0.5 text-xs rounded-full bg-brand-100 dark:bg-brand-900/60 text-brand-800 dark:text-brand-200 font-bold">
              Safe Mode
            </span>
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Check Roll Number Range</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Check official results for up to 15 students in a sequential range with built-in safe delays (1.5s) to protect your IP from SGBAU rate limits.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <form onSubmit={startBatchCheck} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                  Exam Session
                </label>
                <select
                  value={form.session}
                  onChange={setField('session')}
                  disabled={isRunning}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
                >
                  {SESSIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                  Course & Branch
                </label>
                <select
                  value={form.course}
                  onChange={setField('course')}
                  disabled={isRunning}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 font-medium"
                >
                  {ALL_COURSES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                  Semester
                </label>
                <select
                  value={form.semester}
                  onChange={setField('semester')}
                  disabled={isRunning}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
                >
                  {SEMESTERS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                  Exam Type
                </label>
                <select
                  value={form.examType}
                  onChange={setField('examType')}
                  disabled={isRunning}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Regular">Regular</option>
                  <option value="Back">Back</option>
                  <option value="Reval">Reval</option>
                  <option value="EVS">EVS</option>
                </select>
              </div>
            </div>

            {/* Start and End Roll inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Start Roll Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 25BD310550"
                  value={form.startRoll}
                  onChange={setField('startRoll')}
                  disabled={isRunning}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-mono font-medium focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  End Roll Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 25BD310560"
                  value={form.endRoll}
                  onChange={setField('endRoll')}
                  disabled={isRunning}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-mono font-medium focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Validation & Count Feedback */}
            <div className="pt-2">
              {parsed.error ? (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                  <span>⚠️</span> {parsed.error}
                </div>
              ) : parsed.valid ? (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between">
                  <span>
                    ✅ Valid range: <strong>{parsed.count} roll numbers</strong> ({parsed.rolls[0]} to {parsed.rolls[parsed.rolls.length - 1]})
                  </span>
                  <span className="text-xs text-gray-500">Max limit: 15</span>
                </div>
              ) : null}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={!parsed.valid || isRunning}
                className="px-6 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
              >
                {isRunning ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Checking Range…
                  </>
                ) : (
                  <>
                    <span>🚀</span> Check Range ({parsed.count || 0} Students)
                  </>
                )}
              </button>

              {isRunning && (
                <button
                  type="button"
                  onClick={handleStop}
                  className="px-4 py-2.5 rounded-lg border border-red-300 dark:border-red-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 text-sm font-medium"
                >
                  🛑 Stop Check
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Real-Time Progress Box */}
        {isRunning && (
          <div className="p-4 rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50/50 dark:bg-brand-950/40 space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-brand-800 dark:text-brand-200">
              <span>Checking {progressIndex} of {parsed.count}: <code className="font-mono">{currentChecking}</code></span>
              <span>{Math.round((progressIndex / parsed.count) * 100)}%</span>
            </div>
            <div className="w-full bg-brand-200 dark:bg-brand-900 rounded-full h-2 overflow-hidden">
              <div
                className="bg-brand-600 h-2 transition-all duration-300 rounded-full"
                style={{ width: `${(progressIndex / parsed.count) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Paced with 1.5s delay between requests to protect your connection from SGBAU firewall blocks.
            </p>
          </div>
        )}

        {/* Results Section */}
        {resultsList.length > 0 && (
          <div className="space-y-4">
            {/* Statistics Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center">
                <div className="text-xs text-gray-500 uppercase font-semibold">Total Checked</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalChecked}</div>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center">
                <div className="text-xs text-emerald-600 uppercase font-semibold">Passed</div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{totalPassed}</div>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center">
                <div className="text-xs text-amber-600 uppercase font-semibold">Backlogs / ATKT</div>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{totalBacklogs}</div>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center">
                <div className="text-xs text-brand-600 uppercase font-semibold">Batch Avg SGPA</div>
                <div className="text-2xl font-bold text-brand-700 dark:text-brand-300 mt-1">{avgSgpa || '—'}</div>
              </div>
            </div>

            {/* Results Table Header & CSV Export */}
            <div className="flex justify-between items-center pt-2">
              <h2 className="text-lg font-bold">Class Results Summary</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setResultsList([])}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800/60 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-medium shadow-sm transition-colors"
                >
                  <span>🗑️</span> Clear Table
                </button>
                <button
                  onClick={exportToCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-medium shadow-sm"
                >
                  <span>📥</span> Export Table to CSV
                </button>
              </div>
            </div>

            {/* Results Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/60 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="p-3 w-10">#</th>
                      <th className="p-3">Roll Number</th>
                      <th className="p-3">Student Name</th>
                      <th className="p-3 text-center">SGPA</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Backlogs</th>
                      <th className="p-3 text-right">Scorecard & Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {resultsList.map((r, idx) => {
                      const student = r.data;
                      const isPass = student?.result_status_text === 'PASS';
                      const isDeclared = r.status === 'RESULT_FOUND';

                      return (
                        <tr key={r.rollNumber} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                          <td className="p-3 text-gray-400 font-mono text-xs">{idx + 1}</td>
                          <td className="p-3 font-mono font-semibold text-gray-900 dark:text-white">
                            {r.rollNumber}
                          </td>
                          <td className="p-3">
                            {student ? (
                              <button
                                onClick={() => setSelectedStudentDetail(student)}
                                className="font-medium text-left hover:text-brand-600 hover:underline"
                              >
                                {student.student_name || 'View Details'}
                              </button>
                            ) : (
                              <span className="text-gray-400 italic text-xs">{r.message || 'Not Found'}</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {student?.sgpa ? (
                              <span className="font-bold font-mono text-brand-600 dark:text-brand-400">
                                {student.sgpa}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {isDeclared ? (
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  isPass
                                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                                }`}
                              >
                                {student.result_status_text || 'FOUND'}
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                Not Declared
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center font-mono">
                            {student?.backlogs !== undefined ? student.backlogs : '—'}
                          </td>
                          <td className="p-3 text-right space-x-2">
                            {student && (
                              <button
                                onClick={() => setSelectedStudentDetail(student)}
                                className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                Marks
                              </button>
                            )}
                            {r.pdfDownloadUrl ? (
                              <a
                                href={r.pdfDownloadUrl}
                                download={r.pdfFilename || 'SGBAU_Result.pdf'}
                                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-brand-600 hover:bg-brand-700 text-white font-medium shadow-xs"
                              >
                                <span>⬇️</span> PDF
                              </a>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => setResultsList((prev) => prev.filter((item) => item.rollNumber !== r.rollNumber))}
                              title="Delete from list"
                              className="text-xs px-2 py-1 rounded border border-red-200 dark:border-red-900/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Marks Modal */}
        {selectedStudentDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-3xl w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-700 pb-3">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedStudentDetail.student_name}
                  </h3>
                  <p className="text-xs text-gray-500 font-mono">
                    Roll No: <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedStudentDetail.roll_number}</span> | SGPA: <span className="font-semibold text-brand-600">{selectedStudentDetail.sgpa || '—'}</span> | Result: <span className="font-semibold text-emerald-600">{selectedStudentDetail.result_status_text}</span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedStudentDetail(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              {/* Subject Breakdown Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-900/60 text-left font-semibold text-gray-500">
                    <tr>
                      <th className="p-2">Subject Name</th>
                      <th className="p-2 text-center">Type</th>
                      <th className="p-2 text-center">Int / Ext</th>
                      <th className="p-2 text-center">Total</th>
                      <th className="p-2 text-center">Grade</th>
                      <th className="p-2 text-center">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {(selectedStudentDetail.subjects || []).map((sub, i) => (
                      <tr key={i}>
                        <td className="p-2 font-medium">{sub.subject_name}</td>
                        <td className="p-2 text-center text-gray-500">{sub.subject_type || '—'}</td>
                        <td className="p-2 text-center">{sub.internal_marks ?? '—'} / {sub.external_marks ?? '—'}</td>
                        <td className="p-2 text-center font-bold">{sub.total_marks ?? '—'}</td>
                        <td className="p-2 text-center font-bold text-brand-600">{sub.grade ?? '—'}</td>
                        <td className="p-2 text-center">{sub.grade_points ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedStudentDetail(null)}
                  className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-semibold hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
