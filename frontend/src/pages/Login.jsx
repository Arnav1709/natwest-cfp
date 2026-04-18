import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ParticleBackground from '../components/ParticleBackground';
import ShimmerButton from '../components/ShimmerButton';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Login failed');
      localStorage.setItem('stocksense-token', data.access_token);
      localStorage.setItem('stocksense-user', JSON.stringify(data.user));
      navigate('/dashboard/overview');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = () => {
    setPhone('9876543210');
    setPassword('demo123');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      position: 'relative',
      background: 'var(--color-bg-primary)',
      overflow: 'hidden',
    }}>
      {/* === Left Panel — Branding & Particles === */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        padding: '3rem',
      }}>
        <ParticleBackground particleCount={40} color="#10B981" maxOpacity={0.25} />

        {/* Aurora blobs */}
        <div style={{ position: 'absolute', top: '10%', left: '10%', width: '50%', height: '50%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)', filter: 'blur(80px)', animation: 'morph 15s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '40%', height: '40%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)', filter: 'blur(80px)', animation: 'morph 18s ease-in-out infinite reverse', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 400 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, margin: '0 auto 1.5rem',
            background: 'linear-gradient(135deg, #0D9488, #10B981, #34D399)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', boxShadow: '0 0 40px rgba(16,185,129,0.3)',
            animation: 'float 3s ease-in-out infinite',
          }}>📦</div>

          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: '2.25rem', fontWeight: 800,
            marginBottom: '0.75rem', lineHeight: 1.2,
          }}>
            Stock<span style={{ color: 'var(--color-primary-light)' }}>Sense</span>
          </h1>
          <p style={{
            color: 'var(--color-text-secondary)', fontSize: '1rem', lineHeight: 1.6,
          }}>
            AI-Powered Inventory Intelligence for the smartest shopkeepers in Bharat
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '2.5rem', marginTop: '2.5rem' }}>
            {[{ val: '85%', label: 'Accuracy' }, { val: '30%', label: 'Less Waste' }, { val: '2x', label: 'Faster' }].map((s, i) => (
              <div key={i} style={{ textAlign: 'center', opacity: 0, animation: `fade-in-up 0.5s ${0.3 + i * 0.1}s forwards` }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary-light)' }}>{s.val}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* === Right Panel — Login Form === */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
        position: 'relative',
        borderLeft: '1px solid rgba(255,255,255,0.04)',
      }}>
        <div style={{
          width: '100%', maxWidth: 420,
          opacity: 0, animation: 'fade-in-up 0.6s 0.2s forwards',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800,
            marginBottom: '0.5rem',
          }}>Welcome back</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>
            Sign in to your dashboard
          </p>

          {error && (
            <div style={{
              background: 'rgba(244,63,94,0.08)',
              border: '1px solid rgba(244,63,94,0.15)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              marginBottom: '1.5rem',
              color: 'var(--color-danger)',
              fontSize: '0.85rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              animation: 'fade-in-up 0.3s ease',
            }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                className="form-input"
                placeholder="Enter your phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                style={{ height: 52 }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ height: 52 }}
              />
            </div>

            <ShimmerButton
              type="submit"
              disabled={loading}
              style={{ width: '100%', height: 52, marginTop: '0.5rem' }}
            >
              {loading ? '⏳ Signing in...' : '→ Sign In'}
            </ShimmerButton>
          </form>

          {/* Demo hint */}
          <div style={{
            marginTop: '2rem',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.25rem',
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
              Demo Credentials
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
              <span style={{ color: 'var(--color-text-muted)' }}>phone:</span> <span style={{ color: 'var(--color-primary-light)' }}>9876543210</span><br />
              <span style={{ color: 'var(--color-text-muted)' }}>pass:</span> <span style={{ color: 'var(--color-primary-light)' }}>demo123</span>
            </div>
            <button
              onClick={handleDemo}
              className="btn btn-outline btn-sm"
              style={{ marginTop: '0.75rem', width: '100%' }}
            >
              Fill Demo Credentials
            </button>
          </div>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Don't have an account?{' '}
            <button onClick={() => navigate('/onboarding/language')} style={{ color: 'var(--color-primary-light)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}>
              Get Started
            </button>
          </p>
        </div>
      </div>

      {/* Mobile responsive */}
      <style>{`
        @media (max-width: 768px) {
          .login-page > div:first-child { display: none !important; }
          .login-page > div:last-child { flex: 1 !important; border-left: none !important; }
        }
      `}</style>
    </div>
  );
}
