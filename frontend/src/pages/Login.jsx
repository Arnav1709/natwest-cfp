import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '../services/api';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ phone: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await authApi.login({
        phone: form.phone,
        password: form.password,
      });

      if (result.access_token) {
        localStorage.setItem('stocksense-token', result.access_token);
        localStorage.setItem('stocksense-user', JSON.stringify(result.user));
        // Notify ProtectedRoute that auth state changed (same-tab event)
        window.dispatchEvent(new Event('auth-change'));
        navigate('/dashboard/overview');
      } else {
        setError('Login failed. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Invalid phone number or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gradient-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: '440px', width: '100%', padding: '2rem', position: 'relative', zIndex: 10 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 56, height: 56, background: 'linear-gradient(135deg, #0D9488, #10B981)',
            borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.75rem', color: 'white', marginBottom: '1rem',
          }}>📦</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F8FAFC' }}>StockSense</h1>
          <p style={{ color: '#94A3B8', fontSize: '0.875rem' }}>Predictive Intelligence</p>
        </div>

        <div className="glass-card" style={{ padding: '2.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.5rem', textAlign: 'center' }}>
            Welcome Back 👋
          </h2>
          <p style={{ color: '#94A3B8', marginBottom: '2rem', textAlign: 'center', fontSize: '0.875rem' }}>
            Sign in with your phone number and password
          </p>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1.25rem',
              color: '#ef4444', fontSize: '0.875rem',
            }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="floating-label-group">
              <input
                type="tel"
                placeholder=" "
                value={form.phone}
                onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                required
                id="login-phone"
                autoFocus
              />
              <label>Phone Number</label>
            </div>

            <div className="floating-label-group">
              <input
                type="password"
                placeholder=" "
                value={form.password}
                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                required
                minLength={4}
                id="login-password"
              />
              <label>Password</label>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              disabled={loading}
              id="btn-login"
            >
              {loading ? '⏳ Signing in...' : '🔑 Sign In'}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#94A3B8' }}>
            Don't have an account?{' '}
            <Link
              to="/onboarding/language"
              style={{ color: 'var(--color-primary-light)', fontWeight: 600, textDecoration: 'none' }}
            >
              Create one →
            </Link>
          </div>

          {/* Seed account hint (for testing) */}
          <div style={{
            marginTop: '1.5rem', textAlign: 'center', fontSize: '0.7rem', color: '#475569',
            background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', padding: '0.75rem',
          }}>
            Demo account: <strong>9999999999</strong> / <strong>test1234</strong>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link to="/" style={{ color: '#64748B', fontSize: '0.8rem', textDecoration: 'none' }}>
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
