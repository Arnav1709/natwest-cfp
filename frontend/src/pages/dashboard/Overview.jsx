import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Plot from '../../components/PlotChart.jsx';
import { mockHealth, mockIntelligence } from '../../mocks/mockData';

export default function Overview() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const h = mockHealth;

  const kpis = [
    { label: t('dashboard.total_skus'),       value: h.total_skus,       change: '+2.1%', positive: true,  icon: '📦', iconBg: 'teal' },
    { label: t('dashboard.below_reorder'),    value: h.below_reorder,    change: 'Critical', positive: false, icon: '⚠️', iconBg: 'amber' },
    { label: t('dashboard.stockout_risk'),    value: h.stockout_risk,     change: '3 High Risk', positive: false, icon: '🔴', iconBg: 'red' },
    { label: t('dashboard.forecast_accuracy'),value: `${h.forecast_accuracy}%`, change: 'Optimal', positive: true,  icon: '🎯', iconBg: 'green' },
    { label: t('dashboard.inventory_value'),  value: `₹${(h.total_inventory_value/1000).toFixed(0)}K`, change: '+5.2%', positive: true, icon: '💰', iconBg: 'blue' },
  ];

  /* Donut chart data */
  const donutData = [{
    values: [h.health_percentages.healthy, h.health_percentages.warning, h.health_percentages.critical],
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
      text: `<b>${h.health_percentages.healthy}%</b><br><span style="font-size:10px">OPTIMAL</span>`,
      showarrow: false,
      font: { size: 20, color: '#F8FAFC', family: 'Inter' },
      x: 0.5, y: 0.5,
    }],
  };

  return (
    <div>
      {/* Date Range */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <div>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary-light)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            {t('dashboard.overview_subtitle')}
          </p>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>{t('dashboard.overview_title')}</h1>
        </div>
        <div className="badge badge-muted" style={{ padding: '6px 14px' }}>
          📅 Apr 12 – Apr 19, 2026
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-5" style={{ marginBottom: 'var(--space-6)' }}>
        {kpis.map((kpi) => (
          <div className="kpi-card" key={kpi.label}>
            <div className="kpi-card-header">
              <span className="kpi-card-label">{kpi.label}</span>
              <div className={`kpi-card-icon ${kpi.iconBg}`}>{kpi.icon}</div>
            </div>
            <div className="kpi-card-value">{kpi.value}</div>
            <div className={`kpi-card-change ${kpi.positive ? 'positive' : 'negative'}`}>
              {kpi.positive ? '↑' : '↓'} {kpi.change}
            </div>
          </div>
        ))}
      </div>

      {/* Middle Row: Health Donut + Intelligence Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        {/* Stock Health Donut */}
        <div className="glass-card">
          <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
            {t('dashboard.stock_health')}
          </h3>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Plot data={donutData} layout={donutLayout} config={{ displayModeBar: false, responsive: true }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
            {[
              { color: '#10B981', label: 'Healthy Stock', pct: h.health_percentages.healthy },
              { color: '#F59E0B', label: 'Reorder Needed', pct: h.health_percentages.warning },
              { color: '#EF4444', label: 'Out of Stock', pct: h.health_percentages.critical },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color }} />
                <span style={{ color: 'var(--color-text-secondary)', flex: 1 }}>{item.label}</span>
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Intelligence Feed */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>{t('dashboard.intelligence_feed')}</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/alerts')} style={{ color: 'var(--color-primary-light)' }}>
              {t('dashboard.view_all_alerts')} →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {mockIntelligence.map((intel, i) => (
              <div key={i} className="alert-card">
                <div className={`alert-card-indicator ${i === 0 ? 'critical' : i < 3 ? 'warning' : 'info'}`} />
                <div className="alert-card-content">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span>{intel.icon}</span>
                    <span className="alert-card-title">{intel.title}</span>
                  </div>
                  <span className="alert-card-message">{intel.message}</span>
                </div>
                <span className="alert-card-time">{intel.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid-3" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="quick-action" onClick={() => navigate('/upload')} id="qa-upload">
          <div className="quick-action-icon">📤</div>
          <span className="quick-action-label">{t('dashboard.upload_data')}</span>
        </div>
        <div className="quick-action" onClick={() => navigate('/reorder')} id="qa-reorder">
          <div className="quick-action-icon">📋</div>
          <span className="quick-action-label">{t('dashboard.view_reorder')}</span>
        </div>
        <div className="quick-action" onClick={() => navigate('/dashboard/scenarios')} id="qa-scenario">
          <div className="quick-action-icon">🔮</div>
          <span className="quick-action-label">{t('dashboard.run_scenario')}</span>
        </div>
      </div>

      {/* Intelligence Banner */}
      <div className="intelligence-banner">
        <div className="intelligence-banner-header">
          <span style={{ fontSize: '1.25rem' }}>🧠</span>
          <span className="intelligence-banner-title">{t('dashboard.stocking_intelligence')}</span>
          <span className="intelligence-banner-badge">AI LIVE</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <div className="intelligence-item">
            <span className="intelligence-item-icon">💊</span>
            <span className="intelligence-item-text"><strong>Paracetamol</strong> — stock 60% more than usual. Dengue season is active and monsoon peaks this month. Last July you ran out in week 3.</span>
          </div>
          <div className="intelligence-item">
            <span className="intelligence-item-icon">🧂</span>
            <span className="intelligence-item-text"><strong>ORS Sachets</strong> — stock 40% more. Heat and Dengue both drive demand simultaneously.</span>
          </div>
          <div className="intelligence-item">
            <span className="intelligence-item-icon">🦟</span>
            <span className="intelligence-item-text"><strong>Mosquito repellent</strong> — reorder now. Current stock will last ~4 days at forecasted demand.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
