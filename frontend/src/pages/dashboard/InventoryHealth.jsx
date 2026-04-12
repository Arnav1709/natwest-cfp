import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Plot from '../../components/PlotChart.jsx';
import { useApi } from '../../hooks/useApi';
import { inventoryApi } from '../../services/api';

const statusConfig = {
  healthy: { label: 'Healthy', class: 'badge-success' },
  low_stock: { label: 'Low Stock', class: 'badge-warning' },
  critical: { label: 'Critical', class: 'badge-danger' },
  out_of_stock: { label: 'Out of Stock', class: 'badge-danger' },
};

export default function InventoryHealth() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: healthData, loading: hLoading } = useApi(() => inventoryApi.health(), []);
  const { data: rawProducts, loading: pLoading } = useApi(() => inventoryApi.list(), []);

  const products = Array.isArray(rawProducts) ? rawProducts : (rawProducts?.products || []);
  const h = healthData || {};

  // Product list filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = products.filter(p => {
    const matchSearch = (p.name || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'all' || p.category === category;
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  // Get unique categories from data
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

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

  // === Analytics Data ===

  // Build heatmap from real product data (top 4 products x 7 days simulated availability)
  const topProducts = products.slice(0, 4);
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const heatmapValues = topProducts.map(p => {
    const stock = p.current_stock || 0;
    const reorder = p.reorder_point || 1;
    const pct = Math.min(100, Math.round((stock / Math.max(reorder, 1)) * 100));
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

  /* Days remaining bars */
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

  /* Category breakdown */
  const categoryMap = {};
  products.forEach(p => {
    const cat = p.category || 'other';
    if (!categoryMap[cat]) categoryMap[cat] = 0;
    categoryMap[cat] += (p.current_stock || 0) * (p.unit_cost || 0);
  });
  const categoryData = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const categoryTrace = categoryData.length > 0 ? [{
    x: categoryData.map(([cat]) => cat.charAt(0).toUpperCase() + cat.slice(1)),
    y: categoryData.map(([, val]) => Number((val / 100000).toFixed(1))),
    type: 'bar',
    marker: {
      color: ['#10B981', '#0D9488', '#0F766E', '#14B8A6', '#2DD4BF'].slice(0, categoryData.length),
      cornerradius: 4,
    },
    text: categoryData.map(([, val]) => `₹${(val / 100000).toFixed(1)}L`),
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

  // Expiry items
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

  // Slow movers
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
  const healthyCount = products.filter(p => p.status === 'healthy').length;
  const lowCount = products.filter(p => p.status === 'low_stock').length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>Inventory</h1>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginTop: 'var(--space-1)' }}>
            <span className="badge badge-success">● {healthyCount} Healthy</span>
            <span className="badge badge-warning">● {lowCount} Low</span>
            <span className="badge badge-danger">● {criticalCount} Critical</span>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/upload')} id="btn-add-product">
          + Add Product
        </button>
      </div>

      {products.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>📦</div>
          <h3 style={{ color: 'var(--color-text-primary)', marginBottom: 'var(--space-2)' }}>No products yet</h3>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Upload a CSV or scan a ledger to add your inventory.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/upload')}>📤 Upload Data</button>
        </div>
      ) : (
        <>
          {/* ── KPI Summary ── */}
          <div className="grid-3" style={{ marginBottom: 'var(--space-4)' }}>
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

          {/* ── Product List ── */}
          <div className="glass-card" style={{ marginBottom: 'var(--space-4)', padding: 0 }}>
            {/* Filters Bar */}
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap', padding: 'var(--space-4)' }}>
              <div style={{ flex: '1 1 200px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '1rem' }}>🔍</span>
                <input
                  className="form-input"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: 36 }}
                  id="product-search"
                />
              </div>
              <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)} style={{ minWidth: 140 }} id="filter-category">
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                ))}
              </select>
              <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ minWidth: 140 }} id="filter-status">
                <option value="all">All Status</option>
                <option value="healthy">Healthy</option>
                <option value="low_stock">Low Stock</option>
                <option value="critical">Critical</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                {filtered.length} items
              </span>
            </div>

            {/* Product Table */}
            <div style={{ overflow: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Stock</th>
                    <th>Reorder Point</th>
                    <th>Days Left</th>
                    <th>Status</th>
                    <th>Supplier</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const sc = statusConfig[p.status] || statusConfig.healthy;
                    return (
                      <tr key={p.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: 'var(--radius-md)',
                              background: 'rgba(13,148,136,0.15)', display: 'flex',
                              alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem'
                            }}>💊</div>
                            <span style={{ fontWeight: 600 }}>{p.name}</span>
                          </div>
                        </td>
                        <td style={{ textTransform: 'capitalize' }}>{p.category}</td>
                        <td>
                          <span style={{
                            fontWeight: 700,
                            color: p.status === 'critical' || p.status === 'out_of_stock' ? 'var(--color-danger)' :
                                   p.status === 'low_stock' ? 'var(--color-warning)' : 'var(--color-text-primary)'
                          }}>
                            {p.current_stock}
                          </span>
                          <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}> {p.unit}</span>
                        </td>
                        <td>{p.reorder_point}</td>
                        <td>
                          <span style={{
                            fontWeight: 600,
                            color: (p.days_remaining || 0) < 5 ? 'var(--color-danger)' :
                                   (p.days_remaining || 0) < 10 ? 'var(--color-warning)' : 'var(--color-success)'
                          }}>
                            {p.days_remaining != null ? `${p.days_remaining}d` : '—'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${sc.class}`}>{sc.label}</span>
                        </td>
                        <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                          {p.supplier_name || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Analytics Section ── */}
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary-light)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              STOCK ANALYTICS
            </p>
          </div>

          {/* Heatmap + Category Breakdown */}
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
              {categoryData.length > 0 ? (
                <Plot data={categoryTrace} layout={categoryLayout} config={{ displayModeBar: false, responsive: true }} style={{ width: '100%' }} />
              ) : <p style={{ color: 'var(--color-text-muted)', padding: 'var(--space-4)' }}>No data</p>}
            </div>
          </div>

          {/* Runway Projection */}
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

          {/* Expiry + Slow Movers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
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
        </>
      )}
    </div>
  );
}
