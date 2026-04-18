import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit3, RefreshCw, Package, Clock, DollarSign, Activity, Truck, Calendar, Shield, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Plot from '../../components/PlotChart.jsx';
import { useApi } from '../../hooks/useApi';
import { inventoryApi } from '../../services/api';
import GlowCard from '../../components/GlowCard';
import AnimatedCounter from '../../components/AnimatedCounter';
import ShimmerButton from '../../components/ShimmerButton';

const statusConfig = {
  healthy:      { label: 'Healthy',      color: '#10B981' },
  low_stock:    { label: 'Low Stock',    color: '#F59E0B' },
  critical:     { label: 'Critical',     color: '#EF4444' },
  out_of_stock: { label: 'Out of Stock', color: '#EF4444' },
};

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: product, loading, error } = useApi(() => inventoryApi.get(id), [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <Package className="w-12 h-12 text-teal-500 animate-pulse mx-auto mb-4 opacity-50" />
          <p className="text-slate-400 font-medium">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-700">
          <Package className="w-10 h-10 text-slate-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Product not found</h2>
        <p className="text-slate-400 mb-6 max-w-sm">{error}</p>
        <ShimmerButton onClick={() => navigate('/products')}>
          <span className="flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> Back to Products</span>
        </ShimmerButton>
      </div>
    );
  }

  const sc = statusConfig[product.status] || statusConfig.healthy;
  const movements = product.recent_movements || product.stock_movements || [];

  const movementTrace = movements.length > 0 ? [
    {
      x: movements.map(m => m.date),
      y: movements.map(m => m.balance || m.quantity),
      type: 'scatter',
      mode: 'lines+markers',
      line: { color: '#10B981', width: 2, shape: 'spline' },
      marker: { size: 6, color: '#0F172A', line: { color: '#10B981', width: 2 } },
      fill: 'tozeroy',
      fillcolor: 'rgba(16, 185, 129, 0.08)',
    }
  ] : [];

  const movementLayout = {
    paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
    font: { color: '#94A3B8', family: "'Inter', sans-serif", size: 11 },
    margin: { t: 10, r: 20, b: 30, l: 40 },
    height: 200,
    xaxis: { gridcolor: 'rgba(255,255,255,0.05)', zerolinecolor: 'rgba(255,255,255,0.05)' },
    yaxis: { gridcolor: 'rgba(255,255,255,0.05)', zerolinecolor: 'rgba(255,255,255,0.05)', title: 'Units' },
    hovermode: 'x unified',
    shapes: movements.length > 0 ? [{
      type: 'line', x0: movements[0].date, x1: movements[movements.length-1].date,
      y0: product.reorder_point || 0, y1: product.reorder_point || 0,
      line: { color: '#EF4444', width: 2, dash: 'dot' },
    }] : [],
  };

  return (
    <div className="space-y-6 animate-fade-in-up max-w-[1200px] mx-auto">
      {/* Back */}
      <button
        className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-teal-400 transition-colors group"
        onClick={() => navigate('/products')}
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Products
      </button>

      {/* Header Card */}
      <GlowCard className="p-6" glowColor={sc.color}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-bold border-2 shadow-lg shrink-0"
              style={{ backgroundColor: `${sc.color}15`, borderColor: `${sc.color}40`, color: sc.color }}
            >
              {(product.name || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{product.name}</h1>
              <div className="flex gap-2 items-center mt-2">
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border"
                  style={{ backgroundColor: `${sc.color}15`, borderColor: `${sc.color}30`, color: sc.color }}
                >
                  <Activity className="w-3 h-3" />
                  {sc.label}
                </div>
                <div className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 capitalize">
                  {product.category}
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 font-medium border border-slate-700/50 transition-colors">
              <Edit3 className="w-4 h-4" /> Edit
            </button>
            <ShimmerButton>
              <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Reorder</span>
            </ShimmerButton>
          </div>
        </div>
      </GlowCard>

      {/* KPIs */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Current Stock', value: product.current_stock || 0, suffix: ` ${product.unit || ''}`, icon: Package, color: 'teal' },
          { label: 'Reorder Point', value: product.reorder_point || 0, icon: Activity, color: 'blue' },
          { label: 'Days Remaining', value: product.days_remaining, icon: Clock, color: (product.days_remaining || 0) < 5 ? 'red' : 'emerald' },
          { label: 'Unit Cost', value: product.unit_cost || 0, prefix: '₹', icon: DollarSign, color: 'violet' },
        ].map((kpi, i) => (
          <GlowCard key={i} className="p-5 flex flex-col relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-${kpi.color}-500/5 rounded-full blur-2xl -mr-4 -mt-4`}></div>
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="text-sm font-semibold tracking-wider text-slate-400 uppercase">{kpi.label}</span>
              <div className={`p-1.5 rounded-lg bg-${kpi.color}-500/10 text-${kpi.color}-400 border border-${kpi.color}-500/20`}>
                <kpi.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1 mt-auto relative z-10">
              {kpi.prefix && <span className="text-xl font-bold text-slate-400">{kpi.prefix}</span>}
              {kpi.value != null ? (
                <AnimatedCounter value={kpi.value} className="text-3xl font-bold text-white tracking-tight leading-none" />
              ) : (
                <span className="text-3xl font-bold text-slate-500">—</span>
              )}
              {kpi.suffix && <span className="text-sm font-medium text-slate-500">{kpi.suffix}</span>}
            </div>
          </GlowCard>
        ))}
      </div>

      {/* Stock Movement Chart + Supplier Info */}
      <div className="grid lg:grid-cols-3 gap-6">
        <GlowCard className="lg:col-span-2 p-5" glowColor="#10B981">
          <h3 className="text-lg font-bold text-white mb-1">Stock Movement</h3>
          <p className="text-xs text-slate-500 mb-4">Historical inventory levels over time</p>
          {movementTrace.length > 0 ? (
            <>
              <Plot data={movementTrace} layout={movementLayout} config={{ displayModeBar: false, responsive: true }} style={{ width: '100%' }} />
              <p className="text-xs text-slate-500 mt-2 flex items-center gap-2">
                <span className="inline-block w-6 h-0.5 bg-red-500 border-dotted"></span>
                Reorder point ({product.reorder_point || 0} units)
              </p>
            </>
          ) : (
            <div className="py-12 text-center">
              <Activity className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No movement data available yet.</p>
              <p className="text-xs text-slate-500 mt-1">Sales data will appear here after uploads.</p>
            </div>
          )}
        </GlowCard>

        <GlowCard className="p-5" glowColor="#3B82F6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-400" /> Supplier Info
          </h3>
          <div className="space-y-4">
            {[
              { label: 'Supplier', value: product.supplier_name || '—', icon: Truck },
              { label: 'Contact', value: product.supplier_contact || '—', icon: Activity },
              { label: 'Lead Time', value: product.lead_time_days ? `${product.lead_time_days} days` : '—', icon: Clock },
              { label: 'Expiry Date', value: product.expiry_date || 'N/A', icon: Calendar },
              { label: 'Safety Stock', value: product.safety_stock ? `${product.safety_stock} ${product.unit}` : '—', icon: Shield },
            ].map((info) => (
              <div key={info.label} className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                <info.icon className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{info.label}</div>
                  <div className="text-sm font-semibold text-white mt-0.5">{info.value}</div>
                </div>
              </div>
            ))}
          </div>
        </GlowCard>
      </div>

      {/* Movement History */}
      <GlowCard className="overflow-hidden p-0">
        <div className="px-6 py-4 border-b border-slate-800">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-400" /> Recent Activity
          </h3>
        </div>
        {movements.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            No activity recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-900/80 border-b border-slate-700/50 text-slate-300 uppercase tracking-wider text-xs font-semibold">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Qty</th>
                  <th className="px-6 py-3">Notes</th>
                  <th className="px-6 py-3">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {movements.map((m, i) => {
                  const isPositive = (m.quantity || 0) > 0;
                  const typeColor = m.type === 'sale' ? '#3B82F6' : m.type === 'restock' ? '#10B981' : '#F59E0B';
                  return (
                    <tr key={m.id || i} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-3 text-slate-300 tabular-nums">{m.date}</td>
                      <td className="px-6 py-3">
                        <span
                          className="px-2.5 py-1 rounded-md text-xs font-bold border capitalize"
                          style={{ backgroundColor: `${typeColor}15`, borderColor: `${typeColor}30`, color: typeColor }}
                        >
                          {m.type}
                        </span>
                      </td>
                      <td className="px-6 py-3 font-bold tabular-nums flex items-center gap-1" style={{ color: isPositive ? '#10B981' : '#EF4444' }}>
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : m.quantity === 0 ? <Minus className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {isPositive ? '+' : ''}{m.quantity}
                      </td>
                      <td className="px-6 py-3 text-slate-500 text-xs">{m.notes || '—'}</td>
                      <td className="px-6 py-3 font-bold text-white tabular-nums">{m.balance}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlowCard>
    </div>
  );
}
