import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, Bell, Check, Filter } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { alertsApi } from '../services/api';
import GlowCard from '../components/GlowCard';

const severityConfig = {
  critical: { icon: AlertCircle, color: '#EF4444', label: 'Critical' },
  warning:  { icon: AlertTriangle, color: '#F59E0B', label: 'Warning' },
  info:     { icon: Info, color: '#3B82F6', label: 'Info' },
};

export default function Alerts() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('all');

  const { data: rawData, loading, error, setData } = useApi(() => alertsApi.list(), []);
  const alerts = Array.isArray(rawData) ? rawData : (rawData?.alerts || []);

  const filtered = alerts.filter(a => {
    if (filter === 'all') return !a.dismissed;
    return a.severity === filter && !a.dismissed;
  });

  const dismiss = async (id) => {
    try {
      await alertsApi.dismiss(id);
    } catch (_) {
      // Ignore API error — still dismiss locally
    }
    // Update local state
    const updated = alerts.map(a => a.id === id ? { ...a, dismissed: true } : a);
    setData(Array.isArray(rawData) ? updated : { ...rawData, alerts: updated });
  };

  const counts = {
    all: alerts.filter(a => !a.dismissed).length,
    critical: alerts.filter(a => a.severity === 'critical' && !a.dismissed).length,
    warning: alerts.filter(a => a.severity === 'warning' && !a.dismissed).length,
    info: alerts.filter(a => a.severity === 'info' && !a.dismissed).length,
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now - d) / 60000);
    if (diff < 1) return `Just now`;
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  const filterButtons = [
    { key: 'all',      label: 'All Alerts', color: '#8B5CF6' },
    { key: 'critical', label: 'Critical', color: '#EF4444' },
    { key: 'warning',  label: 'Warning', color: '#F59E0B' },
    { key: 'info',     label: 'Info', color: '#3B82F6' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <Bell className="w-12 h-12 text-blue-500 animate-pulse mx-auto mb-4 opacity-50" />
          <p className="text-slate-400 font-medium">Scanning for anomalous events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-1 w-6 rounded-full bg-violet-500"></div>
            <span className="text-xs font-bold tracking-wider text-violet-400 uppercase">System Monitor</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">{t('alerts.title')}</h1>
          <p className="text-slate-400 mt-1">
            <span className="font-semibold text-white">{counts.all}</span> active alerts · <span className="text-red-400 font-semibold">{counts.critical}</span> critical
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3 text-red-400">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-900/50 rounded-2xl border border-slate-800 w-fit">
        <div className="pl-3 pr-2 flex items-center text-slate-500 hidden sm:flex">
          <Filter className="w-4 h-4" />
        </div>
        {filterButtons.map(fb => {
          const isActive = filter === fb.key;
          return (
            <button
              key={fb.key}
              onClick={() => setFilter(fb.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                isActive 
                  ? 'bg-slate-800 shadow-lg scale-100 ring-1 ring-white/10' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 scale-95'
              }`}
              style={isActive ? { color: fb.color } : {}}
            >
              {fb.label}
              <span className={`px-2 py-0.5 rounded-full text-xs ${isActive ? '' : 'bg-slate-800'}`} 
                style={isActive ? { backgroundColor: `${fb.color}20` } : {}}>
                {counts[fb.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Alert List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <GlowCard className="p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">All Clear</h3>
              <p className="text-slate-400 max-w-sm mx-auto">
                {alerts.length === 0 ? 'No alerts yet. Your inventory metrics are perfectly balanced.' : 'No alerts in this specific category.'}
              </p>
            </div>
          </GlowCard>
        ) : (
          filtered.map(alert => {
            const sc = severityConfig[alert.severity] || severityConfig.info;
            const Icon = sc.icon;
            return (
              <GlowCard 
                key={alert.id} 
                glowColor={sc.color}
                className="overflow-hidden transition-all duration-300 hover:translate-x-1"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4 p-5">
                  <div className="hidden sm:flex shrink-0 w-12 h-12 rounded-full items-center justify-center border shadow-inner" style={{ backgroundColor: `${sc.color}15`, borderColor: `${sc.color}30` }}>
                    <Icon className="w-6 h-6" style={{ color: sc.color }} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                      <div className="flex items-center gap-3">
                        <div className="sm:hidden shrink-0 w-8 h-8 rounded-full flex items-center justify-center border shadow-inner" style={{ backgroundColor: `${sc.color}15`, borderColor: `${sc.color}30` }}>
                          <Icon className="w-4 h-4" style={{ color: sc.color }} />
                        </div>
                        <h3 className="text-lg font-bold text-white truncate">{alert.title}</h3>
                      </div>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider tabular-nums shrink-0 mt-1 sm:mt-0">
                        {formatTime(alert.created_at)}
                      </span>
                    </div>
                    
                    <p className="text-slate-300 text-sm leading-relaxed mb-4 max-w-4xl">
                      {alert.message}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      {alert.product_name && (
                        <div className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 truncate max-w-[200px]">
                          {alert.product_name}
                        </div>
                      )}
                      <div className="px-2.5 py-1 rounded-lg border text-xs font-semibold uppercase tracking-wider" 
                           style={{ backgroundColor: `${sc.color}10`, borderColor: `${sc.color}20`, color: sc.color }}>
                        {alert.type}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 mt-4 sm:mt-0 flex justify-end">
                    <button 
                      onClick={() => dismiss(alert.id)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-all group"
                    >
                      <Check className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:text-emerald-400 transition-all" />
                      Dismiss
                    </button>
                  </div>
                </div>
                {/* Severity indicator line */}
                <div className="h-1 w-full" style={{ background: `linear-gradient(to right, ${sc.color}B3, transparent)` }}></div>
              </GlowCard>
            );
          })
        )}
      </div>
    </div>
  );
}
