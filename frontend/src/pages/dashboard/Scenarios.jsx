import { useState, useEffect, useCallback } from 'react';
import Plot from '../../components/PlotChart.jsx';
import { useApi } from '../../hooks/useApi';
import { inventoryApi, forecastApi } from '../../services/api';

// Scenario type definitions — IDs match what the backend accepts
const SCENARIO_TYPES = [
  { id: 'discount', label: '🏷️ Discount', desc: 'price reduction impact' },
  { id: 'surge', label: '📈 Demand Surge', desc: 'growth percentage' },
  { id: 'delay', label: '🚚 Supplier Delay', desc: 'additional lead time' },
  { id: 'custom', label: '⚡ Custom', desc: 'custom multiplier' },
];

// Dynamic slider config per scenario type
const SLIDER_CONFIG = {
  discount: { label: 'Discount Intensity', min: 5, max: 50, step: 5, unit: '%', default: 20 },
  surge:    { label: 'Demand Surge',       min: 5, max: 100, step: 5, unit: '%', default: 20 },
  delay:    { label: 'Delay (Days)',       min: 1, max: 30,  step: 1, unit: '',  default: 3 },
  custom:   { label: 'Custom Multiplier',  min: 5, max: 100, step: 5, unit: '%', default: 20 },
};

// Dynamic badge text per scenario type
const SCENARIO_BADGES = {
  discount: { label: 'Price Impact', className: 'badge-warning' },
  surge:    { label: 'Projected Surge', className: 'badge-warning' },
  delay:    { label: 'Supply Risk', className: 'badge-danger' },
  custom:   { label: 'Custom Simulation', className: 'badge-primary' },
};

