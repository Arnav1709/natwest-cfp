import { useTranslation } from 'react-i18next';
import { mockReorder } from '../mocks/mockData';

const urgencyConfig = {
  high: { label: 'Urgent', class: 'badge-danger', icon: '🔴' },
  medium: { label: 'Soon', class: 'badge-warning', icon: '🟡' },
  low: { label: 'Normal', class: 'badge-info', icon: '🟢' },
};

export default function Reorder() {
  const { t } = useTranslation();
  const { summary, reorder_list, grouped_by_supplier } = mockReorder;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>{t('reorder.title')}</h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
            AI-generated reorder recommendations based on current stock and forecast demand
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-secondary" id="btn-export-csv">📥 {t('reorder.export_csv')}</button>
          <button className="btn btn-secondary" id="btn-export-pdf">📄 {t('reorder.export_pdf')}</button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="kpi-card">
          <div className="kpi-card-label">{t('reorder.total_items')}</div>
          <div className="kpi-card-value">{summary.total_items}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-label">{t('reorder.estimated_cost')}</div>
          <div className="kpi-card-value">₹{summary.estimated_total_cost.toLocaleString()}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-label">{t('reorder.most_urgent')}</div>
          <div className="kpi-card-value" style={{ fontSize: 'var(--font-size-base)' }}>{summary.most_urgent_product}</div>
          <div className="kpi-card-change negative">⚡ {summary.most_urgent_days_remaining} days left</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-label">Suppliers Involved</div>
          <div className="kpi-card-value">{Object.keys(grouped_by_supplier).length}</div>
        </div>
      </div>

      {/* Reorder Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'auto', marginBottom: 'var(--space-6)' }}>
        <div style={{ padding: 'var(--space-4) var(--space-4) var(--space-2)' }}>
          <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>Reorder List</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Current Stock</th>
              <th>Forecast Demand</th>
              <th>Reorder Qty</th>
              <th>Days to Stockout</th>
              <th>Urgency</th>
              <th>Supplier</th>
              <th>Est. Cost</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {reorder_list.map((item) => {
              const uc = urgencyConfig[item.urgency];
              return (
                <tr key={item.product_id}>
                  <td style={{ fontWeight: 600 }}>{item.product_name}</td>
                  <td>{item.current_stock}</td>
                  <td>{item.forecast_demand}/week</td>
                  <td style={{ fontWeight: 700, color: 'var(--color-primary-light)' }}>{item.reorder_qty}</td>
                  <td>
                    <span style={{
                      fontWeight: 600,
                      color: item.days_to_stockout <= 2 ? 'var(--color-danger)' :
                             item.days_to_stockout <= 7 ? 'var(--color-warning)' : 'var(--color-text-primary)'
                    }}>
                      {item.days_to_stockout === 0 ? 'NOW' : `${item.days_to_stockout} days`}
                    </span>
                  </td>
                  <td><span className={`badge ${uc.class}`}>{uc.icon} {uc.label}</span></td>
                  <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{item.supplier_name}</td>
                  <td style={{ fontWeight: 600 }}>₹{item.estimated_cost.toLocaleString()}</td>
                  <td>
                    <button className="btn btn-primary btn-sm">Order</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Grouped by Supplier */}
      <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
        📦 Grouped by Supplier
      </h3>
      <div className="grid-2">
        {Object.entries(grouped_by_supplier).map(([supplier, items]) => {
          const total = items.reduce((sum, item) => sum + item.estimated_cost, 0);
          return (
            <div className="glass-card" key={supplier}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <h4 style={{ fontWeight: 600, fontSize: 'var(--font-size-base)' }}>{supplier}</h4>
                <span className="badge badge-muted">₹{total.toLocaleString()}</span>
              </div>
              {items.map((item) => (
                <div key={item.product_id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: 'var(--space-2) 0',
                  borderBottom: '1px solid var(--color-border)'
                }}>
                  <span style={{ fontSize: 'var(--font-size-sm)' }}>{item.product_name}</span>
                  <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-primary-light)' }}>
                    {item.reorder_qty} units
                  </span>
                </div>
              ))}
              <button className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: 'var(--space-3)' }}>
                📧 Send Order to {supplier}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
