import Plot from '../../components/PlotChart.jsx';
import { mockHeatmapData, mockProducts } from '../../mocks/mockData';

export default function InventoryHealth() {
  const hm = mockHeatmapData;

  /* Heatmap */
  const heatmapTrace = [{
    z: hm.values,
    x: hm.days,
    y: hm.products,
    type: 'heatmap',
    colorscale: [
      [0, '#EF4444'],
      [0.3, '#F59E0B'],
      [0.6, '#0D9488'],
      [1, '#10B981'],
    ],
    showscale: false,
    hovertemplate: '%{y}: %{z}% stock level on %{x}<extra></extra>',
    text: hm.values.map(row => row.map(v => `${v}%`)),
    texttemplate: '%{text}',
    textfont: { color: 'white', size: 11 },
  }];

  const heatmapLayout = {
    paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
    font: { color: '#94A3B8', family: 'Inter', size: 11 },
    margin: { t: 20, r: 20, b: 40, l: 120 },
    height: 200,
    xaxis: { side: 'top', tickfont: { size: 11 } },
    yaxis: { tickfont: { size: 11 }, autorange: 'reversed' },
  };

  /* Days remaining bars */
  const daysProducts = mockProducts.slice(0, 6);
  const barsTrace = [{
    y: daysProducts.map(p => p.name),
    x: daysProducts.map(p => p.days_remaining),
    type: 'bar',
    orientation: 'h',
    marker: {
      color: daysProducts.map(p =>
        p.days_remaining > 14 ? '#10B981' :
        p.days_remaining > 7 ? '#F59E0B' : '#EF4444'
      ),
    },
    hovertemplate: '%{y}: %{x} days<extra></extra>',
  }];

  const barsLayout = {
    paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
    font: { color: '#94A3B8', family: 'Inter', size: 11 },
    margin: { t: 10, r: 30, b: 30, l: 150 },
    height: 240,
    xaxis: { title: 'Days', gridcolor: 'rgba(255,255,255,0.05)' },
    yaxis: { autorange: 'reversed' },
    shapes: [{
      type: 'line', x0: 5, x1: 5, y0: -0.5, y1: 5.5,
      line: { color: '#EF4444', width: 2, dash: 'dot' },
    }],
    annotations: [{
      x: 5, y: -0.7, text: 'CRITICAL ALERT: 5 DAYS THRESHOLD',
      showarrow: false, font: { size: 9, color: '#EF4444' },
    }],
  };

  /* Category breakdown */
  const categoryTrace = [{
    x: ['Medicines', 'OTC', 'Supplements'],
    y: [2.4, 1.1, 0.5],
    type: 'bar',
    marker: {
      color: ['#10B981', '#0D9488', '#0F766E'],
      cornerradius: 4,
    },
    text: ['₹2.4L', '₹1.1L', '₹0.5L'],
    textposition: 'outside',
    textfont: { color: '#F8FAFC', size: 11 },
    hovertemplate: '%{x}: ₹%{y}L<extra></extra>',
  }];

  const categoryLayout = {
    paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
    font: { color: '#94A3B8', family: 'Inter', size: 11 },
    margin: { t: 20, r: 20, b: 30, l: 40 },
    height: 200,
    xaxis: { gridcolor: 'transparent' },
    yaxis: { title: '₹ Lakhs', gridcolor: 'rgba(255,255,255,0.05)' },
    showlegend: false,
  };

  const expiryItems = [
    { name: 'Paracetamol', days: 7, color: '#EF4444', stock: 45 },
    { name: 'Amoxicillin', days: 14, color: '#F59E0B', stock: 10 },
    { name: 'Cough Syrup', days: 15, color: '#F59E0B', stock: 120 },
    { name: 'Vitamin C', days: 30, color: '#10B981', stock: 85 },
  ];

  const slowMovers = [
    { name: 'Ear Supplement', sold: '8.5%', trend: 'Decreasing' },
    { name: 'Antifungal Gel (M.L)', sold: '6.2%', trend: 'Flat' },
    { name: 'B12 Multi-Vita', sold: '4.8%', trend: 'Decreasing' },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary-light)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
          INVENTORY HEALTH
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginTop: 'var(--space-1)' }}>
          <span className="badge badge-success">● Healthy</span>
          <span className="badge badge-warning">● Low</span>
          <span className="badge badge-danger">● Critical</span>
        </div>
      </div>

      {/* Top Row: Heatmap + Category Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <div className="chart-container">
          <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
            Stock Vitality Heatmap
          </h3>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
            Daily availability trends for top-moving labels
          </p>
          <Plot data={heatmapTrace} layout={heatmapLayout} config={{ displayModeBar: false, responsive: true }} style={{ width: '100%' }} />
        </div>

        <div className="glass-card">
          <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Value Breakdown</h3>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>Total stock valuation by category</p>
          <Plot data={categoryTrace} layout={categoryLayout} config={{ displayModeBar: false, responsive: true }} style={{ width: '100%' }} />
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)', textAlign: 'center' }}>
            💊 Medicines comprise 61% of your total value. Inventory rotation is healthy.
          </p>
        </div>
      </div>

      {/* Days Remaining Chart */}
      <div className="chart-container" style={{ marginBottom: 'var(--space-4)' }}>
        <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
          Runway Projection
        </h3>
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
          Projected dry stock depletion based on current velocity
        </p>
        <Plot data={barsTrace} layout={barsLayout} config={{ displayModeBar: false, responsive: true }} style={{ width: '100%' }} />
      </div>

      {/* Bottom Row: Expiry + Slow Movers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <div className="glass-card">
          <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>Expiry Watchlist</h3>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Inventory nearing expiry within the next 30 days
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            {expiryItems.map((item) => (
              <div key={item.name} style={{
                flex: '1 1 120px', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
                border: `1px solid ${item.color}30`, background: `${item.color}10`, textAlign: 'center'
              }}>
                <div style={{ fontSize: 'var(--font-size-xs)', color: item.color, fontWeight: 600, marginBottom: 2 }}>
                  {item.days} DAYS
                </div>
                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {item.name}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                  {item.stock} units
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card">
          <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>Inventory Velocity</h3>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Products with &lt;10% turnover in 30 days
          </p>
          {slowMovers.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
              padding: 'var(--space-3) 0', borderBottom: i < slowMovers.length - 1 ? '1px solid var(--color-border)' : 'none'
            }}>
              <span style={{ fontSize: '1.25rem' }}>📦</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.name}</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{item.sold} Turnover</div>
              </div>
              <span className="badge badge-warning">{item.trend}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom KPI Row */}
      <div className="grid-3">
        <div className="kpi-card" style={{ background: 'rgba(13,148,136,0.1)', borderColor: 'rgba(13,148,136,0.2)' }}>
          <div className="kpi-card-label">Incoming Shipments</div>
          <div className="kpi-card-value" style={{ fontSize: 'var(--font-size-2xl)' }}>12 Batches</div>
        </div>
        <div className="kpi-card" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)' }}>
          <div className="kpi-card-label">Critical Shortages</div>
          <div className="kpi-card-value" style={{ fontSize: 'var(--font-size-2xl)', color: 'var(--color-danger)' }}>04 Items</div>
        </div>
        <div className="kpi-card" style={{ background: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.2)' }}>
          <div className="kpi-card-label">Inventory Value</div>
          <div className="kpi-card-value" style={{ fontSize: 'var(--font-size-2xl)' }}>₹4.52 Lakh</div>
        </div>
      </div>
    </div>
  );
}
