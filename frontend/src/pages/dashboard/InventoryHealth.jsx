import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Plot from '../../components/PlotChart.jsx';
import { useApi } from '../../hooks/useApi';
import { inventoryApi, expiryApi } from '../../services/api';
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
  TrendingUp,
  Activity,
  Box,
  Upload,
  PieChart,
  Zap,
  Target,
  ShieldCheck
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
  const { data: rawProducts, loading: pLoading } = useApi(() => inventoryApi.list({ per_page: 1000 }), []);
  const { data: expiryData } = useApi(() => expiryApi?.batches?.() || inventoryApi.expiring(60), []);

  const products = Array.isArray(rawProducts) ? rawProducts : (rawProducts?.products || []);
  const h = healthData || {};

  // Product list filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  /* Inventory velocity — based on days_remaining (lower = faster moving)
   * IMPORTANT: This useMemo MUST be called before any early returns so that
   * the number of hooks is identical on every render (React rules of hooks). */
  const velocityProducts = useMemo(() => {
    const withVelocity = products
      .filter(p => p.current_stock > 0)
      .map(p => {
        const days = p.days_remaining;
        const dailyRate = days != null && days > 0 ? (p.current_stock / days) : 0;
        let speed = 'No Data';
        let speedColor = '#64748B';
        if (dailyRate > 0) {
          if (dailyRate >= 10) { speed = 'Fast'; speedColor = '#00FFAA'; }
          else if (dailyRate >= 3) { speed = 'Medium'; speedColor = '#00D0FF'; }
          else if (dailyRate >= 1) { speed = 'Slow'; speedColor = '#FFB020'; }
          else { speed = 'Very Slow'; speedColor = '#FF3366'; }
        }
        return { ...p, dailyRate: Math.round(dailyRate * 10) / 10, speed, speedColor };
      })
      .sort((a, b) => b.dailyRate - a.dailyRate); // Fastest first

    // Show top 3 fastest and top 3 slowest
    const fastest = withVelocity.filter(p => p.dailyRate > 0).slice(0, 3);
    const slowest = withVelocity.filter(p => p.dailyRate > 0).reverse().slice(0, 3);
    return { fastest, slowest };
  }, [products]);

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

  /* Runway projection — products sorted by days_remaining (stock depletion projection) */
  const productsWithRunway = products
    .filter(p => p.days_remaining != null && p.days_remaining > 0 && p.current_stock > 0)
    .sort((a, b) => (a.days_remaining || 0) - (b.days_remaining || 0))
    .slice(0, 8);

  const barsTrace = productsWithRunway.length > 0 ? [{
    y: productsWithRunway.map(p => p.name.length > 20 ? p.name.slice(0, 20) + '…' : p.name),
    x: productsWithRunway.map(p => Math.round(p.days_remaining)),
    type: 'bar',
    orientation: 'h',
    marker: {
      color: productsWithRunway.map(p =>
        (p.days_remaining || 0) > 21 ? '#00FFAA' :
        (p.days_remaining || 0) > 7 ? '#FFB020' : '#FF3366'
      ),
      cornerradius: 4
    },
    text: productsWithRunway.map(p => `${Math.round(p.days_remaining)}d`),
    textposition: 'outside',
    textfont: { color: '#F8FAFC', size: 11 },
    hovertemplate: '%{y}: %{x} days remaining<extra></extra>',
  }] : [];

  const barsLayout = {
    paper_bgcolor: 'transparent', 
    plot_bgcolor: 'transparent',
    font: { color: '#94A3B8', family: 'Inter', size: 11 },
    margin: { t: 10, r: 50, b: 30, l: 150 },
    height: Math.max(200, productsWithRunway.length * 36),
    xaxis: { title: 'Days Until Stockout', gridcolor: 'rgba(255,255,255,0.05)', zeroline: false },
    yaxis: { autorange: 'reversed', tickfont: { size: 11 } },
    shapes: [{
      type: 'line', x0: 7, x1: 7, y0: -0.5, y1: Math.max(productsWithRunway.length - 0.5, 0.5),
      line: { color: '#FF3366', width: 2, dash: 'dot' },
    }],
    annotations: productsWithRunway.length > 0 ? [{
      x: 7, y: -0.7, text: 'Critical Zone', showarrow: false,
      font: { color: '#FF3366', size: 10 }, xanchor: 'center'
    }] : [],
  };

  /* Expiry watchlist — using real data */
  const expiryItems = (() => {
    // Try batches from expiry API first
    const batches = expiryData?.batches || expiryData?.expiring_products || [];
    if (batches.length > 0) {
      return batches
        .map(b => {
          const daysUntil = Math.ceil((new Date(b.expiry_date) - new Date()) / 86400000);
          return {
            name: b.product_name || b.name || 'Unknown',
            days: daysUntil,
            stock: b.quantity || b.current_stock || 0,
            value: (b.quantity || b.current_stock || 0) * (b.unit_cost || 0),
          };
        })
        .filter(p => p.days > 0 && p.days <= 60)
        .sort((a, b) => a.days - b.days)
        .slice(0, 6)
        .map(p => ({
          ...p,
          color: p.days <= 7 ? '#FF3366' : p.days <= 14 ? '#FFB020' : p.days <= 30 ? '#00D0FF' : '#00FFAA',
          urgency: p.days <= 7 ? 'Critical' : p.days <= 14 ? 'Urgent' : p.days <= 30 ? 'Warning' : 'Monitor',
        }));
    }
    // Fallback to product-level expiry
    return products
      .filter(p => p.expiry_date)
      .map(p => {
        const daysUntil = Math.ceil((new Date(p.expiry_date) - new Date()) / 86400000);
        return { name: p.name, days: daysUntil, stock: p.current_stock || 0, value: (p.current_stock || 0) * (p.unit_cost || 0) };
      })
      .filter(p => p.days > 0 && p.days <= 60)
      .sort((a, b) => a.days - b.days)
      .slice(0, 6)
      .map(p => ({
        ...p,
        color: p.days <= 7 ? '#FF3366' : p.days <= 14 ? '#FFB020' : p.days <= 30 ? '#00D0FF' : '#00FFAA',
        urgency: p.days <= 7 ? 'Critical' : p.days <= 14 ? 'Urgent' : p.days <= 30 ? 'Warning' : 'Monitor',
      }));
  })();



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

  const totalValue = (h.total_inventory_value || products.reduce((sum, p) => sum + (p.current_stock || 0) * (p.unit_cost || 0), 0));
  const criticalCount = products.filter(p => p.status === 'critical' || p.status === 'out_of_stock').length;
  const healthyCount = products.filter(p => p.status === 'healthy').length;
  const lowCount = products.filter(p => p.status === 'low_stock').length;
  const belowReorder = products.filter(p => p.reorder_point > 0 && p.current_stock <= p.reorder_point).length;

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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
            <GlowCard glowColor="rgba(0,208,255,0.3)" style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)', borderLeft: '4px solid #00D0FF' }}>
              <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(0,208,255,0.1)', color: '#00D0FF' }}>
                <Package size={28} />
              </div>
              <div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '4px' }}>Total SKUs</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  <AnimatedCounter value={products.length} />
                </div>
              </div>
            </GlowCard>

            <GlowCard glowColor="rgba(255,51,102,0.3)" style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)', borderLeft: '4px solid #FF3366' }}>
              <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,51,102,0.1)', color: '#FF3366' }}>
                <AlertOctagon size={28} />
              </div>
              <div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '4px' }}>Below Reorder</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: belowReorder > 0 ? '#FF3366' : '#00FFAA' }}>
                  <AnimatedCounter value={belowReorder} />
                </div>
              </div>
            </GlowCard>

            <GlowCard glowColor="rgba(112,0,255,0.3)" style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)', borderLeft: '4px solid #7000FF' }}>
              <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(112,0,255,0.1)', color: '#7000FF' }}>
                <Wallet size={28} />
              </div>
              <div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '4px' }}>Inventory Value</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'baseline' }}>
                  ₹<AnimatedCounter value={totalValue / 100000} decimals={2} /> 
                  <span style={{ fontSize: '1rem', color: 'var(--color-text-muted)', marginLeft: 4 }}>L</span>
                </div>
              </div>
            </GlowCard>

            <GlowCard glowColor="rgba(0,255,170,0.3)" style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)', borderLeft: '4px solid #00FFAA' }}>
              <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(0,255,170,0.1)', color: '#00FFAA' }}>
                <Target size={28} />
              </div>
              <div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '4px' }}>AI Reorder Active</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#00FFAA' }}>
                  <AnimatedCounter value={products.filter(p => p.reorder_point > 0).length} />
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginLeft: 4 }}>/{products.length}</span>
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
                    {['Product', 'Category', 'Stock', 'Reorder Pt', 'Safety Stock', 'Days Left', 'Status'].map(col => (
                      <th key={col} style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, index) => {
                    const sc = statusConfig[p.status] || statusConfig.healthy;
                    const stockPct = p.reorder_point > 0 ? Math.min(100, (p.current_stock / p.reorder_point) * 100) : 100;
                    return (
                      <tr key={p.id} style={{ borderBottom: index < filtered.length - 1 ? '1px solid var(--color-border)' : 'none', cursor: 'pointer' }}
                        onClick={() => navigate(`/products/${p.id}`)}
                      >
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
                          <div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
                              <span style={{ fontWeight: 700, fontSize: '1.125rem', color: p.status === 'critical' || p.status === 'out_of_stock' ? '#FF3366' : p.status === 'low_stock' ? '#FFB020' : 'var(--color-text-primary)' }}>
                                {p.current_stock}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{p.unit}</span>
                            </div>
                            {p.reorder_point > 0 && (
                              <div style={{ width: 60, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                                <div style={{ width: `${stockPct}%`, height: '100%', borderRadius: 2, background: stockPct > 150 ? '#00FFAA' : stockPct > 100 ? '#00D0FF' : stockPct > 50 ? '#FFB020' : '#FF3366' }} />
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px 20px', color: p.reorder_point > 0 ? 'var(--color-text-secondary)' : 'var(--color-text-muted)', fontWeight: 500 }}>
                          {p.reorder_point > 0 ? p.reorder_point : '—'}
                        </td>
                        <td style={{ padding: '12px 20px', color: p.safety_stock > 0 ? 'var(--color-text-secondary)' : 'var(--color-text-muted)', fontWeight: 500 }}>
                          {p.safety_stock > 0 ? p.safety_stock : '—'}
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                          <span style={{ fontWeight: 700, color: (p.days_remaining || 0) < 5 ? '#FF3366' : (p.days_remaining || 0) < 10 ? '#FFB020' : '#00FFAA' }}>
                            {p.days_remaining != null ? `${Math.round(p.days_remaining)}d` : '—'}
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

          {/* Runway + Category Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
            {/* Runway Projection */}
            <GlowCard style={{ padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Zap size={18} color="#FFB020" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Runway Projection</h3>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>Projected stock depletion based on sales velocity</p>
              {productsWithRunway.length > 0 ? (
                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '8px' }}>
                  <Plot data={barsTrace} layout={barsLayout} config={{ displayModeBar: false, responsive: true }} style={{ width: '100%' }} />
                </div>
              ) : (
                <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
                  <p style={{ color: 'var(--color-text-muted)' }}>No runway data — record sales to see projections</p>
                </div>
              )}
            </GlowCard>

            {/* Category Breakdown */}
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

          {/* Expiry + Velocity */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-6)' }}>
            {/* Expiry Watchlist */}
            <GlowCard style={{ padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Clock size={18} color="#FFB020" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Expiry Watchlist</h3>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>Inventory nearing expiry within 60 days</p>
              
              {expiryItems.length === 0 ? (
                <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
                  <ShieldCheck size={32} color="var(--color-text-muted)" style={{ margin: '0 auto 8px' }} />
                  <p style={{ color: 'var(--color-text-muted)' }}>No items expiring in next 60 days</p>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {expiryItems.map((item, i) => (
                    <div key={i} style={{ flex: '1 1 120px', padding: '14px', borderRadius: '12px', border: `1px solid ${item.color}30`, background: 'rgba(255,255,255,0.02)', position: 'relative', overflow: 'hidden', minWidth: 120 }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.08, background: `linear-gradient(135deg, transparent, ${item.color})` }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', position: 'relative' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em', color: item.color }}>
                          {item.days} DAYS
                        </span>
                        <span style={{ fontSize: '0.6rem', fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: `${item.color}20`, color: item.color }}>
                          {item.urgency}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', position: 'relative' }} title={item.name}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', position: 'relative' }}>
                        {item.stock} units at risk
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlowCard>

            {/* Inventory Velocity */}
            <GlowCard style={{ padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <TrendingUp size={18} color="#00D0FF" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Inventory Velocity</h3>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>Sales velocity — units consumed per day</p>
              
              {velocityProducts.fastest.length === 0 && velocityProducts.slowest.length === 0 ? (
                <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
                  <p style={{ color: 'var(--color-text-muted)' }}>No velocity data — record sales to track movement</p>
                </div>
              ) : (
                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                  {velocityProducts.fastest.length > 0 && (
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border)', background: 'rgba(0,255,170,0.03)' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#00FFAA', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🔥 Fastest Moving</span>
                    </div>
                  )}
                  {velocityProducts.fastest.map((item, i) => (
                    <div key={`f-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderBottom: '1px solid var(--color-border)' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '8px', background: `${item.speedColor}15`, border: `1px solid ${item.speedColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <TrendingUp size={16} color={item.speedColor} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{item.current_stock} units • {item.days_remaining ? `${Math.round(item.days_remaining)}d left` : '—'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: item.speedColor }}>{item.dailyRate}/day</div>
                        <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, background: `${item.speedColor}15`, color: item.speedColor, border: `1px solid ${item.speedColor}30` }}>
                          {item.speed}
                        </span>
                      </div>
                    </div>
                  ))}
                  {velocityProducts.slowest.length > 0 && (
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border)', background: 'rgba(255,176,32,0.03)' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#FFB020', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🐌 Slowest Moving</span>
                    </div>
                  )}
                  {velocityProducts.slowest.map((item, i) => (
                    <div key={`s-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderBottom: i < velocityProducts.slowest.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '8px', background: `${item.speedColor}15`, border: `1px solid ${item.speedColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <TrendingDown size={16} color={item.speedColor} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{item.current_stock} units • {item.days_remaining ? `${Math.round(item.days_remaining)}d left` : '—'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: item.speedColor }}>{item.dailyRate}/day</div>
                        <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, background: `${item.speedColor}15`, color: item.speedColor, border: `1px solid ${item.speedColor}30` }}>
                          {item.speed}
                        </span>
                      </div>
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
