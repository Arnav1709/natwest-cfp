import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import ParticleBackground from '../components/ParticleBackground';
import AnimatedText from '../components/AnimatedText';
import ShimmerButton from '../components/ShimmerButton';

const features = [
  { icon: '📊', title: 'AI Demand Forecasting', desc: 'ML-powered 4-week predictions with 85%+ accuracy. Never guess inventory levels again.' },
  { icon: '🔔', title: 'Smart Alerts', desc: 'Real-time low-stock, expiry, and overstock warnings. Stay ahead of every disruption.' },
  { icon: '📸', title: 'Photo Upload', desc: 'Snap a photo of your inventory register. Our OCR extracts data in seconds.' },
  { icon: '📈', title: 'What-If Scenarios', desc: 'Simulate price changes, seasonal demand, and supply disruptions before they happen.' },
  { icon: '🌐', title: 'Multi-Language', desc: 'Full support for Hindi, Tamil, Bengali, and more. Built for Bharat.' },
  { icon: '💰', title: 'Smart Reordering', desc: 'Auto-generated purchase orders optimized for your budget and storage capacity.' },
];

const steps = [
  { num: '01', title: 'Upload Inventory', desc: 'Photo, CSV, or manual entry — your choice' },
  { num: '02', title: 'AI Analyzes', desc: 'Our models process your data in real-time' },
  { num: '03', title: 'Get Insights', desc: 'Forecasts, alerts, and reorder recommendations' },
  { num: '04', title: 'Take Action', desc: 'One-click reorders and data-driven decisions' },
];

const testimonials = [
  { name: 'Rajesh Kumar', role: 'Kirana Owner, Delhi', text: 'StockSense reduced my wastage by 30%. The AI predictions are surprisingly accurate for my small shop.', avatar: 'RK' },
  { name: 'Priya Sharma', role: 'Pharmacy Owner, Mumbai', text: 'Expiry alerts alone saved me ₹15,000 last month. This tool pays for itself.', avatar: 'PS' },
  { name: 'Arun Patel', role: 'General Store, Ahmedabad', text: 'The photo upload feature is magic. No more manual data entry after a long day.', avatar: 'AP' },
];

