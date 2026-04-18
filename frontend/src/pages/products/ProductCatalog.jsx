import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useTransliterate } from '../../hooks/useTransliterate';
import { inventoryApi } from '../../services/api';

export default function ProductCatalog() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: rawData, loading, error } = useApi(() => inventoryApi.list(), []);
  const products = Array.isArray(rawData) ? rawData : (rawData?.products || []);

  // Collect product names for transliteration
  const productNames = useMemo(
    () => products.map((p) => p.name).filter(Boolean),
    [products]
  );
  const { translatedMap } = useTransliterate(productNames);

  // Status config with translated labels
  const statusConfig = {
    healthy: { label: t('status.healthy'), class: 'badge-success' },
    low_stock: { label: t('status.low_stock'), class: 'badge-warning' },
    critical: { label: t('status.critical'), class: 'badge-danger' },
    out_of_stock: { label: t('status.out_of_stock'), class: 'badge-danger' },
  };

  const filtered = products.filter(p => {
    const matchSearch = (p.name || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'all' || p.category === category;
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading products...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>{t('products.title')}</h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
            {filtered.length} products found
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/upload')} id="btn-add-product">
          + {t('products.add_product')}
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', marginBottom: 'var(--space-4)', color: 'var(--color-warning)', fontSize: 'var(--font-size-sm)' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Filters */}
      <div className="glass-card" style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
        <div style={{ flex: '1 1 200px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '1rem' }}>🔍</span>
          <input
            className="form-input"
            placeholder={t('products.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
            id="product-search"
          />
        </div>
        <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)} style={{ minWidth: 140 }} id="filter-category">
          <option value="all">{t('products.category')}</option>
          <option value="medicines">{t('categories.Medicines')}</option>
          <option value="supplements">{t('categories.Supplements')}</option>
          <option value="supplies">{t('categories.Supplies')}</option>
          <option value="equipment">{t('categories.Equipment')}</option>
          <option value="grocery">{t('categories.Grocery')}</option>
        </select>
        <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ minWidth: 140 }} id="filter-status">
          <option value="all">{t('products.status')}</option>
          <option value="healthy">{t('status.healthy')}</option>
          <option value="low_stock">{t('status.low_stock')}</option>
          <option value="critical">{t('status.critical')}</option>
          <option value="out_of_stock">{t('status.out_of_stock')}</option>
        </select>
      </div>

      {/* Product Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>📦</div>
            <h3 style={{ color: 'var(--color-text-primary)', marginBottom: 'var(--space-2)' }}>No products yet</h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
              Upload a CSV or scan a ledger to add your inventory.
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/upload')}>📤 Upload Data</button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('products.name')}</th>
                <th>{t('products.category')}</th>
                <th>{t('products.stock')}</th>
                <th>{t('products.reorder_point')}</th>
                <th>{t('products.days_remaining')}</th>
                <th>{t('products.status')}</th>
                <th>{t('products.supplier')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const sc = statusConfig[p.status] || statusConfig.healthy;
                return (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/products/${p.id}`)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 'var(--radius-md)',
                          background: 'rgba(13,148,136,0.15)', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem'
                        }}>💊</div>
                        <span style={{ fontWeight: 600 }}>{translatedMap[p.name] || p.name}</span>
                      </div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{t(`categories.${p.category}`, { defaultValue: p.category })}</td>
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
                        {p.days_remaining != null ? `${p.days_remaining} days` : '—'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${sc.class}`}>{sc.label}</span>
                    </td>
                    <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                      {p.supplier_name || '—'}
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-primary-light)' }}>→</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
