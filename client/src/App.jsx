import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth.jsx';
import { ThemeProvider } from './hooks/useTheme.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';

import { Landing } from './pages/Landing.jsx';
import { Login } from './pages/Login.jsx';
import { Register } from './pages/Register.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Profiles } from './pages/Profiles.jsx';
import { AddProfile } from './pages/AddProfile.jsx';
import { Results } from './pages/Results.jsx';
import { ResultDetail } from './pages/ResultDetail.jsx';
import { PrintResult } from './pages/PrintResult.jsx';
import { Settings } from './pages/Settings.jsx';
import { Admin } from './pages/Admin.jsx';
import { InstantCheck } from './pages/InstantCheck.jsx';
import { RangeCheck } from './pages/RangeCheck.jsx';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/instant-check" element={<InstantCheck />} />
          <Route path="/range-check" element={<RangeCheck />} />

          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/profiles" element={<ProtectedRoute><Profiles /></ProtectedRoute>} />
          <Route path="/profiles/new" element={<ProtectedRoute><AddProfile /></ProtectedRoute>} />
          <Route path="/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />
          <Route path="/results/:id" element={<ProtectedRoute><ResultDetail /></ProtectedRoute>} />
          <Route path="/results/:id/print" element={<ProtectedRoute><PrintResult /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />

          <Route path="*" element={<Landing />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
