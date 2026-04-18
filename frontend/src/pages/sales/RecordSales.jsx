import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PenLine, Camera, FileSpreadsheet, Plus, Trash2, Loader2, CheckCircle2, AlertTriangle, XCircle, ArrowLeft, ShieldCheck, Receipt, History, ArrowRight, X } from 'lucide-react';
import { salesApi, inventoryApi } from '../../services/api';
import GlowCard from '../../components/GlowCard';
import ShimmerButton from '../../components/ShimmerButton';

export default function RecordSales() {
  const { t } = useTranslation();
  const fileRef = useRef(null);
  const imageRef = useRef(null);

  // Tab state: 'manual', 'csv', or 'image'
  const [activeTab, setActiveTab] = useState('manual');

  // CSV upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsedSales, setParsedSales] = useState([]);
  const [csvUploading, setCsvUploading] = useState(false);

  // Image upload state
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState('');
  const [ocrSales, setOcrSales] = useState([]);

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

  // ─── Image OCR Handlers ────────────────────────────────────────
  const handleImageSelect = (e) => {
    setError(null);
    const file = e.target?.files[0];
    if (file) {
      setSelectedImage(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      setOcrSales([]);
    }
  };

  const handleImageDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    setError(null);
    const file = e.dataTransfer?.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      setOcrSales([]);
    }
  };

  const handleProcessImage = async () => {
    if (!selectedImage) return;
    setOcrProcessing(true);
    setOcrProgress('Sending image to AI OCR engine...');
    setError(null);

    try {
      const result = await salesApi.uploadImage(selectedImage);

      if (!result.extracted_data || result.extracted_data.length === 0) {
        setError('AI could not extract any sales data from this image. Try a clearer photo.');
        setOcrProcessing(false);
        setOcrProgress('');
        return;
      }

      setOcrProgress('Extraction complete! Review the data below.');

      // Map OCR results to sales entries
      const salesEntries = result.extracted_data.map((item, idx) => ({
        id: idx,
        selected: true,
        product_name: item.name || '',
        quantity: item.quantity || 0,
        date: item.date || new Date().toISOString().split('T')[0],
        price: item.price || 0,
        category: item.category || 'Other',
        confidence: item.confidence || 0.5,
      }));

      setOcrSales(salesEntries);
    } catch (err) {
      setError(err.message || 'Image processing failed');
    } finally {
      setOcrProcessing(false);
    }
  };

  const handleSubmitOCR = async () => {
    const selectedSales = ocrSales
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
      setOcrSales([]);
      setSelectedImage(null);
      setImagePreviewUrl(null);
      setOcrProgress('');
      // Refresh history
      const hist = await salesApi.history({ per_page: 10 });
      setSalesHistory(hist.sales || []);
    } catch (err) {
      setError(err.message || 'Failed to record sales');
    } finally {
      setSubmitting(false);
    }
  };

  const updateOcrEntry = (idx, field, value) => {
    const updated = [...ocrSales];
    updated[idx] = { ...updated[idx], [field]: value };
    setOcrSales(updated);
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

    // Client-side stock validation warning
    const stockWarnings = [];
    for (const entry of validEntries) {
      const product = products.find(p => p.name === entry.product_name);
      if (product && entry.quantity > (product.current_stock || 0)) {
        stockWarnings.push(
          `${entry.product_name}: trying to sell ${entry.quantity} but only ${product.current_stock || 0} in stock`
        );
      }
    }
    if (stockWarnings.length > 0) {
      setError(`Insufficient stock — ${stockWarnings.join('; ')}`);
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
      // Refresh products (stock changed) and history
      try {
        const inv = await inventoryApi.list({ per_page: 100 });
        setProducts(inv.products || []);
      } catch (_) {}
      const hist = await salesApi.history({ per_page: 10 });
      setSalesHistory(hist.sales || []);
    } catch (err) {
      setError(err.message || 'Failed to record sales');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Helpers ───────────────────────────────────────────────────
  const getConfidenceColor = (conf) => {
    if (conf >= 0.9) return '#10B981';
    if (conf >= 0.75) return '#F59E0B';
    return '#EF4444';
  };

  const inputCls = "w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all text-sm";

  const tabs = [
    { key: 'manual', label: 'Manual Entry', icon: PenLine },
    { key: 'image', label: 'Upload Image', icon: Camera },
    { key: 'csv', label: 'Upload CSV', icon: FileSpreadsheet },
  ];

  return (
    <div className="max-w-[1000px] mx-auto space-y-6 animate-fade-in-up">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="h-1 w-6 rounded-full bg-teal-500"></div>
          <span className="text-xs font-bold tracking-wider text-teal-400 uppercase">Sales Recording</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <Receipt className="w-8 h-8 text-teal-400" />
          Record Daily Sales
        </h1>
        <p className="text-slate-400 mt-1">Record today's sales to auto-deduct from inventory. Upload a photo, CSV, or enter manually.</p>
      </div>

      {/* Success Result Banner */}
      {result && (
        <GlowCard
          className="p-5"
          glowColor={result.failed > 0 && result.successful === 0 ? '#EF4444' : result.failed > 0 ? '#F59E0B' : '#10B981'}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {result.failed > 0 && result.successful === 0 ? (
                <XCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
              ) : result.failed > 0 ? (
                <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-bold text-white mb-1">
                  {result.failed > 0 && result.successful === 0
                    ? 'Sales Recording Failed'
                    : result.failed > 0
                      ? 'Sales Partially Recorded'
                      : 'Sales Recorded Successfully!'}
                </div>
                <p className="text-sm text-slate-300">
                  {result.successful} of {result.total_processed} sales processed.
                  {result.failed > 0 && <span className="text-red-400 ml-2">{result.failed} failed.</span>}
                  {result.alerts_generated > 0 && <span className="text-amber-400 ml-2">{result.alerts_generated} stock alert(s) triggered!</span>}
                </p>
                {/* Individual results */}
                <div className="mt-3 space-y-1">
                  {result.results?.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {r.status === 'success' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-red-400" />
                      )}
                      <span className="font-medium text-slate-200">{r.product_name}</span>
                      {r.status === 'success' && (
                        <>
                          <span className="text-slate-400">— sold {r.quantity}</span>
                          {r.new_stock !== null && r.new_stock !== undefined && (
                            <span className="text-slate-500">(remaining: {r.new_stock})</span>
                          )}
                        </>
                      )}
                      {r.status === 'insufficient_stock' && (
                        <span className="text-red-400">— {r.warning || `Cannot sell ${r.quantity} (only ${r.new_stock} available)`}</span>
                      )}
                      {r.status === 'product_not_found' && (
                        <span className="text-red-400">— Product not found in inventory</span>
                      )}
                      {r.alert && (
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${r.alert === 'stockout' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
                          {r.alert === 'stockout' ? 'OUT OF STOCK' : 'LOW STOCK'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => setResult(null)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700/50 transition-all shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        </GlowCard>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3 text-red-400">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex gap-1 p-1 rounded-xl bg-slate-900/70 border border-slate-800 w-max">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            id={`tab-${tab.key}-sales`}
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

      {/* ────────── MANUAL ENTRY TAB ────────── */}
      {activeTab === 'manual' && (
        <GlowCard className="p-6">
          <h3 className="text-base font-bold text-white mb-5 flex items-center gap-2">
            <PenLine className="w-5 h-5 text-teal-400" />
            Enter Sales for Today
          </h3>

          <div className="space-y-3">
            {manualEntries.map((entry, idx) => {
              const matchedProduct = products.find(pr => pr.name === entry.product_name);
              const isOverStock = matchedProduct && Number(entry.quantity) > (matchedProduct.current_stock || 0);

              return (
                <div key={idx} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 items-end">
                  {/* Product Select/Input */}
                  <div>
                    {idx === 0 && <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Product Name *</label>}
                    {products.length > 0 ? (
                      <select
                        className={inputCls}
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
                        className={inputCls}
                        placeholder="Product name"
                        value={entry.product_name}
                        onChange={(e) => updateManualEntry(idx, 'product_name', e.target.value)}
                      />
                    )}
                  </div>

                  {/* Quantity */}
                  <div>
                    {idx === 0 && <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Qty Sold *</label>}
                    <input
                      type="number"
                      min="1"
                      className={`${inputCls} ${isOverStock ? '!border-red-500 !ring-red-500/30 ring-1' : ''}`}
                      placeholder="Qty"
                      value={entry.quantity}
                      onChange={(e) => updateManualEntry(idx, 'quantity', e.target.value)}
                    />
                    {isOverStock && (
                      <span className="text-[10px] text-red-400 font-medium mt-0.5 block">Only {matchedProduct.current_stock || 0} in stock</span>
                    )}
                  </div>

                  {/* Date */}
                  <div>
                    {idx === 0 && <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Date</label>}
                    <input
                      type="date"
                      className={inputCls}
                      value={entry.date}
                      onChange={(e) => updateManualEntry(idx, 'date', e.target.value)}
                    />
                  </div>

                  {/* Price */}
                  <div>
                    {idx === 0 && <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Price (opt)</label>}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={inputCls}
                      placeholder="₹"
                      value={entry.price}
                      onChange={(e) => updateManualEntry(idx, 'price', e.target.value)}
                    />
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeManualRow(idx)}
                    className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Remove row"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 mt-5 pt-4 border-t border-slate-800">
            <button
              onClick={addManualRow}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-teal-300 bg-slate-900/50 hover:bg-teal-500/10 border border-slate-700/50 hover:border-teal-500/30 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Row
            </button>
            <ShimmerButton onClick={handleSubmitManual} disabled={submitting}>
              <span className="flex items-center gap-2">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Recording...</> : <><CheckCircle2 className="w-4 h-4" /> Record {manualEntries.filter((e) => e.product_name && e.quantity).length} Sale(s)</>}
              </span>
            </ShimmerButton>
          </div>
        </GlowCard>
      )}

      {/* ────────── IMAGE OCR TAB ────────── */}
      {activeTab === 'image' && (
        <GlowCard className="p-6" glowColor="#8B5CF6">
          <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
            <Camera className="w-5 h-5 text-violet-400" />
            Upload Sales Ledger / Receipt Image
          </h3>
          <p className="text-xs text-slate-500 mb-5">Take a photo of your handwritten sales register, receipt, or bill. AI will automatically extract product names, quantities, dates, and prices.</p>

          {/* No OCR results yet — show upload area */}
          {ocrSales.length === 0 && (
            <>
              {/* Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleImageDrop}
                onClick={() => imageRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${dragOver ? 'border-violet-500 bg-violet-500/5' : 'border-slate-700 hover:border-slate-600'} ${ocrProcessing ? 'pointer-events-none opacity-50' : ''}`}
                id="sales-image-dropzone"
              >
                <input ref={imageRef} type="file" accept="image/*" onChange={handleImageSelect} hidden />
                <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-7 h-7 text-violet-400" />
                </div>
                <p className="text-sm text-slate-400 mb-3">Drag & drop your sales image here, or click to browse</p>
                <div className="flex gap-1.5 justify-center">
                  {['.jpg', '.png', '.webp'].map(ext => (
                    <span key={ext} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">{ext}</span>
                  ))}
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20">AI OCR</span>
                </div>
              </div>

              {/* Image Preview + Process Button */}
              {selectedImage && (
                <div className="mt-4 flex gap-4 items-start flex-wrap">
                  {imagePreviewUrl && (
                    <div className="w-36 h-36 rounded-xl overflow-hidden border-2 border-slate-700 shrink-0">
                      <img src={imagePreviewUrl} alt="Sales ledger preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-semibold text-sm text-white">{selectedImage.name}</div>
                    <div className="text-xs text-slate-500 mb-3">{(selectedImage.size / 1024).toFixed(1)} KB</div>
                    {ocrProcessing ? (
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                        <span className="text-sm font-medium text-violet-400">{ocrProgress}</span>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <ShimmerButton onClick={handleProcessImage} id="btn-process-sales-image">
                          <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Extract Sales Data</span>
                        </ShimmerButton>
                        <button
                          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 transition-all"
                          onClick={() => { setSelectedImage(null); setImagePreviewUrl(null); }}
                        >
                          <X className="w-4 h-4" /> Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* OCR Results Preview */}
          {ocrSales.length > 0 && (
            <>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mb-4 flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300 font-medium">{ocrSales.length} sales entries extracted!</span>
                <span className="text-slate-400">Review the data below, edit if needed, then record.</span>
              </div>

              <div className="max-h-[450px] overflow-y-auto mb-4 rounded-xl border border-slate-800">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-900/80 border-b border-slate-700/50 text-slate-300 uppercase tracking-wider text-xs font-semibold sticky top-0">
                    <tr>
                      <th className="px-4 py-3 w-10">✓</th>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Qty</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Price (₹)</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Conf.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {ocrSales.map((sale, idx) => (
                      <tr key={idx} className={`transition-colors ${!sale.selected ? 'opacity-40' : ''} ${sale.confidence < 0.75 ? 'bg-amber-500/[0.03]' : 'hover:bg-slate-800/40'}`}>
                        <td className="px-4 py-2">
                          <input type="checkbox" checked={sale.selected} onChange={(e) => updateOcrEntry(idx, 'selected', e.target.checked)} className="w-4 h-4 accent-teal-500 rounded" />
                        </td>
                        <td className="px-4 py-2">
                          <input className={`${inputCls} min-w-[160px]`} value={sale.product_name} onChange={(e) => updateOcrEntry(idx, 'product_name', e.target.value)} />
                        </td>
                        <td className="px-4 py-2">
                          <input type="number" className={`${inputCls} w-20`} value={sale.quantity} onChange={(e) => updateOcrEntry(idx, 'quantity', Number(e.target.value))} />
                        </td>
                        <td className="px-4 py-2">
                          <input type="date" className={`${inputCls} w-[140px]`} value={sale.date} onChange={(e) => updateOcrEntry(idx, 'date', e.target.value)} />
                        </td>
                        <td className="px-4 py-2">
                          <input type="number" step="0.5" className={`${inputCls} w-20`} value={sale.price || ''} placeholder="₹" onChange={(e) => updateOcrEntry(idx, 'price', e.target.value ? Number(e.target.value) : null)} />
                        </td>
                        <td className="px-4 py-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 capitalize">{sale.category}</span>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${sale.confidence * 100}%`, backgroundColor: getConfidenceColor(sale.confidence) }} />
                            </div>
                            <span className="text-xs font-bold tabular-nums" style={{ color: getConfidenceColor(sale.confidence) }}>{(sale.confidence * 100).toFixed(0)}%</span>
                            {sale.confidence < 0.75 && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 flex-wrap">
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 transition-all"
                  onClick={() => { setOcrSales([]); setSelectedImage(null); setImagePreviewUrl(null); setOcrProgress(''); }}
                >
                  <ArrowLeft className="w-4 h-4" /> Upload Different Image
                </button>
                <ShimmerButton onClick={handleSubmitOCR} disabled={submitting} id="btn-record-ocr-sales">
                  <span className="flex items-center gap-2">
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Recording...</> : <><CheckCircle2 className="w-4 h-4" /> Record {ocrSales.filter((s) => s.selected).length} Sale(s)</>}
                  </span>
                </ShimmerButton>
              </div>
            </>
          )}
        </GlowCard>
      )}

      {/* ────────── CSV UPLOAD TAB ────────── */}
      {activeTab === 'csv' && (
        <GlowCard className="p-6" glowColor="#3B82F6">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-400" />
            Upload Sales CSV
          </h3>

          {/* CSV Format Guide */}
          <div className="bg-blue-500/8 border border-blue-500/20 rounded-xl p-3 mb-5 text-sm text-slate-300">
            <strong className="text-blue-300">Expected CSV format:</strong><br />
            <code className="text-xs text-blue-400">product_name, quantity, date, price (optional)</code><br />
            <span className="text-xs text-slate-500">Column names are auto-detected (name/item, qty/sold/units, date, price/cost).</span>
          </div>

          {/* Drop Zone */}
          {!parsedSales.length && (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${dragOver ? 'border-blue-500 bg-blue-500/5' : 'border-slate-700 hover:border-slate-600'}`}
              >
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileDrop} hidden />
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
                  <FileSpreadsheet className="w-7 h-7 text-blue-400" />
                </div>
                <p className="text-sm text-slate-400 mb-3">Drag & drop your sales CSV here, or click to browse</p>
                <div className="flex gap-1.5 justify-center">
                  {['.csv', '.xlsx', '.xls'].map(ext => (
                    <span key={ext} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">{ext}</span>
                  ))}
                </div>
              </div>

              {selectedFile && (
                <GlowCard className="mt-4 p-4 flex flex-wrap items-center justify-between gap-4" glowColor="#3B82F6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10 border border-blue-500/20">
                      <FileSpreadsheet className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-white">{selectedFile.name}</div>
                      <div className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</div>
                    </div>
                  </div>
                  <ShimmerButton onClick={handleParseCSV} disabled={csvUploading}>
                    <span className="flex items-center gap-2">
                      {csvUploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Parsing...</> : <>Parse & Preview <ArrowRight className="w-4 h-4" /></>}
                    </span>
                  </ShimmerButton>
                </GlowCard>
              )}
            </>
          )}

          {/* Parsed Sales Preview */}
          {parsedSales.length > 0 && (
            <>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mb-4 flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300 font-medium">{parsedSales.length} sales entries parsed from <strong>{selectedFile?.name}</strong>.</span>
                <span className="text-slate-400">Review and confirm below:</span>
              </div>

              <div className="max-h-[400px] overflow-y-auto mb-4 rounded-xl border border-slate-800">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-900/80 border-b border-slate-700/50 text-slate-300 uppercase tracking-wider text-xs font-semibold sticky top-0">
                    <tr>
                      <th className="px-4 py-3 w-10">✓</th>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Quantity</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {parsedSales.map((sale, idx) => (
                      <tr key={idx} className={`transition-colors ${!sale.selected ? 'opacity-40' : 'hover:bg-slate-800/40'}`}>
                        <td className="px-4 py-2">
                          <input type="checkbox" checked={sale.selected} onChange={(e) => {
                            const updated = [...parsedSales];
                            updated[idx] = { ...updated[idx], selected: e.target.checked };
                            setParsedSales(updated);
                          }} className="w-4 h-4 accent-teal-500 rounded" />
                        </td>
                        <td className="px-4 py-2">
                          <input className={`${inputCls} min-w-[160px]`} value={sale.product_name} onChange={(e) => {
                            const updated = [...parsedSales];
                            updated[idx] = { ...updated[idx], product_name: e.target.value };
                            setParsedSales(updated);
                          }} />
                        </td>
                        <td className="px-4 py-2">
                          <input type="number" className={`${inputCls} w-20`} value={sale.quantity} onChange={(e) => {
                            const updated = [...parsedSales];
                            updated[idx] = { ...updated[idx], quantity: Number(e.target.value) };
                            setParsedSales(updated);
                          }} />
                        </td>
                        <td className="px-4 py-2">
                          <input type="date" className={`${inputCls} w-[140px]`} value={sale.date} onChange={(e) => {
                            const updated = [...parsedSales];
                            updated[idx] = { ...updated[idx], date: e.target.value };
                            setParsedSales(updated);
                          }} />
                        </td>
                        <td className="px-4 py-2">
                          <input type="number" className={`${inputCls} w-20`} value={sale.price || ''} placeholder="₹" onChange={(e) => {
                            const updated = [...parsedSales];
                            updated[idx] = { ...updated[idx], price: e.target.value ? Number(e.target.value) : null };
                            setParsedSales(updated);
                          }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3">
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 transition-all"
                  onClick={() => { setParsedSales([]); setSelectedFile(null); }}
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <ShimmerButton onClick={handleSubmitCSV} disabled={submitting}>
                  <span className="flex items-center gap-2">
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Recording...</> : <><CheckCircle2 className="w-4 h-4" /> Record {parsedSales.filter((s) => s.selected).length} Sale(s)</>}
                  </span>
                </ShimmerButton>
              </div>
            </>
          )}
        </GlowCard>
      )}

      {/* ────────── RECENT SALES HISTORY ────────── */}
      <GlowCard className="overflow-hidden p-0">
        <div className="px-6 py-4 border-b border-slate-800">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-teal-400" />
            Recent Sales
          </h3>
        </div>

        {historyLoading ? (
          <div className="py-8 text-center text-slate-500 text-sm">Loading...</div>
        ) : salesHistory.length === 0 ? (
          <div className="py-12 text-center">
            <Receipt className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No sales recorded yet. Start by entering today's sales above!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-900/80 border-b border-slate-700/50 text-slate-300 uppercase tracking-wider text-xs font-semibold">
                <tr>
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3">Quantity</th>
                  <th className="px-6 py-3">Revenue</th>
                  <th className="px-6 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {salesHistory.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-3 font-semibold text-white">{sale.product_name}</td>
                    <td className="px-6 py-3 text-slate-300 tabular-nums">{sale.quantity}</td>
                    <td className="px-6 py-3 font-bold text-emerald-400 tabular-nums">{sale.revenue ? `₹${sale.revenue.toFixed(2)}` : '—'}</td>
                    <td className="px-6 py-3 text-slate-500 text-xs">{new Date(sale.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlowCard>
    </div>
  );
}
