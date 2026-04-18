import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileText, ShoppingCart, Box, DollarSign, Clock, AlertTriangle, Activity, Package, Send, CheckCircle2 } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useTransliterate } from '../hooks/useTransliterate';
import { reorderApi } from '../services/api';
import GlowCard from '../components/GlowCard';
import AnimatedCounter from '../components/AnimatedCounter';
import ShimmerButton from '../components/ShimmerButton';

export default function Reorder() {
  const { t } = useTranslation();
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [orderedItems, setOrderedItems] = useState(new Set());
  const [orderedSuppliers, setOrderedSuppliers] = useState(new Set());

  const { data: rawData, loading, error } = useApi(() => reorderApi.list(), []);

  const reorderData = rawData || {};
  const reorder_list = reorderData.reorder_list || [];

  const productNames = useMemo(
    () => reorder_list.map((item) => item.product_name).filter(Boolean),
    [reorder_list]
  );
  const { translatedMap } = useTransliterate(productNames);

  const urgencyConfig = {
    high: { label: t('urgency.high'),   color: '#EF4444', bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/20' },
    medium: { label: t('urgency.medium'), color: '#F59E0B', bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/20' },
    low: { label: t('urgency.low'),    color: '#10B981', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  };

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

  const handleOrderItem = (item) => {
    setOrderedItems((prev) => {
      const next = new Set(prev);
      next.add(item.product_id);
      return next;
    });
  };

  const handleOrderSupplier = (supplier, items) => {
    setOrderedSuppliers((prev) => {
      const next = new Set(prev);
      next.add(supplier);
      return next;
    });
    setOrderedItems((prev) => {
      const next = new Set(prev);
      items.forEach((item) => next.add(item.product_id));
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <ShoppingCart className="w-12 h-12 text-blue-500 animate-pulse mx-auto mb-4 opacity-50" />
          <p className="text-slate-400 font-medium">Analyzing stock levels and generating recommendations...</p>
        </div>
      </div>
    );
  }

  const summary = reorderData.summary || { total_items: 0, estimated_total_cost: 0, most_urgent_product: '—', most_urgent_days_remaining: 0 };
  const grouped_by_supplier = reorderData.grouped_by_supplier || {};

  return (
    <div className="space-y-6 animate-fade-in-up max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-1 w-6 rounded-full bg-emerald-500"></div>
            <span className="text-xs font-bold tracking-wider text-emerald-400 uppercase">Procurement Engine</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">{t('reorder.title')}</h1>
          <p className="text-slate-400 mt-1">
            AI-generated reorder recommendations based on current stock and forecast demand
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => handleExport('csv')}
            disabled={exportingCsv}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 font-medium border border-slate-700/50 transition-colors"
          >
            {exportingCsv ? <Activity className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {t('reorder.export_csv')}
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={exportingPdf}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 font-medium border border-slate-700/50 transition-colors"
          >
            {exportingPdf ? <Activity className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {t('reorder.export_pdf')}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3 text-red-400">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: t('reorder.total_items'),
            value: summary.total_items,
            icon: Box,
            color: 'blue'
          },
          {
            label: t('reorder.estimated_cost'),
            value: summary.estimated_total_cost || 0,
            icon: DollarSign,
            color: 'emerald',
            prefix: '₹'
          },
          {
            label: t('reorder.most_urgent'),
            value: 0, 
            displayValue: summary.most_urgent_product,
            icon: AlertTriangle,
            color: 'amber',
            badge: summary.most_urgent_days_remaining != null ? `${summary.most_urgent_days_remaining} days left` : null
          },
          {
            label: "Suppliers Involved",
            value: Object.keys(grouped_by_supplier).length,
            icon: Package,
            color: 'violet'
          }
        ].map((kpi, i) => (
          <GlowCard key={i} className="p-5 flex flex-col relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-${kpi.color}-500/5 rounded-full blur-2xl -mr-4 -mt-4 transition-all group-hover:bg-${kpi.color}-500/10`}></div>
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="text-sm font-semibold tracking-wider text-slate-400 uppercase">{kpi.label}</span>
              <div className={`p-1.5 rounded-lg bg-${kpi.color}-500/10 text-${kpi.color}-400 border border-${kpi.color}-500/20`}>
                <kpi.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1 mt-auto relative z-10 min-h-[2.5rem]">
              {kpi.prefix && <span className="text-xl font-bold text-slate-400">{kpi.prefix}</span>}
              {kpi.displayValue ? (
                <span className="text-2xl font-bold text-white tracking-tight leading-tight truncate" title={kpi.displayValue}>
                  {kpi.displayValue}
                </span>
              ) : (
                <AnimatedCounter 
                  value={kpi.value} 
                  className="text-3xl font-bold text-white tracking-tight leading-none"
                />
              )}
            </div>
            {kpi.badge && (
              <div className={`mt-3 text-xs font-semibold px-2.5 py-1 rounded-md inline-flex items-center w-max bg-amber-500/10 text-amber-400 border border-amber-500/20 relative z-10`}>
                <Clock className="w-3 h-3 mr-1.5" />
                {kpi.badge}
              </div>
            )}
          </GlowCard>
        ))}
      </div>

      {Object.keys(grouped_by_supplier).length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1 text-slate-300">
            <Send className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-bold">Quick Ordering by Supplier</h3>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Object.entries(grouped_by_supplier).map(([supplier, items]) => {
              const total = items.reduce((sum, item) => sum + (item.estimated_cost || 0), 0);
              const isSupplierOrdered = orderedSuppliers.has(supplier);
              return (
                <GlowCard key={supplier} className={`p-5 flex flex-col transition-all duration-300 ${isSupplierOrdered ? 'opacity-50 grayscale scale-[0.98]' : ''}`}>
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-bold text-lg text-white">{supplier}</h4>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tabular-nums">
                      ₹{total.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="space-y-2.5 mb-6 flex-1">
                    {items.slice(0, 3).map((item) => (
                      <div key={item.product_id} className="flex justify-between items-center text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
                        <span className="text-slate-300 truncate pr-4">{item.product_name}</span>
                        <span className="text-blue-400 font-bold whitespace-nowrap bg-blue-500/10 px-2 py-0.5 rounded">
                          {item.reorder_qty} units
                        </span>
                      </div>
                    ))}
                    {items.length > 3 && (
                      <div className="text-xs text-slate-500 font-medium italic pt-1">
                        + {items.length - 3} more items
                      </div>
                    )}
                  </div>
                  
                  <button
                    className={`w-full py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                      isSupplierOrdered 
                        ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 border border-blue-500/50'
                    }`}
                    onClick={() => handleOrderSupplier(supplier, items)}
                    disabled={isSupplierOrdered}
                  >
                    {isSupplierOrdered ? (
                      <><CheckCircle2 className="w-5 h-5" /> Order Sent</>
                    ) : (
                      <><Send className="w-4 h-4" /> Send Order</>
                    )}
                  </button>
                </GlowCard>
              );
            })}
          </div>
        </div>
      )}

      {/* Reorder Table */}
      <div className="mt-8">
        <h3 className="text-lg font-bold text-white mb-4 px-1 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-emerald-400" />
          Detailed Reorder Manifest
        </h3>
        <GlowCard className="overflow-hidden p-0">
          {reorder_list.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-1">Stock Optimal</h3>
              <p className="text-slate-400">No reorders needed — all stock levels are healthy.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-900/80 border-b border-slate-700/50 text-slate-300 uppercase tracking-wider text-xs font-semibold">
                  <tr>
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4">Stock</th>
                    <th className="px-6 py-4">Demand/Wk</th>
                    <th className="px-6 py-4">Reorder Qty</th>
                    <th className="px-6 py-4">Est. Empty</th>
                    <th className="px-6 py-4">Urgency</th>
                    <th className="px-6 py-4">Supplier</th>
                    <th className="px-6 py-4">Est. Cost</th>
                    <th className="px-6 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {reorder_list.map((item) => {
                    const uc = urgencyConfig[item.urgency] || urgencyConfig.low;
                    const isOrdered = orderedItems.has(item.product_id);
                    const days = item.days_to_stockout || 0;
                    const isCritical = days <= 2;
                    const isWarning = days > 2 && days <= 7;
                    
                    return (
                      <tr 
                        key={item.product_id} 
                        className={`transition-colors hover:bg-slate-800/40 ${isOrdered ? 'opacity-40 grayscale bg-slate-900/50' : ''}`}
                      >
                        <td className="px-6 py-4 font-semibold text-white whitespace-normal min-w-[200px]">
                          {translatedMap[item.product_name] || item.product_name}
                        </td>
                        <td className="px-6 py-4 text-slate-300">{item.current_stock}</td>
                        <td className="px-6 py-4 text-slate-400 tabular-nums">{item.forecast_demand}</td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">
                            {item.reorder_qty}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-bold ${isCritical ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {days === 0 ? 'NOW' : `${days} days`}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`px-2.5 py-1 rounded-md text-xs font-bold w-max border flex items-center gap-1.5 ${uc.bg} ${uc.text} ${uc.border}`}>
                            <Activity className="w-3 h-3" />
                            {uc.label}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-xs">
                          {item.supplier_name}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-200 tabular-nums">
                          ₹{(item.estimated_cost || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 flex justify-center">
                          <button
                            className={`px-4 py-1.5 flex items-center gap-2 rounded-lg text-xs font-bold transition-all ${
                              isOrdered 
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' 
                                : 'bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white border border-slate-600 hover:border-blue-500'
                            }`}
                            onClick={() => handleOrderItem(item)}
                            disabled={isOrdered}
                          >
                            {isOrdered ? (
                              <><CheckCircle2 className="w-3 h-3" /> Marked</>
                            ) : (
                              <><ShoppingCart className="w-3 h-3" /> Order</>
                            )}
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
      </div>
    </div>
  );
}
