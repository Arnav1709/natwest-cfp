import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { indianStates } from '../../mocks/mockData';

export default function ShopSetup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ shopName: '', city: '', state: '', phone: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('stocksense-shop', JSON.stringify(form));
    navigate('/upload');
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
            <span className="progress-step-label active">Setup</span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '2.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.5rem', textAlign: 'center' }}>
            {t('onboarding.setup_title')}
          </h1>
          <p style={{ color: '#94A3B8', marginBottom: '2rem', textAlign: 'center' }}>
            {t('onboarding.setup_desc')}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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

            <div className="floating-label-group">
              <input
                type="tel"
                placeholder=" "
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                id="input-phone"
              />
              <label>Phone Number (+91)</label>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary btn-lg" style={{ flex: 1 }} onClick={() => navigate(-1)}>
                ← {t('onboarding.back')}
              </button>
              <button type="submit" className="btn btn-primary btn-lg" style={{ flex: 2 }} id="btn-complete-setup">
                {t('onboarding.complete')} 🚀
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
