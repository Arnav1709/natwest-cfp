import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Landing() {
  const { t } = useTranslation();

  return (
    <div className="gradient-bg" style={{ minHeight: '100vh' }}>
      {/* Navigation */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1.25rem 2rem', maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 36, height: 36, background: 'linear-gradient(135deg, #0D9488, #10B981)',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem', color: 'white'
          }}>📦</div>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC' }}>StockSense</span>
        </div>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <a href="#features" style={{ color: '#94A3B8', fontSize: '0.875rem', fontWeight: 500 }}>Features</a>
          <a href="#how" style={{ color: '#94A3B8', fontSize: '0.875rem', fontWeight: 500 }}>How it Works</a>
          <a href="#testimonials" style={{ color: '#94A3B8', fontSize: '0.875rem', fontWeight: 500 }}>Testimonials</a>
          <Link to="/onboarding/language" className="btn btn-primary btn-sm">Get Started</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        maxWidth: '1200px', margin: '0 auto', padding: '5rem 2rem 4rem',
        textAlign: 'center', position: 'relative', zIndex: 10
      }}>
        <div className="badge badge-primary" style={{ marginBottom: '1.5rem', fontSize: '0.75rem' }}>
          ✨ Predictive Intelligence
        </div>
        <h1 style={{
          fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, lineHeight: 1.1,
          color: '#F8FAFC', maxWidth: '700px', margin: '0 auto 1.5rem'
        }}>
          {t('landing.hero_title')}
        </h1>
        <p style={{
          fontSize: '1.125rem', color: '#94A3B8', maxWidth: '600px',
          margin: '0 auto 2.5rem', lineHeight: 1.7
        }}>
          {t('landing.hero_subtitle')}
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/onboarding/language" className="btn btn-primary btn-lg">
            {t('landing.cta_start')} →
          </Link>
          <button className="btn btn-outline btn-lg">
            ▶ {t('landing.cta_demo')}
          </button>
        </div>
      </section>

      {/* Built for Ground Reality */}
      <section id="features" style={{
        maxWidth: '1200px', margin: '0 auto', padding: '4rem 2rem'
      }}>
        <h2 style={{ textAlign: 'center', fontSize: '1.875rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.5rem' }}>
          Built for the Ground Reality
        </h2>
        <p style={{ textAlign: 'center', color: '#94A3B8', marginBottom: '3rem', fontSize: '0.95rem' }}>
          StockSense isn't just a data tool—it's built for how Indian businesses actually work.
        </p>
        <div className="grid-3">
          <div className="feature-card">
            <div className="feature-card-icon">📷</div>
            <h3 className="feature-card-title">{t('landing.feature_ocr')}</h3>
            <p className="feature-card-desc">{t('landing.feature_ocr_desc')}</p>
          </div>
          <div className="feature-card">
            <div className="feature-card-icon">🦟</div>
            <h3 className="feature-card-title">{t('landing.feature_disease')}</h3>
            <p className="feature-card-desc">{t('landing.feature_disease_desc')}</p>
          </div>
          <div className="feature-card">
            <div className="feature-card-icon">💬</div>
            <h3 className="feature-card-title">{t('landing.feature_whatsapp')}</h3>
            <p className="feature-card-desc">{t('landing.feature_whatsapp_desc')}</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" style={{
        maxWidth: '1200px', margin: '0 auto', padding: '4rem 2rem'
      }}>
        <h2 style={{ textAlign: 'center', fontSize: '1.875rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.5rem' }}>
          {t('landing.how_title')}
        </h2>
        <p style={{ textAlign: 'center', color: '#94A3B8', marginBottom: '3rem', fontSize: '0.95rem' }}>
          From handwritten ledger to AI-powered forecast in 4 easy steps.
        </p>
        <div className="grid-4">
          {[
            { num: '01', icon: '📤', title: t('landing.step1'), desc: 'Upload CSV, image, or enter manually' },
            { num: '02', icon: '✅', title: t('landing.step2'), desc: 'Review extracted data before AI runs' },
            { num: '03', icon: '🔮', title: t('landing.step3'), desc: '6-week AI forecast with confidence bands' },
            { num: '04', icon: '📋', title: t('landing.step4'), desc: 'Auto reorder list, WhatsApp alerts' },
          ].map((step) => (
            <div key={step.num} className="glass-card" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
              <div style={{
                fontSize: '0.75rem', color: 'var(--color-primary-light)', fontWeight: 700,
                marginBottom: '0.75rem', letterSpacing: '0.05em'
              }}>STEP {step.num}</div>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{step.icon}</div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#F8FAFC', marginBottom: '0.5rem' }}>{step.title}</h3>
              <p style={{ fontSize: '0.875rem', color: '#94A3B8', lineHeight: 1.5 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" style={{
        maxWidth: '1200px', margin: '0 auto', padding: '4rem 2rem'
      }}>
        <h2 style={{ textAlign: 'center', fontSize: '1.875rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '3rem' }}>
          {t('landing.testimonials_title')}
        </h2>
        <div className="grid-3">
          {[
            { name: 'Ramesh Kumar', role: 'Kirana Store Owner, Lucknow', quote: '"StockSense saved my inventory from expiring. Now I never guess — the AI tells me what to order beforehand."', avatar: '👨‍🌾' },
            { name: 'Dr. Priya Nair', role: 'Pharmacy Owner, Chennai', quote: '"The disease intelligence system predicted a local flu surge 10 days early. I stocked up, competitors ran out."', avatar: '👩‍⚕️' },
            { name: 'Vikram Patel', role: 'Regional Distributor, Pune', quote: '"Managing 5000+ SKUs manually was a nightmare. StockSense brings data-driven precision to distribution."', avatar: '👨‍💼' },
          ].map((t) => (
            <div key={t.name} className="glass-card" style={{ padding: '2rem' }}>
              <p style={{ fontSize: '0.875rem', color: '#94A3B8', lineHeight: 1.7, marginBottom: '1.5rem', fontStyle: 'italic' }}>
                {t.quote}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', background: 'rgba(13,148,136,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem'
                }}>{t.avatar}</div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#F8FAFC' }}>{t.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '4rem 2rem 6rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(13,148,136,0.2), rgba(16,185,129,0.15))',
          border: '1px solid rgba(13,148,136,0.3)',
          borderRadius: '16px', padding: '3rem', textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '1rem' }}>
            Ready to see the future?
          </h2>
          <p style={{ color: '#94A3B8', marginBottom: '2rem', maxWidth: '500px', margin: '0 auto 2rem' }}>
            Join 1,000+ businesses already using StockSense for intelligent demand predictions.
          </p>
          <Link to="/onboarding/language" className="btn btn-primary btn-lg">
            Start Free Trial →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.1)', padding: '2rem',
        textAlign: 'center', fontSize: '0.875rem', color: '#64748B'
      }}>
        © 2026 StockSense · Predictive Intelligence for Indian Retail
      </footer>
    </div>
  );
}
