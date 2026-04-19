import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Rocket, Check, LogIn, UserPlus, Phone, Lock, Store, MapPin, Map, AlertTriangle, Loader2 } from 'lucide-react';
import { indianStates } from '../../utils/constants';
import { authApi } from '../../services/api';
import ShimmerButton from '../../components/ShimmerButton';

const StepIndicator = ({ current }) => {
  const steps = ['Language', 'Business', 'Setup'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: '2rem' }}>
      {steps.map((label, i) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8rem', fontWeight: 700, transition: 'all 0.3s',
              background: i < current ? 'linear-gradient(135deg, #10B981, #059669)' : i === current ? 'linear-gradient(135deg, #14B8A6, #0D9488)' : 'rgba(30,41,59,0.8)',
              color: i <= current ? '#fff' : '#64748B',
              border: i === current ? '2px solid rgba(20,184,166,0.4)' : '2px solid transparent',
              boxShadow: i === current ? '0 0 20px rgba(20,184,166,0.2)' : 'none',
            }}>
              {i < current ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span style={{ fontSize: '0.65rem', fontWeight: 600, color: i <= current ? '#14B8A6' : '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
          </div>
          {i < 2 && (
            <div style={{ width: 48, height: 2, borderRadius: 1, margin: '0 4px', marginBottom: 16, background: i < current ? 'linear-gradient(90deg, #10B981, #14B8A6)' : 'rgba(51,65,85,0.5)' }} />
          )}
        </div>
      ))}
    </div>
  );
};

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
        const businessType = localStorage.getItem('SupplySense-business') || 'pharmacy';
        const language = localStorage.getItem('SupplySense-language') || 'en';

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
        localStorage.setItem('SupplySense-token', result.access_token);
        localStorage.setItem('SupplySense-user', JSON.stringify(result.user));
        localStorage.setItem('SupplySense-shop', JSON.stringify(form));
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

  const inputStyle = {
    width: '100%', padding: '12px 14px 12px 42px', borderRadius: 12,
    background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(51,65,85,0.6)',
    color: '#E2E8F0', fontSize: '0.9rem', outline: 'none', transition: 'all 0.2s',
  };

  const iconContainerStyle = {
    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
    color: '#475569', pointerEvents: 'none',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0F172A 0%, #0B1120 40%, #0F172A 100%)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Ambient glow */}
      <div style={{ position: 'absolute', top: '-10%', left: '30%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,184,166,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '25%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 520, width: '100%', padding: '2rem', position: 'relative', zIndex: 10 }}>
        <StepIndicator current={2} />

        <div style={{
          background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(51,65,85,0.5)', borderRadius: 20, padding: '2.5rem',
        }}>
          {/* Mode Toggle */}
          <div style={{ display: 'flex', gap: 4, marginBottom: '1.5rem', background: 'rgba(30,41,59,0.6)', borderRadius: 14, padding: 4 }}>
            <button
              type="button"
              onClick={() => setMode('register')}
              style={{
                flex: 1, padding: '10px 12px', borderRadius: 10, border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: mode === 'register' ? 'linear-gradient(135deg, rgba(20,184,166,0.2), rgba(20,184,166,0.1))' : 'transparent',
                color: mode === 'register' ? '#5EEAD4' : '#64748B',
                fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: mode === 'register' ? '0 0 12px rgba(20,184,166,0.1)' : 'none',
                border: mode === 'register' ? '1px solid rgba(20,184,166,0.3)' : '1px solid transparent',
              }}
            >
              <UserPlus style={{ width: 15, height: 15 }} /> Create Account
            </button>
            <button
              type="button"
              onClick={() => setMode('login')}
              style={{
                flex: 1, padding: '10px 12px', borderRadius: 10, border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: mode === 'login' ? 'linear-gradient(135deg, rgba(20,184,166,0.2), rgba(20,184,166,0.1))' : 'transparent',
                color: mode === 'login' ? '#5EEAD4' : '#64748B',
                fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: mode === 'login' ? '0 0 12px rgba(20,184,166,0.1)' : 'none',
                border: mode === 'login' ? '1px solid rgba(20,184,166,0.3)' : '1px solid transparent',
              }}
            >
              <LogIn style={{ width: 15, height: 15 }} /> Sign In
            </button>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
              {mode === 'login' ? 'Welcome Back' : t('onboarding.setup_title')}
            </h1>
            <p style={{ color: '#94A3B8', fontSize: '0.85rem' }}>
              {mode === 'login' ? 'Enter your phone & password to continue' : t('onboarding.setup_desc')}
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 12, padding: '12px 14px', marginBottom: '1.25rem',
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <AlertTriangle style={{ width: 16, height: 16, color: '#EF4444', marginTop: 1, flexShrink: 0 }} />
              <span style={{ color: '#FCA5A5', fontSize: '0.85rem' }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Register-only fields */}
            {mode === 'register' && (
              <>
                <div style={{ position: 'relative' }}>
                  <div style={iconContainerStyle}><Store style={{ width: 16, height: 16 }} /></div>
                  <input
                    type="text"
                    placeholder="Shop Name"
                    value={form.shopName}
                    onChange={(e) => updateField('shopName', e.target.value)}
                    required
                    id="input-shop-name"
                    style={inputStyle}
                    onFocus={(e) => { e.target.style.borderColor = 'rgba(20,184,166,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(20,184,166,0.1)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(51,65,85,0.6)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>

                <div style={{ position: 'relative' }}>
                  <div style={iconContainerStyle}><MapPin style={{ width: 16, height: 16 }} /></div>
                  <input
                    type="text"
                    placeholder="City"
                    value={form.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    required
                    id="input-city"
                    style={inputStyle}
                    onFocus={(e) => { e.target.style.borderColor = 'rgba(20,184,166,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(20,184,166,0.1)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(51,65,85,0.6)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>

                <div style={{ position: 'relative' }}>
                  <div style={iconContainerStyle}><Map style={{ width: 16, height: 16 }} /></div>
                  <select
                    value={form.state}
                    onChange={(e) => updateField('state', e.target.value)}
                    required
                    id="select-state"
                    style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
                    onFocus={(e) => { e.target.style.borderColor = 'rgba(20,184,166,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(20,184,166,0.1)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(51,65,85,0.6)'; e.target.style.boxShadow = 'none'; }}
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
            <div style={{ position: 'relative' }}>
              <div style={iconContainerStyle}><Phone style={{ width: 16, height: 16 }} /></div>
              <input
                type="tel"
                placeholder="Phone Number"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                required
                id="input-phone"
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(20,184,166,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(20,184,166,0.1)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(51,65,85,0.6)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <div style={iconContainerStyle}><Lock style={{ width: 16, height: 16 }} /></div>
              <input
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                required
                minLength={4}
                id="input-password"
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(20,184,166,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(20,184,166,0.1)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(51,65,85,0.6)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => navigate(-1)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '12px 20px', borderRadius: 12, border: '1px solid rgba(51,65,85,0.5)',
                  background: 'rgba(30,41,59,0.5)', color: '#94A3B8', fontSize: '0.9rem', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                <ArrowLeft style={{ width: 16, height: 16 }} /> {t('onboarding.back')}
              </button>
              <div style={{ flex: 2 }}>
                <ShimmerButton type="submit" disabled={loading} id="btn-complete-setup" style={{ width: '100%' }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '2px 0' }}>
                    {loading
                      ? <><Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} /> Please wait...</>
                      : mode === 'login'
                        ? <><LogIn style={{ width: 18, height: 18 }} /> Sign In</>
                        : <><Rocket style={{ width: 18, height: 18 }} /> {t('onboarding.complete')}</>
                    }
                  </span>
                </ShimmerButton>
              </div>
            </div>
          </form>

          {/* Quick test seed login hint */}
          {mode === 'login' && (
            <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.72rem', color: '#475569',
              background: 'rgba(30,41,59,0.4)', borderRadius: 10, padding: '8px 12px', border: '1px solid rgba(51,65,85,0.3)' }}>
              Test account: Phone <strong style={{ color: '#94A3B8' }}>9999999999</strong>, Password <strong style={{ color: '#94A3B8' }}>test1234</strong>
            </div>
          )}
        </div>
      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
