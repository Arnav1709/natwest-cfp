import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Plot from '../../components/PlotChart.jsx';
import { inventoryApi, forecastApi } from '../../services/api';
import { useApi } from '../../hooks/useApi';
import GlowCard from '../../components/GlowCard';
import AnimatedCounter from '../../components/AnimatedCounter';
import ShimmerButton from '../../components/ShimmerButton';

// Auto-assign icons based on driver name keywords
function getDriverIcon(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('disease') || n.includes('outbreak') || n.includes('flu') || n.includes('dengue') || n.includes('respiratory'))
    return '🦠';
  if (n.includes('festival') || n.includes('diwali') || n.includes('eid') || n.includes('christmas') || n.includes('holi'))
    return '🎉';
  if (n.includes('weather') || n.includes('monsoon') || n.includes('rain') || n.includes('summer') || n.includes('winter'))
    return '🌦️';
  if (n.includes('trend') && n.includes('up')) return '📈';
  if (n.includes('trend') && n.includes('declin')) return '📉';
  if (n.includes('trend')) return '📊';
  if (n.includes('market') || n.includes('demand')) return '🛒';
  if (n.includes('season')) return '🗓️';
  return '⚡';
}

export default function Forecasting() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: rawProducts, loading: pLoading } = useApi(() => inventoryApi.list({ per_page: 1000 }), []);
  const products = Array.isArray(rawProducts) ? rawProducts : (rawProducts?.products || []);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [fc, setFc] = useState(null);
  const [fcLoading, setFcLoading] = useState(false);
  const [fcError, setFcError] = useState(null);

  // Auto-select first product
  useEffect(() => {
    if (products.length > 0 && !selectedProduct) {
      setSelectedProduct(products[0].id);
    }
  }, [products, selectedProduct]);

  // Fetch forecast when product changes
  useEffect(() => {
    if (!selectedProduct) return;
    setFcLoading(true);
    setFcError(null);
    forecastApi.get(selectedProduct)
      .then(data => setFc(data))
      .catch(err => { setFcError(err.message); setFc(null); })
      .finally(() => setFcLoading(false));
  }, [selectedProduct]);

  if (pLoading && products.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, margin: '0 auto 1rem',
            background: 'linear-gradient(135deg, rgba(56,189,248,0.1), rgba(139,92,246,0.08))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.75rem', animation: 'float 2s ease-in-out infinite',
          }}>🔮</div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Loading forecast models...</p>
        </div>
      </div>
    );
  }

  const hasForecast = fc && fc.forecast && fc.forecast.length > 0;

  const weeks = hasForecast ? fc.forecast.map(f => f.week) : [];
  const likely = hasForecast ? fc.forecast.map(f => f.likely) : [];
  const low = hasForecast ? fc.forecast.map(f => f.low) : [];
  const high = hasForecast ? fc.forecast.map(f => f.high) : [];
  const baseline = fc?.baseline || [];

  /* Main forecast chart - Neon styled */
  const forecastTraces = hasForecast ? [
    { x: weeks, y: high, type: 'scatter', mode: 'lines', line: { width: 0 }, showlegend: false, hoverinfo: 'skip' },
    { x: weeks, y: low, type: 'scatter', mode: 'lines', line: { width: 0 }, fill: 'tonexty', fillcolor: 'rgba(56,189,248,0.15)', name: 'Confidence Range', showlegend: true, hoverinfo: 'skip' },
    { x: weeks, y: likely, type: 'scatter', mode: 'lines+markers', name: 'Forecast', line: { color: '#38BDF8', width: 3, shape: 'spline' }, marker: { size: 6, color: '#38BDF8', line: { color: '#0F172A', width: 2 } } },
    ...(baseline.length > 0 ? [{ x: weeks, y: baseline, type: 'scatter', mode: 'lines', name: 'Baseline', line: { color: 'rgba(148,163,184,0.5)', width: 2, dash: 'dot' } }] : []),
  ] : [];

  const forecastLayout = {
    paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
    font: { color: '#94A3B8', family: 'Inter', size: 12 },
    margin: { t: 30, r: 30, b: 50, l: 50 },
    height: 320,
    xaxis: { title: '', gridcolor: 'rgba(255,255,255,0.05)', tickfont: { color: '#94A3B8' }, zerolinecolor: 'rgba(255,255,255,0.1)' },
    yaxis: { title: 'Units', gridcolor: 'rgba(255,255,255,0.05)', tickfont: { color: '#94A3B8' }, zerolinecolor: 'rgba(255,255,255,0.1)' },
    legend: { orientation: 'h', y: 1.12, x: 0.5, xanchor: 'center', font: { size: 11, color: '#F8FAFC' } },
    hovermode: 'x unified',
  };

  const rawDrivers = fc?.driver_details || [];
  const drivers = rawDrivers.map(d => ({
    name: d.name,
    icon: getDriverIcon(d.name),
    desc: d.description || '',
    value: d.impact_pct != null ? `${d.impact_pct > 0 ? '+' : ''}${d.impact_pct}%` : '',
    positive: (d.impact_pct || 0) >= 0,
    impactValue: d.impact_pct || 0,
  }));

  const accuracy = fc?.accuracy || {};
  const hasAccuracyData = accuracy.accuracy_pct > 0 || accuracy.mape > 0;

  const modelUsed = fc?.model_used || '';
  const dataQuality = fc?.data_quality || '';

  const modelBadge = (() => {
    if (modelUsed.includes('prophet')) return { label: 'Prophet AI', cls: 'badge-primary' };
    if (modelUsed.includes('sma')) return { label: 'SMA Fallback', cls: 'badge-warning' };
    if (modelUsed === 'none') return { label: 'No Model', cls: 'badge-muted' };
    return { label: modelUsed || '—', cls: 'badge-muted' };
  })();

  const qualityBadge = (() => {
    if (dataQuality === 'sufficient') return { label: 'Optimal Data', cls: 'badge-success' };
    if (dataQuality === 'supplemented') return { label: 'Supplemented', cls: 'badge-info' };
    if (dataQuality === 'proxy_from_similar') return { label: 'Proxy Data', cls: 'badge-warning' };
    if (dataQuality === 'limited_data') return { label: 'Limited Data', cls: 'badge-warning' };
    if (dataQuality === 'insufficient') return { label: 'Insufficient', cls: 'badge-danger' };
    return null;
  })();

  const trendIndicator = (() => {
    if (!hasAccuracyData) return null;
    const t = accuracy.trend;
    if (t === 'improving') return { icon: '📈', label: 'Improving', cls: 'var(--color-success)' };
    if (t === 'declining') return { icon: '📉', label: 'Declining', cls: 'var(--color-danger)' };
    return { icon: '→', label: 'Stable', cls: 'var(--color-text-muted)' };
  })();

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div style={{ opacity: 0, animation: 'fade-in-up 0.4s forwards' }}>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 'var(--space-1)' }}>
            {t('forecast.title')}
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-2xl)', fontWeight: 800, margin: 0 }}>
            Demand Projections
          </h1>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', opacity: 0, animation: 'fade-in-up 0.4s 0.1s forwards' }}>
          <div className="custom-select-wrapper">
            <select
              className="form-select"
              style={{ minWidth: 220, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
              value={selectedProduct || ''}
              onChange={(e) => setSelectedProduct(Number(e.target.value))}
            >
              {products.length === 0 && <option value="">No products</option>}
              {products.map(p => (
                <option key={p.id} value={p.id} style={{ background: '#0F172A' }}>{p.name}</option>
              ))}
            </select>
          </div>
          {fc && !fcLoading && (
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <span className={`badge ${modelBadge.cls}`} style={{ boxShadow: '0 0 10px rgba(56,189,248,0.2)' }}>{modelBadge.label}</span>
              {qualityBadge && <span className={`badge ${qualityBadge.cls}`}>{qualityBadge.label}</span>}
            </div>
          )}
        </div>
      </div>

      {fcError && (
        <div style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', marginBottom: 'var(--space-4)', color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)', animation: 'fade-in-up 0.4s forwards' }}>
          ⚠️ {fcError}
        </div>
      )}

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--space-5)' }}>
        {/* Left — Chart & Drivers */}
        <div>
          <GlowCard glowColor="rgba(56,189,248,0.15)" style={{ marginBottom: 'var(--space-5)', padding: 'var(--space-5)', opacity: 0, animation: 'fade-in-up 0.5s 0.2s forwards' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>{t('forecast.demand_projection')}</h2>
            </div>
            {fcLoading ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-8) 0', color: 'var(--color-text-muted)' }}>
                <div style={{ width: 40, height: 40, margin: '0 auto', border: '3px solid rgba(56,189,248,0.2)', borderTopColor: '#38BDF8', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : hasForecast ? (
              <Plot data={forecastTraces} layout={forecastLayout} config={{ displayModeBar: false, responsive: true }} style={{ width: '100%' }} />
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-2)', animation: 'float 3s ease infinite' }}>📉</div>
                <p>No forecast data available.</p>
                <p style={{ fontSize: 'var(--font-size-xs)' }}>Upload more sales data to generate AI predictions.</p>
              </div>
            )}
          </GlowCard>

          {/* Driver Cards */}
          {fcLoading ? (
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-base)', fontWeight: 700, marginBottom: 'var(--space-3)' }}>
                {t('forecast.drivers_title')}
              </h3>
              <div className="grid-3">
                {[1, 2, 3].map(i => (
                  <GlowCard key={i} style={{ padding: 'var(--space-4)' }}>
                    <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', marginBottom: '1rem' }} />
                    <div className="skeleton" style={{ width: '70%', height: 14, marginBottom: 8, borderRadius: 4 }} />
                    <div className="skeleton" style={{ width: '90%', height: 10, borderRadius: 4 }} />
                  </GlowCard>
                ))}
              </div>
            </div>
          ) : drivers.length > 0 ? (
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-base)', fontWeight: 700, marginBottom: 'var(--space-3)', opacity: 0, animation: 'fade-in-up 0.5s 0.3s forwards' }}>
                {t('forecast.drivers_title')}
              </h3>
              <div className="grid-3">
                {drivers.map((driver, i) => (
                  <GlowCard key={i} glowColor={driver.positive ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)'} style={{ padding: 'var(--space-4)', opacity: 0, animation: `fade-in-up 0.5s ${0.35 + i*0.1}s forwards` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                      <span className="driver-card-icon" style={{ background: 'rgba(255,255,255,0.05)', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-md)', fontSize: '1.25rem' }}>{driver.icon}</span>
                      <span className={`driver-card-value ${driver.positive ? 'positive' : 'negative'}`} style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                        <AnimatedCounter value={Math.abs(driver.impactValue)} prefix={driver.positive ? '+' : '-'} suffix="%" />
                      </span>
                    </div>
                    <div className="driver-card-info" style={{ marginLeft: 0 }}>
                      <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>{driver.name}</h4>
                      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{driver.desc}</p>
                    </div>
                  </GlowCard>
                ))}
              </div>
            </div>
          ) : !fcLoading && hasForecast ? (
            <GlowCard style={{ marginBottom: 'var(--space-5)', textAlign: 'center', padding: 'var(--space-6)', opacity: 0, animation: 'fade-in-up 0.5s 0.3s forwards' }}>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>No external demand drivers strongly influenced this product.</p>
              <p style={{ fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-1)', color: 'var(--color-text-muted)' }}>Forecast assumes underlying historical trend momentum.</p>
            </GlowCard>
          ) : null}

          {/* Weekly Breakdown Table */}
          {hasForecast && (
            <GlowCard style={{ padding: 0, overflow: 'hidden', opacity: 0, animation: 'fade-in-up 0.5s 0.4s forwards' }}>
              <div style={{ padding: 'var(--space-4) var(--space-5) var(--space-2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-base)', fontWeight: 700 }}>{t('forecast.weekly_breakdown')}</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '12px 20px', textAlign: 'left', color: 'var(--color-text-muted)', fontWeight: 600 }}>Week</th>
                      <th style={{ padding: '12px 20px', textAlign: 'right', color: 'var(--color-text-muted)', fontWeight: 600 }}>Low Bound</th>
                      <th style={{ padding: '12px 20px', textAlign: 'right', color: 'var(--color-accent)', fontWeight: 600 }}>Likely Forecast</th>
                      <th style={{ padding: '12px 20px', textAlign: 'right', color: 'var(--color-text-muted)', fontWeight: 600 }}>High Bound</th>
                      <th style={{ padding: '12px 20px', textAlign: 'left', color: 'var(--color-text-muted)', fontWeight: 600 }}>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fc.forecast.map((week, i) => {
                      const range = week.high - week.low;
                      const conf = week.likely > 0
                        ? Math.max(0, Math.min(100, 100 - ((range / week.likely) * 100))).toFixed(0)
                        : '0';
                      return (
                        <tr key={week.week} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            {week.week} 
                            {i === 0 && <span className="badge badge-accent" style={{ marginLeft: 8, fontSize: '0.65rem' }}>Current</span>}
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'right', color: 'var(--color-text-muted)' }}>{week.low?.toLocaleString()}</td>
                          <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 700, color: '#38BDF8', textShadow: '0 0 10px rgba(56,189,248,0.3)' }}>{week.likely?.toLocaleString()}</td>
                          <td style={{ padding: '14px 20px', textAlign: 'right', color: 'var(--color-text-muted)' }}>{week.high?.toLocaleString()}</td>
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                flex: 1, minWidth: 60, height: 6, borderRadius: 'var(--radius-full)', background: 'rgba(255,255,255,0.05)', overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${conf}%`, height: '100%', borderRadius: 'var(--radius-full)',
                                  background: Number(conf) > 70 ? 'var(--color-success)' : Number(conf) > 50 ? 'var(--color-accent)' : 'var(--color-warning)',
                                  boxShadow: `0 0 10px ${Number(conf) > 70 ? 'var(--color-success)' : Number(conf) > 50 ? 'var(--color-accent)' : 'var(--color-warning)'}`
                                }} />
                              </div>
                              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', minWidth: 28 }}>{conf}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </GlowCard>
          )}
        </div>

        {/* Right Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Model Precision */}
          <GlowCard glowColor="rgba(16,185,129,0.15)" style={{ textAlign: 'center', padding: 'var(--space-6)', opacity: 0, animation: 'fade-in-left 0.5s 0.3s forwards' }}>
            <h3 style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, marginBottom: 'var(--space-4)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-muted)' }}>
              {t('forecast.model_precision')}
            </h3>
            {hasAccuracyData ? (
              <>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 800, color: 'var(--color-success)',
                  lineHeight: 1, marginBottom: 'var(--space-2)', textShadow: '0 0 20px rgba(16,185,129,0.3)',
                }}>
                  <AnimatedCounter value={accuracy.accuracy_pct} suffix="%" />
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
                  Historic MAPE: {accuracy.mape}%
                </div>
                {trendIndicator && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', padding: '6px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-full)', fontSize: 'var(--font-size-xs)', color: trendIndicator.cls, fontWeight: 600 }}>
                    <span style={{ fontSize: '1rem' }}>{trendIndicator.icon}</span>
                    <span>{trendIndicator.label}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 700,
                  lineHeight: 1, marginBottom: 'var(--space-2)',
                  color: modelUsed.includes('prophet') ? 'var(--color-accent)' : modelUsed.includes('sma') ? '#FFB020' : 'var(--color-text-muted)',
                }}>
                  {modelUsed.includes('prophet') ? '🤖' : modelUsed.includes('sma') ? '📊' : '—'}
                </div>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
                  {modelBadge.label}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                  {modelUsed.includes('prophet') ? 'AI time-series forecasting active' :
                   modelUsed.includes('sma') ? 'Moving average — add more sales data for AI' :
                   'Upload sales data to enable forecasting'}
                </div>
              </>
            )}
          </GlowCard>

          {/* AI Trend Explanation */}
          {fc?.trend_explanation && (
            <GlowCard glowColor="rgba(56,189,248,0.12)" style={{ padding: 'var(--space-5)', opacity: 0, animation: 'fade-in-left 0.5s 0.35s forwards' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-3)' }}>
                <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>💡</div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text-primary)' }}>AI Trend Analysis</h3>
              </div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
                {fc.trend_explanation}
              </p>
              <div style={{ marginTop: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#38BDF8', boxShadow: '0 0 8px rgba(56,189,248,0.4)' }}></span>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Powered by AI intelligence</span>
              </div>
            </GlowCard>
          )}

          {/* Test Scenario Action */}
          <GlowCard style={{ padding: 'var(--space-5)', opacity: 0, animation: 'fade-in-left 0.5s 0.4s forwards' }}>
            <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))', border: '1px solid rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: 'var(--space-4)' }}>🧪</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-base)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>What-If Scenarios</h3>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: 'var(--space-4)' }}>
              Simulate price changes, festivals, and disruptions to see how they impact this forecast.
            </p>
            <ShimmerButton
              style={{ width: '100%', fontSize: '0.9rem' }}
              onClick={() => navigate('/dashboard/scenarios')}
            >
              Launch Simulator →
            </ShimmerButton>
          </GlowCard>
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          div[style*="gridTemplateColumns: '1fr 300px'"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
