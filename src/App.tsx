import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SectionsList from './pages/SectionsList';
import SectionView from './pages/SectionView';
import OperationView from './pages/OperationView';
import Settings from './pages/Settings';
import LedgerView from './pages/LedgerView';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="sections" element={<SectionsList />} />
            <Route path="sections/:sectionId" element={<SectionView />} />
            <Route path="sections/:sectionId/operations/:operationId" element={<OperationView />} />
            <Route path="settings" element={<Settings />} />
            <Route path="ledger" element={<LedgerView />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
