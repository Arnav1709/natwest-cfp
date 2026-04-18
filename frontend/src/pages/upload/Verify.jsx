import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle2, AlertTriangle, Trash2, Plus, RefreshCw, Loader2, ShieldCheck, FileSpreadsheet, Camera, PenLine, Package } from 'lucide-react';
import { uploadApi } from '../../services/api';
import GlowCard from '../../components/GlowCard';
import AnimatedCounter from '../../components/AnimatedCounter';
import ShimmerButton from '../../components/ShimmerButton';

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
      category: 'Other',
      expiry_date: '',
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
          expiry_date: row.expiry_date || null,
          unit: 'units',
        }));

      if (verifiedData.length === 0) {
        setError('No valid rows to submit. Ensure at least one row has a product name.');
        setSubmitting(false);
        return;
      }

      const result = await uploadApi.verify({ verified_data: verifiedData, source });

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
    if (conf >= 0.9) return '#10B981';
    if (conf >= 0.75) return '#F59E0B';
    return '#EF4444';
  };

  const sourceConfig = {
    image: { icon: Camera, label: 'AI OCR Extraction', color: '#8B5CF6' },
    csv:   { icon: FileSpreadsheet, label: 'CSV Import', color: '#3B82F6' },
    manual: { icon: PenLine, label: 'Manual Entry', color: '#10B981' },
  };
  const srcCfg = sourceConfig[source] || sourceConfig.manual;

  // ── Success overlay ──
  if (submitResult) {
    const isCSV = source === 'csv';
    return (
      <div className="max-w-lg mx-auto mt-20 animate-fade-in-up">
        <GlowCard className="p-10 text-center" glowColor="#10B981">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">
            {isCSV ? 'Sales History Imported!' : 'Data Saved Successfully!'}
          </h2>
          <div className="flex justify-center gap-8 mb-6 flex-wrap">
            {!isCSV && (
              <div className="text-center">
                <AnimatedCounter value={submitResult.products_created} className="text-3xl font-bold text-teal-300 tracking-tight" />
                <div className="text-xs font-medium text-slate-500 mt-1">Products Created</div>
              </div>
            )}
            {isCSV && (
              <div className="text-center">
                <AnimatedCounter value={submitResult.products_matched || 0} className="text-3xl font-bold text-teal-300 tracking-tight" />
                <div className="text-xs font-medium text-slate-500 mt-1">Products Matched</div>
              </div>
            )}
            <div className="text-center">
              <AnimatedCounter value={submitResult.sales_records_created} className="text-3xl font-bold text-emerald-400 tracking-tight" />
              <div className="text-xs font-medium text-slate-500 mt-1">Sales Records</div>
            </div>
            {isCSV && submitResult.products_skipped > 0 && (
              <div className="text-center">
                <AnimatedCounter value={submitResult.products_skipped} className="text-3xl font-bold text-amber-400 tracking-tight" />
                <div className="text-xs font-medium text-slate-500 mt-1">Rows Skipped</div>
              </div>
            )}
          </div>
          {isCSV && (
            <p className="text-xs text-slate-500 mb-4 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3 h-3" />
              Stock levels were not modified — only sales history was recorded.
            </p>
          )}
          <div className="flex items-center gap-2 justify-center text-sm text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Redirecting to dashboard...
          </div>
        </GlowCard>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <button
            className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-teal-400 transition-colors group mb-3"
            onClick={() => navigate('/upload')}
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Upload
          </button>
          <h1 className="text-3xl font-bold text-white tracking-tight">{t('verify.title')}</h1>
          <p className="text-slate-400 mt-1 flex items-center gap-2">
            <srcCfg.icon className="w-4 h-4" style={{ color: srcCfg.color }} />
            <span>{srcCfg.label}</span>
            {fileName && <><span className="text-slate-600">·</span><span className="text-slate-500">{fileName}</span></>}
          </p>
        </div>
        {hasData && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl border" style={{ backgroundColor: `${getConfidenceColor(overallConfidence / 100)}15`, borderColor: `${getConfidenceColor(overallConfidence / 100)}30` }}>
            <ShieldCheck className="w-4 h-4" style={{ color: getConfidenceColor(overallConfidence / 100) }} />
            <span className="text-sm font-bold" style={{ color: getConfidenceColor(overallConfidence / 100) }}>
              {t('verify.confidence')}: {overallConfidence}%
            </span>
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3 text-red-400">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!hasData && source !== 'manual' && (
        <GlowCard className="py-16 text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
            <Package className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Data to Verify</h3>
          <p className="text-slate-400 mb-6 max-w-sm mx-auto text-sm">Go back and upload a file or image to extract data.</p>
          <ShimmerButton onClick={() => navigate('/upload')}>
            <span className="flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> Back to Upload</span>
          </ShimmerButton>
        </GlowCard>
      )}

      {/* Data Table */}
      {(hasData || source === 'manual') && (
        <>
          <GlowCard className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-900/80 border-b border-slate-700/50 text-slate-300 uppercase tracking-wider text-xs font-semibold">
                  <tr>
                    <th className="px-5 py-3">Product Name</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Quantity</th>
                    <th className="px-5 py-3">Unit Price (₹)</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Expiry Date</th>
                    {source === 'image' && <th className="px-5 py-3">Confidence</th>}
                    <th className="px-5 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data.map((row) => (
                    <tr key={row.id} className={`transition-colors ${row.confidence < 0.75 ? 'bg-amber-500/[0.03]' : 'hover:bg-slate-800/40'}`}>
                      <td className="px-5 py-3">
                        <input
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 text-sm min-w-[180px]"
                          value={row.name}
                          onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                          placeholder="Product name"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <input
                          type="date"
                          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 text-sm w-[140px]"
                          value={row.date}
                          onChange={(e) => updateRow(row.id, 'date', e.target.value)}
                        />
                      </td>
                      <td className="px-5 py-3">
                        <input
                          type="number"
                          className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 text-sm tabular-nums"
                          value={row.quantity}
                          onChange={(e) => updateRow(row.id, 'quantity', Number(e.target.value))}
                        />
                      </td>
                      <td className="px-5 py-3">
                        <input
                          type="number"
                          step="0.5"
                          className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 text-sm tabular-nums"
                          value={row.price}
                          onChange={(e) => updateRow(row.id, 'price', Number(e.target.value))}
                        />
                      </td>
                      <td className="px-5 py-3">
                        <select
                          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 text-sm"
                          value={row.category}
                          onChange={(e) => updateRow(row.id, 'category', e.target.value)}
                        >
                          <option value="Medicines">Medicines</option>
                          <option value="Supplements">Supplements</option>
                          <option value="Supplies">Supplies</option>
                          <option value="Equipment">Equipment</option>
                          <option value="Grocery">Grocery</option>
                          <option value="Other">Other</option>
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        <input
                          type="date"
                          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 text-sm w-[140px]"
                          value={row.expiry_date || ''}
                          onChange={(e) => updateRow(row.id, 'expiry_date', e.target.value)}
                        />
                      </td>
                      {source === 'image' && (
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${row.confidence * 100}%`, backgroundColor: getConfidenceColor(row.confidence) }}
                              />
                            </div>
                            <span className="text-xs font-bold tabular-nums" style={{ color: getConfidenceColor(row.confidence) }}>
                              {(row.confidence * 100).toFixed(0)}%
                            </span>
                            {row.confidence < 0.75 && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                          </div>
                        </td>
                      )}
                      <td className="px-5 py-3">
                        <button
                          onClick={() => deleteRow(row.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="Remove row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlowCard>

          {/* Add row button */}
          <button
            onClick={addRow}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-teal-300 bg-slate-900/50 hover:bg-teal-500/10 border border-slate-700/50 hover:border-teal-500/30 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Row
          </button>

          {/* Confirmation */}
          <GlowCard className="p-5 flex flex-wrap items-center justify-between gap-4" glowColor={confirmed ? '#10B981' : undefined}>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="w-5 h-5 rounded accent-teal-500"
                id="checkbox-confirm"
              />
              <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors">
                {t('verify.confirm_label')}
              </span>
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/upload')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 transition-all"
                id="btn-rescan"
              >
                <RefreshCw className="w-4 h-4" /> {t('verify.rescan')}
              </button>
              <ShimmerButton
                disabled={!confirmed || submitting || data.length === 0}
                onClick={handleConfirm}
                id="btn-confirm-verify"
                style={{ opacity: (confirmed && !submitting && data.length > 0) ? 1 : 0.5 }}
              >
                <span className="flex items-center gap-2">
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><CheckCircle2 className="w-4 h-4" /> {t('verify.confirm_btn')}</>}
                </span>
              </ShimmerButton>
            </div>
          </GlowCard>
        </>
      )}
    </div>
  );
}
