import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const businessTypes = [
  { id: 'pharmacy', icon: '🏥', name: 'Pharmacy / Medical Store', desc: 'Medicines, supplements, medical supplies', badge: '🦟 Disease Intelligence' },
  { id: 'grocery',  icon: '🏪', name: 'Kirana / Grocery', desc: 'Daily essentials, FMCG, perishables', badge: null },
  { id: 'retail',   icon: '🏬', name: 'General Retail', desc: 'Electronics, clothing, hardware', badge: null },
  { id: 'other',    icon: '📦', name: 'Other', desc: 'Distributors, wholesalers, specialty', badge: null },
];

export default function BusinessType() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selected, setSelected] = useState('pharmacy');

  const handleContinue = () => {
    localStorage.setItem('stocksense-business', selected);
    navigate('/onboarding/setup');
  };

  return (
    <div className="gradient-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: '700px', width: '100%', padding: '2rem', position: 'relative', zIndex: 10 }}>
        {/* Progress */}
        <div className="progress-steps">
          <div className="progress-step">
            <div className="progress-step-circle completed">✓</div>
            <span className="progress-step-label">Language</span>
          </div>
          <div className="progress-step-line completed" />
          <div className="progress-step">
            <div className="progress-step-circle active">2</div>
            <span className="progress-step-label active">Business</span>
          </div>
          <div className="progress-step-line" />
          <div className="progress-step">
            <div className="progress-step-circle">3</div>
            <span className="progress-step-label">Setup</span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.5rem' }}>
            {t('onboarding.choose_business')}
          </h1>
          <p style={{ color: '#94A3B8', marginBottom: '2rem', fontSize: '0.95rem' }}>
            {t('onboarding.business_desc')}
          </p>

          <div className="grid-2" style={{ marginBottom: '2rem' }}>
            {businessTypes.map((bt) => (
              <div
                key={bt.id}
                className={`onboarding-card ${selected === bt.id ? 'selected' : ''}`}
                onClick={() => setSelected(bt.id)}
                style={{ textAlign: 'left', padding: '1.5rem' }}
                id={`biz-${bt.id}`}
              >
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{bt.icon}</div>
                <div className="onboarding-card-title" style={{ textAlign: 'left' }}>{bt.name}</div>
                <div className="onboarding-card-subtitle" style={{ textAlign: 'left', marginBottom: bt.badge ? '0.75rem' : 0 }}>{bt.desc}</div>
                {bt.badge && (
                  <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>{bt.badge}</span>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-secondary btn-lg" style={{ flex: 1 }} onClick={() => navigate(-1)}>
              ← {t('onboarding.back')}
            </button>
            <button className="btn btn-primary btn-lg" style={{ flex: 2 }} onClick={handleContinue} id="btn-continue-business">
              {t('onboarding.continue')} →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
