import React, { useState, useEffect } from 'react';
import { Lock, BookOpen, Eye, EyeOff } from 'lucide-react';
import { verifyLedgerPassword } from '../utils/storage';

const SESSION_KEY = 'ledgerUnlocked';

export default function LedgerGate({ children }) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(SESSION_KEY) === 'true');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (unlocked) sessionStorage.setItem(SESSION_KEY, 'true');
  }, [unlocked]);

  if (unlocked) return children;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) return;
    setError('');
    setLoading(true);
    try {
      await verifyLedgerPassword(password);
      setUnlocked(true);
    } catch (err) {
      setError(err.message || 'Incorrect ledger password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', padding: '2rem', overflowY: 'auto' }}>
      <div className="glass-panel fade-in" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '64px', height: '64px', borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.05) 100%)',
          border: '1px solid rgba(212, 175, 55, 0.3)', color: '#D4AF37', marginBottom: '1rem'
        }}>
          <Lock size={32} />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <BookOpen size={20} color="#D4AF37" /> Ledger Locked
        </h2>
        <p style={{ color: '#a1a1aa', margin: '0 0 1.5rem 0', fontSize: '0.95rem', lineHeight: '1.5' }}>
          Enter the ledger password to view the Bills Ledger.
        </p>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '1.5rem',
            fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
            <label>Ledger Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter ledger password"
                autoFocus
                required
                style={{ width: '100%', paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', display: 'flex'
                }}
                tabIndex="-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Verifying...' : 'Unlock Ledger'}
          </button>
        </form>

        <p style={{ color: '#666', fontSize: '0.8rem', marginTop: '1.5rem' }}>
          Forgot it? Reset it from Settings &rarr; Reset Password &rarr; Ledger Password.
        </p>
      </div>
    </div>
  );
}
