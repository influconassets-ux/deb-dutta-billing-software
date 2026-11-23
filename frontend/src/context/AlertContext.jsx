import React, { createContext, useState, useContext } from 'react';
import { AlertCircle, CheckCircle, Info, HelpCircle, X } from 'lucide-react';

const AlertContext = createContext();

export const useAlert = () => {
  return useContext(AlertContext);
};

export const AlertProvider = ({ children }) => {
  const [alertState, setAlertState] = useState({
    isOpen: false,
    type: 'info', // 'info', 'success', 'error', 'confirm', 'warning'
    message: '',
    onConfirm: null,
  });

  const showAlert = (message, type = 'info') => {
    // If it's a generic "Failed..." string, maybe auto-set to error
    let inferredType = type;
    if (type === 'info' && typeof message === 'string') {
      if (message.toLowerCase().includes('failed') || message.toLowerCase().includes('error')) inferredType = 'error';
      else if (message.toLowerCase().includes('success')) inferredType = 'success';
    }

    setAlertState({
      isOpen: true,
      type: inferredType,
      message,
      onConfirm: null,
    });
  };

  const showConfirm = (message, onConfirm, type = 'confirm') => {
    let inferredType = type;
    if (message.toLowerCase().includes('warning') || message.toLowerCase().includes('delete')) {
      inferredType = 'warning';
    }

    setAlertState({
      isOpen: true,
      type: inferredType,
      message,
      onConfirm,
    });
  };

  const closeAlert = () => {
    setAlertState(prev => ({ ...prev, isOpen: false }));
  };

  const handleConfirm = () => {
    if (alertState.onConfirm) {
      alertState.onConfirm();
    }
    closeAlert();
  };

  const getIcon = () => {
    switch (alertState.type) {
      case 'success': return <CheckCircle size={32} color="#10b981" />;
      case 'error': return <AlertCircle size={32} color="#ef4444" />;
      case 'warning': return <AlertCircle size={32} color="#f59e0b" />;
      case 'confirm': return <HelpCircle size={32} color="#3b82f6" />;
      default: return <Info size={32} color="#D4AF37" />;
    }
  };

  const getTitle = () => {
    switch (alertState.type) {
      case 'success': return 'Success';
      case 'error': return 'Error';
      case 'warning': return 'Warning';
      case 'confirm': return 'Confirmation';
      default: return 'Information';
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      
      {alertState.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99999,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          `}</style>
          
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '400px',
            padding: '2rem',
            position: 'relative',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <button 
              onClick={closeAlert}
              style={{
                position: 'absolute', top: '1rem', right: '1rem',
                background: 'transparent', border: 'none', color: '#a1a1aa',
                cursor: 'pointer', padding: '4px', display: 'flex'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ marginBottom: '1.2rem', display: 'flex', justifyContent: 'center' }}>
              {getIcon()}
            </div>
            
            <h3 style={{ margin: '0 0 1rem 0', color: 'white', fontSize: '1.25rem', fontWeight: 'bold' }}>
              {getTitle()}
            </h3>
            
            <p style={{ color: '#d4d4d8', margin: '0 0 2rem 0', fontSize: '0.95rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
              {alertState.message}
            </p>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              {alertState.onConfirm ? (
                <>
                  <button 
                    onClick={closeAlert}
                    style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleConfirm}
                    style={{ flex: 1, padding: '10px', background: alertState.type === 'warning' ? '#ef4444' : '#D4AF37', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <button 
                  onClick={closeAlert}
                  style={{ width: '100%', padding: '12px', background: '#D4AF37', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
};
