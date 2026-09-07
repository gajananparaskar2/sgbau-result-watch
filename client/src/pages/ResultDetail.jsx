import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout.jsx';
import { ResultView } from '../components/ResultView.jsx';
import { api } from '../services/api.js';

export function ResultDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.getResult(id).then(setData).catch((e) => setError(e.message));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this result?')) return;
    setDeleting(true);
    try {
      await api.deleteResult(id);
      navigate('/results');
    } catch (err) {
      alert(err.message || 'Failed to delete result');
      setDeleting(false);
    }
  };

  return (
    <AppLayout>
      {error && <p className="text-red-600">{error}</p>}
      {data && (
        <>
          <div className="no-print flex items-center justify-between gap-4 mb-6">
            <div className="flex gap-4">
              <a href={api.resultPdfUrl(id)} className="rounded-md bg-brand-600 text-white text-sm px-4 py-2 hover:bg-brand-700 font-medium shadow-xs">
                Download PDF
              </a>
              <Link to={`/results/${id}/print`} className="rounded-md bg-gray-100 dark:bg-gray-800 text-sm px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-700 font-medium">
                Print
              </Link>
            </div>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-md bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 text-sm px-4 py-2 font-medium transition-colors"
            >
              {deleting ? 'Deleting…' : '🗑️ Delete Result'}
            </button>
          </div>
          <div className="max-w-3xl bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <ResultView result={data.result} subjects={data.subjects} />
          </div>
        </>
      )}
    </AppLayout>
  );
}
