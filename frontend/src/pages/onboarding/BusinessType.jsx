import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ArrowLeft, Check, Building2, ShoppingCart, Store, Package } from 'lucide-react';
import ShimmerButton from '../../components/ShimmerButton';

const businessTypes = [
  { id: 'pharmacy', icon: Building2, emoji: '🏥', name: 'Pharmacy / Medical Store', desc: 'Medicines, supplements, medical supplies', badge: 'Disease Intelligence', badgeColor: '#8B5CF6' },
  { id: 'grocery', icon: ShoppingCart, emoji: '🏪', name: 'Kirana / Grocery', desc: 'Daily essentials, FMCG, perishables', badge: null },
  { id: 'retail', icon: Store, emoji: '🏬', name: 'General Retail', desc: 'Electronics, clothing, hardware', badge: null },
  { id: 'other', icon: Package, emoji: '📦', name: 'Other', desc: 'Distributors, wholesalers, specialty', badge: null },
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

export default function BusinessType() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selected, setSelected] = useState('pharmacy');

  const handleContinue = () => {
    localStorage.setItem('SupplySense-business', selected);
    navigate('/onboarding/setup');
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0F172A 0%, #0B1120 40%, #0F172A 100%)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Ambient glow */}
      <div style={{ position: 'absolute', top: '-20%', right: '15%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-10%', left: '20%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,184,166,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 700, width: '100%', padding: '2rem', position: 'relative', zIndex: 10 }}>
        <StepIndicator current={1} />

        <div style={{
          background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(51,65,85,0.5)', borderRadius: 20, padding: '2.5rem', textAlign: 'center',
        }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
            {t('onboarding.choose_business')}
          </h1>
          <p style={{ color: '#94A3B8', marginBottom: '2rem', fontSize: '0.9rem' }}>
            {t('onboarding.business_desc')}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
            {businessTypes.map((bt) => {
              const isSelected = selected === bt.id;
              return (
                <div
                  key={bt.id}
                  onClick={() => setSelected(bt.id)}
                  id={`biz-${bt.id}`}
                  style={{
                    textAlign: 'left', padding: '1.5rem', borderRadius: 14, cursor: 'pointer',
                    transition: 'all 0.2s ease', position: 'relative',
                    background: isSelected ? 'rgba(20,184,166,0.1)' : 'rgba(30,41,59,0.5)',
                    border: isSelected ? '2px solid rgba(20,184,166,0.5)' : '2px solid rgba(51,65,85,0.4)',
                    boxShadow: isSelected ? '0 0 20px rgba(20,184,166,0.1)' : 'none',
                  }}
                >
                  {isSelected && (
                    <div style={{ position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: '50%', background: '#14B8A6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check style={{ width: 12, height: 12, color: '#fff' }} />
                    </div>
                  )}
                  <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{bt.emoji}</div>
                  <div style={{ fontWeight: 700, color: isSelected ? '#5EEAD4' : '#E2E8F0', marginBottom: 4, fontSize: '0.95rem' }}>{bt.name}</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: bt.badge ? '0.75rem' : 0 }}>{bt.desc}</div>
                  {bt.badge && (
                    <span style={{
                      display: 'inline-block', padding: '3px 10px', borderRadius: 8,
                      fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                      background: `${bt.badgeColor}15`, color: bt.badgeColor, border: `1px solid ${bt.badgeColor}30`,
                    }}>
                      {bt.badge}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
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
              <ShimmerButton onClick={handleContinue} id="btn-continue-business" style={{ width: '100%' }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '2px 0' }}>
                  {t('onboarding.continue')} <ArrowRight style={{ width: 18, height: 18 }} />
                </span>
              </ShimmerButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
