import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout.jsx';
import { api } from '../services/api.js';

export function Results() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    api.listResults().then(({ results: r }) => {
      setResults(r);
      setSelectedIds(new Set());
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isAllSelected = results.length > 0 && selectedIds.size === results.length;
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(results.map((r) => r.id)));
    }
  };

  const handleBatchDelete = async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    if (!confirm(`Are you sure you want to delete ${count} selected result(s)? This will remove them from your history.`)) {
      return;
    }
    setDeleting(true);
    try {
      await api.deleteResultsBatch(Array.from(selectedIds));
      await load();
    } catch (err) {
      alert(err.message || 'Failed to delete results.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteOne = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this result from history?')) return;
    try {
      await api.deleteResult(id);
      await load();
    } catch (err) {
      alert(err.message || 'Failed to delete result.');
    }
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Result History</h1>
          <p className="text-sm text-gray-500">Official verified results detected and saved for your profiles.</p>
        </div>
      </div>

      {/* Multi-Selection Batch Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-sm shadow-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-amber-900 dark:text-amber-200">
              Selected: {selectedIds.size} of {results.length} result(s)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchDelete}
              disabled={deleting}
              className="px-4 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs disabled:opacity-60 flex items-center gap-1.5"
            >
              <span>🗑️</span> {deleting ? 'Deleting…' : `Delete Selected (${selectedIds.size})`}
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
      ) : results.length === 0 ? (
        <p className="text-gray-500">No results detected yet. Once SGBAU declares your result, it will appear here.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-gray-500 px-1">
            <input
              type="checkbox"
              id="selectAllResults"
              checked={isAllSelected}
              onChange={toggleSelectAll}
              className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
            />
            <label htmlFor="selectAllResults" className="cursor-pointer font-medium">
              Select All Results ({results.length})
            </label>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {results.map((r) => {
              const isChecked = selectedIds.has(r.id);
              return (
                <div
                  key={r.id}
                  className={`rounded-xl border transition-colors bg-white dark:bg-gray-900 p-4 relative flex flex-col justify-between ${
                    isChecked
                      ? 'border-amber-400 dark:border-amber-600 bg-amber-50/40 dark:bg-amber-950/20'
                      : 'border-gray-200 dark:border-gray-800 hover:border-brand-500'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectOne(r.id)}
                        className="mt-1 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      />
                      <div>
                        <Link to={`/results/${r.id}`} className="font-semibold text-base hover:text-brand-600 hover:underline">
                          Semester {r.semester} — {r.exam_type} {r.exam_session}
                        </Link>
                        <p className="text-sm text-gray-500 mt-1">
                          SGPA <span className="font-bold text-brand-600">{r.sgpa ?? '—'}</span> {r.cgpa ? `· CGPA ${r.cgpa}` : ''} {r.result_status ? `· ${r.result_status}` : ''}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          Detected {new Date(`${r.created_at}Z`).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleDeleteOne(r.id, e)}
                      className="text-xs text-red-500 hover:text-red-700 p-1 hover:bg-red-50 dark:hover:bg-red-950/40 rounded"
                      title="Delete this result"
                    >
                      🗑️
                    </button>
                  </div>

                  <div className="flex items-center gap-3 pt-3 mt-3 border-t border-gray-100 dark:border-gray-800 text-xs">
                    <Link to={`/results/${r.id}`} className="text-brand-600 hover:underline font-medium">
                      View Details →
                    </Link>
                    <a href={api.resultPdfUrl(r.id)} className="text-brand-600 hover:underline font-medium">
                      Download PDF
                    </a>
                    <Link to={`/results/${r.id}/print`} className="text-gray-500 hover:underline">
                      Print
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </AppLayout>
  );
}

