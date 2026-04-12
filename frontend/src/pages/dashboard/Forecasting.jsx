import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Plot from '../../components/PlotChart.jsx';
import { inventoryApi, forecastApi } from '../../services/api';
import { useApi } from '../../hooks/useApi';

export default function Forecasting() {
  const { t } = useTranslation();

  const { data: rawProducts, loading: pLoading } = useApi(() => inventoryApi.list(), []);
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
  }, [products]);

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
          <div style={{ fontSize: '2rem', marginBottom: 'var(--space-3)', animation: 'pulse 1.5s ease-in-out infinite' }}>📈</div>
          <p style={{ color: 'var(--color-text-muted)' }}>Loading forecast data...</p>
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

  /* Main forecast chart */
  const forecastTraces = hasForecast ? [
    { x: weeks, y: high, type: 'scatter', mode: 'lines', line: { width: 0 }, showlegend: false, hoverinfo: 'skip' },
    { x: weeks, y: low, type: 'scatter', mode: 'lines', line: { width: 0 }, fill: 'tonexty', fillcolor: 'rgba(13,148,136,0.15)', name: 'Confidence Range', showlegend: true, hoverinfo: 'skip' },
    { x: weeks, y: likely, type: 'scatter', mode: 'lines+markers', name: 'Forecast', line: { color: '#10B981', width: 3, shape: 'spline' }, marker: { size: 6, color: '#10B981' } },
    ...(baseline.length > 0 ? [{ x: weeks, y: baseline, type: 'scatter', mode: 'lines', name: 'Baseline', line: { color: '#64748B', width: 2, dash: 'dot' } }] : []),
  ] : [];

  const forecastLayout = {
    paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
    font: { color: '#94A3B8', family: 'Inter', size: 12 },
    margin: { t: 30, r: 30, b: 50, l: 50 },
    height: 320,
    xaxis: { title: '', gridcolor: 'rgba(255,255,255,0.05)', tickfont: { color: '#94A3B8' } },
    yaxis: { title: 'Units', gridcolor: 'rgba(255,255,255,0.05)', tickfont: { color: '#94A3B8' } },
    legend: { orientation: 'h', y: 1.12, x: 0.5, xanchor: 'center', font: { size: 11 } },
    hovermode: 'x unified',
  };

  const drivers = fc?.driver_details || [];
  const accuracy = fc?.accuracy || {};

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary-light)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            {t('forecast.title')}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>SKU:</span>
            <select
              className="form-select"
              style={{ minWidth: 200, padding: '6px 10px', minHeight: '36px' }}
              value={selectedProduct || ''}
              onChange={(e) => setSelectedProduct(Number(e.target.value))}
              id="select-product-forecast"
            >
              {products.length === 0 && <option value="">No products</option>}
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {fcError && (
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', marginBottom: 'var(--space-4)', color: 'var(--color-warning)', fontSize: 'var(--font-size-sm)' }}>
          ⚠️ {fcError}
        </div>
      )}

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 'var(--space-4)' }}>
        {/* Left — Chart */}
        <div>
          <div className="chart-container" style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
              <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>{t('forecast.demand_projection')}</h2>
            </div>
            {fcLoading ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>
                Loading forecast...
              </div>
            ) : hasForecast ? (
              <Plot data={forecastTraces} layout={forecastLayout} config={{ displayModeBar: false, responsive: true }} style={{ width: '100%' }} />
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>📈</div>
                <p>No forecast data available.</p>
                <p style={{ fontSize: 'var(--font-size-xs)' }}>Upload more sales data to generate predictions.</p>
              </div>
            )}
          </div>

          {/* Driver Cards */}
          {drivers.length > 0 && (
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
                {t('forecast.drivers_title')}
              </h3>
              <div className="grid-3">
                {drivers.map((driver, i) => (
                  <div className="driver-card" key={i}>
                    <span className="driver-card-icon">{driver.icon}</span>
                    <div className="driver-card-info">
                      <h4>{driver.name}</h4>
                      <p>{driver.desc}</p>
                    </div>
                    <span className={`driver-card-value ${driver.positive ? 'positive' : 'negative'}`}>
                      {driver.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weekly Breakdown Table */}
          {hasForecast && (
            <div className="glass-card" style={{ padding: 0, overflow: 'auto' }}>
              <div style={{ padding: 'var(--space-4) var(--space-4) var(--space-2)' }}>
                <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>{t('forecast.weekly_breakdown')}</h3>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Week</th>
                    <th>Low Bound</th>
                    <th>Likely Forecast</th>
                    <th>High Bound</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {fc.forecast.map((week, i) => {
                    const conf = Math.max(0, 100 - (((week.high - week.low) / week.likely) * 100)).toFixed(0);
                    return (
                      <tr key={week.week}>
                        <td style={{ fontWeight: 600 }}>{week.week} {i === 0 ? <span className="badge badge-primary" style={{ marginLeft: 4 }}>Current</span> : ''}</td>
                        <td style={{ color: 'var(--color-text-muted)' }}>{week.low?.toLocaleString()}</td>
                        <td style={{ fontWeight: 700, color: 'var(--color-primary-light)' }}>{week.likely?.toLocaleString()}</td>
                        <td style={{ color: 'var(--color-text-muted)' }}>{week.high?.toLocaleString()}</td>
                        <td>
                          <div style={{
                            width: 50, height: 6, borderRadius: 'var(--radius-full)', background: 'var(--color-bg-active)', display: 'inline-block', marginRight: 6, verticalAlign: 'middle'
                          }}>
                            <div style={{
                              width: `${conf}%`, height: '100%', borderRadius: 'var(--radius-full)',
                              background: Number(conf) > 70 ? 'var(--color-success)' : 'var(--color-warning)'
                            }} />
                          </div>
                          <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>{conf}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Model Precision */}
          <div className="glass-card" style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--space-3)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>
              {t('forecast.model_precision')}
            </h3>
            <div style={{
              fontSize: 'var(--font-size-4xl)', fontWeight: 800, color: 'var(--color-primary-light)',
              lineHeight: 1, marginBottom: 'var(--space-1)'
            }}>
              {accuracy.mape != null ? `${accuracy.mape}%` : '—'}
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              MAPE (Mean Absolute % Error)
            </div>
          </div>

          {/* Test Scenario Button */}
          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            onClick={() => window.location.href = '/dashboard/scenarios'}
            id="btn-test-scenario"
          >
            🔮 {t('forecast.test_scenario')}
          </button>
        </div>
      </div>
    </div>
  );
}
