import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Download, FileText, ShoppingCart, Box, DollarSign, Clock, AlertTriangle, Activity, Package, Send, CheckCircle2, MessageCircle, Wifi, WifiOff, Settings, Edit3, Phone, Loader2, XCircle } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useTransliterate } from '../hooks/useTransliterate';
import { reorderApi, whatsappApi } from '../services/api';
import GlowCard from '../components/GlowCard';
import AnimatedCounter from '../components/AnimatedCounter';
import ShimmerButton from '../components/ShimmerButton';

export default function Reorder() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [orderedItems, setOrderedItems] = useState(new Set());
  const [orderedSuppliers, setOrderedSuppliers] = useState(new Set());
  const [sendingSupplier, setSendingSupplier] = useState(null);
  const [sendErrors, setSendErrors] = useState({});

  // WhatsApp connection status
  const [waConnected, setWaConnected] = useState(null); // null = loading, true/false = result
  const [waPhone, setWaPhone] = useState(null);

  const { data: rawData, loading, error } = useApi(() => reorderApi.list(), []);

  const reorderData = rawData || {};
  const reorder_list = reorderData.reorder_list || [];

  const productNames = useMemo(
    () => reorder_list.map((item) => item.product_name).filter(Boolean),
    [reorder_list]
  );
  const { translatedMap } = useTransliterate(productNames);

  // Check WhatsApp status on mount
  useEffect(() => {
    const checkWA = async () => {
      try {
        const status = await whatsappApi.status();
        setWaConnected(status.connected || false);
        setWaPhone(status.phone || null);
      } catch {
        setWaConnected(false);
      }
    };
    checkWA();
  }, []);

  // Split suppliers into "ready" (has contact) and "missing" (no contact)
  const grouped_by_supplier = reorderData.grouped_by_supplier || {};

  const { readySuppliers, missingSuppliers } = useMemo(() => {
    const ready = {};
    const missing = {};

    Object.entries(grouped_by_supplier).forEach(([supplier, items]) => {
      // A supplier group is "ready" if at least one item has a supplier_contact
      const hasContact = items.some(item => item.supplier_contact);
      if (hasContact) {
        ready[supplier] = items;
      } else {
        missing[supplier] = items;
      }
    });

    return { readySuppliers: ready, missingSuppliers: missing };
  }, [grouped_by_supplier]);

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

  // Send reorder via WhatsApp
  const handleSendOrder = async (supplier, items) => {
    // Get supplier contact from items
    const contact = items.find(i => i.supplier_contact)?.supplier_contact;
    if (!contact) return;

    setSendingSupplier(supplier);
    setSendErrors(prev => ({ ...prev, [supplier]: null }));

    try {
      const result = await reorderApi.sendOrder({
        supplier_name: supplier,
        supplier_contact: contact,
        items: items.map(item => ({
          product_name: item.product_name,
          reorder_qty: item.reorder_qty,
          estimated_cost: item.estimated_cost || 0,
        })),
      });

      if (result.success) {
        setOrderedSuppliers(prev => {
          const next = new Set(prev);
          next.add(supplier);
          return next;
        });
        setOrderedItems(prev => {
          const next = new Set(prev);
          items.forEach(item => next.add(item.product_id));
          return next;
        });
      } else {
        setSendErrors(prev => ({ ...prev, [supplier]: result.message }));
      }
    } catch (err) {
      setSendErrors(prev => ({ ...prev, [supplier]: err.message || 'Failed to send order' }));
    } finally {
      setSendingSupplier(null);
    }
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

      {/* WhatsApp Status Banner */}
      {waConnected !== null && (
        <GlowCard className="p-0" glowColor={waConnected ? '#22C55E' : '#EF4444'}>
          <div className="flex items-center gap-3 px-5 py-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${waConnected ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
              {waConnected ? <Wifi className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4 text-red-400" />}
            </div>
            <div className="flex-1 min-w-0">
              {waConnected ? (
                <>
                  <span className="text-sm font-semibold text-emerald-400">WhatsApp Connected</span>
                  <span className="text-xs text-slate-500 ml-2">
                    {waPhone ? `as ${waPhone}` : ''} — Ready to send supplier orders
                  </span>
                </>
              ) : (
                <>
                  <span className="text-sm font-semibold text-red-400">WhatsApp Disconnected</span>
                  <span className="text-xs text-slate-500 ml-2">
                    Connect WhatsApp to send reorder messages to suppliers
                  </span>
                </>
              )}
            </div>
            {!waConnected && (
              <button
                onClick={() => navigate('/settings')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition-all shrink-0"
              >
                <Settings className="w-3.5 h-3.5" /> Connect
              </button>
            )}
          </div>
        </GlowCard>
      )}

      {/* Auto-update info banner */}
      <GlowCard className="mb-4" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,208,255,0.03)', borderColor: 'rgba(0,208,255,0.15)' }}>
        <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'rgba(0,208,255,0.1)', border: '1px solid rgba(0,208,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>🤖</div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#00D0FF' }}>AI-Powered Auto-Reorder</span>
          <span style={{ fontSize: '0.775rem', color: 'var(--color-text-muted)', marginLeft: '8px' }}>
            Reorder points update automatically after each sale using: <code style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', padding: '1px 4px', borderRadius: '3px' }}>ROP = (avg_daily × lead_time) + safety_stock</code>
          </span>
        </div>
      </GlowCard>

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

      {/* ────── READY TO ORDER (has supplier contact) ────── */}
      {Object.keys(readySuppliers).length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1 text-slate-300">
            <MessageCircle className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold">Ready to Order via WhatsApp</h3>
            <span className="text-xs text-slate-500 ml-1">— Suppliers with contact info</span>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Object.entries(readySuppliers).map(([supplier, items]) => {
              const total = items.reduce((sum, item) => sum + (item.estimated_cost || 0), 0);
              const isSupplierOrdered = orderedSuppliers.has(supplier);
              const isSending = sendingSupplier === supplier;
              const contact = items.find(i => i.supplier_contact)?.supplier_contact;
              const supplierError = sendErrors[supplier];

              return (
                <GlowCard key={supplier} className={`transition-all duration-300 ${isSupplierOrdered ? 'opacity-60 scale-[0.98]' : ''}`} glowColor="#10B981">
                  <div className="p-5 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-lg text-white">{supplier}</h4>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tabular-nums">
                        ₹{total.toLocaleString()}
                      </span>
                    </div>
                    {contact && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-4">
                        <Phone className="w-3 h-3" /> {contact}
                      </div>
                    )}
                    
                    <div className="space-y-2.5 mb-5 flex-1">
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

                    {supplierError && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 mb-3 text-xs text-red-400 flex items-start gap-2">
                        <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{supplierError}</span>
                      </div>
                    )}
                    
                    <button
                      className={`w-full py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                        isSupplierOrdered 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                          : !waConnected
                            ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 border border-emerald-500/50'
                      }`}
                      onClick={() => handleSendOrder(supplier, items)}
                      disabled={isSupplierOrdered || isSending || !waConnected}
                    >
                      {isSupplierOrdered ? (
                        <><CheckCircle2 className="w-5 h-5" /> Order Sent via WhatsApp</>
                      ) : isSending ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                      ) : !waConnected ? (
                        <><WifiOff className="w-4 h-4" /> WhatsApp Not Connected</>
                      ) : (
                        <><MessageCircle className="w-4 h-4" /> Send Order via WhatsApp</>
                      )}
                    </button>
                  </div>
                </GlowCard>
              );
            })}
          </div>
        </div>
      )}

      {/* ────── MISSING CONTACT (no supplier contact) ────── */}
      {Object.keys(missingSuppliers).length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1 text-slate-300">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold">Missing Supplier Contact</h3>
            <span className="text-xs text-slate-500 ml-1">— Add phone number to enable WhatsApp ordering</span>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Object.entries(missingSuppliers).map(([supplier, items]) => {
              const total = items.reduce((sum, item) => sum + (item.estimated_cost || 0), 0);
              return (
                <GlowCard key={supplier} className="border-amber-500/10" glowColor="#F59E0B">
                  <div className="p-5 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-lg text-white">{supplier}</h4>
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold tabular-nums">
                        ₹{total.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-amber-400/80 mb-4">
                      <Phone className="w-3 h-3" /> No contact info
                    </div>
                    
                    <div className="space-y-2.5 mb-5 flex-1">
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
                      className="w-full py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:border-amber-500/50"
                      onClick={() => {
                        // Navigate to the first product's edit page
                        const firstItem = items[0];
                        if (firstItem && firstItem.product_id) {
                          navigate(`/products/${firstItem.product_id}`);
                        } else {
                          navigate('/products');
                        }
                      }}
                    >
                      <Edit3 className="w-4 h-4" /> Add Contact Info
                    </button>
                  </div>
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
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-1">Stock Optimal</h3>
                <p className="text-slate-400">No reorders needed — all stock levels are healthy.</p>
              </div>
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
                          {item.supplier_name || '—'}
                          {item.supplier_contact && (
                            <div className="flex items-center gap-1 text-emerald-500 mt-0.5">
                              <Phone className="w-2.5 h-2.5" />
                              <span className="text-[10px]">{item.supplier_contact}</span>
                            </div>
                          )}
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
