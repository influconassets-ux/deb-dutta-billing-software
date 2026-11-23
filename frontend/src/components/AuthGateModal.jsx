import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../utils/firebase';
import { verifyPassword, verifyEditPin } from '../utils/storage';
import { useAlert } from '../context/AlertContext';

// Shared password/OTP/PIN gate used to authorize sensitive actions (editing, deleting bills).
export default function AuthGateModal({ open, onClose, onVerified, message, phone, otpOnly = false, pinOnly = false }) {
  const { showAlert } = useAlert();
  const [authMethod, setAuthMethod] = useState(pinOnly ? 'pin' : otpOnly ? 'otp' : 'password');
  const [authPassword, setAuthPassword] = useState('');
  const [pin, setPin] = useState('');
  const [otpView, setOtpView] = useState('send');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const recaptchaContainerId = 'auth-gate-recaptcha-container';

  useEffect(() => {
    if (open) {
      setAuthMethod(pinOnly ? 'pin' : otpOnly ? 'otp' : 'password');
      setAuthPassword('');
      setPin('');
      setOtpView('send');
      setOtp('');
      setIsLoading(false);
      if (otpOnly) setTimeout(initRecaptcha, 150);
    } else if (window.recaptchaVerifierAuthGate) {
      try { window.recaptchaVerifierAuthGate.clear(); } catch (e) {}
      window.recaptchaVerifierAuthGate = null;
    }
  }, [open]);

  if (!open) return null;

  const initRecaptcha = () => {
    if (window.recaptchaVerifierAuthGate) {
      try { window.recaptchaVerifierAuthGate.clear(); } catch (e) {}
      window.recaptchaVerifierAuthGate = null;
    }
    const container = document.getElementById(recaptchaContainerId);
    if (!container) return;
    container.innerHTML = '';
    window.recaptchaVerifierAuthGate = new RecaptchaVerifier(auth, recaptchaContainerId, { size: 'normal' });
    window.recaptchaVerifierAuthGate.render().catch(() => {});
  };

  const handleVerifyPassword = async (e) => {
    if (e) e.preventDefault();
    if (!authPassword) {
      showAlert('Please enter your account password', 'error');
      return;
    }
    setIsLoading(true);
    try {
      await verifyPassword(authPassword);
      onVerified();
    } catch (err) {
      showAlert(err.message || 'Incorrect password', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPin = async (e) => {
    if (e) e.preventDefault();
    if (!pin || pin.length < 4) {
      showAlert('Please enter your 4-digit PIN', 'error');
      return;
    }
    setIsLoading(true);
    try {
      await verifyEditPin(pin);
      onVerified();
    } catch (err) {
      showAlert(err.message || 'Incorrect PIN', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOTP = async () => {
    setIsLoading(true);
    try {
      if (!window.recaptchaVerifierAuthGate) {
        initRecaptcha();
        await window.recaptchaVerifierAuthGate.render();
      }
      let authPhone = (phone || '+919339919973').trim();
      if (!authPhone.startsWith('+')) authPhone = '+91' + authPhone;

      const confirmationResult = await signInWithPhoneNumber(auth, authPhone, window.recaptchaVerifierAuthGate);
      window.authGateConfirmationResult = confirmationResult;
      setOtpView('verify');
      showAlert('OTP sent successfully', 'success');
    } catch (err) {
      if (window.recaptchaVerifierAuthGate) {
        try { window.recaptchaVerifierAuthGate.clear(); } catch (e) {}
        window.recaptchaVerifierAuthGate = null;
      }
      showAlert(err.message || 'Failed to send OTP', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setIsLoading(true);
    try {
      if (!window.authGateConfirmationResult) throw new Error('Please request OTP again');
      await window.authGateConfirmationResult.confirm(otp);
      onVerified();
    } catch (err) {
      showAlert('Invalid OTP', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#1A1A1A', padding: '2.5rem', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.4)', width: '420px', maxWidth: '90%' }}>
        <h3 style={{ color: '#D4AF37', marginTop: 0, marginBottom: '1.2rem', fontSize: '1.35rem' }}>Authentication Required</h3>

        {!otpOnly && !pinOnly && (
          <div style={{ display: 'flex', borderBottom: '1px solid #333', marginBottom: '1.5rem', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setAuthMethod('password')}
              style={{
                flex: 1, padding: '8px', background: 'transparent', border: 'none',
                borderBottom: authMethod === 'password' ? '2px solid #D4AF37' : '2px solid transparent',
                color: authMethod === 'password' ? '#D4AF37' : '#888',
                fontWeight: authMethod === 'password' ? '700' : 'normal', cursor: 'pointer', fontSize: '0.95rem'
              }}
            >
              Account Password
            </button>
            <button
              type="button"
              onClick={() => { setAuthMethod('otp'); setTimeout(initRecaptcha, 150); }}
              style={{
                flex: 1, padding: '8px', background: 'transparent', border: 'none',
                borderBottom: authMethod === 'otp' ? '2px solid #D4AF37' : '2px solid transparent',
                color: authMethod === 'otp' ? '#D4AF37' : '#888',
                fontWeight: authMethod === 'otp' ? '700' : 'normal', cursor: 'pointer', fontSize: '0.95rem'
              }}
            >
              Phone OTP
            </button>
          </div>
        )}

        {authMethod === 'pin' ? (
          <form onSubmit={handleVerifyPin}>
            <p style={{ color: '#bbb', lineHeight: 1.5, fontSize: '0.9rem', marginBottom: '1rem' }}>
              {message || 'Enter your 4-digit PIN to continue.'}
            </p>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="----"
              maxLength={6}
              autoFocus
              style={{
                width: '100%', padding: '15px', boxSizing: 'border-box', background: '#111',
                border: '1px solid #444', color: '#fff', borderRadius: '6px',
                letterSpacing: '0.6em', textAlign: 'center', fontSize: '1.5rem',
                outline: 'none', marginBottom: '1.5rem'
              }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #666', color: '#fff', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={isLoading} style={{ flex: 1, padding: '12px', background: '#D4AF37', border: 'none', color: '#000', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                {isLoading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </form>
        ) : authMethod === 'password' ? (
          <form onSubmit={handleVerifyPassword}>
            <p style={{ color: '#bbb', lineHeight: 1.5, fontSize: '0.9rem', marginBottom: '1rem' }}>
              {message || 'Enter your account password to continue.'}
            </p>
            <input
              type="password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              placeholder="Enter your account password"
              autoFocus
              style={{
                width: '100%', padding: '12px 14px', boxSizing: 'border-box', background: '#111',
                border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '1rem',
                outline: 'none', marginBottom: '1.5rem'
              }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #666', color: '#fff', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={isLoading} style={{ flex: 1, padding: '12px', background: '#D4AF37', border: 'none', color: '#000', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                {isLoading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </form>
        ) : (
          otpView === 'send' ? (
            <div>
              <p style={{ color: '#bbb', lineHeight: 1.5, fontSize: '0.9rem' }}>
                An OTP will be sent to the registered mobile number ({phone || '+919339919973'}).
              </p>
              <div id={recaptchaContainerId} style={{ display: 'flex', justifyContent: 'center', margin: '15px 0' }}></div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
                <button onClick={onClose} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #666', color: '#fff', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleSendOTP} disabled={isLoading} style={{ flex: 1, padding: '12px', background: '#D4AF37', border: 'none', color: '#000', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{isLoading ? 'Sending...' : 'Send OTP'}</button>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ color: '#bbb', lineHeight: 1.5, fontSize: '0.9rem' }}>Enter the 6-digit OTP sent to your registered number.</p>
              <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="------" maxLength={6} style={{ width: '100%', padding: '15px', marginTop: '10px', background: '#111', border: '1px solid #444', color: '#fff', borderRadius: '6px', letterSpacing: '8px', textAlign: 'center', fontSize: '1.5rem', outline: 'none' }} />
              <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
                <button onClick={onClose} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #666', color: '#fff', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleVerifyOTP} disabled={isLoading} style={{ flex: 1, padding: '12px', background: '#D4AF37', border: 'none', color: '#000', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{isLoading ? 'Verifying...' : 'Verify OTP'}</button>
              </div>
            </div>
          )
        )}
      </div>
    </div>,
    document.body
  );
}
