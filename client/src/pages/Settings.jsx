import React, { useEffect, useState } from 'react';
import { AppLayout } from '../layouts/AppLayout.jsx';
import { api } from '../services/api.js';

export function Settings() {
  const [profiles, setProfiles] = useState([]);
  const [profileId, setProfileId] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.listProfiles().then(({ profiles: p }) => {
      setProfiles(p);
      if (p.length) setProfileId(String(p[0].id));
    });
  }, []);

  const onUpload = async (e) => {
    e.preventDefault();
    if (!file || !profileId) return;
    setUploading(true);
    setStatus(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('profileId', profileId);
      fd.append('rollNumber', rollNumber);
      const res = await api.uploadResult(fd);
      setStatus({ ok: true, message: res.created ? 'Result uploaded and verified.' : (res.message || 'Already recorded.') });
    } catch (err) {
      setStatus({ ok: false, message: err.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppLayout>
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>

      <section className="max-w-xl rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 mb-8">
        <h2 className="font-semibold mb-2">Email Notifications</h2>
        <p className="text-sm text-gray-500">
          Email notifications are configured server-side via the <code>EMAIL_ENABLED</code> environment
          variable by whoever deployed this instance. When enabled, you'll receive an email the moment
          a new verified result is detected for any of your profiles.
        </p>
      </section>

      <section className="max-w-xl rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <h2 className="font-semibold mb-1">Upload Result (fallback)</h2>
        <p className="text-sm text-gray-500 mb-4">
          If SGBAU requires a CAPTCHA or other verification that automatic monitoring can't complete,
          open the official result page yourself, then upload the result PDF or a photo/screenshot here.
        </p>

        <a
          href="https://sgbau.ucanapply.com/result-details"
          target="_blank"
          rel="noreferrer"
          className="inline-block text-sm text-brand-600 hover:underline mb-4"
        >
          Open Official SGBAU Result Page ↗
        </a>

        <form onSubmit={onUpload} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Profile</label>
            <select
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.roll_number} — Sem {p.semester} {p.exam_type} {p.exam_session}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Roll number (used if not readable from the file)</label>
            <input
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Result file (PDF, PNG, or JPG)</label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm"
            />
          </div>
          {status && (
            <p className={`text-sm ${status.ok ? 'text-green-600' : 'text-red-600'}`}>{status.message}</p>
          )}
          <button
            type="submit"
            disabled={uploading || !file}
            className="rounded-md bg-brand-600 text-white text-sm px-4 py-2 hover:bg-brand-700 disabled:opacity-60"
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </form>
      </section>
    </AppLayout>
  );
}
