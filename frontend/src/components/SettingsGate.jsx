import React, { useState, useEffect } from 'react';
import { Lock, Smartphone, Settings as SettingsIcon } from 'lucide-react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../utils/firebase';
import { getSettings } from '../utils/storage';

const SESSION_KEY = 'settingsUnlocked';
const RECAPTCHA_CONTAINER_ID = 'settings-gate-recaptcha-container';

export default function SettingsGate({ children }) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(SESSION_KEY) === 'true');
  const [phone, setPhone] = useState('+919339919973');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (unlocked) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      return;
    }
    getSettings().then((s) => {
      if (s && s.forgotPasswordPhone) setPhone(s.forgotPasswordPhone);
    }).catch(() => {});

    if (!window.recaptchaVerifierSettingsGate) {
      const container = document.getElementById(RECAPTCHA_CONTAINER_ID);
      if (container) {
        window.recaptchaVerifierSettingsGate = new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, { size: 'normal' });
        window.recaptchaVerifierSettingsGate.render().catch(() => {});
      }
    }

    return () => {
      if (window.recaptchaVerifierSettingsGate) {
        try { window.recaptchaVerifierSettingsGate.clear(); } catch (e) {}
        window.recaptchaVerifierSettingsGate = null;
      }
    };
  }, [unlocked]);

  if (unlocked) return children;

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!window.recaptchaVerifierSettingsGate) {
        window.recaptchaVerifierSettingsGate = new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, { size: 'normal' });
        await window.recaptchaVerifierSettingsGate.render();
      }
      const confirmationResult = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifierSettingsGate);
      window.settingsGateConfirmationResult = confirmationResult;
      setOtpSent(true);
    } catch (err) {
      if (window.recaptchaVerifierSettingsGate) {
        try { window.recaptchaVerifierSettingsGate.clear(); } catch (e) {}
        window.recaptchaVerifierSettingsGate = null;
      }
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }
    setError('');
    setLoading(true);
    try {
      if (!window.settingsGateConfirmationResult) throw new Error('Please request OTP again');
      await window.settingsGateConfirmationResult.confirm(otp);
      setUnlocked(true);
    } catch (err) {
      setError('Invalid or expired OTP');
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
          <SettingsIcon size={20} color="#D4AF37" /> Settings Locked
        </h2>
        <p style={{ color: '#a1a1aa', margin: '0 0 1.5rem 0', fontSize: '0.95rem', lineHeight: '1.5' }}>
          {otpSent
            ? `Enter the OTP sent to ${phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')}`
            : 'Verify your identity with OTP to open Settings.'}
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

        {!otpSent ? (
          <form onSubmit={handleSendOTP}>
            <div id={RECAPTCHA_CONTAINER_ID} style={{ display: 'flex', justifyContent: 'center', margin: '15px 0' }}></div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP}>
            <div className="form-group" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
              <label>6-Digit OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                maxLength={6}
                autoFocus
                required
                style={{ width: '100%', letterSpacing: '0.5em', textAlign: 'center', fontSize: '1.5rem', fontWeight: 'bold', padding: '1rem' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#D4AF37', marginBottom: '1rem', justifyContent: 'center' }}>
              <Smartphone size={16} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Open Settings'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
