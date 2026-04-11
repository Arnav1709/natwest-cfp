import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { mockVerificationData } from '../../mocks/mockData';

export default function Verify() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState(mockVerificationData);
  const [confirmed, setConfirmed] = useState(false);

  const overallConfidence = (data.reduce((sum, r) => sum + r.confidence, 0) / data.length * 100).toFixed(0);

  const updateRow = (id, field, value) => {
    setData(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const handleConfirm = () => {
    navigate('/dashboard/overview');
  };

  const getConfidenceColor = (conf) => {
    if (conf >= 0.9) return 'var(--color-success)';
    if (conf >= 0.75) return 'var(--color-warning)';
    return 'var(--color-danger)';
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h1 className="section-title" style={{ marginBottom: 'var(--space-1)' }}>{t('verify.title')}</h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>{t('verify.subtitle')}</p>
        </div>
        <div className="badge badge-primary" style={{ fontSize: 'var(--font-size-sm)', padding: '6px 16px' }}>
          {t('verify.confidence')}: {overallConfidence}%
        </div>
      </div>

      {/* Data Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'auto', marginBottom: 'var(--space-4)' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Date</th>
              <th>Quantity</th>
              <th>Unit Price (₹)</th>
              <th>Category</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id} style={{ background: row.confidence < 0.75 ? 'rgba(245,158,11,0.05)' : 'transparent' }}>
                <td>
                  <input
                    className="form-input"
                    style={{ padding: '6px 10px', minHeight: '36px', width: '100%' }}
                    value={row.name}
                    onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="form-input"
                    style={{ padding: '6px 10px', minHeight: '36px', width: '120px' }}
                    value={row.date}
                    onChange={(e) => updateRow(row.id, 'date', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="form-input"
                    type="number"
                    style={{ padding: '6px 10px', minHeight: '36px', width: '80px' }}
                    value={row.quantity}
                    onChange={(e) => updateRow(row.id, 'quantity', Number(e.target.value))}
                  />
                </td>
                <td>
                  <input
                    className="form-input"
                    type="number"
                    step="0.5"
                    style={{ padding: '6px 10px', minHeight: '36px', width: '90px' }}
                    value={row.price}
                    onChange={(e) => updateRow(row.id, 'price', Number(e.target.value))}
                  />
                </td>
                <td>
                  <select
                    className="form-select"
                    style={{ padding: '6px 10px', minHeight: '36px' }}
                    value={row.category}
                    onChange={(e) => updateRow(row.id, 'category', e.target.value)}
                  >
                    <option value="medicines">Medicines</option>
                    <option value="supplements">Supplements</option>
                    <option value="supplies">Supplies</option>
                    <option value="equipment">Equipment</option>
                  </select>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <div style={{
                      width: 60, height: 6, borderRadius: 'var(--radius-full)',
                      background: 'var(--color-bg-active)', overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${row.confidence * 100}%`, height: '100%',
                        background: getConfidenceColor(row.confidence), borderRadius: 'var(--radius-full)'
                      }} />
                    </div>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: getConfidenceColor(row.confidence), fontWeight: 600 }}>
                      {(row.confidence * 100).toFixed(0)}%
                    </span>
                    {row.confidence < 0.75 && <span title="Low confidence">⚠️</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Confirmation */}
      <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            style={{ width: 20, height: 20, accentColor: 'var(--color-primary)' }}
            id="checkbox-confirm"
          />
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            {t('verify.confirm_label')}
          </span>
        </label>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="btn btn-secondary" onClick={() => navigate(-1)} id="btn-rescan">
            🔄 {t('verify.rescan')}
          </button>
          <button
            className="btn btn-primary"
            disabled={!confirmed}
            onClick={handleConfirm}
            style={{ opacity: confirmed ? 1 : 0.5 }}
            id="btn-confirm-verify"
          >
            ✅ {t('verify.confirm_btn')}
          </button>
        </div>
      </div>
    </div>
  );
}
