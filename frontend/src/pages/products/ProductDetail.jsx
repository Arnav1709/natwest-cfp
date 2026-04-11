import { useParams, useNavigate } from 'react-router-dom';
import Plot from '../../components/PlotChart.jsx';
import { mockProducts, mockStockMovements, mockForecast } from '../../mocks/mockData';

const statusConfig = {
  healthy: { label: 'Healthy', class: 'badge-success', color: '#10B981' },
  low_stock: { label: 'Low Stock', class: 'badge-warning', color: '#F59E0B' },
  critical: { label: 'Critical', class: 'badge-danger', color: '#EF4444' },
  out_of_stock: { label: 'Out of Stock', class: 'badge-danger', color: '#EF4444' },
};

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const product = mockProducts.find(p => p.id === Number(id)) || mockProducts[0];
  const sc = statusConfig[product.status];

  const movementTrace = [{
    x: mockStockMovements.map(m => m.date),
    y: mockStockMovements.map(m => m.balance),
    type: 'scatter',
    mode: 'lines+markers',
    line: { color: '#10B981', width: 2, shape: 'spline' },
    marker: { size: 6 },
    fill: 'tozeroy',
    fillcolor: 'rgba(13,148,136,0.1)',
  }];

  const movementLayout = {
    paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
    font: { color: '#94A3B8', family: 'Inter', size: 11 },
    margin: { t: 10, r: 20, b: 30, l: 40 },
    height: 180,
    xaxis: { gridcolor: 'rgba(255,255,255,0.05)' },
    yaxis: { gridcolor: 'rgba(255,255,255,0.05)', title: 'Units' },
    shapes: [{
      type: 'line', x0: mockStockMovements[0].date, x1: mockStockMovements[mockStockMovements.length-1].date,
      y0: product.reorder_point, y1: product.reorder_point,
      line: { color: '#EF4444', width: 2, dash: 'dot' },
    }],
  };

  return (
    <div>
      {/* Back */}
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--space-3)', color: 'var(--color-primary-light)' }} onClick={() => navigate('/products')}>
        ← Back to Products
      </button>

      {/* Header Card */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 'var(--radius-lg)',
            background: `${sc.color}20`, border: `2px solid ${sc.color}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem'
          }}>💊</div>
          <div>
            <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>{product.name}</h1>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginTop: 'var(--space-1)' }}>
              <span className={`badge ${sc.class}`}>{sc.label}</span>
              <span className="badge badge-muted" style={{ textTransform: 'capitalize' }}>{product.category}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-secondary btn-sm">✏️ Edit</button>
          <button className="btn btn-primary btn-sm">🔄 Reorder</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="kpi-card">
          <div className="kpi-card-label">Current Stock</div>
          <div className="kpi-card-value">{product.current_stock} <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{product.unit}</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-label">Reorder Point</div>
          <div className="kpi-card-value">{product.reorder_point}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-label">Days Remaining</div>
          <div className="kpi-card-value" style={{ color: product.days_remaining < 5 ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>
            {product.days_remaining}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-label">Unit Cost</div>
          <div className="kpi-card-value">₹{product.unit_cost}</div>
        </div>
      </div>

      {/* Stock Movement Chart + Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <div className="chart-container">
          <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Stock Movement</h3>
          <Plot data={movementTrace} layout={movementLayout} config={{ displayModeBar: false, responsive: true }} style={{ width: '100%' }} />
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
            Red line = Reorder point ({product.reorder_point} units)
          </p>
        </div>

        <div className="glass-card">
          <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Supplier Info</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {[
              { label: 'Supplier', value: product.supplier_name },
              { label: 'Contact', value: product.supplier_contact },
              { label: 'Lead Time', value: `${product.lead_time_days} days` },
              { label: 'Expiry Date', value: product.expiry_date || 'N/A' },
              { label: 'Safety Stock', value: `${product.safety_stock} ${product.unit}` },
            ].map((info) => (
              <div key={info.label}>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 2 }}>{info.label}</div>
                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>{info.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Movement History */}
      <div className="glass-card" style={{ padding: 0, overflow: 'auto' }}>
        <div style={{ padding: 'var(--space-4) var(--space-4) var(--space-2)' }}>
          <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>Recent Activity</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Date</th><th>Type</th><th>Qty</th><th>Notes</th><th>Balance</th></tr>
          </thead>
          <tbody>
            {mockStockMovements.map(m => (
              <tr key={m.id}>
                <td>{m.date}</td>
                <td>
                  <span className={`badge ${m.type === 'sale' ? 'badge-info' : m.type === 'restock' ? 'badge-success' : 'badge-warning'}`}>
                    {m.type}
                  </span>
                </td>
                <td style={{ color: m.quantity > 0 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
                  {m.quantity > 0 ? '+' : ''}{m.quantity}
                </td>
                <td style={{ color: 'var(--color-text-secondary)' }}>{m.notes}</td>
                <td style={{ fontWeight: 600 }}>{m.balance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
