import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser, resetPassword, getSettings, getLedger } from '../utils/storage';
import { LogIn, KeyRound, Lock, Smartphone, Eye, EyeOff, Loader2 } from 'lucide-react';
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from '../utils/firebase';
import { useAlert } from '../context/AlertContext';
import './Auth.css';

// The phone number is now fetched dynamically from settings
// fallback if settings fetch fails
const FALLBACK_PHONE = '+919339919973';

const Login = () => {
  const { showAlert } = useAlert();
  const [view, setView] = useState('login'); // 'login', 'forgot_email', 'forgot_otp', 'reset_password'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [firebaseIdToken, setFirebaseIdToken] = useState(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [authPhone, setAuthPhone] = useState(FALLBACK_PHONE);
  const navigate = useNavigate();

  useEffect(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible'
      });
    }
    
    // Fetch settings to get the dynamic phone number
    getSettings().then(settings => {
      if (settings && settings.forgotPasswordPhone) {
        setAuthPhone(settings.forgotPasswordPhone);
      }
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await loginUser({ email, password });
      
      setView('fetching_data');
      
      // Pre-fetch heavy data before navigating
      await Promise.all([
        getSettings(),
        getLedger()
      ]);

      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to login');
      setView('login');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const appVerifier = window.recaptchaVerifier;
      const confirmationResult = await signInWithPhoneNumber(auth, authPhone, appVerifier);
      window.confirmationResult = confirmationResult;
      setView('forgot_otp');
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
      const result = await window.confirmationResult.confirm(otp);
      const user = result.user;
      const idToken = await user.getIdToken();
      setFirebaseIdToken(idToken);
      setView('reset_password');
    } catch (err) {
      setError('Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await resetPassword(email, firebaseIdToken, password);
      showAlert("Password updated successfully! Please login with your new password.", 'success');
      setPassword('');
      setConfirmPassword('');
      setView('login');
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div id="recaptcha-container"></div>
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo-wrapper">
            <img src="/logo.png" alt="Rhiddhiman Mukherjee Logo" />
          </div>
          <h2>
            {view === 'login' ? 'Welcome Back' :
              view === 'fetching_data' ? 'Authenticating' :
              view === 'forgot_email' ? 'Reset Password' :
                view === 'forgot_otp' ? 'Enter OTP' :
                  'New Password'}
          </h2>
          <p>
            {view === 'login' ? 'Login to access your billing dashboard' :
              view === 'fetching_data' ? 'Please wait while we prepare your workspace' :
              view === 'forgot_email' ? 'Enter your email to request a password reset' :
                view === 'forgot_otp' ? `An OTP has been sent to ${authPhone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')}` :
                  'Create a secure new password'}
          </p>
        </div>

        {error && view !== 'fetching_data' && <div className="auth-error">{error}</div>}

        {view === 'fetching_data' && (
          <div className="auth-form fade-in" style={{ textAlign: 'center', padding: '20px 0 40px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <Loader2 size={48} color="#d4af37" className="spinner-icon" />
            </div>
            <h3 style={{ color: '#d4af37', margin: '0 0 10px 0', fontFamily: 'var(--font-family-display)', fontSize: '20px' }}>Preparing Workspace...</h3>
            <p style={{ color: '#a1a1aa', fontSize: '14px', margin: 0 }}>Securely fetching your ledger and settings.</p>
          </div>
        )}

        {view === 'login' && (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Logging in...' : 'Log In'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => { setView('forgot_email'); setError(''); setPassword(''); }}
                style={{ background: 'none', border: 'none', color: '#D4AF37', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem' }}
              >
                Forgot Password?
              </button>
            </div>
          </form>
        )}

        {view === 'forgot_email' && (
          <form onSubmit={handleSendOTP} className="auth-form">
            <p style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#BBB', lineHeight: '1.5' }}>
              We will send a 6-digit OTP to your registered mobile number ending in <strong>{authPhone.slice(-4)}</strong> to verify your identity.
            </p>

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => { setView('login'); setError(''); }}
                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.9rem' }}
              >
                Back to Login
              </button>
            </div>
          </form>
        )}

        {view === 'forgot_otp' && (
          <form onSubmit={handleVerifyOTP} className="auth-form">
            <div className="form-group">
              <label>6-Digit OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
                required
                style={{ letterSpacing: '0.5em', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}
              />
            </div>

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => { setView('login'); setError(''); setOtp(''); }}
                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.9rem' }}
              >
                Cancel Reset
              </button>
            </div>
          </form>
        )}

        {view === 'reset_password' && (
          <form onSubmit={handleResetPassword} className="auth-form">
            <div className="form-group">
              <label>New Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex="-1"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Updating Password...' : 'Save New Password'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

export default Login;
