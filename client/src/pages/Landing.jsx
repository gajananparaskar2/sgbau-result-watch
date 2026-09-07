import React from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout.jsx';

const FEATURES = [
  ['🔄', 'Automatic Monitoring', 'A background worker checks the SGBAU portal on your schedule — no need to keep a browser open.'],
  ['🔍', 'Result Detection', 'Distinguishes "not declared yet" from a real, verified result. Never guesses.'],
  ['📄', 'PDF Generation', 'A clean, printable summary of your result, generated the moment it is verified.'],
  ['⬇️', 'Download & Print', 'Download the PDF or use the dedicated print view, formatted for A4.'],
  ['✉️', 'Email Notifications', 'Optional email the moment your result is detected and verified.'],
  ['🗂️', 'Result History', 'Every profile you monitor keeps a full history of detected results.']
];

export function Landing() {
  return (
    <AppLayout>
      <section className="text-center py-16">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Never Miss Your SGBAU Result Again.
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto mb-8">
          Automatically monitor your result and get notified the moment it is declared.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/instant-check"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 text-white px-6 py-3 font-semibold shadow-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
          >
            <span>⚡</span> Check Declared Result (Instant & PDF)
          </Link>
          <Link
            to="/register"
            className="inline-block rounded-lg bg-brand-600 text-white px-6 py-3 font-medium hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
          >
            Start Automatic Monitoring
          </Link>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 py-8">
        {FEATURES.map(([icon, title, desc]) => (
          <div key={title} className="rounded-xl border border-gray-200 dark:border-gray-800 p-5 bg-white dark:bg-gray-900">
            <div className="text-2xl mb-2">{icon}</div>
            <h3 className="font-semibold mb-1">{title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{desc}</p>
          </div>
        ))}
      </section>

      <p className="text-center text-sm text-gray-500 dark:text-gray-500 mt-10">
        ResultWatch is not affiliated with SGBAU. It reads only from SGBAU's public result portal
        and never bypasses CAPTCHA, login, or other access controls.
      </p>
    </AppLayout>
  );
}
