import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Plot from '../../components/PlotChart.jsx';
import { useApi } from '../../hooks/useApi';
import { inventoryApi } from '../../services/api';
import GlowCard from '../../components/GlowCard';
import AnimatedCounter from '../../components/AnimatedCounter';
import ShimmerButton from '../../components/ShimmerButton';
import { 
  Package, 
  AlertOctagon, 
  Wallet, 
  Search, 
  Filter,
  Plus,
  Clock,
  TrendingDown,
  Activity,
  Box,
  Upload,
  PieChart
} from 'lucide-react';

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

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  if (hLoading || pLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>
            <Activity size={48} color="var(--color-primary-light)" style={{ marginBottom: 'var(--space-3)', margin: '0 auto' }} />
          </div>
          <p style={{ color: 'var(--color-text-muted)' }}>Analyzing inventory health...</p>
        </div>
      </div>
    );
  }

  // === Analytics Data ===

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
      [0, '#FF3366'],    // Neon Danger
      [0.3, '#FFB020'],  // Neon Warning
      [0.6, '#00D0FF'],  // Neon Cyan
      [1, '#00FFAA'],    // Neon Success
    ],
    showscale: false,
    hovertemplate: '%{y}: %{z}% stock level on %{x}<extra></extra>',
    text: heatmapValues.map(row => row.map(v => `${v}%`)),
    texttemplate: '%{text}',
    textfont: { color: 'rgba(255,255,255,0.9)', size: 11, family: 'Inter' },
  }] : [];

  const heatmapLayout = {
    paper_bgcolor: 'transparent', 
    plot_bgcolor: 'transparent',
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
        (p.days_remaining || 0) > 14 ? '#00FFAA' :
        (p.days_remaining || 0) > 7 ? '#FFB020' : '#FF3366'
      ),
      cornerradius: 4
    },
    hovertemplate: '%{y}: %{x} days<extra></extra>',
  }] : [];

  const barsLayout = {
    paper_bgcolor: 'transparent', 
    plot_bgcolor: 'transparent',
    font: { color: '#94A3B8', family: 'Inter', size: 11 },
    margin: { t: 10, r: 30, b: 30, l: 150 },
    height: 240,
    xaxis: { title: 'Days', gridcolor: 'rgba(255,255,255,0.05)' },
    yaxis: { autorange: 'reversed' },
    shapes: [{
      type: 'line', x0: 5, x1: 5, y0: -0.5, y1: Math.max(sortedByDays.length - 0.5, 0.5),
      line: { color: '#FF3366', width: 2, dash: 'dot' },
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
      color: ['#00D0FF', '#7000FF', '#FF007F', '#00FFAA', '#FFB020'].slice(0, categoryData.length),
      cornerradius: 4,
    },
    text: categoryData.map(([, val]) => `₹${(val / 100000).toFixed(1)}L`),
    textposition: 'outside',
    textfont: { color: '#F8FAFC', size: 11 },
    hovertemplate: '%{x}: ₹%{y}L<extra></extra>',
  }] : [];

  const categoryLayout = {
    paper_bgcolor: 'transparent', 
    plot_bgcolor: 'transparent',
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
      color: p.days <= 7 ? '#FF3366' : p.days <= 14 ? '#FFB020' : '#00FFAA',
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
    <div className="animate-fade-in-up">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, background: 'linear-gradient(to right, #ffffff, #88ccff)', WebkitBackgroundClip: 'text', color: 'transparent', letterSpacing: '-0.02em' }}>
            Inventory Health
          </h1>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', marginTop: 'var(--space-2)' }}>
            <span className="badge" style={{ background: 'rgba(0,255,170,0.1)', color: '#00FFAA', border: '1px solid rgba(0,255,170,0.2)' }}>
              ● {healthyCount} Healthy
            </span>
            <span className="badge" style={{ background: 'rgba(255,176,32,0.1)', color: '#FFB020', border: '1px solid rgba(255,176,32,0.2)' }}>
              ● {lowCount} Low
            </span>
            <span className="badge" style={{ background: 'rgba(255,51,102,0.1)', color: '#FF3366', border: '1px solid rgba(255,51,102,0.2)' }}>
              ● {criticalCount} Critical
            </span>
          </div>
        </div>
        <ShimmerButton onClick={() => navigate('/upload')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}>
          <Plus size={18} /> Add Product
        </ShimmerButton>
      </div>

      {products.length === 0 ? (
        <GlowCard style={{ textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
            <Package size={40} color="var(--color-primary-light)" />
          </div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 'var(--space-2)' }}>No products yet</h3>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)', maxWidth: 400 }}>
            Upload your inventory data via CSV or connect your supply chain ledger to unlock AI insights.
          </p>
          <ShimmerButton onClick={() => navigate('/upload')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={18} /> Upload Data
          </ShimmerButton>
        </GlowCard>
      ) : (
        <>
          {/* ── KPI Summary ── */}
          <div className="grid-3" style={{ marginBottom: 'var(--space-6)' }}>
            <GlowCard glowColor="rgba(0,208,255,0.3)" style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)', borderLeft: '4px solid #00D0FF' }}>
              <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(0,208,255,0.1)', color: '#00D0FF' }}>
                <Package size={28} />
              </div>
              <div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '4px' }}>Total Products</div>
                <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  <AnimatedCounter value={products.length} suffix=" SKUs" />
                </div>
              </div>
            </GlowCard>

            <GlowCard glowColor="rgba(255,51,102,0.3)" style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)', borderLeft: '4px solid #FF3366' }}>
              <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,51,102,0.1)', color: '#FF3366' }}>
                <AlertOctagon size={28} />
              </div>
              <div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '4px' }}>Critical Shortages</div>
                <div style={{ fontSize: '1.875rem', fontWeight: 700, color: criticalCount > 0 ? '#FF3366' : '#00FFAA' }}>
                  {criticalCount > 0 ? (
                    <><AnimatedCounter value={criticalCount} /> Items</>
                  ) : 'None'}
                </div>
              </div>
            </GlowCard>

            <GlowCard glowColor="rgba(112,0,255,0.3)" style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)', borderLeft: '4px solid #7000FF' }}>
              <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(112,0,255,0.1)', color: '#7000FF' }}>
                <Wallet size={28} />
              </div>
              <div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '4px' }}>Inventory Value</div>
                <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'baseline' }}>
                  ₹<AnimatedCounter value={totalValue / 100000} decimals={2} /> 
                  <span style={{ fontSize: '1.125rem', color: 'var(--color-text-muted)', marginLeft: 4 }}>L</span>
                </div>
              </div>
            </GlowCard>
          </div>

          {/* ── Product List ── */}
          <GlowCard style={{ marginBottom: 'var(--space-6)', padding: 0, overflow: 'hidden' }}>
            {/* Filters Bar */}
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap', padding: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ flex: '1 1 200px', position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  className="form-input"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: 40, width: '100%' }}
                  id="product-search"
                />
              </div>
              
              <div style={{ position: 'relative' }}>
                <Filter size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
                <select 
                  className="form-select" 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ paddingLeft: 36, minWidth: 160 }}
                  id="filter-category"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div style={{ position: 'relative' }}>
                <Activity size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
                <select 
                  className="form-select" 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ paddingLeft: 36, minWidth: 160 }}
                  id="filter-status"
                >
                  <option value="all">All Status</option>
                  <option value="healthy">Healthy</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="critical">Critical</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>
              
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: 500, background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                {filtered.length} items
              </span>
            </div>

            {/* Product Table */}
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Product</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stock</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reorder Point</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Days Left</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  </tr>
                </thead>
                <tbody style={{ divideY: '1px solid var(--color-border)' }}>
                  {filtered.map((p, index) => {
                    const sc = statusConfig[p.status] || statusConfig.healthy;
                    return (
                      <tr key={p.id} style={{ borderBottom: index < filtered.length - 1 ? '1px solid var(--color-border)' : 'none', transition: 'background 0.2s', ':hover': { background: 'rgba(255,255,255,0.02)' } }}>
                        <td style={{ padding: '12px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'rgba(0,208,255,0.1)', border: '1px solid rgba(0,208,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Box size={16} color="#00D0FF" />
                            </div>
                            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{p.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 20px', textTransform: 'capitalize', color: 'var(--color-text-secondary)' }}>{p.category}</td>
                        <td style={{ padding: '12px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                            <span style={{ fontWeight: 700, fontSize: '1.125rem', color: p.status === 'critical' || p.status === 'out_of_stock' ? '#FF3366' : p.status === 'low_stock' ? '#FFB020' : 'var(--color-text-primary)' }}>
                              {p.current_stock}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{p.unit}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 20px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{p.reorder_point}</td>
                        <td style={{ padding: '12px 20px' }}>
                          <span style={{ fontWeight: 700, color: (p.days_remaining || 0) < 5 ? '#FF3366' : (p.days_remaining || 0) < 10 ? '#FFB020' : '#00FFAA' }}>
                            {p.days_remaining != null ? `${p.days_remaining}d` : '—'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                          <span className={`badge ${sc.class}`} 
                            style={{ 
                              background: sc.class === 'badge-success' ? 'rgba(0,255,170,0.1)' : sc.class === 'badge-warning' ? 'rgba(255,176,32,0.1)' : 'rgba(255,51,102,0.1)',
                              color: sc.class === 'badge-success' ? '#00FFAA' : sc.class === 'badge-warning' ? '#FFB020' : '#FF3366',
                              border: `1px solid ${sc.class === 'badge-success' ? 'rgba(0,255,170,0.2)' : sc.class === 'badge-warning' ? 'rgba(255,176,32,0.2)' : 'rgba(255,51,102,0.2)'}`
                            }}>
                            {sc.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlowCard>

          {/* ── Analytics Section ── */}
          <div style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PieChart size={20} color="var(--color-primary-light)" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>Stock Analytics</h2>
          </div>

          {/* Heatmap + Category Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
            <GlowCard style={{ padding: 'var(--space-4)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>Stock Vitality Heatmap</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>Availability trends for top-moving labels</p>
              {topProducts.length > 0 ? (
                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '8px' }}>
                  <Plot data={heatmapTrace} layout={heatmapLayout} config={{ displayModeBar: false, responsive: true }} style={{ width: '100%' }} />
                </div>
              ) : <p style={{ color: 'var(--color-text-muted)', padding: 'var(--space-4)' }}>No data</p>}
            </GlowCard>

            <GlowCard style={{ padding: 'var(--space-4)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>Value Breakdown</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>Total stock valuation by category</p>
              {categoryData.length > 0 ? (
                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '8px' }}>
                  <Plot data={categoryTrace} layout={categoryLayout} config={{ displayModeBar: false, responsive: true }} style={{ width: '100%', height: '220px' }} />
                </div>
              ) : <p style={{ color: 'var(--color-text-muted)', padding: 'var(--space-4)' }}>No data</p>}
            </GlowCard>
          </div>

          {/* Runway Projection */}
          {sortedByDays.length > 0 && (
            <GlowCard style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>Runway Projection</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>Projected stock depletion based on current velocity</p>
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '8px' }}>
                <Plot data={barsTrace} layout={barsLayout} config={{ displayModeBar: false, responsive: true }} style={{ width: '100%' }} />
              </div>
            </GlowCard>
          )}

          {/* Expiry + Slow Movers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-6)' }}>
            <GlowCard style={{ padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Clock size={18} color="#FFB020" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Expiry Watchlist</h3>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>Inventory nearing expiry within 60 days</p>
              
              {expiryItems.length === 0 ? (
                <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
                  <p style={{ color: 'var(--color-text-muted)' }}>No expiring items detected</p>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {expiryItems.map((item) => (
                    <div key={item.name} style={{ flex: '1 1 120px', padding: '16px', borderRadius: '12px', border: `1px solid ${item.color}30`, background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(4px)', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.1, background: `linear-gradient(135deg, transparent, ${item.color})` }} />
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', color: item.color, marginBottom: '4px' }}>
                        {item.days} DAYS
                      </div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.name}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {item.stock} units left
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlowCard>

            <GlowCard style={{ padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <TrendingDown size={18} color="var(--color-primary-light)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Inventory Velocity</h3>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>Products with slowest movement</p>
              
              {slowMovers.length === 0 ? (
                <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
                  <p style={{ color: 'var(--color-text-muted)' }}>No velocity data</p>
                </div>
              ) : (
                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                  {slowMovers.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderBottom: i < slowMovers.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={18} color="var(--color-text-muted)" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '2px' }}>{item.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>{item.stock} units in stock</div>
                      </div>
                      <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(255,176,32,0.1)', color: '#FFB020', border: '1px solid rgba(255,176,32,0.2)' }}>
                        {item.trend}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </GlowCard>
          </div>
        </>
      )}
    </div>
  );
}
