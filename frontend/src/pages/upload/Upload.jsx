import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { uploadApi, inventoryApi } from '../../services/api';
import { useApi } from '../../hooks/useApi';

export default function Upload() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const imageRef = useRef(null);

  // Tab state: 'import' or 'update'
  const [activeTab, setActiveTab] = useState('import');

  // Import tab state
  const [activeMethod, setActiveMethod] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState('');

  // Update tab state
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(null);
  const [updateError, setUpdateError] = useState(null);
  const [stockEdits, setStockEdits] = useState({}); // { productId: newStockValue }
  const [savingIds, setSavingIds] = useState(new Set());

  // Add new product state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '', category: 'Medicines', unit: 'units',
    current_stock: 0, reorder_point: 10, safety_stock: 5,
    unit_cost: 0, supplier_name: '', supplier_contact: '',
    lead_time_days: 3, expiry_date: '',
  });
  const [addingProduct, setAddingProduct] = useState(false);
  const [showColumnGuide, setShowColumnGuide] = useState(false);

  // Fetch real upload history from API
  const { data: uploadHistoryData, loading: loadingHistory } = useApi(
    () => uploadApi.history(10), [activeTab]
  );

  // Fetch products when switching to update tab
  useEffect(() => {
    if (activeTab === 'update') {
      fetchProducts();
    }
  }, [activeTab]);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    setUpdateError(null);
    try {
      const result = await inventoryApi.list();
      const list = Array.isArray(result) ? result : (result?.products || []);
      setProducts(list);
    } catch (err) {
      setUpdateError(err.message || 'Failed to load products');
    } finally {
      setLoadingProducts(false);
    }
  };

  // ── Import handlers (existing) ──

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    setError(null);
    const file = e.dataTransfer?.files[0] || e.target?.files[0];
    if (file) {
      setSelectedFile(file);
      setActiveMethod('csv');
    }
  };

  const handleImageSelect = (e) => {
    setError(null);
    const file = e.target?.files[0];
    if (file) {
      setSelectedFile(file);
      setActiveMethod('image');
    }
  };

  const handleProceed = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      if (activeMethod === 'image') {
        setUploadProgress('Uploading image to AI OCR engine...');
        const result = await uploadApi.image(selectedFile);

        if (!result.extracted_data || result.extracted_data.length === 0) {
          setError('OCR could not extract any data from this image. Please try a clearer photo or use CSV upload instead.');
          setUploading(false);
          return;
        }

        const verifyData = result.extracted_data.map((item, idx) => ({
          id: idx + 1,
          name: item.name || '',
          date: item.date || '',
          quantity: item.quantity || 0,
          price: item.price || 0,
          category: item.category || 'Other',
          confidence: item.confidence || 0.5,
        }));

        navigate('/upload/verify', {
          state: {
            data: verifyData,
            source: 'image',
            overallConfidence: result.overall_confidence,
            fileName: selectedFile.name,
          },
        });

      } else if (activeMethod === 'csv') {
        setUploadProgress('Parsing spreadsheet...');
        const result = await uploadApi.csv(selectedFile);

        if (!result.products || result.products.length === 0) {
          setError('No valid data rows found in the file.');
          setUploading(false);
          return;
        }

        const verifyData = result.products.map((item, idx) => ({
          id: idx + 1,
          name: item.name || '',
          date: item.date || '',
          quantity: item.quantity || 0,
          price: item.price || 0,
          category: item.category || 'Other',
          expiry_date: item.expiry_date || '',
          confidence: item.confidence || 1.0,
        }));

        navigate('/upload/verify', {
          state: {
            data: verifyData,
            source: 'csv',
            overallConfidence: 1.0,
            fileName: selectedFile.name,
            columnsDetected: result.columns_detected,
          },
        });
      }

    } catch (err) {
      console.error('Upload failed:', err);
      setError(err.message || 'Upload failed. Please check your connection and try again.');
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  // ── Update handlers ──

  const handleStockChange = (productId, newValue) => {
    setStockEdits(prev => ({ ...prev, [productId]: newValue }));
  };

  const handleSaveStock = async (product) => {
    const newStock = stockEdits[product.id];
    if (newStock === undefined || newStock === product.current_stock) return;

    setSavingIds(prev => new Set(prev).add(product.id));
    setUpdateSuccess(null);
    setUpdateError(null);

    try {
      await inventoryApi.update(product.id, { current_stock: parseInt(newStock, 10) });
      setProducts(prev => prev.map(p =>
        p.id === product.id ? { ...p, current_stock: parseInt(newStock, 10) } : p
      ));
      setStockEdits(prev => { const n = { ...prev }; delete n[product.id]; return n; });
      setUpdateSuccess(`${product.name} updated to ${newStock} units`);
      setTimeout(() => setUpdateSuccess(null), 3000);
    } catch (err) {
      setUpdateError(`Failed to update ${product.name}: ${err.message}`);
    } finally {
      setSavingIds(prev => { const n = new Set(prev); n.delete(product.id); return n; });
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.name.trim()) return;

    setAddingProduct(true);
    setUpdateError(null);

    try {
      const result = await inventoryApi.create(newProduct);
      setProducts(prev => [...prev, result]);
      setNewProduct({
        name: '', category: 'Medicines', unit: 'units',
        current_stock: 0, reorder_point: 10, safety_stock: 5,
        unit_cost: 0, supplier_name: '', supplier_contact: '',
        lead_time_days: 3, expiry_date: '',
      });
      setShowAddForm(false);
      setUpdateSuccess(`${result.name || newProduct.name} added successfully!`);
      setTimeout(() => setUpdateSuccess(null), 3000);
    } catch (err) {
      setUpdateError(`Failed to add product: ${err.message}`);
    } finally {
      setAddingProduct(false);
    }
  };

  // ── Status helpers ──
  const getStockStatus = (product) => {
    const stock = product.current_stock || 0;
    const reorderPt = product.reorder_point || 0;
    if (stock === 0) return { label: 'Out of Stock', cls: 'badge-danger' };
    if (stock <= reorderPt) return { label: 'Low Stock', cls: 'badge-warning' };
    return { label: 'Healthy', cls: 'badge-success' };
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h1 className="section-title">{t('upload.title')}</h1>
        <p className="section-subtitle">{t('upload.subtitle')}</p>
      </div>

      {/* ── Tab Switcher ── */}
      <div style={{
        display: 'flex', gap: 'var(--space-2)',
        marginBottom: 'var(--space-5)',
        borderBottom: '1px solid var(--color-border)',
        paddingBottom: 'var(--space-1)',
      }}>
        <button
          className={`btn ${activeTab === 'import' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('import')}
          style={{ borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', fontWeight: 600 }}
          id="tab-import"
        >
          📥 Import New Data
        </button>
        <button
          className={`btn ${activeTab === 'update' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('update')}
          style={{ borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', fontWeight: 600 }}
          id="tab-update"
        >
          ✏️ Update Current Inventory
        </button>
      </div>

      {/* ==== TAB 1: IMPORT ==== */}
      {activeTab === 'import' && (
        <>
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

          <div className="grid-3" style={{ marginBottom: 'var(--space-6)' }}>
            {/* CSV Upload */}
            <div
              className={`upload-card ${activeMethod === 'csv' ? 'active' : ''} ${dragOver ? 'active' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileRef.current?.click()}
              id="upload-csv"
              style={{ pointerEvents: uploading ? 'none' : 'auto', opacity: uploading ? 0.6 : 1 }}
            >
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileDrop} hidden />
              <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>📄</div>
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 'var(--space-2)' }}>
                {t('upload.csv_title')}
              </h3>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
                {t('upload.csv_desc')}
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center', flexWrap: 'wrap' }}>
                <span className="badge badge-muted">.csv</span>
                <span className="badge badge-muted">.xlsx</span>
                <span className="badge badge-muted">.xls</span>
              </div>
            </div>

            {/* Image OCR */}
            <div
              className={`upload-card ${activeMethod === 'image' ? 'active' : ''}`}
              onClick={() => imageRef.current?.click()}
              id="upload-image"
              style={{ pointerEvents: uploading ? 'none' : 'auto', opacity: uploading ? 0.6 : 1 }}
            >
              <input ref={imageRef} type="file" accept="image/*" onChange={handleImageSelect} hidden />
              <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>📷</div>
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 'var(--space-2)' }}>
                {t('upload.image_title')}
              </h3>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
                {t('upload.image_desc')}
              </p>
              <span className="badge badge-primary">🤖 AI OCR</span>
            </div>

            {/* Manual Entry */}
            <div
              className={`upload-card ${activeMethod === 'manual' ? 'active' : ''}`}
              onClick={() => { setActiveMethod('manual'); navigate('/upload/verify', { state: { data: [], source: 'manual' } }); }}
              id="upload-manual"
              style={{ pointerEvents: uploading ? 'none' : 'auto', opacity: uploading ? 0.6 : 1 }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>✏️</div>
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 'var(--space-2)' }}>
                {t('upload.manual_title')}
              </h3>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                {t('upload.manual_desc')}
              </p>
            </div>
          </div>

          {/* Selected File Info */}
          {selectedFile && (
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <span style={{ fontSize: '1.5rem' }}>{activeMethod === 'csv' ? '📄' : '📷'}</span>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{selectedFile.name}</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              </div>

              {uploading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div className="spinner" style={{ width: 20, height: 20, border: '3px solid var(--color-bg-active)', borderTop: '3px solid var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-primary)', fontWeight: 500 }}>
                    {uploadProgress || 'Processing...'}
                  </span>
                </div>
              ) : (
                <button className="btn btn-primary" onClick={handleProceed} id="btn-proceed-upload">
                  Process & Verify →
                </button>
              )}
            </div>
          )}

          {/* CSV Column Format Guide */}
          <div className="glass-card" style={{ marginBottom: 'var(--space-4)' }}>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setShowColumnGuide(!showColumnGuide)}
            >
              <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                📋 CSV / Excel Column Format Guide
              </h3>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', transition: 'transform 0.2s', transform: showColumnGuide ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
            </div>
            {showColumnGuide && (
              <div style={{ marginTop: 'var(--space-3)' }}>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
                  Your file should contain at least a <strong>product name</strong> column. The system auto-detects columns from these names:
                </p>
                <table className="data-table" style={{ fontSize: 'var(--font-size-xs)' }}>
                  <thead>
                    <tr>
                      <th>Field</th>
                      <th>Accepted Column Names</th>
                      <th>Required</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Product Name</td>
                      <td><code>product_name</code>, <code>product</code>, <code>name</code>, <code>item_name</code>, <code>item</code>, <code>medicine</code>, <code>sku</code>, <code>description</code></td>
                      <td><span className="badge badge-success">Required</span></td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Date</td>
                      <td><code>date</code>, <code>sale_date</code>, <code>transaction_date</code>, <code>sold_date</code>, <code>order_date</code></td>
                      <td><span className="badge badge-muted">Optional</span></td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Quantity</td>
                      <td><code>quantity</code>, <code>qty</code>, <code>units</code>, <code>sold</code>, <code>units_sold</code>, <code>stock</code>, <code>current_stock</code></td>
                      <td><span className="badge badge-muted">Optional</span></td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Price</td>
                      <td><code>price</code>, <code>unit_price</code>, <code>cost</code>, <code>unit_cost</code>, <code>rate</code>, <code>mrp</code>, <code>selling_price</code></td>
                      <td><span className="badge badge-muted">Optional</span></td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Expiry Date</td>
                      <td><code>expiry_date</code>, <code>expiry</code>, <code>exp_date</code>, <code>expiration_date</code>, <code>best_before</code>, <code>valid_until</code></td>
                      <td><span className="badge badge-muted">Optional</span></td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Category</td>
                      <td><code>category</code>, <code>type</code>, <code>product_type</code>, <code>product_category</code>, <code>group</code></td>
                      <td><span className="badge badge-muted">Optional</span></td>
                    </tr>
                  </tbody>
                </table>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
                  💡 Column names are case-insensitive. If no name column is found, the first text column is used.
                </p>
              </div>
            )}
          </div>

          {/* Recent Uploads — from API */}
          <div className="glass-card">
            <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 'var(--space-4)' }}>
              Recent Uploads
            </h3>
            {loadingHistory ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                Loading upload history...
              </div>
            ) : (!uploadHistoryData?.uploads || uploadHistoryData.uploads.length === 0) ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>📭</div>
                <p style={{ fontSize: 'var(--font-size-sm)' }}>No uploads yet — start by importing your first file above</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Type</th>
                    <th>Records</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadHistoryData.uploads.map((upload) => {
                    const typeBadge = upload.upload_type === 'csv' ? 'badge-info' :
                                     upload.upload_type === 'image' ? 'badge-primary' : 'badge-muted';
                    const typeLabel = upload.upload_type === 'csv' ? 'CSV' :
                                     upload.upload_type === 'image' ? 'OCR' : 'Manual';
                    const statusBadge = upload.status === 'verified' ? 'badge-success' :
                                       upload.status === 'pending' ? 'badge-warning' : 'badge-danger';
                    const dateStr = upload.created_at
                      ? new Date(upload.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—';
                    return (
                      <tr key={upload.id}>
                        <td style={{ fontWeight: 500 }}>{upload.filename}</td>
                        <td><span className={`badge ${typeBadge}`}>{typeLabel}</span></td>
                        <td>{upload.records}</td>
                        <td><span className={`badge ${statusBadge}`}>{upload.status.charAt(0).toUpperCase() + upload.status.slice(1)}</span></td>
                        <td>{dateStr}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ==== TAB 2: UPDATE CURRENT INVENTORY ==== */}
      {activeTab === 'update' && (
        <>
          {/* Success / Error banners */}
          {updateSuccess && (
            <div style={{
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 'var(--radius-lg)', padding: 'var(--space-3) var(--space-4)',
              marginBottom: 'var(--space-4)', color: '#10B981', fontSize: 'var(--font-size-sm)',
            }}>
              ✅ {updateSuccess}
            </div>
          )}
          {updateError && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 'var(--radius-lg)', padding: 'var(--space-3) var(--space-4)',
              marginBottom: 'var(--space-4)', color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)',
            }}>
              ⚠️ {updateError}
            </div>
          )}

          {/* Quick Stock Update Table */}
          <div className="glass-card" style={{ marginBottom: 'var(--space-5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
              <div>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  📦 Quick Stock Update
                </h3>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
                  Edit stock quantities for existing products directly
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => setShowAddForm(!showAddForm)}
                id="btn-add-new-product"
              >
                {showAddForm ? '✕ Cancel' : '+ Add New Product'}
              </button>
            </div>

            {loadingProducts ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)', animation: 'pulse 1.5s ease-in-out infinite' }}>📦</div>
                <p>Loading products...</p>
              </div>
            ) : products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>📭</div>
                <p>No products found. Import data first or add a new product below.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Current Stock</th>
                      <th>New Stock</th>
                      <th>Reorder Point</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => {
                      const status = getStockStatus(p);
                      const hasEdit = stockEdits[p.id] !== undefined && parseInt(stockEdits[p.id], 10) !== p.current_stock;
                      const isSaving = savingIds.has(p.id);

                      return (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 500 }}>{p.name}</td>
                          <td><span className="badge badge-muted">{p.category}</span></td>
                          <td>{p.current_stock || 0}</td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              value={stockEdits[p.id] !== undefined ? stockEdits[p.id] : (p.current_stock || 0)}
                              onChange={(e) => handleStockChange(p.id, e.target.value)}
                              style={{
                                width: '80px', padding: '6px 10px',
                                background: hasEdit ? 'rgba(16,185,129,0.1)' : 'var(--color-bg-elevated)',
                                border: hasEdit ? '1px solid rgba(16,185,129,0.5)' : '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--color-text-primary)',
                                fontSize: 'var(--font-size-sm)',
                              }}
                              id={`stock-input-${p.id}`}
                            />
                          </td>
                          <td>{p.reorder_point || 0}</td>
                          <td><span className={`badge ${status.cls}`}>{status.label}</span></td>
                          <td>
                            <button
                              className="btn btn-sm"
                              disabled={!hasEdit || isSaving}
                              onClick={() => handleSaveStock(p)}
                              style={{
                                padding: '4px 12px', fontSize: 'var(--font-size-xs)',
                                background: hasEdit ? 'var(--color-primary)' : 'var(--color-bg-active)',
                                color: hasEdit ? '#fff' : 'var(--color-text-muted)',
                                border: 'none', borderRadius: 'var(--radius-md)',
                                cursor: hasEdit ? 'pointer' : 'default',
                                opacity: isSaving ? 0.6 : 1,
                              }}
                              id={`btn-save-${p.id}`}
                            >
                              {isSaving ? '...' : 'Save'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Add New Product Form ── */}
          {showAddForm && (
            <div className="glass-card" style={{ marginBottom: 'var(--space-5)' }}>
              <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 'var(--space-4)' }}>
                ➕ Add New Product
              </h3>
              <form onSubmit={handleAddProduct}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  {/* Product Name */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Product Name *</label>
                    <input
                      type="text" required value={newProduct.name}
                      onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. Paracetamol 500mg"
                      style={inputStyle} id="input-product-name"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label style={labelStyle}>Category</label>
                    <select
                      value={newProduct.category}
                      onChange={e => setNewProduct(p => ({ ...p, category: e.target.value }))}
                      style={inputStyle} id="input-category"
                    >
                      <option value="Medicines">Medicines</option>
                      <option value="Supplies">Medical Supplies</option>
                      <option value="Equipment">Equipment</option>
                      <option value="Supplements">Supplements</option>
                      <option value="Grocery">Grocery</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Unit */}
                  <div>
                    <label style={labelStyle}>Unit</label>
                    <select
                      value={newProduct.unit}
                      onChange={e => setNewProduct(p => ({ ...p, unit: e.target.value }))}
                      style={inputStyle} id="input-unit"
                    >
                      <option value="units">Units</option>
                      <option value="strips">Strips</option>
                      <option value="bottles">Bottles</option>
                      <option value="packets">Packets</option>
                      <option value="kg">Kilograms</option>
                      <option value="liters">Liters</option>
                    </select>
                  </div>

                  {/* Current Stock */}
                  <div>
                    <label style={labelStyle}>Initial Stock *</label>
                    <input
                      type="number" min="0" required value={newProduct.current_stock}
                      onChange={e => setNewProduct(p => ({ ...p, current_stock: parseInt(e.target.value, 10) || 0 }))}
                      style={inputStyle} id="input-stock"
                    />
                  </div>

                  {/* Unit Cost */}
                  <div>
                    <label style={labelStyle}>Unit Cost (₹)</label>
                    <input
                      type="number" min="0" step="0.01" value={newProduct.unit_cost}
                      onChange={e => setNewProduct(p => ({ ...p, unit_cost: parseFloat(e.target.value) || 0 }))}
                      style={inputStyle} id="input-cost"
                    />
                  </div>

                  {/* Reorder Point */}
                  <div>
                    <label style={labelStyle}>Reorder Point</label>
                    <input
                      type="number" min="0" value={newProduct.reorder_point}
                      onChange={e => setNewProduct(p => ({ ...p, reorder_point: parseInt(e.target.value, 10) || 0 }))}
                      style={inputStyle} id="input-reorder-point"
                    />
                  </div>

                  {/* Safety Stock */}
                  <div>
                    <label style={labelStyle}>Safety Stock</label>
                    <input
                      type="number" min="0" value={newProduct.safety_stock}
                      onChange={e => setNewProduct(p => ({ ...p, safety_stock: parseInt(e.target.value, 10) || 0 }))}
                      style={inputStyle} id="input-safety-stock"
                    />
                  </div>

                  {/* Supplier Name */}
                  <div>
                    <label style={labelStyle}>Supplier Name</label>
                    <input
                      type="text" value={newProduct.supplier_name}
                      onChange={e => setNewProduct(p => ({ ...p, supplier_name: e.target.value }))}
                      placeholder="e.g. MedPlus Distributors"
                      style={inputStyle} id="input-supplier"
                    />
                  </div>

                  {/* Lead Time */}
                  <div>
                    <label style={labelStyle}>Lead Time (days)</label>
                    <input
                      type="number" min="1" value={newProduct.lead_time_days}
                      onChange={e => setNewProduct(p => ({ ...p, lead_time_days: parseInt(e.target.value, 10) || 1 }))}
                      style={inputStyle} id="input-lead-time"
                    />
                  </div>

                  {/* Expiry Date */}
                  <div>
                    <label style={labelStyle}>Expiry Date</label>
                    <input
                      type="date" value={newProduct.expiry_date}
                      onChange={e => setNewProduct(p => ({ ...p, expiry_date: e.target.value }))}
                      style={inputStyle} id="input-expiry"
                    />
                  </div>

                  {/* Supplier Contact */}
                  <div>
                    <label style={labelStyle}>Supplier Contact</label>
                    <input
                      type="text" value={newProduct.supplier_contact}
                      onChange={e => setNewProduct(p => ({ ...p, supplier_contact: e.target.value }))}
                      placeholder="+91-XXXXXXXXXX"
                      style={inputStyle} id="input-supplier-contact"
                    />
                  </div>
                </div>

                {/* Submit */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowAddForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={addingProduct || !newProduct.name.trim()} id="btn-submit-product">
                    {addingProduct ? 'Adding...' : '✓ Add Product'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}

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

// Shared inline styles for the form
const labelStyle = {
  display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 600,
  color: 'var(--color-text-secondary)', marginBottom: '4px',
  textTransform: 'uppercase', letterSpacing: '0.04em',
};

const inputStyle = {
  width: '100%', padding: '8px 12px',
  background: 'var(--color-bg-elevated)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--color-text-primary)',
  fontSize: 'var(--font-size-sm)',
};
