import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Plot from '../../components/PlotChart.jsx';
import { useApi } from '../../hooks/useApi';
import { inventoryApi, alertsApi } from '../../services/api';
import AnimatedCounter from '../../components/AnimatedCounter';
import GlowCard from '../../components/GlowCard';

export default function Overview() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: health, loading: hLoading, error: hError } = useApi(() => inventoryApi.health(), []);
  const { data: alertsData, loading: aLoading } = useApi(() => alertsApi.list({ limit: 5 }), []);

  if (hLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, margin: '0 auto 1rem',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(139,92,246,0.08))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.75rem', animation: 'float 2s ease-in-out infinite',
          }}>📊</div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Loading dashboard...</p>
          <div style={{
            width: 120, height: 3, borderRadius: 10, margin: '0.75rem auto 0',
            background: 'rgba(255,255,255,0.06)', overflow: 'hidden', position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: '-100%', width: '100%', height: '100%',
              background: 'linear-gradient(90deg, transparent, var(--color-primary), transparent)',
              animation: 'shimmer 1.5s ease-in-out infinite',
            }} />
          </div>
        </div>
      </div>
    );
  }

  // Default values when API returns no data yet (empty inventory)
  const h = health || {
    total_skus: 0, below_reorder: 0, stockout_risk: 0, out_of_stock: 0,
    forecast_accuracy: 0, total_inventory_value: 0,
    health_distribution: { healthy: 0, warning: 0, critical: 0 },
    health_percentages: { healthy: 100, warning: 0, critical: 0 },
  };

  const alerts = Array.isArray(alertsData) ? alertsData : (alertsData?.alerts || []);

  const kpis = [
    { label: t('dashboard.total_skus'), value: h.total_skus || 0, change: '', positive: true, icon: '📦', iconBg: 'teal', glowColor: 'rgba(16,185,129,0.15)' },
    { label: t('dashboard.below_reorder'), value: h.below_reorder || 0, change: h.below_reorder > 0 ? 'Critical' : 'OK', positive: (h.below_reorder || 0) === 0, icon: '⚠️', iconBg: 'amber', glowColor: 'rgba(251,191,36,0.12)' },
    { label: t('dashboard.stockout_risk'), value: h.stockout_risk || 0, change: `${h.stockout_risk || 0} at risk`, positive: (h.stockout_risk || 0) === 0, icon: '🔴', iconBg: 'red', glowColor: 'rgba(244,63,94,0.12)' },
    { label: t('dashboard.forecast_accuracy'), value: h.forecast_accuracy || 0, suffix: '%', change: (h.forecast_accuracy || 0) > 80 ? 'Optimal' : 'Low', positive: (h.forecast_accuracy || 0) > 80, icon: '🎯', iconBg: 'green', glowColor: 'rgba(16,185,129,0.15)' },
    { label: t('dashboard.inventory_value'), value: ((h.total_inventory_value || 0) / 1000).toFixed(0), prefix: '₹', suffix: 'K', change: '', positive: true, icon: '💰', iconBg: 'blue', glowColor: 'rgba(59,130,246,0.12)' },
  ];

  const hp = h.health_percentages || { healthy: 100, warning: 0, critical: 0 };

  /* Donut chart data */
  const donutData = [{
    values: [hp.healthy, hp.warning, hp.critical],
    labels: ['Healthy Stock', 'Reorder Needed', 'Out of Stock'],
    type: 'pie',
    hole: 0.7,
    marker: { colors: ['#10B981', '#F59E0B', '#EF4444'] },
    textinfo: 'none',
    hoverinfo: 'label+percent',
  }];

  const donutLayout = {
    showlegend: false,
    margin: { t: 10, b: 10, l: 10, r: 10 },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: { color: '#94A3B8', family: 'Inter' },
    height: 200,
    width: 200,
    annotations: [{
      text: `<b>${hp.healthy}%</b><br><span style="font-size:10px">OPTIMAL</span>`,
      showarrow: false,
      font: { size: 20, color: '#F8FAFC', family: 'Inter' },
      x: 0.5, y: 0.5,
    }],
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now - d) / 60000);
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  const severityIcon = (sev) => {
    if (sev === 'critical') return '⚠️';
    if (sev === 'warning') return '🟡';
    return '🔵';
  };

  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 86400000);
  const dateRange = `${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${nextWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <div>
      {/* Date Range Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <div style={{ opacity: 0, animation: 'fade-in-up 0.4s forwards' }}>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary-light)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 'var(--space-1)' }}>
            {t('dashboard.overview_subtitle')}
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
            {t('dashboard.overview_title')}
          </h1>
        </div>
        <div className="badge badge-muted" style={{ padding: '6px 14px', opacity: 0, animation: 'fade-in-up 0.4s 0.1s forwards' }}>
          📅 {dateRange}
        </div>
      </div>

      {hError && (
        <div style={{
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', marginBottom: 'var(--space-4)',
          color: 'var(--color-warning)', fontSize: 'var(--font-size-sm)',
          animation: 'fade-in-up 0.4s forwards',
        }}>
          ⚠️ Could not load live data: {hError}. Upload inventory data to see real metrics.
        </div>
      )}

      {/* KPI Cards with AnimatedCounter */}
      <div className="grid-5" style={{ marginBottom: 'var(--space-6)' }}>
        {kpis.map((kpi, i) => (
          <GlowCard
            key={kpi.label}
            glowColor={kpi.glowColor}
            style={{
              padding: 'var(--space-5)',
              opacity: 0,
              animation: `fade-in-up 0.5s ${0.05 * i}s forwards`,
            }}
          >
            <div className="kpi-card-header">
              <span className="kpi-card-label">{kpi.label}</span>
              <div className={`kpi-card-icon ${kpi.iconBg}`}>{kpi.icon}</div>
            </div>
            <div className="kpi-card-value">
              {typeof kpi.value === 'number' ? (
                <AnimatedCounter value={kpi.value} prefix={kpi.prefix || ''} suffix={kpi.suffix || ''} />
              ) : (
                <>{kpi.prefix || ''}{kpi.value}{kpi.suffix || ''}</>
              )}
            </div>
            {kpi.change && (
              <div className={`kpi-card-change ${kpi.positive ? 'positive' : 'negative'}`}>
                {kpi.positive ? '↑' : '↓'} {kpi.change}
              </div>
            )}
          </GlowCard>
        ))}
      </div>

      {/* Middle Row: Health Donut + Intelligence Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        {/* Stock Health Donut */}
        <GlowCard style={{ opacity: 0, animation: 'fade-in-up 0.5s 0.3s forwards' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-base)', fontWeight: 700, marginBottom: 'var(--space-3)' }}>
            {t('dashboard.stock_health')}
          </h3>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Plot data={donutData} layout={donutLayout} config={{ displayModeBar: false, responsive: true }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
            {[
              { color: '#10B981', label: 'Healthy Stock', pct: hp.healthy },
              { color: '#F59E0B', label: 'Reorder Needed', pct: hp.warning },
              { color: '#EF4444', label: 'Out of Stock', pct: hp.critical },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)' }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%', background: item.color,
                  boxShadow: `0 0 8px ${item.color}40`,
                }} />
                <span style={{ color: 'var(--color-text-secondary)', flex: 1 }}>{item.label}</span>
                <span style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>{item.pct}%</span>
              </div>
            ))}
          </div>
        </GlowCard>

        {/* Intelligence Feed — from real alerts API */}
        <GlowCard style={{ opacity: 0, animation: 'fade-in-up 0.5s 0.35s forwards' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-base)', fontWeight: 700 }}>
              {t('dashboard.intelligence_feed')}
            </h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/alerts')} style={{ color: 'var(--color-primary-light)' }}>
              {t('dashboard.view_all_alerts')} →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {alerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)', animation: 'float 3s ease-in-out infinite' }}>✅</div>
                <p>No alerts — inventory is looking good!</p>
                <p style={{ fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-1)' }}>Upload data to start tracking.</p>
              </div>
            ) : (
              alerts.slice(0, 5).map((alert, i) => (
                <div
                  key={alert.id || i}
                  className="alert-card"
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <div className={`alert-card-indicator ${alert.severity === 'critical' ? 'critical' : alert.severity === 'warning' ? 'warning' : 'info'}`} />
                  <div className="alert-card-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <span>{severityIcon(alert.severity)}</span>
                      <span className="alert-card-title">{alert.title}</span>
                    </div>
                    <span className="alert-card-message">{alert.message}</span>
                  </div>
                  <span className="alert-card-time">{formatTime(alert.created_at)}</span>
                </div>
              ))
            )}
          </div>
        </GlowCard>
      </div>

      {/* Quick Actions */}
      <div className="grid-3" style={{ marginBottom: 'var(--space-6)' }}>
        {[
          { icon: '📤', label: t('dashboard.upload_data'), path: '/upload', id: 'qa-upload' },
          { icon: '📋', label: t('dashboard.view_reorder'), path: '/reorder', id: 'qa-reorder' },
          { icon: '🔮', label: t('dashboard.run_scenario'), path: '/dashboard/scenarios', id: 'qa-scenario' },
        ].map((qa, i) => (
          <div
            key={qa.id}
            className="quick-action"
            onClick={() => navigate(qa.path)}
            id={qa.id}
            style={{
              opacity: 0,
              animation: `fade-in-up 0.5s ${0.4 + i * 0.08}s forwards`,
            }}
          >
            <div className="quick-action-icon">{qa.icon}</div>
            <span className="quick-action-label">{qa.label}</span>
          </div>
        ))}
      </div>

      {/* Intelligence Banner */}
      <div
        className="intelligence-banner"
        style={{ opacity: 0, animation: 'fade-in-up 0.5s 0.55s forwards' }}
      >
        <div className="intelligence-banner-header">
          <span style={{ fontSize: '1.25rem' }}>🧠</span>
          <span className="intelligence-banner-title">{t('dashboard.stocking_intelligence')}</span>
          <span className="intelligence-banner-badge">AI LIVE</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {(h.total_skus || 0) === 0 ? (
            <div className="intelligence-item">
              <span className="intelligence-item-icon">📤</span>
              <span className="intelligence-item-text">
                <strong>Get started</strong> — Upload your inventory data (CSV or photo) to receive AI-powered stocking recommendations.
              </span>
            </div>
          ) : (
            <>
              {(h.below_reorder || 0) > 0 && (
                <div className="intelligence-item">
                  <span className="intelligence-item-icon">⚠️</span>
                  <span className="intelligence-item-text">
                    <strong>{h.below_reorder} products</strong> are below reorder point. Review the <strong>Reorder List</strong> for AI-generated purchase recommendations.
                  </span>
                </div>
              )}
              {(h.stockout_risk || 0) > 0 && (
                <div className="intelligence-item">
                  <span className="intelligence-item-icon">🔴</span>
                  <span className="intelligence-item-text">
                    <strong>{h.stockout_risk} products</strong> are at stockout risk. Immediate action recommended.
                  </span>
                </div>
              )}
              {(h.below_reorder || 0) === 0 && (h.stockout_risk || 0) === 0 && (
                <div className="intelligence-item">
                  <span className="intelligence-item-icon">✅</span>
                  <span className="intelligence-item-text">
                    All inventory levels are healthy. No immediate action required.
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Responsive override for mobile */}
      <style>{`
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns: '300px 1fr'"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
