import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { uploadApi } from '../../services/api';

export default function Verify() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // Get real data from Upload page via React Router state
  const routerState = location.state || {};
  const initialData = routerState.data || [];
  const source = routerState.source || 'unknown';
  const fileName = routerState.fileName || '';

  const [data, setData] = useState(initialData);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [error, setError] = useState(null);

  // If no data was passed, show empty state
  const hasData = data.length > 0;

  const overallConfidence = hasData
    ? (data.reduce((sum, r) => sum + r.confidence, 0) / data.length * 100).toFixed(0)
    : 0;

  const updateRow = (id, field, value) => {
    setData(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const deleteRow = (id) => {
    setData(prev => prev.filter(row => row.id !== id));
  };

  const addRow = () => {
    const newId = data.length > 0 ? Math.max(...data.map(r => r.id)) + 1 : 1;
    setData(prev => [...prev, {
      id: newId,
      name: '',
      date: new Date().toISOString().split('T')[0],
      quantity: 0,
      price: 0,
      category: 'medicines',
      confidence: 1.0,
    }]);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);

    try {
      // Transform data to match backend VerifyRequest schema
      const verifiedData = data
        .filter(row => row.name.trim())
        .map(row => ({
          name: row.name.trim(),
          date: row.date || null,
          quantity: Number(row.quantity) || null,
          price: Number(row.price) || null,
          category: row.category || null,
          unit: 'units',
        }));

      if (verifiedData.length === 0) {
        setError('No valid rows to submit. Ensure at least one row has a product name.');
        setSubmitting(false);
        return;
      }

      const result = await uploadApi.verify({ verified_data: verifiedData });

      setSubmitResult(result);
      // Navigate to dashboard after brief success display
      setTimeout(() => {
        navigate('/dashboard/overview');
      }, 2500);

    } catch (err) {
      console.error('Verify failed:', err);
      setError(err.message || 'Failed to save data. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getConfidenceColor = (conf) => {
    if (conf >= 0.9) return 'var(--color-success)';
    if (conf >= 0.75) return 'var(--color-warning)';
    return 'var(--color-danger)';
  };

  const getSourceLabel = () => {
    if (source === 'image') return '📷 AI OCR Extraction';
    if (source === 'csv') return '📄 CSV Import';
    if (source === 'manual') return '✏️ Manual Entry';
    return 'Data Verification';
  };

  // ── Success overlay ──
  if (submitResult) {
    return (
      <div style={{ maxWidth: '500px', margin: '80px auto', textAlign: 'center' }}>
        <div className="glass-card" style={{ padding: 'var(--space-8)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>✅</div>
          <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 'var(--space-3)' }}>
            Data Saved Successfully!
          </h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-6)', marginBottom: 'var(--space-4)' }}>
            <div>
              <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-primary)' }}>
                {submitResult.products_created}
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Products Created</div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-success)' }}>
                {submitResult.sales_records_created}
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Sales Records</div>
            </div>
          </div>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h1 className="section-title" style={{ marginBottom: 'var(--space-1)' }}>{t('verify.title')}</h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>
            {fileName ? `${getSourceLabel()} — ${fileName}` : t('verify.subtitle')}
          </p>
        </div>
        {hasData && (
          <div className="badge badge-primary" style={{ fontSize: 'var(--font-size-sm)', padding: '6px 16px' }}>
            {t('verify.confidence')}: {overallConfidence}%
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-4)',
            color: 'var(--color-danger)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Empty state */}
      {!hasData && source !== 'manual' && (
        <div className="glass-card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-3)' }}>📭</div>
          <h3 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-2)' }}>
            No Data to Verify
          </h3>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
            Go back and upload a file or image to extract data.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/upload')}>
            ← Back to Upload
          </button>
        </div>
      )}

      {/* Data Table */}
      {(hasData || source === 'manual') && (
        <>
          <div className="glass-card" style={{ padding: 0, overflow: 'auto', marginBottom: 'var(--space-4)' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Date</th>
                  <th>Quantity</th>
                  <th>Unit Price (₹)</th>
                  <th>Category</th>
                  {source === 'image' && <th>Confidence</th>}
                  <th style={{ width: 40 }}></th>
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
                        placeholder="Product name"
                      />
                    </td>
                    <td>
                      <input
                        className="form-input"
                        type="date"
                        style={{ padding: '6px 10px', minHeight: '36px', width: '140px' }}
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
                        <option value="grocery">Grocery</option>
                        <option value="other">Other</option>
                      </select>
                    </td>
                    {source === 'image' && (
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
                          {row.confidence < 0.75 && <span title="Low confidence — please verify">⚠️</span>}
                        </div>
                      </td>
                    )}
                    <td>
                      <button
                        onClick={() => deleteRow(row.id)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--color-text-muted)', fontSize: '1rem',
                          padding: '4px', borderRadius: 'var(--radius-sm)',
                        }}
                        title="Remove row"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add row button */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <button
              className="btn btn-secondary"
              onClick={addRow}
              style={{ fontSize: 'var(--font-size-sm)' }}
            >
              + Add Row
            </button>
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
              <button className="btn btn-secondary" onClick={() => navigate('/upload')} id="btn-rescan">
                🔄 {t('verify.rescan')}
              </button>
              <button
                className="btn btn-primary"
                disabled={!confirmed || submitting || data.length === 0}
                onClick={handleConfirm}
                style={{ opacity: (confirmed && !submitting && data.length > 0) ? 1 : 0.5 }}
                id="btn-confirm-verify"
              >
                {submitting ? '⏳ Saving...' : `✅ ${t('verify.confirm_btn')}`}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
