import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useTheme } from '../hooks/useTheme.jsx';

export default function ForgotPassword() {
  const [step, setStep] = useState('request'); // 'request' or 'reset'
  const [email, setEmail] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();
  const { colors } = useTheme();

  const handleRequest = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!email || !secretCode) return setError('Email and secret code required');
    try {
      setLoading(true);
      await api.post('/auth/forgot-password', { email, secretCode });
      setMessage('Verification successful! You can now reset your password.');
      setStep('reset');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!newPassword || !confirmPassword) return setError('All fields required');
    if (newPassword.length < 6) return setError('Password must be at least 6 characters');
    if (newPassword !== confirmPassword) return setError('Passwords do not match');
    try {
      setLoading(true);
      await api.post('/auth/reset-password', { email, newPassword, secretCode });
      setMessage('Password reset successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', background: colors.bg, color: colors.text, minHeight: '100vh' }}>
      <div style={{ maxWidth: 500, margin: '2rem auto' }}>
        <h2 style={{ color: colors.text, marginBottom: '1.5rem' }}>
          {step === 'request' ? 'Request Password Reset' : 'Reset Password'}
        </h2>

          {step === 'request' && (
          <form onSubmit={handleRequest}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, color: colors.text, fontWeight: 500 }}>Email</label>
              <input 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="you@example.com"
                style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 4, fontSize: 14 }} 
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, color: colors.text, fontWeight: 500 }}>Secret Code</label>
              <input 
                type="password" 
                value={secretCode} 
                onChange={(e) => setSecretCode(e.target.value)} 
                placeholder="Enter secret code"
                style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 4, fontSize: 14 }} 
              />
            </div>
            {error && <div style={{ color: 'red', marginBottom: 12, fontSize: 14 }}>{error}</div>}
            {message && <div style={{ color: 'green', marginBottom: 12, fontSize: 14 }}>{message}</div>}
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                type="submit" 
                disabled={loading} 
                style={{ padding: '10px 16px', background: colors.buttonPrimary, color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14 }}
              >
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </button>
              <button 
                type="button"
                onClick={() => navigate(-1)}
                style={{ padding: '10px 16px', background: colors.buttonSecondary, color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14 }}
              >
                Back
              </button>
            </div>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handleReset}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, color: colors.text, fontWeight: 500 }}>New Password</label>
              <input 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 4, fontSize: 14 }} 
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, color: colors.text, fontWeight: 500 }}>Confirm Password</label>
              <input 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 4, fontSize: 14 }} 
              />
            </div>
            {error && <div style={{ color: 'red', marginBottom: 12, fontSize: 14 }}>{error}</div>}
            {message && <div style={{ color: 'green', marginBottom: 12, fontSize: 14 }}>{message}</div>}
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                type="submit" 
                disabled={loading} 
                style={{ padding: '10px 16px', background: colors.buttonPrimary, color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14 }}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
              <button 
                type="button"
                onClick={() => navigate(-1)}
                style={{ padding: '10px 16px', background: colors.buttonSecondary, color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14 }}
              >
                Back
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
