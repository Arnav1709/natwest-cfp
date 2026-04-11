import { useState } from 'react';
import Plot from '../../components/PlotChart.jsx';
import { mockScenario, mockProducts } from '../../mocks/mockData';

export default function Scenarios() {
  const [product, setProduct] = useState('Paracetamol 500mg');
  const [scenarioType, setScenarioType] = useState('discount');
  const [intensity, setIntensity] = useState(20);
  const [applied, setApplied] = useState(true);

  const sc = mockScenario;
  const weeks = sc.original_forecast.map(f => f.week);
  const origLikely = sc.original_forecast.map(f => f.likely);
  const scenLikely = sc.scenario_forecast.map(f => f.likely);

  const chartConfig = { displayModeBar: false, responsive: true };
  const sharedLayout = {
    paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
    font: { color: '#94A3B8', family: 'Inter', size: 11 },
    margin: { t: 30, r: 20, b: 40, l: 40 },
    height: 250,
    xaxis: { gridcolor: 'rgba(255,255,255,0.05)' },
    yaxis: { gridcolor: 'rgba(255,255,255,0.05)', title: 'Units' },
    showlegend: false,
  };

  const originalTraces = [
    { x: weeks, y: origLikely, type: 'bar', marker: { color: 'rgba(13,148,136,0.5)', cornerradius: 4 }, name: 'Current' },
    { x: weeks, y: origLikely, type: 'scatter', mode: 'lines+markers', line: { color: '#10B981', width: 2 }, marker: { size: 5 } },
  ];

  const scenarioTraces = [
    { x: weeks, y: scenLikely, type: 'bar', marker: { color: 'rgba(245,158,11,0.5)', cornerradius: 4 }, name: 'Scenario' },
    { x: weeks, y: scenLikely, type: 'scatter', mode: 'lines+markers', line: { color: '#F59E0B', width: 2 }, marker: { size: 5 } },
  ];

  const scenarioTypes = [
    { id: 'discount', label: '🏷️ Discount', desc: 'price reduction impact' },
    { id: 'surge', label: '📈 Demand Surge', desc: 'growth percentage' },
    { id: 'delay', label: '🚚 Supplier Delay', desc: 'additional lead time' },
    { id: 'custom', label: '⚡ Custom', desc: 'custom multiplier' },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary-light)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            STOCKSENSE INTELLIGENCE
          </p>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>What-If Scenario Planner</h1>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-secondary" onClick={() => { setIntensity(20); setApplied(false); }} id="btn-reset-scenario">
            Reset
          </button>
          <button className="btn btn-primary" onClick={() => setApplied(true)} id="btn-apply-scenario">
            Apply Scenario
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        {/* Left Controls */}
        <div className="glass-card">
          <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--space-4)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>
            Simulation Controls
          </h3>

          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label className="form-label">Product Selector</label>
            <select className="form-select" value={product} onChange={(e) => setProduct(e.target.value)} id="scenario-product">
              {mockProducts.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label className="form-label">Scenario Type</label>
            <select className="form-select" value={scenarioType} onChange={(e) => setScenarioType(e.target.value)} id="scenario-type">
              {scenarioTypes.map(st => <option key={st.id} value={st.id}>{st.label}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label className="form-label">
              {scenarioType === 'discount' ? 'Discount Intensity' :
               scenarioType === 'delay' ? 'Delay (Days)' : 'Growth'}: <strong>{intensity}%</strong>
            </label>
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--color-primary)' }}
              id="scenario-slider"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              <span>5%</span><span>25%</span><span>50%</span>
            </div>
          </div>

          {/* Smart Alert */}
          <div style={{
            padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
            marginTop: 'var(--space-4)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
              <span>✨</span>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-warning)' }}>Smart Alert</span>
            </div>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              Historical data suggests high elasticity for <strong>{product}</strong>. A {intensity}% price drop typically triggers panic-buying from tier-2 distributors.
            </p>
          </div>
        </div>

        {/* Right Charts */}
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <div className="chart-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Current Forecast</h3>
                <span className="badge badge-success">Steady</span>
              </div>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
                Baseline projection (No change)
              </p>
              <Plot data={originalTraces} layout={sharedLayout} config={chartConfig} style={{ width: '100%' }} />
            </div>

            <div className="chart-container" style={{ borderColor: applied ? 'rgba(245,158,11,0.3)' : undefined }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-warning)' }}>Scenario Forecast</h3>
                <span className="badge badge-warning">Projected Surge</span>
              </div>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
                Projection with {intensity}% {scenarioType}
              </p>
              <Plot data={scenarioTraces} layout={sharedLayout} config={chartConfig} style={{ width: '100%' }} />
            </div>
          </div>

          {/* Simulation Outcome */}
          <div className="intelligence-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
              <span style={{ fontSize: '1.25rem' }}>📊</span>
              <span style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-primary-light)' }}>Simulation Outcome</span>
            </div>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
              With <strong>{intensity}% {scenarioType}</strong>, expected demand increases by <strong>35%</strong>.
              Recommended additional stock: <strong>85 units</strong>. Estimated cost: <strong>₹2,125</strong>.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
              <span className="badge badge-success">● Stock Sufficient</span>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Lead Time: 2 Days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom KPI Row */}
      <div className="grid-4">
        <div className="kpi-card">
          <div className="kpi-card-label">Impact on Margin</div>
          <div className="kpi-card-value" style={{ fontSize: 'var(--font-size-xl)' }}>-4.2% <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)' }}>▼ Critical</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-label">New Volume Total</div>
          <div className="kpi-card-value" style={{ fontSize: 'var(--font-size-xl)' }}>4,120 <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-warning)' }}>▲ HIGH</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-label">Shelf Depletion Rate</div>
          <div className="kpi-card-value" style={{ fontSize: 'var(--font-size-xl)' }}>1.8x <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>FAST</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-label">Revenue Forecast</div>
          <div className="kpi-card-value" style={{ fontSize: 'var(--font-size-xl)' }}>₹8.4L <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-success)' }}>▲ OPTIMAL</span></div>
        </div>
      </div>
    </div>
  );
}
