import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, ArrowRight, Check } from 'lucide-react';
import ShimmerButton from '../../components/ShimmerButton';

const languages = [
  { code: 'en', name: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', native: 'हिंदी', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', flag: '🇮🇳' },
];

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

export default function LanguageSelection() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(i18n.language || 'en');

  const handleContinue = () => {
    i18n.changeLanguage(selected);
    localStorage.setItem('SupplySense-lang', selected);
    navigate('/onboarding/business-type');
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0F172A 0%, #0B1120 40%, #0F172A 100%)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Ambient glow */}
      <div style={{ position: 'absolute', top: '-20%', left: '20%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,184,166,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 620, width: '100%', padding: '2rem', position: 'relative', zIndex: 10 }}>
        <StepIndicator current={0} />

        <div style={{
          background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(51,65,85,0.5)', borderRadius: 20, padding: '2.5rem', textAlign: 'center',
        }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, rgba(20,184,166,0.15), rgba(20,184,166,0.05))', border: '1px solid rgba(20,184,166,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Globe style={{ width: 28, height: 28, color: '#14B8A6' }} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
            {t('onboarding.choose_language_native')}
          </h1>
          <p style={{ color: '#94A3B8', marginBottom: '2rem', fontSize: '0.9rem' }}>
            {t('onboarding.choose_language')}
          </p>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))',
            gap: '0.75rem', marginBottom: '2rem'
          }}>
            {languages.map((lang) => (
              <div
                key={lang.code}
                onClick={() => setSelected(lang.code)}
                id={`lang-${lang.code}`}
                style={{
                  padding: '1.25rem 1rem', borderRadius: 14, cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: selected === lang.code ? 'rgba(20,184,166,0.1)' : 'rgba(30,41,59,0.5)',
                  border: selected === lang.code ? '2px solid rgba(20,184,166,0.5)' : '2px solid rgba(51,65,85,0.4)',
                  boxShadow: selected === lang.code ? '0 0 20px rgba(20,184,166,0.1)' : 'none',
                  position: 'relative',
                }}
              >
                {selected === lang.code && (
                  <div style={{ position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: '50%', background: '#14B8A6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Check style={{ width: 11, height: 11, color: '#fff' }} />
                  </div>
                )}
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{lang.flag}</div>
                <div style={{ fontWeight: 700, color: selected === lang.code ? '#5EEAD4' : '#E2E8F0', fontSize: '0.95rem' }}>{lang.native}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 2 }}>{lang.name}</div>
              </div>
            ))}
          </div>

          <ShimmerButton onClick={handleContinue} id="btn-continue-language" style={{ width: '100%' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '2px 0' }}>
              {t('onboarding.continue')} <ArrowRight style={{ width: 18, height: 18 }} />
            </span>
          </ShimmerButton>
        </div>
      </div>
    </div>
  );
}
