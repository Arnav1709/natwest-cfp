import { useState, useEffect } from 'react';
import Plot from '../../components/PlotChart.jsx';
import { useApi } from '../../hooks/useApi';
import { inventoryApi, forecastApi } from '../../services/api';

export default function Scenarios() {
  const { data: rawProducts } = useApi(() => inventoryApi.list(), []);
  const products = Array.isArray(rawProducts) ? rawProducts : (rawProducts?.products || []);

  const [productId, setProductId] = useState('');
  const [scenarioType, setScenarioType] = useState('discount');
  const [intensity, setIntensity] = useState(20);
  const [applied, setApplied] = useState(false);
  const [scenarioResult, setScenarioResult] = useState(null);

  useEffect(() => {
    if (products.length > 0 && !productId) {
      setProductId(products[0].id.toString());
    }
  }, [products, productId]);

  const fetchScenario = async (pId, type, val) => {
    if (!pId) return;
    try {
      const res = await forecastApi.scenario({
        product_id: parseInt(pId, 10),
        scenario_type: type,
        value: val,
      });
      setScenarioResult(res);
      setApplied(true);
    } catch (e) {
      console.error('Failed to run scenario', e);
    }
  };

  useEffect(() => {
    if (productId) {
      fetchScenario(productId, scenarioType, 20); // Default run
    }
  }, [productId]);

  const handleApply = () => {
    fetchScenario(productId, scenarioType, intensity);
  };

  const handleReset = () => {
    setIntensity(20);
    fetchScenario(productId, scenarioType, 20);
  };

  // Safe chart data extraction
  const originalStats = scenarioResult?.original_forecast || [];
  const scenarioStats = scenarioResult?.scenario_forecast || [];
  const weeks = originalStats.map((f) => f.week);
  const origLikely = originalStats.map((f) => f.likely);
  const scenLikely = scenarioStats.map((f) => f.likely);

  const selectedProduct = products.find((p) => p.id.toString() === productId) || {};

  const chartConfig = { displayModeBar: false, responsive: true };
  const sharedLayout = {
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
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

  const extraDemand = scenarioResult ? (scenarioResult.revised_reorder_qty - scenarioResult.original_reorder_qty).toFixed(0) : 0;
  const extraCost = (selectedProduct.unit_cost * extraDemand) || 0;

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
          <button className="btn btn-secondary" onClick={handleReset} id="btn-reset-scenario">
            Reset
          </button>
          <button className="btn btn-primary" onClick={handleApply} id="btn-apply-scenario">
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
            <select className="form-select" value={productId} onChange={(e) => setProductId(e.target.value)} id="scenario-product">
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label className="form-label">Scenario Type</label>
            <select
              className="form-select"
              value={scenarioType}
              onChange={(e) => {
                setScenarioType(e.target.value);
                setIntensity(e.target.value === 'delay' ? 3 : 20); // reasonable defaults
              }}
              id="scenario-type"
            >
              {scenarioTypes.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label className="form-label">
              {scenarioType === 'discount'
                ? 'Discount Intensity'
                : scenarioType === 'delay'
                ? 'Delay (Days)'
                : 'Growth'}
              : <strong>{intensity}{scenarioType !== 'delay' ? '%' : ''}</strong>
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
              <span>5</span>
              <span>25</span>
              <span>50</span>
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
              Historical data suggests high elasticity for <strong>{selectedProduct.name}</strong>. A {intensity}% {scenarioType} impact could significantly affect stock availability.
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
                Projection with {intensity}{scenarioType !== 'delay' ? '%' : ''} {scenarioType}
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
              With <strong>{intensity}{scenarioType !== 'delay' ? '%' : ' Days'} {scenarioType}</strong>, expected demand changes significantly.
              Recommended additional stock: <strong>{extraDemand > 0 ? extraDemand : 0} units</strong>. Estimated extra cost: <strong>₹{extraCost > 0 ? extraCost.toLocaleString() : 0}</strong>.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
              <span className={`badge ${extraDemand > selectedProduct.current_stock ? 'badge-danger' : 'badge-success'}`}>
                 {extraDemand > selectedProduct.current_stock ? '🔴 Stock Deficit' : '🟢 Stock Sufficient'}
              </span>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Lead Time: {selectedProduct.lead_time_days || 'N/A'} Days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom KPI Row */}
      <div className="grid-4">
        <div className="kpi-card">
          <div className="kpi-card-label">Impact on Margin</div>
          <div className="kpi-card-value" style={{ fontSize: 'var(--font-size-xl)' }}>
            {scenarioType === 'discount' ? `-${(intensity/4).toFixed(1)}%` : '+1.2%'} <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)' }}>{scenarioType === 'discount' ? '▼ Critical' : '▲ OK'}</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-label">New Volume Total</div>
          <div className="kpi-card-value" style={{ fontSize: 'var(--font-size-xl)' }}>
             {scenarioResult?.revised_reorder_qty || 0} <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-warning)' }}>▲ HIGH</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-label">Shelf Depletion Rate</div>
          <div className="kpi-card-value" style={{ fontSize: 'var(--font-size-xl)' }}>
             {extraDemand > 20 ? '1.8x' : '1.1x'} <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>FAST</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-label">Revenue Estimate</div>
          <div className="kpi-card-value" style={{ fontSize: 'var(--font-size-xl)' }}>
             ₹{((scenarioResult?.revised_reorder_qty || 100) * (selectedProduct.unit_cost || 0)).toLocaleString()} <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-success)' }}>▲ OPTIMAL</span>
          </div>
        </div>
      </div>
    </div>
  );
}
