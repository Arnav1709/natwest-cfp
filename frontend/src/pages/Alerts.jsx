import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { mockAlerts } from '../mocks/mockData';

const severityConfig = {
  critical: { icon: '🔴', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' },
  warning: { icon: '🟡', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  info: { icon: '🔵', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)' },
};

export default function Alerts() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('all');
  const [alerts, setAlerts] = useState(mockAlerts);

  const filtered = alerts.filter(a => {
    if (filter === 'all') return !a.dismissed;
    return a.severity === filter && !a.dismissed;
  });

  const dismiss = (id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, dismissed: true } : a));
  };

  const counts = {
    all: alerts.filter(a => !a.dismissed).length,
    critical: alerts.filter(a => a.severity === 'critical' && !a.dismissed).length,
    warning: alerts.filter(a => a.severity === 'warning' && !a.dismissed).length,
    info: alerts.filter(a => a.severity === 'info' && !a.dismissed).length,
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now - d) / 60000);
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  const filterButtons = [
    { key: 'all',      label: t('alerts.all') },
    { key: 'critical', label: t('alerts.critical') },
    { key: 'warning',  label: t('alerts.warning') },
    { key: 'info',     label: t('alerts.info') },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>{t('alerts.title')}</h1>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
          {counts.all} active alerts · {counts.critical} critical
        </p>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        {filterButtons.map(fb => (
          <button
            key={fb.key}
            className={`btn ${filter === fb.key ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setFilter(fb.key)}
            id={`filter-${fb.key}`}
          >
            {fb.label} ({counts[fb.key]})
          </button>
        ))}
      </div>

      {/* Alert List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {filtered.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 'var(--space-3)' }}>✅</div>
            <p style={{ color: 'var(--color-text-muted)' }}>No alerts in this category</p>
          </div>
        ) : (
          filtered.map(alert => {
            const sc = severityConfig[alert.severity];
            return (
              <div key={alert.id} className="glass-card" style={{
                borderLeft: `4px solid ${sc.border}`,
                background: sc.bg,
                display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)'
              }}>
                <span style={{ fontSize: '1.5rem', marginTop: 2 }}>{sc.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
                    <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {alert.title}
                    </h3>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                      {formatTime(alert.created_at)}
                    </span>
                  </div>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 'var(--space-3)' }}>
                    {alert.message}
                  </p>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                    {alert.product_name && (
                      <span className="badge badge-muted">{alert.product_name}</span>
                    )}
                    <span className="badge badge-muted" style={{ textTransform: 'capitalize' }}>{alert.type}</span>
                    <div style={{ flex: 1 }} />
                    <button className="btn btn-ghost btn-sm" onClick={() => dismiss(alert.id)} style={{ color: 'var(--color-text-muted)' }}>
                      {t('alerts.dismiss')}
                    </button>
                    <button className="btn btn-primary btn-sm">View Details</button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
