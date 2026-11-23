import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header';
import CreateBill from './pages/CreateBill';
import BillsLedger from './pages/BillsLedger';
import RoughBills from './pages/RoughBills';
import SettingsPage from './pages/SettingsPage';
import Login from './pages/Login';
import LedgerGate from './components/LedgerGate';
import SettingsGate from './components/SettingsGate';
import FeeStructureDrawer from './components/FeeStructureDrawer';
import { AlertProvider } from './context/AlertContext';
import { FeeStructureProvider } from './context/FeeStructureContext';

import './App.css';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Shown on every page except auth screens and Settings
const FEE_STRUCTURE_EXCLUDED_PATHS = ['/login', '/register', '/settings'];

const FEE_PANEL_WIDTH = 'min(38vw, 560px)';

const AppLayout = ({ children }) => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const showFeeStructure = !isAuthPage && !FEE_STRUCTURE_EXCLUDED_PATHS.includes(location.pathname);
  const [feeOpen, setFeeOpen] = useState(false);

  useEffect(() => {
    if (!showFeeStructure) setFeeOpen(false);
  }, [showFeeStructure]);

  return (
    <div className="app-container">
      <div className="ambient-mesh"></div>
      {!isAuthPage && <Header />}
      <div
        className={isAuthPage ? "" : "main-content-wrapper"}
        style={!isAuthPage ? {
          marginRight: showFeeStructure && feeOpen ? FEE_PANEL_WIDTH : 0,
          transition: 'margin-right 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        } : undefined}
      >
        <FeeStructureProvider feeOpen={showFeeStructure && feeOpen} panelWidth={FEE_PANEL_WIDTH} closeFeeStructure={() => setFeeOpen(false)}>
          {children}
        </FeeStructureProvider>
      </div>
      {showFeeStructure && (
        <FeeStructureDrawer
          open={feeOpen}
          panelWidth={FEE_PANEL_WIDTH}
          onToggle={() => setFeeOpen(o => !o)}
          onClose={() => setFeeOpen(false)}
        />
      )}
    </div>
  );
};

function App() {
  return (
    <AlertProvider>
      <Router>
        <AppLayout>
        <Routes>
          <Route path="/login" element={<Login />} />

          
          {/* Protected Routes */}
          <Route path="/" element={<ProtectedRoute><CreateBill /></ProtectedRoute>} />
          <Route path="/ledger" element={<ProtectedRoute><LedgerGate><BillsLedger /></LedgerGate></ProtectedRoute>} />
          <Route path="/rough-bills" element={<ProtectedRoute><RoughBills /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsGate><SettingsPage /></SettingsGate></ProtectedRoute>} />
        </Routes>
      </AppLayout>
    </Router>
    </AlertProvider>
  );
}

export default App;
