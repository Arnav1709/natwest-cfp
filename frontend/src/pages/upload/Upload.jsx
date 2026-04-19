import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Upload as UploadIcon, FileSpreadsheet, Camera, PenLine, ChevronDown, Package, Clock, CheckCircle2, AlertTriangle, Plus, Save, X, Loader2, ArrowRight, History, Info } from 'lucide-react';
import { uploadApi, inventoryApi } from '../../services/api';
import { useApi } from '../../hooks/useApi';
import GlowCard from '../../components/GlowCard';
import ShimmerButton from '../../components/ShimmerButton';

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
      const result = await inventoryApi.list({ per_page: 1000 });
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
          expiry_date: item.expiry_date || '',
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

        // Default to today's date if no date column was found in the CSV
        const todayISO = new Date().toISOString().split('T')[0];

        const verifyData = result.products.map((item, idx) => ({
          id: idx + 1,
          name: item.name || '',
          date: item.date || todayISO,
          quantity: item.quantity || 0,
          price: item.price || 0,
          category: item.category || 'Other',
          expiry_date: item.expiry_date || '',
          confidence: item.confidence || 1.0,
        }));

        // Determine import source from detected columns:
        // - If CSV has a date column → it's sales data → 'csv' handler (match existing products)
        // - Otherwise → inventory data → 'image' handler (creates/updates products + batches)
        const cols = result.columns_detected || [];
        const hasSalesDate = cols.includes('date');
        const importSource = hasSalesDate ? 'csv' : 'image';

        navigate('/upload/verify', {
          state: {
            data: verifyData,
            source: importSource,
            overallConfidence: 1.0,
            fileName: selectedFile.name,
            columnsDetected: cols,
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
    if (stock === 0) return { label: 'Out of Stock', color: '#EF4444' };
    if (stock <= reorderPt) return { label: 'Low Stock', color: '#F59E0B' };
    return { label: 'Healthy', color: '#10B981' };
  };

  // Upload method cards config
  const methods = [
    {
      id: 'csv', icon: FileSpreadsheet, color: '#3B82F6',
      title: t('upload.csv_title'), desc: t('upload.csv_desc'),
      badges: ['.csv', '.xlsx', '.xls'],
      onClick: () => fileRef.current?.click(),
    },
    {
      id: 'image', icon: Camera, color: '#8B5CF6',
      title: t('upload.image_title'), desc: t('upload.image_desc'),
      badges: ['AI OCR'],
      onClick: () => imageRef.current?.click(),
    },
    {
      id: 'manual', icon: PenLine, color: '#10B981',
      title: t('upload.manual_title'), desc: t('upload.manual_desc'),
      badges: [],
      onClick: () => { setActiveMethod('manual'); navigate('/upload/verify', { state: { data: [], source: 'manual' } }); },
    },
  ];

  const tabs = [
    { key: 'import', label: 'Import New Data', icon: UploadIcon },
    { key: 'update', label: 'Update Inventory', icon: Package },
  ];

  return (
    <div className="max-w-[960px] mx-auto space-y-6 animate-fade-in-up">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="h-1 w-6 rounded-full bg-teal-500"></div>
          <span className="text-xs font-bold tracking-wider text-teal-400 uppercase">Data Management</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">{t('upload.title')}</h1>
        <p className="text-slate-400 mt-1">{t('upload.subtitle')}</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 p-1 rounded-xl bg-slate-900/70 border border-slate-800 w-max">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            id={`tab-${tab.key}`}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === tab.key
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 shadow-md shadow-teal-500/10'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ==== TAB 1: IMPORT ==== */}
      {activeTab === 'import' && (
        <>
          {/* Error banner */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3 text-red-400">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Hidden file inputs — must be outside the card loop */}
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileDrop} hidden />
          <input ref={imageRef} type="file" accept="image/*" onChange={handleImageSelect} hidden />

          {/* Upload Methods */}
          <div className="grid sm:grid-cols-3 gap-4">
            {methods.map((m) => {
              const isActive = activeMethod === m.id;
              return (
                <GlowCard
                  key={m.id}
                  className={`p-6 text-center cursor-pointer transition-all duration-300 group ${isActive ? 'ring-2 ring-teal-500/40' : ''} ${dragOver && m.id === 'csv' ? 'ring-2 ring-blue-500/40' : ''}`}
                  onClick={m.onClick}
                  id={`upload-${m.id}`}
                  glowColor={isActive ? m.color : undefined}
                  style={{ pointerEvents: uploading ? 'none' : 'auto', opacity: uploading ? 0.5 : 1 }}
                  onDragOver={m.id === 'csv' ? (e) => { e.preventDefault(); setDragOver(true); } : undefined}
                  onDragLeave={m.id === 'csv' ? () => setDragOver(false) : undefined}
                  onDrop={m.id === 'csv' ? handleFileDrop : undefined}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 border transition-all group-hover:scale-110"
                    style={{ backgroundColor: `${m.color}15`, borderColor: `${m.color}30` }}
                  >
                    <m.icon className="w-7 h-7" style={{ color: m.color }} />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1.5">{m.title}</h3>
                  <p className="text-xs text-slate-400 mb-3 leading-relaxed">{m.desc}</p>
                  <div className="flex gap-1.5 justify-center flex-wrap">
                    {m.badges.map((b) => (
                      <span key={b} className="px-2 py-0.5 rounded-md text-[10px] font-bold border" style={{ backgroundColor: `${m.color}10`, borderColor: `${m.color}25`, color: m.color }}>
                        {b}
                      </span>
                    ))}
                  </div>
                </GlowCard>
              );
            })}
          </div>

          {/* Selected File Info */}
          {selectedFile && (
            <GlowCard className="p-4 flex flex-wrap items-center justify-between gap-4" glowColor="#3B82F6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10 border border-blue-500/20">
                  {activeMethod === 'csv' ? <FileSpreadsheet className="w-5 h-5 text-blue-400" /> : <Camera className="w-5 h-5 text-violet-400" />}
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">{selectedFile.name}</div>
                  <div className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</div>
                </div>
              </div>

              {uploading ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-teal-400 animate-spin" />
                  <span className="text-sm font-medium text-teal-400">{uploadProgress || 'Processing...'}</span>
                </div>
              ) : (
                <ShimmerButton onClick={handleProceed} id="btn-proceed-upload">
                  <span className="flex items-center gap-2">Process & Verify <ArrowRight className="w-4 h-4" /></span>
                </ShimmerButton>
              )}
            </GlowCard>
          )}

          {/* CSV Column Format Guide */}
          <GlowCard className="p-4">
            <div
              className="flex justify-between items-center cursor-pointer"
              onClick={() => setShowColumnGuide(!showColumnGuide)}
            >
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400" />
                CSV / Excel Column Format Guide
              </h3>
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${showColumnGuide ? 'rotate-180' : ''}`} />
            </div>
            {showColumnGuide && (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-slate-500">
                  Your file should contain at least a <strong className="text-slate-300">product name</strong> column. The system auto-detects columns from these names:
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-700/50">
                      <tr>
                        <th className="px-4 py-2">Field</th>
                        <th className="px-4 py-2">Accepted Column Names</th>
                        <th className="px-4 py-2">Required</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {[
                        { field: 'Product Name', names: 'product_name, product, name, item_name, item, medicine, sku, description', required: true },
                        { field: 'Date', names: 'date, sale_date, transaction_date, sold_date, order_date', required: false },
                        { field: 'Quantity', names: 'quantity, qty, units, sold, units_sold, stock, current_stock', required: false },
                        { field: 'Price', names: 'price, unit_price, cost, unit_cost, rate, mrp, selling_price', required: false },
                        { field: 'Expiry Date', names: 'expiry_date, expiry, exp_date, expiration_date, best_before, valid_until', required: false },
                        { field: 'Category', names: 'category, type, product_type, product_category, group', required: false },
                      ].map((row) => (
                        <tr key={row.field}>
                          <td className="px-4 py-2 font-semibold text-white">{row.field}</td>
                          <td className="px-4 py-2 text-slate-400"><code className="text-xs text-slate-300">{row.names}</code></td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${row.required ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-700/50 border-slate-600 text-slate-400'}`}>
                              {row.required ? 'Required' : 'Optional'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <Info className="w-3 h-3" />
                  Column names are case-insensitive. If no name column is found, the first text column is used.
                </p>
              </div>
            )}
          </GlowCard>

          {/* Recent Uploads — from API */}
          <GlowCard className="overflow-hidden p-0">
            <div className="px-6 py-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-teal-400" />
                Recent Uploads
              </h3>
            </div>
            {loadingHistory ? (
              <div className="py-8 text-center text-slate-500 text-sm">Loading upload history...</div>
            ) : (!uploadHistoryData?.uploads || uploadHistoryData.uploads.length === 0) ? (
              <div className="py-12 text-center">
                <Package className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No uploads yet — start by importing your first file above</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-900/80 border-b border-slate-700/50 text-slate-300 uppercase tracking-wider text-xs font-semibold">
                    <tr>
                      <th className="px-6 py-3">File</th>
                      <th className="px-6 py-3">Type</th>
                      <th className="px-6 py-3">Records</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {uploadHistoryData.uploads.map((upload) => {
                      const typeColors = { csv: '#3B82F6', image: '#8B5CF6' };
                      const typeLabels = { csv: 'CSV', image: 'OCR' };
                      const statusColors = { verified: '#10B981', pending: '#F59E0B', failed: '#EF4444' };
                      const tc = typeColors[upload.upload_type] || '#6B7280';
                      const sc = statusColors[upload.status] || '#6B7280';
                      const dateStr = upload.created_at
                        ? new Date(upload.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—';
                      return (
                        <tr key={upload.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-6 py-3 font-medium text-slate-200">{upload.filename}</td>
                          <td className="px-6 py-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border" style={{ backgroundColor: `${tc}15`, borderColor: `${tc}30`, color: tc }}>
                              {typeLabels[upload.upload_type] || 'Manual'}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-slate-400 tabular-nums">{upload.records}</td>
                          <td className="px-6 py-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border capitalize" style={{ backgroundColor: `${sc}15`, borderColor: `${sc}30`, color: sc }}>
                              {upload.status}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-slate-500 text-xs">{dateStr}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </GlowCard>
        </>
      )}

      {/* ==== TAB 2: UPDATE CURRENT INVENTORY ==== */}
      {activeTab === 'update' && (
        <>
          {/* Success / Error banners */}
          {updateSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-3 text-emerald-400">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{updateSuccess}</p>
            </div>
          )}
          {updateError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3 text-red-400">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">{updateError}</p>
            </div>
          )}

          {/* Quick Stock Update Table */}
          <GlowCard className="overflow-hidden p-0">
            <div className="px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-teal-400" />
                  Quick Stock Update
                </h3>
                <p className="text-xs text-slate-500 mt-1">Edit stock quantities for existing products directly</p>
              </div>
              <ShimmerButton onClick={() => setShowAddForm(!showAddForm)} id="btn-add-new-product">
                <span className="flex items-center gap-2">
                  {showAddForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add New Product</>}
                </span>
              </ShimmerButton>
            </div>

            {loadingProducts ? (
              <div className="py-12 text-center">
                <Package className="w-10 h-10 text-teal-500/30 animate-pulse mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Loading products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="py-12 text-center">
                <Package className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No products found. Import data first or add a new product.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-900/80 border-b border-slate-700/50 text-slate-300 uppercase tracking-wider text-xs font-semibold">
                    <tr>
                      <th className="px-6 py-3">Product</th>
                      <th className="px-6 py-3">Category</th>
                      <th className="px-6 py-3">Current Stock</th>
                      <th className="px-6 py-3">New Stock</th>
                      <th className="px-6 py-3">Reorder Pt</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {products.map(p => {
                      const status = getStockStatus(p);
                      const hasEdit = stockEdits[p.id] !== undefined && parseInt(stockEdits[p.id], 10) !== p.current_stock;
                      const isSaving = savingIds.has(p.id);

                      return (
                        <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-6 py-3 font-semibold text-white">{p.name}</td>
                          <td className="px-6 py-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 capitalize">{p.category}</span>
                          </td>
                          <td className="px-6 py-3 text-slate-400 tabular-nums">{p.current_stock || 0}</td>
                          <td className="px-6 py-3">
                            <input
                              type="number"
                              min="0"
                              value={stockEdits[p.id] !== undefined ? stockEdits[p.id] : (p.current_stock || 0)}
                              onChange={(e) => handleStockChange(p.id, e.target.value)}
                              className={`w-20 px-2.5 py-1.5 rounded-lg text-sm font-medium text-white border focus:outline-none focus:ring-2 focus:ring-teal-500/30 transition-all tabular-nums ${hasEdit ? 'bg-teal-500/10 border-teal-500/40' : 'bg-slate-900 border-slate-700'}`}
                              id={`stock-input-${p.id}`}
                            />
                          </td>
                          <td className="px-6 py-3 text-slate-500 tabular-nums">{p.reorder_point || 0}</td>
                          <td className="px-6 py-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border" style={{ backgroundColor: `${status.color}15`, borderColor: `${status.color}30`, color: status.color }}>
                              {status.label}
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            <button
                              disabled={!hasEdit || isSaving}
                              onClick={() => handleSaveStock(p)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${hasEdit ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500/30' : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-default'}`}
                              id={`btn-save-${p.id}`}
                            >
                              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
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
          </GlowCard>

          {/* ── Add New Product Form ── */}
          {showAddForm && (
            <GlowCard className="p-6" glowColor="#10B981">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-5">
                <Plus className="w-5 h-5 text-emerald-400" />
                Add New Product
              </h3>
              <form onSubmit={handleAddProduct}>
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Product Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Product Name *</label>
                    <input
                      type="text" required value={newProduct.name}
                      onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. Paracetamol 500mg"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all text-sm"
                      id="input-product-name"
                    />
                  </div>

                  {[
                    { label: 'Category', type: 'select', key: 'category', options: ['Medicines', 'Supplies', 'Equipment', 'Supplements', 'Grocery', 'Other'] },
                    { label: 'Unit', type: 'select', key: 'unit', options: ['units', 'strips', 'bottles', 'packets', 'kg', 'liters'] },
                    { label: 'Initial Stock *', type: 'number', key: 'current_stock', min: 0, required: true },
                    { label: 'Unit Cost (₹)', type: 'number', key: 'unit_cost', min: 0, step: '0.01' },
                    { label: 'Reorder Point', type: 'number', key: 'reorder_point', min: 0 },
                    { label: 'Safety Stock', type: 'number', key: 'safety_stock', min: 0 },
                    { label: 'Supplier Name', type: 'text', key: 'supplier_name', placeholder: 'e.g. MedPlus Distributors' },
                    { label: 'Lead Time (days)', type: 'number', key: 'lead_time_days', min: 1 },
                    { label: 'Expiry Date', type: 'date', key: 'expiry_date' },
                    { label: 'Supplier Contact', type: 'text', key: 'supplier_contact', placeholder: '+91-XXXXXXXXXX' },
                  ].map((f) => (
                    <div key={f.key}>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{f.label}</label>
                      {f.type === 'select' ? (
                        <select
                          value={newProduct[f.key]}
                          onChange={e => setNewProduct(p => ({ ...p, [f.key]: e.target.value }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all text-sm"
                          id={`input-${f.key}`}
                        >
                          {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input
                          type={f.type}
                          min={f.min}
                          step={f.step}
                          required={f.required}
                          value={newProduct[f.key]}
                          onChange={e => {
                            const val = f.type === 'number' ? (f.step ? parseFloat(e.target.value) || 0 : parseInt(e.target.value, 10) || 0) : e.target.value;
                            setNewProduct(p => ({ ...p, [f.key]: val }));
                          }}
                          placeholder={f.placeholder}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all text-sm"
                          id={`input-${f.key}`}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Submit */}
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 transition-all"
                  >
                    Cancel
                  </button>
                  <ShimmerButton type="submit" disabled={addingProduct || !newProduct.name.trim()} id="btn-submit-product">
                    <span className="flex items-center gap-2">
                      {addingProduct ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</> : <><CheckCircle2 className="w-4 h-4" /> Add Product</>}
                    </span>
                  </ShimmerButton>
                </div>
              </form>
            </GlowCard>
          )}
        </>
      )}
    </div>
  );
}
