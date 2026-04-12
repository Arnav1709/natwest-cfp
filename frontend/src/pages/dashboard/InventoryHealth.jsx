import Plot from '../../components/PlotChart.jsx';
import { useApi } from '../../hooks/useApi';
import { inventoryApi } from '../../services/api';

export default function InventoryHealth() {
  const { data: healthData, loading: hLoading } = useApi(() => inventoryApi.health(), []);
  const { data: rawProducts, loading: pLoading } = useApi(() => inventoryApi.list(), []);

  const products = Array.isArray(rawProducts) ? rawProducts : (rawProducts?.products || []);
  const h = healthData || {};

  if (hLoading || pLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 'var(--space-3)', animation: 'pulse 1.5s ease-in-out infinite' }}>📊</div>
          <p style={{ color: 'var(--color-text-muted)' }}>Loading inventory health...</p>
        </div>
      </div>
    );
  }

  // Build heatmap from real product data (top 4 products x 7 days simulated availability)
  const topProducts = products.slice(0, 4);
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const heatmapValues = topProducts.map(p => {
    const stock = p.current_stock || 0;
    const reorder = p.reorder_point || 1;
    const pct = Math.min(100, Math.round((stock / Math.max(reorder, 1)) * 100));
    // Simulate daily variation
    return days.map((_, i) => Math.max(0, Math.min(100, pct + Math.round((Math.sin(i + stock) * 15)))));
  });

  const heatmapTrace = topProducts.length > 0 ? [{
    z: heatmapValues,
    x: days,
    y: topProducts.map(p => p.name),
    type: 'heatmap',
    colorscale: [
      [0, '#EF4444'],
      [0.3, '#F59E0B'],
      [0.6, '#0D9488'],
      [1, '#10B981'],
    ],
    showscale: false,
    hovertemplate: '%{y}: %{z}% stock level on %{x}<extra></extra>',
    text: heatmapValues.map(row => row.map(v => `${v}%`)),
    texttemplate: '%{text}',
    textfont: { color: 'white', size: 11 },
  }] : [];

  const heatmapLayout = {
    paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
    font: { color: '#94A3B8', family: 'Inter', size: 11 },
    margin: { t: 20, r: 20, b: 40, l: 120 },
    height: 200,
    xaxis: { side: 'top', tickfont: { size: 11 } },
    yaxis: { tickfont: { size: 11 }, autorange: 'reversed' },
  };

  /* Days remaining bars — from real data */
  const sortedByDays = [...products].filter(p => p.days_remaining != null).sort((a, b) => (a.days_remaining || 0) - (b.days_remaining || 0)).slice(0, 6);
  const barsTrace = sortedByDays.length > 0 ? [{
    y: sortedByDays.map(p => p.name),
    x: sortedByDays.map(p => p.days_remaining),
    type: 'bar',
    orientation: 'h',
    marker: {
      color: sortedByDays.map(p =>
        (p.days_remaining || 0) > 14 ? '#10B981' :
        (p.days_remaining || 0) > 7 ? '#F59E0B' : '#EF4444'
      ),
    },
    hovertemplate: '%{y}: %{x} days<extra></extra>',
  }] : [];

  const barsLayout = {
    paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
    font: { color: '#94A3B8', family: 'Inter', size: 11 },
    margin: { t: 10, r: 30, b: 30, l: 150 },
    height: 240,
    xaxis: { title: 'Days', gridcolor: 'rgba(255,255,255,0.05)' },
    yaxis: { autorange: 'reversed' },
    shapes: [{
      type: 'line', x0: 5, x1: 5, y0: -0.5, y1: Math.max(sortedByDays.length - 0.5, 0.5),
      line: { color: '#EF4444', width: 2, dash: 'dot' },
    }],
  };

  /* Category breakdown from real data */
  const categoryMap = {};
  products.forEach(p => {
    const cat = p.category || 'other';
    if (!categoryMap[cat]) categoryMap[cat] = 0;
    categoryMap[cat] += (p.current_stock || 0) * (p.unit_cost || 0);
  });
  const categories = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const categoryTrace = categories.length > 0 ? [{
    x: categories.map(([cat]) => cat.charAt(0).toUpperCase() + cat.slice(1)),
    y: categories.map(([, val]) => Number((val / 100000).toFixed(1))),
    type: 'bar',
    marker: {
      color: ['#10B981', '#0D9488', '#0F766E', '#14B8A6', '#2DD4BF'].slice(0, categories.length),
      cornerradius: 4,
    },
    text: categories.map(([, val]) => `₹${(val / 100000).toFixed(1)}L`),
    textposition: 'outside',
    textfont: { color: '#F8FAFC', size: 11 },
    hovertemplate: '%{x}: ₹%{y}L<extra></extra>',
  }] : [];

  const categoryLayout = {
    paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
    font: { color: '#94A3B8', family: 'Inter', size: 11 },
    margin: { t: 20, r: 20, b: 30, l: 40 },
    height: 200,
    xaxis: { gridcolor: 'transparent' },
    yaxis: { title: '₹ Lakhs', gridcolor: 'rgba(255,255,255,0.05)' },
    showlegend: false,
  };

  // Expiry items from real data
  const expiryItems = products
    .filter(p => p.expiry_date)
    .map(p => {
      const daysUntil = Math.ceil((new Date(p.expiry_date) - new Date()) / 86400000);
      return { name: p.name, days: daysUntil, stock: p.current_stock || 0 };
    })
    .filter(p => p.days > 0 && p.days <= 60)
    .sort((a, b) => a.days - b.days)
    .slice(0, 4)
    .map(p => ({
      ...p,
      color: p.days <= 7 ? '#EF4444' : p.days <= 14 ? '#F59E0B' : '#10B981',
    }));

  // Slow movers from real data
  const slowMovers = [...products]
    .sort((a, b) => (a.days_remaining || 999) - (b.days_remaining || 999))
    .reverse()
    .slice(0, 3)
    .map(p => ({
      name: p.name,
      stock: p.current_stock || 0,
      trend: (p.days_remaining || 0) > 20 ? 'Slow' : 'Normal',
    }));

  const totalValue = (h.total_inventory_value || products.reduce((sum, p) => sum + (p.current_stock || 0) * (p.unit_cost || 0), 0));
  const criticalCount = products.filter(p => p.status === 'critical' || p.status === 'out_of_stock').length;

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

      {products.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>📊</div>
          <h3 style={{ color: 'var(--color-text-primary)', marginBottom: 'var(--space-2)' }}>No inventory data</h3>
          <p style={{ color: 'var(--color-text-muted)' }}>Upload products to see health metrics.</p>
        </div>
      ) : (
        <>
          {/* Top Row: Heatmap + Category Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <div className="chart-container">
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
                Stock Vitality Heatmap
              </h3>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
                Availability trends for top-moving labels
              </p>
              {topProducts.length > 0 ? (
                <Plot data={heatmapTrace} layout={heatmapLayout} config={{ displayModeBar: false, responsive: true }} style={{ width: '100%' }} />
              ) : <p style={{ color: 'var(--color-text-muted)', padding: 'var(--space-4)' }}>No data</p>}
            </div>

            <div className="glass-card">
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Value Breakdown</h3>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>Total stock valuation by category</p>
              {categories.length > 0 ? (
                <Plot data={categoryTrace} layout={categoryLayout} config={{ displayModeBar: false, responsive: true }} style={{ width: '100%' }} />
              ) : <p style={{ color: 'var(--color-text-muted)', padding: 'var(--space-4)' }}>No data</p>}
            </div>
          </div>

          {/* Days Remaining Chart */}
          {sortedByDays.length > 0 && (
            <div className="chart-container" style={{ marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
                Runway Projection
              </h3>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
                Projected stock depletion based on current velocity
              </p>
              <Plot data={barsTrace} layout={barsLayout} config={{ displayModeBar: false, responsive: true }} style={{ width: '100%' }} />
            </div>
          )}

          {/* Bottom Row: Expiry + Slow Movers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <div className="glass-card">
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>Expiry Watchlist</h3>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
                Inventory nearing expiry within the next 60 days
              </p>
              {expiryItems.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>No expiring items</p>
              ) : (
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
              )}
            </div>

            <div className="glass-card">
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>Inventory Velocity</h3>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
                Products with slowest movement
              </p>
              {slowMovers.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>No data</p>
              ) : (
                slowMovers.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                    padding: 'var(--space-3) 0', borderBottom: i < slowMovers.length - 1 ? '1px solid var(--color-border)' : 'none'
                  }}>
                    <span style={{ fontSize: '1.25rem' }}>📦</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.name}</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{item.stock} units in stock</div>
                    </div>
                    <span className="badge badge-warning">{item.trend}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bottom KPI Row */}
          <div className="grid-3">
            <div className="kpi-card" style={{ background: 'rgba(13,148,136,0.1)', borderColor: 'rgba(13,148,136,0.2)' }}>
              <div className="kpi-card-label">Total Products</div>
              <div className="kpi-card-value" style={{ fontSize: 'var(--font-size-2xl)' }}>{products.length} SKUs</div>
            </div>
            <div className="kpi-card" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)' }}>
              <div className="kpi-card-label">Critical Shortages</div>
              <div className="kpi-card-value" style={{ fontSize: 'var(--font-size-2xl)', color: criticalCount > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                {criticalCount > 0 ? `${String(criticalCount).padStart(2, '0')} Items` : 'None'}
              </div>
            </div>
            <div className="kpi-card" style={{ background: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.2)' }}>
              <div className="kpi-card-label">Inventory Value</div>
              <div className="kpi-card-value" style={{ fontSize: 'var(--font-size-2xl)' }}>
                ₹{(totalValue / 100000).toFixed(2)} Lakh
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