export default function Scenarios() {
  const { data: rawProducts, loading: pLoading } = useApi(() => inventoryApi.list(), []);
  const products = Array.isArray(rawProducts) ? rawProducts : (rawProducts?.products || []);

  const [productId, setProductId] = useState('');
  const [scenarioType, setScenarioType] = useState('discount');
  const [intensity, setIntensity] = useState(20);
  const [applied, setApplied] = useState(false);
  const [scenarioResult, setScenarioResult] = useState(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [scenarioError, setScenarioError] = useState(null);

  // Track the last-applied values so UI only updates on Apply click
  const [appliedIntensity, setAppliedIntensity] = useState(20);
  const [appliedType, setAppliedType] = useState('discount');

  useEffect(() => {
    if (products.length > 0 && !productId) {
      setProductId(products[0].id.toString());
    }
  }, [products, productId]);

  const fetchScenario = useCallback(async (pId, type, val) => {
    if (!pId) return;
    setScenarioLoading(true);
    setScenarioError(null);
    try {
      const res = await forecastApi.scenario({
        product_id: parseInt(pId, 10),
        scenario_type: type,
        value: val,
      });
      setScenarioResult(res);
      setApplied(true);
      // Snapshot the applied values so the UI reflects what was actually simulated
      setAppliedIntensity(val);
      setAppliedType(type);
    } catch (e) {
      console.error('Failed to run scenario', e);
      setScenarioError(e.message || 'Scenario simulation failed');
    } finally {
      setScenarioLoading(false);
    }
  }, []);

  // Default run on product change
  useEffect(() => {
    if (productId) {
      const sliderCfg = SLIDER_CONFIG[scenarioType] || SLIDER_CONFIG.discount;
      fetchScenario(productId, scenarioType, sliderCfg.default);
    }
  }, [productId, fetchScenario]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApply = () => {
    fetchScenario(productId, scenarioType, intensity);
  };

  const handleReset = () => {
    setScenarioType('discount');
    setIntensity(SLIDER_CONFIG.discount.default);
    setAppliedType('discount');
    setAppliedIntensity(SLIDER_CONFIG.discount.default);
    fetchScenario(productId, 'discount', SLIDER_CONFIG.discount.default);
  };

  // Safe chart data extraction
  const originalStats = scenarioResult?.original_forecast || [];
  const scenarioStats = scenarioResult?.scenario_forecast || [];
  const weeks = originalStats.map((f) => f.week);
  const origLikely = originalStats.map((f) => f.likely);
  const scenLikely = scenarioStats.map((f) => f.likely);

  const selectedProduct = products.find((p) => p.id.toString() === productId) || {};

  // — Bug 4 fix: use Number() instead of .toFixed() which returns a string —
  const extraDemand = scenarioResult
    ? Math.round(scenarioResult.revised_reorder_qty - scenarioResult.original_reorder_qty)
    : 0;
  const unitCost = selectedProduct.unit_cost || 0;
  const extraCost = unitCost * Math.max(0, extraDemand);

  // — Bug 3 fix: compute real KPI values —
  const sliderCfg = SLIDER_CONFIG[scenarioType] || SLIDER_CONFIG.discount;
  const appliedSliderCfg = SLIDER_CONFIG[appliedType] || SLIDER_CONFIG.discount;

  // Margin impact: uses applied (not live slider) values
  const marginImpact = (() => {
    if (appliedType === 'discount') return -(appliedIntensity / 4).toFixed(1);
    if (appliedType === 'surge' || appliedType === 'custom') return '+' + (appliedIntensity / 10).toFixed(1);
    if (appliedType === 'delay') return -(appliedIntensity * 0.5).toFixed(1);
    return '0.0';
  })();
  const marginNegative = appliedType === 'discount' || appliedType === 'delay';

  // Shelf depletion rate: ratio of scenario demand to original demand
  const depletionRate = scenarioResult && scenarioResult.original_reorder_qty > 0
    ? (scenarioResult.revised_reorder_qty / scenarioResult.original_reorder_qty).toFixed(1)
    : '1.0';

  // Revenue estimate: use unit_cost as proxy (no selling_price in model)
  const revenueEstimate = (scenarioResult?.revised_reorder_qty || 0) * unitCost;

  // Dynamic badge for "Current Forecast" chart
  const currentBadge = (() => {
    if (!originalStats.length) return { label: '—', className: 'badge-muted' };
    const first = origLikely[0] || 0;
    const last = origLikely[origLikely.length - 1] || 0;
    if (last > first * 1.05) return { label: 'Rising', className: 'badge-warning' };
    if (last < first * 0.95) return { label: 'Declining', className: 'badge-danger' };
    return { label: 'Steady', className: 'badge-success' };
  })();

  const scenarioBadge = SCENARIO_BADGES[appliedType] || SCENARIO_BADGES.custom;

  if (pLoading && products.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 'var(--space-3)', animation: 'pulse 1.5s ease-in-out infinite' }}>🔮</div>
          <p style={{ color: 'var(--color-text-muted)' }}>Loading scenario planner...</p>
        </div>
      </div>
    );
  }

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

  // — Bug 10 fix: contextual smart alert text (uses applied values, not live slider) —
  const smartAlertText = (() => {
    const name = selectedProduct.name || 'this product';
    if (appliedType === 'discount') {
      return `A ${appliedIntensity}% discount on ${name} is projected to increase demand by ~${appliedIntensity}%. Ensure sufficient stock to avoid sell-through before replenishment.`;
    }
    if (appliedType === 'surge') {
      return `A ${appliedIntensity}% demand surge for ${name} would require additional safety stock. Consider pre-ordering from suppliers to avoid stockouts.`;
    }
    if (appliedType === 'delay') {
      return `A ${appliedIntensity}-day supplier delay for ${name} means existing stock must cover ${appliedIntensity} extra days. Review lead-time buffers and alternative suppliers.`;
    }
    return `Custom ${appliedIntensity}% adjustment applied to ${name}. Review the projected impact on stock levels and reorder timing.`;
  })();

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
          <button
            className="btn btn-primary"
            onClick={handleApply}
            disabled={scenarioLoading}
            id="btn-apply-scenario"
          >
            {scenarioLoading ? 'Simulating…' : 'Apply Scenario'}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {scenarioError && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 'var(--radius-lg)', padding: 'var(--space-3)', marginBottom: 'var(--space-4)',
          color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)',
        }}>
          ⚠️ {scenarioError}
        </div>
      )}

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
                const newType = e.target.value;
                setScenarioType(newType);
                const cfg = SLIDER_CONFIG[newType] || SLIDER_CONFIG.discount;
                setIntensity(cfg.default);
              }}
              id="scenario-type"
            >
              {SCENARIO_TYPES.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label className="form-label">
              {sliderCfg.label}: <strong>{intensity}{sliderCfg.unit}</strong>
            </label>
            <input
              type="range"
              min={sliderCfg.min}
              max={sliderCfg.max}
              step={sliderCfg.step}
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--color-primary)' }}
              id="scenario-slider"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              <span>{sliderCfg.min}</span>
              <span>{Math.round((sliderCfg.min + sliderCfg.max) / 2)}</span>
              <span>{sliderCfg.max}</span>
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
              {smartAlertText}
            </p>
          </div>
        </div>

        {/* Right Charts */}
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <div className="chart-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Current Forecast</h3>
                <span className={`badge ${currentBadge.className}`}>{currentBadge.label}</span>
              </div>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
                Baseline projection (No change)
              </p>
              <Plot data={originalTraces} layout={sharedLayout} config={chartConfig} style={{ width: '100%' }} />
            </div>

            <div className="chart-container" style={{ borderColor: applied ? 'rgba(245,158,11,0.3)' : undefined }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-warning)' }}>Scenario Forecast</h3>
                <span className={`badge ${scenarioBadge.className}`}>{scenarioBadge.label}</span>
              </div>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
                Projection with {appliedIntensity}{appliedSliderCfg.unit ? appliedSliderCfg.unit : ' days'} {appliedType === 'delay' ? 'delay' : appliedType}
              </p>
              {scenarioLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 250, color: 'var(--color-text-muted)' }}>
                  Simulating...
                </div>
              ) : (
                <Plot data={scenarioTraces} layout={sharedLayout} config={chartConfig} style={{ width: '100%' }} />
              )}
            </div>
          </div>

          {/* Simulation Outcome */}
          <div className="intelligence-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
              <span style={{ fontSize: '1.25rem' }}>📊</span>
              <span style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-primary-light)' }}>Simulation Outcome</span>
            </div>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
              With <strong>{appliedIntensity}{appliedSliderCfg.unit ? appliedSliderCfg.unit : ' Days'} {appliedType === 'delay' ? 'delay' : appliedType}</strong>, expected demand changes significantly.
              Recommended additional stock: <strong>{extraDemand > 0 ? extraDemand : 0} units</strong>. Estimated extra cost: <strong>₹{extraCost > 0 ? extraCost.toLocaleString() : 0}</strong>.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
              <span className={`badge ${extraDemand > (selectedProduct.current_stock || 0) ? 'badge-danger' : 'badge-success'}`}>
                 {extraDemand > (selectedProduct.current_stock || 0) ? '🔴 Stock Deficit' : '🟢 Stock Sufficient'}
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
            {marginImpact}% <span style={{ fontSize: 'var(--font-size-xs)', color: marginNegative ? 'var(--color-danger)' : 'var(--color-success)' }}>
              {marginNegative ? '▼ Critical' : '▲ Positive'}
            </span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-label">New Volume Total</div>
          <div className="kpi-card-value" style={{ fontSize: 'var(--font-size-xl)' }}>
             {scenarioResult?.revised_reorder_qty || 0} <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-warning)' }}>
              {(scenarioResult?.revised_reorder_qty || 0) > (scenarioResult?.original_reorder_qty || 0) ? '▲ HIGH' : '— SAME'}
            </span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-label">Shelf Depletion Rate</div>
          <div className="kpi-card-value" style={{ fontSize: 'var(--font-size-xl)' }}>
             {depletionRate}x <span style={{ fontSize: 'var(--font-size-xs)', color: parseFloat(depletionRate) > 1.3 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
              {parseFloat(depletionRate) > 1.5 ? 'FAST' : parseFloat(depletionRate) > 1.1 ? 'MODERATE' : 'NORMAL'}
            </span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-label">Revenue Estimate</div>
          <div className="kpi-card-value" style={{ fontSize: 'var(--font-size-xl)' }}>
             ₹{revenueEstimate.toLocaleString()} <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-success)' }}>
              {revenueEstimate > 0 ? '▲ OPTIMAL' : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
