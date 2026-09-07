import React from 'react';
import { Navbar } from '../components/Navbar.jsx';

export function AppLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">{children}</main>
      <footer className="no-print text-center text-xs text-gray-400 py-6 border-t border-gray-200 dark:border-gray-800">
        SGBAU Result Watch is an independent student tool and is not affiliated with Sant Gadge Baba Amravati University.
      </footer>
    </div>
  );
}
