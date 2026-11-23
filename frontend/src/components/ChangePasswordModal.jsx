import React, { useState, useEffect } from 'react';
import { X, KeyRound, Lock, Smartphone, Eye, EyeOff, User, BookOpen, Hash } from 'lucide-react';
import { verifyPassword, verifyLedgerPassword, getLedgerPasswordStatus, verifyEditPin, getEditPinStatus, resetPassword, getSettings } from '../utils/storage';
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from '../utils/firebase';
import { useAlert } from '../context/AlertContext';
import { createPortal } from 'react-dom';

export default function ChangePasswordModal({ onClose }) {
  const { showAlert } = useAlert();
  const [target, setTarget] = useState(null); // 'account' or 'ledger'
  const [step, setStep] = useState('choose'); // 'choose', 'old_password', 'new_password', 'otp'
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [authPhone, setAuthPhone] = useState('+919339919973');
  const [firebaseIdToken, setFirebaseIdToken] = useState(null);

  useEffect(() => {
    getSettings().then(settings => {
      if (settings && settings.forgotPasswordPhone) {
        setAuthPhone(settings.forgotPasswordPhone);
      }
    });

    if (!window.recaptchaVerifierChangePwd) {
      window.recaptchaVerifierChangePwd = new RecaptchaVerifier(auth, 'recaptcha-container-changepwd', {
        size: 'invisible'
      });
    }

    return () => {
      if (window.recaptchaVerifierChangePwd) {
        window.recaptchaVerifierChangePwd.clear();
        window.recaptchaVerifierChangePwd = null;
      }
    };
  }, []);

  const handleChooseTarget = async (chosenTarget) => {
    setTarget(chosenTarget);
    setError('');
    if (chosenTarget === 'ledger' || chosenTarget === 'editPin') {
      setLoading(true);
      try {
        const status = chosenTarget === 'ledger' ? await getLedgerPasswordStatus() : await getEditPinStatus();
        if (!status.isSet) {
          // Not set yet - skip straight to setting a new one
          setStep('new_password');
          setLoading(false);
          return;
        }
      } catch (err) {
        // If the check fails, fall through to asking for the old value anyway
      }
      setLoading(false);
    }
    setStep('old_password');
  };

  const handleVerifyOldPassword = async (e) => {
    e.preventDefault();
    if (!oldPassword) return;
    setError('');
    setLoading(true);
    try {
      if (target === 'ledger') {
        await verifyLedgerPassword(oldPassword);
      } else if (target === 'editPin') {
        await verifyEditPin(oldPassword);
      } else {
        await verifyPassword(oldPassword);
      }
      setStep('new_password');
    } catch (err) {
      setError(err.message || `Incorrect ${target === 'editPin' ? 'PIN' : 'old password'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError(target === 'editPin' ? 'New PINs do not match' : 'New passwords do not match');
      return;
    }
    if (target === 'editPin') {
      if (!/^\d{4,6}$/.test(newPassword)) {
        setError('PIN must be 4 to 6 digits');
        return;
      }
    } else if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const appVerifier = window.recaptchaVerifierChangePwd;
      const confirmationResult = await signInWithPhoneNumber(auth, authPhone, appVerifier);
      window.changePwdConfirmationResult = confirmationResult;
      setStep('otp');
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.');
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
      const result = await window.changePwdConfirmationResult.confirm(otp);
      const user = result.user;
      const idToken = await user.getIdToken();
      
      // Update password in DB
      await resetPassword('user@example.com', idToken, newPassword, target); // The email parameter is ignored by backend since it uses the idToken to verify phone number and updates the single primary user.

      const targetLabel = target === 'ledger' ? 'Ledger password' : target === 'editPin' ? 'Edit PIN' : 'Account password';
      showAlert(`${targetLabel} updated successfully!`, 'success');
      onClose();
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div id="recaptcha-container-changepwd"></div>
      
      <div className="glass-panel fade-in" style={{
        width: '100%',
        maxWidth: '450px',
        padding: '2.5rem',
        position: 'relative'
      }}>
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.5rem',
            right: '1.5rem',
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
            e.currentTarget.style.color = '#ef4444';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = 'white';
          }}
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.05) 100%)',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            color: '#D4AF37',
            marginBottom: '1rem'
          }}>
            {step === 'choose' && <Lock size={32} />}
            {step === 'old_password' && <KeyRound size={32} />}
            {step === 'new_password' && <Lock size={32} />}
            {step === 'otp' && <Smartphone size={32} />}
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: 'white' }}>
            {step === 'choose' ? 'Reset Password' :
             step === 'old_password' ? 'Verify Identity' :
             step === 'new_password' ? 'New Password' :
             'Security Verification'}
          </h2>

          <p style={{ color: '#a1a1aa', margin: 0, fontSize: '0.95rem', lineHeight: '1.5' }}>
            {step === 'choose' ? 'Which one would you like to change?' :
             step === 'old_password' ? `Enter your current ${target === 'ledger' ? 'ledger password' : target === 'editPin' ? 'PIN' : 'account password'} to continue.` :
             step === 'new_password' ? (target === 'editPin' ? 'Create a new 4 to 6 digit PIN.' : `Create a secure new ${target === 'ledger' ? 'ledger' : 'account'} password.`) :
             `Enter the OTP sent to ${authPhone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')}`}
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            textAlign: 'center',
            fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}

        {step === 'choose' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <button
              type="button"
              onClick={() => handleChooseTarget('account')}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '1rem',
                background: 'rgba(255,255,255,0.05)', border: '1px solid #333', borderRadius: '8px',
                color: 'white', cursor: 'pointer', textAlign: 'left', fontSize: '1rem'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#D4AF37'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#333'; }}
            >
              <User size={22} color="#D4AF37" />
              <div>
                <div style={{ fontWeight: '600' }}>Account Password</div>
                <div style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Used to log in to the app</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleChooseTarget('ledger')}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '1rem',
                background: 'rgba(255,255,255,0.05)', border: '1px solid #333', borderRadius: '8px',
                color: 'white', cursor: 'pointer', textAlign: 'left', fontSize: '1rem'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#D4AF37'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#333'; }}
            >
              <BookOpen size={22} color="#D4AF37" />
              <div>
                <div style={{ fontWeight: '600' }}>Ledger Password</div>
                <div style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Required to open the Bills Ledger</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleChooseTarget('editPin')}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '1rem',
                background: 'rgba(255,255,255,0.05)', border: '1px solid #333', borderRadius: '8px',
                color: 'white', cursor: 'pointer', textAlign: 'left', fontSize: '1rem'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#D4AF37'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#333'; }}
            >
              <Hash size={22} color="#D4AF37" />
              <div>
                <div style={{ fontWeight: '600' }}>Edit PIN</div>
                <div style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Required to edit a bill</div>
              </div>
            </button>
          </div>
        )}

        {step === 'old_password' && (
          <form onSubmit={handleVerifyOldPassword}>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label>{target === 'editPin' ? 'Current PIN' : 'Current Password'}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showOldPassword ? "text" : "password"}
                  inputMode={target === 'editPin' ? 'numeric' : undefined}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(target === 'editPin' ? e.target.value.replace(/\D/g, '').slice(0, 6) : e.target.value)}
                  placeholder={target === 'editPin' ? 'Enter current PIN' : 'Enter current password'}
                  maxLength={target === 'editPin' ? 6 : undefined}
                  required
                  style={{ width: '100%', paddingRight: '40px', letterSpacing: target === 'editPin' ? '0.4em' : 'normal', textAlign: target === 'editPin' ? 'center' : 'left' }}
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#a1a1aa',
                    cursor: 'pointer',
                    display: 'flex'
                  }}
                  tabIndex="-1"
                >
                  {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Verifying...' : 'Continue'}
            </button>
          </form>
        )}

        {step === 'new_password' && (
          <form onSubmit={handleSendOTP}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label>{target === 'editPin' ? 'New PIN' : 'New Password'}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPassword ? "text" : "password"}
                  inputMode={target === 'editPin' ? 'numeric' : undefined}
                  value={newPassword}
                  onChange={(e) => setNewPassword(target === 'editPin' ? e.target.value.replace(/\D/g, '').slice(0, 6) : e.target.value)}
                  placeholder={target === 'editPin' ? 'Enter new 4-6 digit PIN' : 'Enter new password'}
                  maxLength={target === 'editPin' ? 6 : undefined}
                  required
                  style={{ width: '100%', paddingRight: '40px', letterSpacing: target === 'editPin' ? '0.4em' : 'normal', textAlign: target === 'editPin' ? 'center' : 'left' }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', display: 'flex'
                  }}
                  tabIndex="-1"
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label>{target === 'editPin' ? 'Confirm PIN' : 'Confirm Password'}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  inputMode={target === 'editPin' ? 'numeric' : undefined}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(target === 'editPin' ? e.target.value.replace(/\D/g, '').slice(0, 6) : e.target.value)}
                  placeholder={target === 'editPin' ? 'Confirm new PIN' : 'Confirm new password'}
                  maxLength={target === 'editPin' ? 6 : undefined}
                  required
                  style={{ width: '100%', paddingRight: '40px', letterSpacing: target === 'editPin' ? '0.4em' : 'normal', textAlign: target === 'editPin' ? 'center' : 'left' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', display: 'flex'
                  }}
                  tabIndex="-1"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Sending OTP...' : 'Save & Verify'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP}>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label>6-Digit OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                maxLength={6}
                required
                style={{ 
                  letterSpacing: '0.5em', 
                  textAlign: 'center', 
                  fontSize: '1.5rem', 
                  fontWeight: 'bold',
                  padding: '1rem'
                }}
              />
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Update Password'}
            </button>
          </form>
        )}

      </div>
    </div>,
    document.body
  );
}
