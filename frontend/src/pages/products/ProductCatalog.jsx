import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Plus, Package, ChevronRight, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useTransliterate } from '../../hooks/useTransliterate';
import { inventoryApi } from '../../services/api';
import GlowCard from '../../components/GlowCard';
import ShimmerButton from '../../components/ShimmerButton';

const statusConfig = {
  healthy:      { label: 'Healthy',      color: '#10B981', icon: CheckCircle2 },
  low_stock:    { label: 'Low Stock',    color: '#F59E0B', icon: AlertTriangle },
  critical:     { label: 'Critical',     color: '#EF4444', icon: AlertCircle },
  out_of_stock: { label: 'Out of Stock', color: '#EF4444', icon: AlertCircle },
};

export default function ProductCatalog() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: rawData, loading, error } = useApi(() => inventoryApi.list({ per_page: 1000 }), []);
  const products = Array.isArray(rawData) ? rawData : (rawData?.products || []);

  const productNames = useMemo(
    () => products.map((p) => p.name).filter(Boolean),
    [products]
  );
  const { translatedMap } = useTransliterate(productNames);

  const filtered = products.filter(p => {
    const matchSearch = (p.name || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'all' || p.category === category;
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <Package className="w-12 h-12 text-blue-500 animate-pulse mx-auto mb-4 opacity-50" />
          <p className="text-slate-400 font-medium">Loading product catalog...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-1 w-6 rounded-full bg-teal-500"></div>
            <span className="text-xs font-bold tracking-wider text-teal-400 uppercase">Inventory Catalog</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">{t('products.title')}</h1>
          <p className="text-slate-400 mt-1">
            <span className="font-semibold text-white">{filtered.length}</span> products found
          </p>
        </div>
        <ShimmerButton onClick={() => navigate('/upload')} id="btn-add-product">
          <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> {t('products.add_product')}</span>
        </ShimmerButton>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3 text-red-400">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Filters */}
      <GlowCard className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all font-medium text-sm"
              placeholder={t('products.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              id="product-search"
            />
          </div>
          <div className="relative">
            <select
              className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white appearance-none pr-10 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all font-medium text-sm min-w-[140px]"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              id="filter-category"
            >
              <option value="all">{t('products.category')}</option>
              <option value="medicines">{t('categories.Medicines')}</option>
              <option value="supplements">{t('categories.Supplements')}</option>
              <option value="supplies">{t('categories.Supplies')}</option>
              <option value="equipment">{t('categories.Equipment')}</option>
              <option value="grocery">{t('categories.Grocery')}</option>
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white appearance-none pr-10 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all font-medium text-sm min-w-[140px]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              id="filter-status"
            >
              <option value="all">{t('products.status')}</option>
              <option value="healthy">{t('status.healthy')}</option>
              <option value="low_stock">{t('status.low_stock')}</option>
              <option value="critical">{t('status.critical')}</option>
              <option value="out_of_stock">{t('status.out_of_stock')}</option>
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
        </div>
      </GlowCard>

      {/* Product Table */}
      <GlowCard className="overflow-hidden p-0">
        {filtered.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-teal-500/10 rounded-full flex items-center justify-center mb-4 border border-teal-500/20">
              <Package className="w-8 h-8 text-teal-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No products yet</h3>
            <p className="text-slate-400 mb-6 max-w-sm mx-auto">Upload a CSV or scan a ledger to add your inventory.</p>
            <ShimmerButton onClick={() => navigate('/upload')}>
              <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Upload Data</span>
            </ShimmerButton>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-900/80 border-b border-slate-700/50 text-slate-300 uppercase tracking-wider text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">{t('products.name')}</th>
                  <th className="px-6 py-4">{t('products.category')}</th>
                  <th className="px-6 py-4">{t('products.stock')}</th>
                  <th className="px-6 py-4">{t('products.reorder_point')}</th>
                  <th className="px-6 py-4">{t('products.days_remaining')}</th>
                  <th className="px-6 py-4">{t('products.status')}</th>
                  <th className="px-6 py-4">{t('products.supplier')}</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((p) => {
                  const sc = statusConfig[p.status] || statusConfig.healthy;
                  const Icon = sc.icon;
                  const days = p.days_remaining;
                  const isCritical = (days || 0) < 5;
                  const isWarning = (days || 0) >= 5 && (days || 0) < 10;

                  return (
                    <tr
                      key={p.id}
                      className="cursor-pointer transition-colors hover:bg-slate-800/40 group"
                      onClick={() => navigate(`/products/${p.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 border"
                            style={{ backgroundColor: `${sc.color}15`, borderColor: `${sc.color}30`, color: sc.color }}
                          >
                            {(p.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-white group-hover:text-teal-300 transition-colors">
                            {translatedMap[p.name] || p.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400 capitalize text-xs font-medium">
                        {t(`categories.${p.category}`, { defaultValue: p.category })}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold" style={{ color: p.status === 'critical' || p.status === 'out_of_stock' ? '#EF4444' : p.status === 'low_stock' ? '#F59E0B' : '#E2E8F0' }}>
                          {p.current_stock}
                        </span>
                        <span className="text-slate-500 text-xs ml-1">{p.unit}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 tabular-nums">{p.reorder_point}</td>
                      <td className="px-6 py-4">
                        <span className={`font-bold tabular-nums ${isCritical ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {days != null ? `${days}d` : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold w-max border"
                          style={{ backgroundColor: `${sc.color}15`, borderColor: `${sc.color}30`, color: sc.color }}
                        >
                          <Icon className="w-3 h-3" />
                          {sc.label}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">{p.supplier_name || '—'}</td>
                      <td className="px-6 py-4">
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-teal-400 transition-colors" />
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
  );
}
