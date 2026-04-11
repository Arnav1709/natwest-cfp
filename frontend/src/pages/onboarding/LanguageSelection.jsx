import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'en', name: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', native: 'हिंदी', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', flag: '🇮🇳' },
];

export default function LanguageSelection() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(i18n.language || 'en');

  const handleContinue = () => {
    i18n.changeLanguage(selected);
    localStorage.setItem('stocksense-lang', selected);
    navigate('/onboarding/business-type');
  };

  return (
    <div className="gradient-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: '620px', width: '100%', padding: '2rem', position: 'relative', zIndex: 10 }}>
        {/* Progress */}
        <div className="progress-steps">
          <div className="progress-step">
            <div className="progress-step-circle active">1</div>
            <span className="progress-step-label active">Language</span>
          </div>
          <div className="progress-step-line" />
          <div className="progress-step">
            <div className="progress-step-circle">2</div>
            <span className="progress-step-label">Business</span>
          </div>
          <div className="progress-step-line" />
          <div className="progress-step">
            <div className="progress-step-circle">3</div>
            <span className="progress-step-label">Setup</span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.5rem' }}>
            {t('onboarding.choose_language_native')}
          </h1>
          <p style={{ color: '#94A3B8', marginBottom: '2rem', fontSize: '0.95rem' }}>
            {t('onboarding.choose_language')}
          </p>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '0.75rem', marginBottom: '2rem'
          }}>
            {languages.map((lang) => (
              <div
                key={lang.code}
                className={`onboarding-card ${selected === lang.code ? 'selected' : ''}`}
                onClick={() => setSelected(lang.code)}
                style={{ padding: '1.25rem 1rem' }}
                id={`lang-${lang.code}`}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{lang.flag}</div>
                <div className="onboarding-card-title">{lang.native}</div>
                <div className="onboarding-card-subtitle">{lang.name}</div>
              </div>
            ))}
          </div>

          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            onClick={handleContinue}
            id="btn-continue-language"
          >
            {t('onboarding.continue')} →
          </button>
        </div>
      </div>
    </div>
  );
}
