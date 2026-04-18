import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '../hooks/useApi';
import { useTransliterate } from '../hooks/useTransliterate';
import { reorderApi } from '../services/api';

export default function Reorder() {
  const { t } = useTranslation();
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [orderedItems, setOrderedItems] = useState(new Set());
  const [orderedSuppliers, setOrderedSuppliers] = useState(new Set());

  const { data: rawData, loading, error } = useApi(() => reorderApi.list(), []);

  const reorderData = rawData || {};
  const reorder_list = reorderData.reorder_list || [];

  // Collect product names for transliteration
  const productNames = useMemo(
    () => reorder_list.map((item) => item.product_name).filter(Boolean),
    [reorder_list]
  );
  const { translatedMap } = useTransliterate(productNames);

  // Urgency config with translated labels
  const urgencyConfig = {
    high: { label: t('urgency.high'), class: 'badge-danger', icon: '🔴' },
    medium: { label: t('urgency.medium'), class: 'badge-warning', icon: '🟡' },
    low: { label: t('urgency.low'), class: 'badge-info', icon: '🟢' },
  };

  // ── Export handlers (authenticated fetch, not bare <a href>) ──
  const handleExport = async (format) => {
    const setter = format === 'csv' ? setExportingCsv : setExportingPdf;
    setter(true);
    try {
      await reorderApi.exportFile(format);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setter(false);
    }
  };

  // ── Mark single item as ordered (visual feedback) ──
  const handleOrderItem = (item) => {
    setOrderedItems((prev) => {
      const next = new Set(prev);
      next.add(item.product_id);
      return next;
    });
  };

  // ── Mark entire supplier group as ordered ──
  const handleOrderSupplier = (supplier, items) => {
    setOrderedSuppliers((prev) => {
      const next = new Set(prev);
      next.add(supplier);
      return next;
    });
    // Also mark all individual items
    setOrderedItems((prev) => {
      const next = new Set(prev);
      items.forEach((item) => next.add(item.product_id));
      return next;
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading reorder recommendations...</p>
      </div>
    );
  }

  const summary = reorderData.summary || { total_items: 0, estimated_total_cost: 0, most_urgent_product: '—', most_urgent_days_remaining: 0 };
  const grouped_by_supplier = reorderData.grouped_by_supplier || {};

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
          <button
            className="btn btn-secondary"
            id="btn-export-csv"
            onClick={() => handleExport('csv')}
            disabled={exportingCsv}
          >
            {exportingCsv ? '⏳ Exporting...' : '📥'} {t('reorder.export_csv')}
          </button>
          <button
            className="btn btn-secondary"
            id="btn-export-pdf"
            onClick={() => handleExport('pdf')}
            disabled={exportingPdf}
          >
            {exportingPdf ? '⏳ Exporting...' : '📄'} {t('reorder.export_pdf')}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', marginBottom: 'var(--space-4)', color: 'var(--color-warning)', fontSize: 'var(--font-size-sm)' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="kpi-card">
          <div className="kpi-card-label">{t('reorder.total_items')}</div>
          <div className="kpi-card-value">{summary.total_items}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-label">{t('reorder.estimated_cost')}</div>
          <div className="kpi-card-value">₹{(summary.estimated_total_cost || 0).toLocaleString()}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-label">{t('reorder.most_urgent')}</div>
          <div className="kpi-card-value" style={{ fontSize: 'var(--font-size-base)' }}>{summary.most_urgent_product}</div>
          {summary.most_urgent_days_remaining != null && (
            <div className="kpi-card-change negative">⚡ {summary.most_urgent_days_remaining} days left</div>
          )}
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
        {reorder_list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>✅</div>
            <p>No reorders needed — all stock levels are healthy!</p>
          </div>
        ) : (
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
                const uc = urgencyConfig[item.urgency] || urgencyConfig.low;
                const isOrdered = orderedItems.has(item.product_id);
                return (
                  <tr key={item.product_id} style={isOrdered ? { opacity: 0.5 } : undefined}>
                    <td style={{ fontWeight: 600 }}>{translatedMap[item.product_name] || item.product_name}</td>
                    <td>{item.current_stock}</td>
                    <td>{item.forecast_demand}/week</td>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary-light)' }}>{item.reorder_qty}</td>
                    <td>
                      <span style={{
                        fontWeight: 600,
                        color: (item.days_to_stockout || 0) <= 2 ? 'var(--color-danger)' :
                               (item.days_to_stockout || 0) <= 7 ? 'var(--color-warning)' : 'var(--color-text-primary)'
                      }}>
                        {item.days_to_stockout === 0 ? 'NOW' : `${item.days_to_stockout} days`}
                      </span>
                    </td>
                    <td><span className={`badge ${uc.class}`}>{uc.icon} {uc.label}</span></td>
                    <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{item.supplier_name}</td>
                    <td style={{ fontWeight: 600 }}>₹{(item.estimated_cost || 0).toLocaleString()}</td>
                    <td>
                      <button
                        className={`btn ${isOrdered ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                        onClick={() => handleOrderItem(item)}
                        disabled={isOrdered}
                      >
                        {isOrdered ? '✓ Marked' : 'Order'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Grouped by Supplier */}
      {Object.keys(grouped_by_supplier).length > 0 && (
        <>
          <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
            📦 Grouped by Supplier
          </h3>
          <div className="grid-2">
            {Object.entries(grouped_by_supplier).map(([supplier, items]) => {
              const total = items.reduce((sum, item) => sum + (item.estimated_cost || 0), 0);
              const isSupplierOrdered = orderedSuppliers.has(supplier);
              return (
                <div className="glass-card" key={supplier} style={isSupplierOrdered ? { opacity: 0.6 } : undefined}>
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
                  <button
                    className={`btn ${isSupplierOrdered ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                    style={{ width: '100%', marginTop: 'var(--space-3)' }}
                    onClick={() => handleOrderSupplier(supplier, items)}
                    disabled={isSupplierOrdered}
                  >
                    {isSupplierOrdered ? '✓ Order Sent' : `📧 Send Order to ${supplier}`}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
