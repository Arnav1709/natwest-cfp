import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { indianStates } from '../../utils/constants';
import { authApi } from '../../services/api';

export default function ShopSetup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ shopName: '', city: '', state: '', phone: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('register'); // 'register' or 'login'

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let result;

      if (mode === 'login') {
        // Login existing user
        result = await authApi.login({ phone: form.phone, password: form.password });
      } else {
        // Register new user
        const businessType = localStorage.getItem('stocksense-business') || 'pharmacy';
        const language = localStorage.getItem('stocksense-language') || 'en';

        result = await authApi.register({
          shop_name: form.shopName || 'My Shop',
          business_type: businessType,
          city: form.city,
          state: form.state,
          language: language,
          phone: form.phone,
          email: '',
          password: form.password,
        });
      }

      // Store the JWT token
      if (result.access_token) {
        localStorage.setItem('stocksense-token', result.access_token);
        localStorage.setItem('stocksense-user', JSON.stringify(result.user));
        localStorage.setItem('stocksense-shop', JSON.stringify(form));
        navigate('/dashboard/overview');
      } else {
        setError('No token received. Please try again.');
      }
    } catch (err) {
      const msg = err.message || 'Registration failed. Please try again.';
      if (msg.includes('already exists')) {
        setError('This phone number is already registered. Switch to "Sign In" below.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="gradient-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: '520px', width: '100%', padding: '2rem', position: 'relative', zIndex: 10 }}>
        {/* Progress */}
        <div className="progress-steps">
          <div className="progress-step">
            <div className="progress-step-circle completed">✓</div>
            <span className="progress-step-label">Language</span>
          </div>
          <div className="progress-step-line completed" />
          <div className="progress-step">
            <div className="progress-step-circle completed">✓</div>
            <span className="progress-step-label">Business</span>
          </div>
          <div className="progress-step-line completed" />
          <div className="progress-step">
            <div className="progress-step-circle active">3</div>
            <span className="progress-step-label">Setup</span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '2.5rem' }}>
          {/* Mode Toggle */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-lg)', padding: '4px' }}>
            <button
              type="button"
              onClick={() => setMode('register')}
              style={{
                flex: 1, padding: '8px', borderRadius: 'var(--radius-md)', border: 'none',
                background: mode === 'register' ? 'var(--color-primary)' : 'transparent',
                color: mode === 'register' ? '#fff' : '#94A3B8',
                fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              🆕 Create Account
            </button>
            <button
              type="button"
              onClick={() => setMode('login')}
              style={{
                flex: 1, padding: '8px', borderRadius: 'var(--radius-md)', border: 'none',
                background: mode === 'login' ? 'var(--color-primary)' : 'transparent',
                color: mode === 'login' ? '#fff' : '#94A3B8',
                fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              🔑 Sign In
            </button>
          </div>

          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.5rem', textAlign: 'center' }}>
            {mode === 'login' ? '🔑 Sign In' : t('onboarding.setup_title')}
          </h1>
          <p style={{ color: '#94A3B8', marginBottom: '2rem', textAlign: 'center' }}>
            {mode === 'login' ? 'Enter your phone & password to continue' : t('onboarding.setup_desc')}
          </p>

          {/* Error Banner */}
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
            {/* Register-only fields */}
            {mode === 'register' && (
              <>
                <div className="floating-label-group">
                  <input
                    type="text"
                    placeholder=" "
                    value={form.shopName}
                    onChange={(e) => updateField('shopName', e.target.value)}
                    required
                    id="input-shop-name"
                  />
                  <label>Shop Name</label>
                </div>

                <div className="floating-label-group">
                  <input
                    type="text"
                    placeholder=" "
                    value={form.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    required
                    id="input-city"
                  />
                  <label>City</label>
                </div>

                <div className="form-group">
                  <label className="form-label">State</label>
                  <select
                    className="form-select"
                    value={form.state}
                    onChange={(e) => updateField('state', e.target.value)}
                    required
                    id="select-state"
                  >
                    <option value="">Select your state</option>
                    {indianStates.map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Shared fields — phone & password */}
            <div className="floating-label-group">
              <input
                type="tel"
                placeholder=" "
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                required
                id="input-phone"
              />
              <label>Phone Number</label>
            </div>

            <div className="floating-label-group">
              <input
                type="password"
                placeholder=" "
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                required
                minLength={4}
                id="input-password"
              />
              <label>Password</label>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary btn-lg" style={{ flex: 1 }} onClick={() => navigate(-1)}>
                ← {t('onboarding.back')}
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ flex: 2 }}
                id="btn-complete-setup"
                disabled={loading}
              >
                {loading
                  ? '⏳ Please wait...'
                  : mode === 'login'
                    ? '🔑 Sign In'
                    : `${t('onboarding.complete')} 🚀`
                }
              </button>
            </div>
          </form>

          {/* Quick test seed login hint */}
          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: '#64748B' }}>
            {mode === 'login' && (
              <span>Test account: Phone <strong>9999999999</strong>, Password <strong>test1234</strong></span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