export default function Landing() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [visibleSections, setVisibleSections] = useState(new Set());
  const sectionsRef = useRef({});

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set([...prev, entry.target.id]));
          }
        });
      },
      { threshold: 0.15 }
    );

    Object.values(sectionsRef.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const isVisible = (id) => visibleSections.has(id);

  return (
    <div className="landing-page" style={{ background: 'var(--color-bg-primary)', minHeight: '100vh', overflow: 'hidden' }}>
      {/* === Floating Navbar === */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: '0 2rem',
        height: '72px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: scrollY > 50 ? 'rgba(6, 11, 24, 0.85)' : 'transparent',
        backdropFilter: scrollY > 50 ? 'blur(20px)' : 'none',
        borderBottom: scrollY > 50 ? '1px solid rgba(255,255,255,0.04)' : '1px solid transparent',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #0D9488, #10B981)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem', boxShadow: '0 0 20px rgba(16,185,129,0.2)',
          }}>📦</div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>
            Stock<span style={{ color: 'var(--color-primary-light)' }}>Sense</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => navigate('/login')} className="btn btn-ghost" style={{ fontSize: '0.875rem' }}>Sign In</button>
          <button onClick={() => navigate('/login')} className="btn btn-primary btn-sm" style={{ boxShadow: '0 4px 15px rgba(16,185,129,0.25)' }}>
            Get Started →
          </button>
        </div>
      </nav>

      {/* === Hero Section === */}
      <section style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        padding: '6rem 2rem 4rem',
      }}>
        <ParticleBackground particleCount={50} color="#10B981" maxOpacity={0.3} />

        {/* Aurora blobs */}
        <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '50%', height: '50%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)', filter: 'blur(80px)', animation: 'morph 15s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '20%', right: '-10%', width: '40%', height: '40%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)', filter: 'blur(80px)', animation: 'morph 18s ease-in-out infinite reverse', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 1200, margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <span className="badge badge-accent" style={{ animation: 'pulse-glow 2s ease-in-out infinite' }}>
                ✨ AI-Powered Inventory Intelligence
              </span>
            </div>

            <AnimatedText
              text="Your Inventory, Brilliantly Managed"
              as="h1"
              split="words"
              staggerDelay={80}
              style={{ fontSize: 'clamp(2.5rem, 5vw, 3.75rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.5rem', fontFamily: 'var(--font-display)' }}
            />

            <p style={{
              fontSize: '1.125rem', color: 'var(--color-text-secondary)', lineHeight: 1.7,
              maxWidth: 480, marginBottom: '2rem',
              opacity: 0, animation: 'fade-in-up 0.6s 0.5s forwards',
            }}>
              AI-powered demand forecasting, smart alerts, and automated reordering — designed for Indian shopkeepers who want to grow, not guess.
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', opacity: 0, animation: 'fade-in-up 0.6s 0.7s forwards' }}>
              <ShimmerButton onClick={() => navigate('/login')}>
                Start Free Today →
              </ShimmerButton>
              <button className="btn btn-secondary btn-lg" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                See How It Works
              </button>
            </div>

            <div style={{ display: 'flex', gap: '2rem', marginTop: '2.5rem', opacity: 0, animation: 'fade-in-up 0.6s 0.9s forwards' }}>
              {[{ val: '10K+', label: 'Shops' }, { val: '85%', label: 'Forecast Accuracy' }, { val: '30%', label: 'Waste Reduced' }].map((s, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary-light)' }}>{s.val}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero Image */}
          <div style={{
            position: 'relative',
            opacity: 0, animation: 'fade-in-right 0.8s 0.4s forwards',
          }}>
            <div style={{
              position: 'absolute', inset: -20, borderRadius: 24,
              background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(139,92,246,0.1))',
              filter: 'blur(40px)', animation: 'breathe 4s ease-in-out infinite',
            }} />
            <img
              src="/hero-dashboard.png"
              alt="StockSense AI Dashboard"
              style={{
                width: '100%', borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
                position: 'relative', zIndex: 1,
                animation: 'float-slow 6s ease-in-out infinite',
              }}
            />
          </div>
        </div>
      </section>

      {/* === Features Section === */}
      <section
        id="features"
        ref={(el) => (sectionsRef.current.features = el)}
        style={{ padding: '6rem 2rem', position: 'relative' }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <span className="badge badge-primary" style={{ marginBottom: '1rem', display: 'inline-flex' }}>Features</span>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 800,
              marginBottom: '1rem',
              opacity: isVisible('features') ? 1 : 0,
              transform: isVisible('features') ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
              Everything You Need to <span className="gradient-text">Win at Inventory</span>
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', maxWidth: 550, margin: '0 auto', fontSize: '1.05rem' }}>
              Powerful AI tools that turn your shop data into actionable intelligence
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {features.map((f, i) => (
              <div
                key={i}
                className="feature-card"
                style={{
                  opacity: isVisible('features') ? 1 : 0,
                  transform: isVisible('features') ? 'translateY(0)' : 'translateY(30px)',
                  transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.1}s`,
                  textAlign: 'left',
                  padding: '2rem',
                }}
              >
                <div className="feature-card-icon" style={{ margin: '0 0 1.25rem 0' }}>
                  {f.icon}
                </div>
                <div className="feature-card-title">{f.title}</div>
                <div className="feature-card-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === How It Works === */}
      <section
        id="howitworks"
        ref={(el) => (sectionsRef.current.howitworks = el)}
        style={{ padding: '6rem 2rem', position: 'relative' }}
      >
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <span className="badge badge-info" style={{ marginBottom: '1rem', display: 'inline-flex' }}>How It Works</span>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 800,
              opacity: isVisible('howitworks') ? 1 : 0,
              transform: isVisible('howitworks') ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
              From Chaos to <span className="gradient-text">Clarity</span> in 4 Steps
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {steps.map((step, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: '2rem',
                  alignItems: 'flex-start',
                  padding: '2rem 0',
                  borderLeft: '2px solid rgba(255,255,255,0.06)',
                  paddingLeft: '2rem',
                  marginLeft: '1.5rem',
                  position: 'relative',
                  opacity: isVisible('howitworks') ? 1 : 0,
                  transform: isVisible('howitworks') ? 'translateX(0)' : 'translateX(-20px)',
                  transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.15}s`,
                }}
              >
                <div style={{
                  position: 'absolute', left: '-15px', top: '2rem',
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 800, color: 'white',
                  boxShadow: '0 0 15px rgba(16,185,129,0.3)',
                }}>{step.num}</div>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>{step.title}</h3>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === Testimonials === */}
      <section
        id="testimonials"
        ref={(el) => (sectionsRef.current.testimonials = el)}
        style={{ padding: '6rem 2rem', position: 'relative' }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <span className="badge badge-success" style={{ marginBottom: '1rem', display: 'inline-flex' }}>Testimonials</span>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 800,
              opacity: isVisible('testimonials') ? 1 : 0,
              transform: isVisible('testimonials') ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
              Loved by <span className="gradient-text">10,000+</span> Shopkeepers
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="glass-card"
                style={{
                  opacity: isVisible('testimonials') ? 1 : 0,
                  transform: isVisible('testimonials') ? 'translateY(0)' : 'translateY(30px)',
                  transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.12}s`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(139,92,246,0.15))',
                    border: '2px solid rgba(16,185,129,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-primary-light)',
                  }}>{t.avatar}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{t.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{t.role}</div>
                  </div>
                </div>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: 1.7, fontStyle: 'italic' }}>
                  "{t.text}"
                </p>
                <div style={{ display: 'flex', gap: '2px', marginTop: '1rem' }}>
                  {[1,2,3,4,5].map(s => <span key={s} style={{ color: '#FBBF24', fontSize: '0.9rem' }}>★</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === CTA Section === */}
      <section style={{ padding: '6rem 2rem', position: 'relative' }}>
        <div style={{
          maxWidth: 800, margin: '0 auto', textAlign: 'center',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 24, padding: '4rem 3rem',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Animated border */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: 'linear-gradient(90deg, var(--color-primary), var(--color-accent), var(--color-info), var(--color-primary))',
            backgroundSize: '300% 100%', animation: 'aurora 4s ease infinite',
          }} />

          <div style={{
            position: 'absolute', top: '-50%', left: '50%', transform: 'translateX(-50%)',
            width: '120%', height: '100%', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
            filter: 'blur(60px)', pointerEvents: 'none',
          }} />

          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: '2.25rem', fontWeight: 800,
            marginBottom: '1rem', position: 'relative',
          }}>
            Ready to <span className="gradient-text">Transform</span> Your Inventory?
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.05rem', marginBottom: '2rem', position: 'relative' }}>
            Join thousands of smart shopkeepers who stopped guessing and started growing.
          </p>
          <div style={{ position: 'relative' }}>
            <ShimmerButton onClick={() => navigate('/login')} style={{ fontSize: '1rem', padding: '1rem 2.5rem' }}>
              Get Started — It's Free →
            </ShimmerButton>
          </div>
        </div>
      </section>

      {/* === Footer === */}
      <footer style={{
        padding: '2rem',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        textAlign: 'center',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.15), rgba(139,92,246,0.08), transparent)',
        }} />
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
          © 2025 StockSense — AI-Powered Inventory Intelligence for Bharat
        </p>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          .landing-page section > div > div[style*="gridTemplateColumns: '1fr 1fr'"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
