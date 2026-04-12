import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { salesApi, inventoryApi } from '../../services/api';

export default function RecordSales() {
  const { t } = useTranslation();
  const fileRef = useRef(null);

  // Tab state: 'csv' or 'manual'
  const [activeTab, setActiveTab] = useState('manual');

  // CSV upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsedSales, setParsedSales] = useState([]);
  const [csvUploading, setCsvUploading] = useState(false);

  // Manual entry state
  const [products, setProducts] = useState([]);
  const [manualEntries, setManualEntries] = useState([
    { product_name: '', quantity: '', date: new Date().toISOString().split('T')[0], price: '' },
  ]);

  // Shared state
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Sales history
  const [salesHistory, setSalesHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Load products for dropdown + recent sales history
  useEffect(() => {
    const loadData = async () => {
      try {
        const inv = await inventoryApi.list({ per_page: 100 });
        setProducts(inv.products || []);
      } catch (e) {
        console.warn('Could not load products:', e.message);
      }
      try {
        setHistoryLoading(true);
        const hist = await salesApi.history({ per_page: 10 });
        setSalesHistory(hist.sales || []);
      } catch (e) {
        console.warn('Could not load sales history:', e.message);
      } finally {
        setHistoryLoading(false);
      }
    };
    loadData();
  }, []);

  // ─── CSV Upload Handlers ───────────────────────────────────────
  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    setError(null);
    const file = e.dataTransfer?.files[0] || e.target?.files[0];
    if (file) setSelectedFile(file);
  };

  const handleParseCSV = async () => {
    if (!selectedFile) return;
    setCsvUploading(true);
    setError(null);
    try {
      const data = await salesApi.uploadCsv(selectedFile);
      setParsedSales(
        (data.sales || []).map((s, i) => ({
          ...s,
          id: i,
          selected: true,
          date: s.date || new Date().toISOString().split('T')[0],
        }))
      );
    } catch (err) {
      setError(err.message || 'Failed to parse CSV');
    } finally {
      setCsvUploading(false);
    }
  };

  const handleSubmitCSV = async () => {
    const selectedSales = parsedSales
      .filter((s) => s.selected && s.product_name && s.quantity > 0)
      .map(({ product_name, quantity, date, price }) => ({
        product_name,
        quantity: Number(quantity),
        date,
        price: price ? Number(price) : undefined,
      }));

    if (selectedSales.length === 0) {
      setError('No valid sales entries selected.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await salesApi.record(selectedSales);
      setResult(res);
      setParsedSales([]);
      setSelectedFile(null);
      // Refresh history
      const hist = await salesApi.history({ per_page: 10 });
      setSalesHistory(hist.sales || []);
    } catch (err) {
      setError(err.message || 'Failed to record sales');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Manual Entry Handlers ─────────────────────────────────────
  const addManualRow = () => {
    setManualEntries([
      ...manualEntries,
      { product_name: '', quantity: '', date: new Date().toISOString().split('T')[0], price: '' },
    ]);
  };

  const removeManualRow = (idx) => {
    if (manualEntries.length <= 1) return;
    setManualEntries(manualEntries.filter((_, i) => i !== idx));
  };

  const updateManualEntry = (idx, field, value) => {
    const updated = [...manualEntries];
    updated[idx] = { ...updated[idx], [field]: value };
    setManualEntries(updated);
  };

  const handleSubmitManual = async () => {
    const validEntries = manualEntries
      .filter((e) => e.product_name && e.quantity > 0)
      .map((e) => ({
        product_name: e.product_name,
        quantity: Number(e.quantity),
        date: e.date || new Date().toISOString().split('T')[0],
        price: e.price ? Number(e.price) : undefined,
      }));

    if (validEntries.length === 0) {
      setError('Please add at least one valid sale entry.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await salesApi.record(validEntries);
      setResult(res);
      setManualEntries([
        { product_name: '', quantity: '', date: new Date().toISOString().split('T')[0], price: '' },
      ]);
      // Refresh history
      const hist = await salesApi.history({ per_page: 10 });
      setSalesHistory(hist.sales || []);
    } catch (err) {
      setError(err.message || 'Failed to record sales');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Styles ────────────────────────────────────────────────────
  const tabStyle = (active) => ({
    padding: 'var(--space-3) var(--space-5)',
    border: 'none',
    background: active ? 'var(--color-primary)' : 'var(--color-bg-card)',
    color: active ? '#fff' : 'var(--color-text-secondary)',
    fontWeight: 600,
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer',
    borderRadius: 'var(--radius-lg)',
    transition: 'all 0.2s ease',
  });

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--color-bg-sunken)',
    color: 'var(--color-text-primary)',
    fontSize: 'var(--font-size-sm)',
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 className="section-title">🧾 Record Daily Sales</h1>
        <p className="section-subtitle">
          Record today's sales to auto-deduct from inventory. Upload a CSV file or enter sales manually.
        </p>
      </div>

      {/* Success Result Banner */}
      {result && (
        <div
          style={{
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-4)',
          }}
        >
          <div style={{ fontWeight: 600, color: '#22c55e', marginBottom: 'var(--space-2)' }}>
            ✅ Sales Recorded Successfully!
          </div>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            {result.successful} of {result.total_processed} sales processed.
            {result.failed > 0 && (
              <span style={{ color: 'var(--color-danger)', marginLeft: 8 }}>
                {result.failed} failed (product not found).
              </span>
            )}
            {result.alerts_generated > 0 && (
              <span style={{ color: '#f59e0b', marginLeft: 8 }}>
                ⚠️ {result.alerts_generated} stock alert(s) triggered!
              </span>
            )}
          </div>
          {/* Show individual results */}
          <div style={{ marginTop: 'var(--space-3)' }}>
            {result.results?.map((r, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: '4px 0',
                  fontSize: 'var(--font-size-sm)',
                }}
              >
                <span>{r.status === 'success' ? '✅' : '❌'}</span>
                <span style={{ fontWeight: 500 }}>{r.product_name}</span>
                <span>— sold {r.quantity}</span>
                {r.new_stock !== null && r.new_stock !== undefined && (
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    (remaining: {r.new_stock})
                  </span>
                )}
                {r.alert && (
                  <span
                    className={`badge ${r.alert === 'stockout' ? 'badge-danger' : 'badge-warning'}`}
                  >
                    {r.alert === 'stockout' ? '🚨 OUT OF STOCK' : '⚠️ LOW STOCK'}
                  </span>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => setResult(null)}
            style={{
              marginTop: 'var(--space-3)',
              background: 'none',
              border: 'none',
              color: 'var(--color-primary)',
              cursor: 'pointer',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            Dismiss ✕
          </button>
        </div>
      )}

      {/* Error Banner */}
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

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
        <button style={tabStyle(activeTab === 'manual')} onClick={() => setActiveTab('manual')}>
          ✏️ Manual Entry
        </button>
        <button style={tabStyle(activeTab === 'csv')} onClick={() => setActiveTab('csv')}>
          📄 Upload Sales CSV
        </button>
      </div>

      {/* ────────── MANUAL ENTRY TAB ────────── */}
      {activeTab === 'manual' && (
        <div className="glass-card">
          <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--space-4)', color: 'var(--color-text-primary)' }}>
            Enter Sales for Today
          </h3>

          {manualEntries.map((entry, idx) => (
            <div
              key={idx}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                gap: 'var(--space-3)',
                marginBottom: 'var(--space-3)',
                alignItems: 'end',
              }}
            >
              {/* Product Select/Input */}
              <div>
                {idx === 0 && (
                  <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}>
                    Product Name *
                  </label>
                )}
                {products.length > 0 ? (
                  <select
                    style={inputStyle}
                    value={entry.product_name}
                    onChange={(e) => updateManualEntry(idx, 'product_name', e.target.value)}
                  >
                    <option value="">Select product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name} ({p.current_stock} in stock)
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    style={inputStyle}
                    placeholder="Product name"
                    value={entry.product_name}
                    onChange={(e) => updateManualEntry(idx, 'product_name', e.target.value)}
                  />
                )}
              </div>

              {/* Quantity */}
              <div>
                {idx === 0 && (
                  <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}>
                    Qty Sold *
                  </label>
                )}
                <input
                  type="number"
                  min="1"
                  style={inputStyle}
                  placeholder="Qty"
                  value={entry.quantity}
                  onChange={(e) => updateManualEntry(idx, 'quantity', e.target.value)}
                />
              </div>

              {/* Date */}
              <div>
                {idx === 0 && (
                  <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}>
                    Date
                  </label>
                )}
                <input
                  type="date"
                  style={inputStyle}
                  value={entry.date}
                  onChange={(e) => updateManualEntry(idx, 'date', e.target.value)}
                />
              </div>

              {/* Price */}
              <div>
                {idx === 0 && (
                  <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}>
                    Price (opt)
                  </label>
                )}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  style={inputStyle}
                  placeholder="₹"
                  value={entry.price}
                  onChange={(e) => updateManualEntry(idx, 'price', e.target.value)}
                />
              </div>

              {/* Remove */}
              <button
                onClick={() => removeManualRow(idx)}
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: 'none',
                  color: 'var(--color-danger)',
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 12px',
                  fontSize: 'var(--font-size-sm)',
                }}
                title="Remove row"
              >
                ✕
              </button>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
            <button
              className="btn"
              onClick={addManualRow}
              style={{ background: 'var(--color-bg-active)', color: 'var(--color-text-primary)' }}
            >
              + Add Row
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmitManual}
              disabled={submitting}
            >
              {submitting ? '⏳ Recording...' : `💾 Record ${manualEntries.filter((e) => e.product_name && e.quantity).length} Sale(s)`}
            </button>
          </div>
        </div>
      )}

      {/* ────────── CSV UPLOAD TAB ────────── */}
      {activeTab === 'csv' && (
        <div className="glass-card">
          <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--space-4)', color: 'var(--color-text-primary)' }}>
            Upload Sales CSV
          </h3>

          {/* CSV Format Guide */}
          <div
            style={{
              background: 'rgba(59,130,246,0.08)',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-3)',
              marginBottom: 'var(--space-4)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <strong>📋 Expected CSV format:</strong>
            <br />
            <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)' }}>
              product_name, quantity, date, price (optional)
            </code>
            <br />
            Column names are auto-detected (name/item, qty/sold/units, date, price/cost).
          </div>

          {/* Drop Zone */}
          {!parsedSales.length && (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-8)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: dragOver ? 'rgba(var(--color-primary-rgb), 0.05)' : 'transparent',
                }}
              >
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileDrop} hidden />
                <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-2)' }}>📄</div>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                  Drag & drop your sales CSV here, or click to browse
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center', marginTop: 'var(--space-2)' }}>
                  <span className="badge badge-muted">.csv</span>
                  <span className="badge badge-muted">.xlsx</span>
                  <span className="badge badge-muted">.xls</span>
                </div>
              </div>

              {selectedFile && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--color-bg-sunken)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <span>📄</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{selectedFile.name}</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-primary" onClick={handleParseCSV} disabled={csvUploading}>
                    {csvUploading ? '⏳ Parsing...' : 'Parse & Preview →'}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Parsed Sales Preview */}
          {parsedSales.length > 0 && (
            <>
              <div style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                ✅ {parsedSales.length} sales entries parsed from <strong>{selectedFile?.name}</strong>. Review and confirm below:
              </div>

              <div style={{ maxHeight: 400, overflowY: 'auto', marginBottom: 'var(--space-4)' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>✓</th>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Date</th>
                      <th>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedSales.map((sale, idx) => (
                      <tr key={idx} style={{ opacity: sale.selected ? 1 : 0.4 }}>
                        <td>
                          <input
                            type="checkbox"
                            checked={sale.selected}
                            onChange={(e) => {
                              const updated = [...parsedSales];
                              updated[idx] = { ...updated[idx], selected: e.target.checked };
                              setParsedSales(updated);
                            }}
                          />
                        </td>
                        <td>
                          <input
                            style={{ ...inputStyle, width: '100%' }}
                            value={sale.product_name}
                            onChange={(e) => {
                              const updated = [...parsedSales];
                              updated[idx] = { ...updated[idx], product_name: e.target.value };
                              setParsedSales(updated);
                            }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            style={{ ...inputStyle, width: 80 }}
                            value={sale.quantity}
                            onChange={(e) => {
                              const updated = [...parsedSales];
                              updated[idx] = { ...updated[idx], quantity: Number(e.target.value) };
                              setParsedSales(updated);
                            }}
                          />
                        </td>
                        <td>
                          <input
                            type="date"
                            style={{ ...inputStyle, width: 140 }}
                            value={sale.date}
                            onChange={(e) => {
                              const updated = [...parsedSales];
                              updated[idx] = { ...updated[idx], date: e.target.value };
                              setParsedSales(updated);
                            }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            style={{ ...inputStyle, width: 80 }}
                            value={sale.price || ''}
                            placeholder="₹"
                            onChange={(e) => {
                              const updated = [...parsedSales];
                              updated[idx] = { ...updated[idx], price: e.target.value ? Number(e.target.value) : null };
                              setParsedSales(updated);
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <button
                  className="btn"
                  style={{ background: 'var(--color-bg-active)' }}
                  onClick={() => { setParsedSales([]); setSelectedFile(null); }}
                >
                  ← Back
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSubmitCSV}
                  disabled={submitting}
                >
                  {submitting
                    ? '⏳ Recording...'
                    : `💾 Record ${parsedSales.filter((s) => s.selected).length} Sale(s)`}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ────────── RECENT SALES HISTORY ────────── */}
      <div className="glass-card" style={{ marginTop: 'var(--space-5)' }}>
        <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 'var(--space-4)' }}>
          📊 Recent Sales
        </h3>

        {historyLoading ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Loading...</p>
        ) : salesHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>🧾</div>
            <p style={{ fontSize: 'var(--font-size-sm)' }}>No sales recorded yet. Start by entering today's sales above!</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Revenue</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {salesHistory.map((sale) => (
                <tr key={sale.id}>
                  <td style={{ fontWeight: 500 }}>{sale.product_name}</td>
                  <td>{sale.quantity}</td>
                  <td>{sale.revenue ? `₹${sale.revenue.toFixed(2)}` : '—'}</td>
                  <td>{new Date(sale.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Spinner animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
