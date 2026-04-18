import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '../hooks/useApi';
import { expiryApi } from '../services/api';

const ACTION_ICONS = {
  discount_sale: '🏷️',
  return_supplier: '🔄',
  bundle_promo: '📦',
  donate: '🤝',
  write_off: '🗑️',
};

const RISK_CONFIG = {
  expired: { label: 'Expired', class: 'badge-danger', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  critical: { label: '< 30 Days', class: 'badge-danger', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  warning: { label: '30–90 Days', class: 'badge-warning', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  safe: { label: '90+ Days', class: 'badge-success', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
};

export default function ExpiryTracker() {
  const { t } = useTranslation();
  const [riskFilter, setRiskFilter] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [advice, setAdvice] = useState(null);
  const [aiAvailable, setAiAvailable] = useState(true);

  const { data, loading, error } = useApi(() => expiryApi.batches(), []);

  const batches = data?.batches || [];
  const summary = data?.summary || {};

  // Group batches by month for calendar view
  const calendarData = useMemo(() => {
    const months = {};
    batches.forEach((b) => {
      const d = new Date(b.expiry_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!months[key]) months[key] = { key, label, items: [], totalValue: 0, totalQty: 0 };
      months[key].items.push(b);
      months[key].totalValue += b.total_value;
      months[key].totalQty += b.quantity || 0;
    });
    return Object.values(months).sort((a, b) => a.key.localeCompare(b.key));
  }, [batches]);

  // Filter batches by risk AND/OR selected month
  const filteredBatches = useMemo(() => {
    let result = batches;
    if (riskFilter) {
      result = result.filter((b) => b.risk === riskFilter);
    }
    if (selectedMonth) {
      result = result.filter((b) => {
        const d = new Date(b.expiry_date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return key === selectedMonth;
      });
    }
    return result;
  }, [batches, riskFilter, selectedMonth]);

  // Handle month card click
  const handleMonthClick = (monthKey) => {
    setSelectedMonth(selectedMonth === monthKey ? null : monthKey);
  };

  // Clear all filters
  const hasAnyFilter = riskFilter || selectedMonth;
  const clearAllFilters = () => {
    setRiskFilter(null);
    setSelectedMonth(null);
  };

  // Get selected month label for display
  const selectedMonthLabel = selectedMonth
    ? calendarData.find((m) => m.key === selectedMonth)?.label || selectedMonth
    : null;

  // Fetch AI advice
  const handleGetAdvice = async () => {
    setAdviceLoading(true);
    try {
      const result = await expiryApi.getAdvice();
      setAdvice(result.advice || []);
      setAiAvailable(result.ai_available !== false);
    } catch (err) {
      console.error('Failed to get advice:', err);
      setAdvice([]);
      setAiAvailable(false);
    } finally {
      setAdviceLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading expiry data...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>⏰ {t('nav.expiry', 'Expiry Tracker')}</h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
            Track batch-level expiry dates and get AI-powered disposal recommendations
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleGetAdvice}
          disabled={adviceLoading || batches.length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          {adviceLoading ? '⏳ Analyzing...' : '🤖 Get AI Recommendations'}
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', marginBottom: 'var(--space-4)', color: 'var(--color-warning)', fontSize: 'var(--font-size-sm)' }}>
          ⚠️ {error}
        </div>
      )}

      {/* KPI Summary */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-6)' }}>
        {[
          { key: 'expired', icon: '🔴', label: 'Expired', value: summary.expired || 0 },
          { key: 'critical', icon: '⚠️', label: '< 30 Days', value: summary.critical || 0 },
          { key: 'warning', icon: '🟡', label: '30–90 Days', value: summary.warning || 0 },
          { key: null, icon: '💰', label: 'Value at Risk', value: `₹${(summary.total_value_at_risk || 0).toLocaleString()}` },
        ].map((kpi, i) => (
          <div
            key={i}
            className="kpi-card"
            style={{ cursor: kpi.key ? 'pointer' : 'default', border: riskFilter === kpi.key ? '2px solid var(--color-primary)' : undefined }}
            onClick={() => kpi.key && setRiskFilter(riskFilter === kpi.key ? null : kpi.key)}
          >
            <div className="kpi-card-label">{kpi.icon} {kpi.label}</div>
            <div className="kpi-card-value">{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Calendar Timeline */}
      <div className="glass-card" style={{ marginBottom: 'var(--space-6)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0 }}>
            📅 Expiry Calendar
          </h3>
          {selectedMonth && (
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary-light)', background: 'rgba(13,148,136,0.15)', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
              Viewing: {selectedMonthLabel}
            </span>
          )}
        </div>
        {calendarData.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--space-4)' }}>
            No batches with expiry dates found.
          </p>
        ) : (
          <div style={{ display: 'flex', gap: 'var(--space-3)', overflowX: 'auto', paddingBottom: 'var(--space-2)' }}>
            {calendarData.map((month) => {
              const worstRisk = month.items.some((b) => b.risk === 'expired') ? 'expired'
                : month.items.some((b) => b.risk === 'critical') ? 'critical'
                : month.items.some((b) => b.risk === 'warning') ? 'warning' : 'safe';
              const rc = RISK_CONFIG[worstRisk];
              const isSelected = selectedMonth === month.key;

              return (
                <div
                  key={month.key}
                  onClick={() => handleMonthClick(month.key)}
                  style={{
                    minWidth: 200, maxWidth: 220, flex: '0 0 auto',
                    background: rc.bg, borderRadius: 'var(--radius-lg)',
                    border: isSelected ? `2px solid ${rc.color}` : `1px solid ${rc.color}33`,
                    padding: 'var(--space-3)',
                    cursor: 'pointer',
                    transition: 'border 0.2s ease',
                  }}
                >
                  {/* Month Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: rc.color }}>
                      {month.label}
                    </div>
                    <div style={{
                      fontSize: '0.65rem', fontWeight: 600, color: 'var(--color-text-muted)',
                      background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: 'var(--radius-full)',
                    }}>
                      {month.items.length} · {month.totalQty} qty
                    </div>
                  </div>

                  {/* Items List — always show max 4 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {month.items.slice(0, 4).map((b) => {
                      const brc = RISK_CONFIG[b.risk];
                      return (
                        <div
                          key={b.id}
                          style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            fontSize: 'var(--font-size-xs)', padding: '4px 8px',
                            background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)',
                            borderLeft: `3px solid ${brc.color}`, gap: 6,
                          }}
                        >
                          <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100, flex: 1 }}>
                            {b.product_name}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                            <span style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 'var(--radius-sm)' }}>
                              ×{b.quantity}
                            </span>
                            <span style={{ color: brc.color, fontWeight: 600, fontSize: '0.65rem', minWidth: 28, textAlign: 'right' }}>
                              {b.days_to_expiry <= 0 ? 'EXP' : `${b.days_to_expiry}d`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {month.items.length > 4 && (
                      <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                        +{month.items.length - 4} more
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div style={{ marginTop: 'var(--space-2)', fontSize: '0.7rem', color: 'var(--color-text-muted)', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 6 }}>
                    💰 ₹{Math.round(month.totalValue).toLocaleString()} at risk
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Advice Section */}
      {advice && (
        <div className="glass-card" style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>
              🤖 AI Disposal Recommendations
            </h3>
            {!aiAvailable && (
              <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                ⚠️ AI unavailable — using rule-based suggestions
              </span>
            )}
          </div>

          {advice.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>No expiring batches to advise on.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--space-3)' }}>
              {advice.map((item, i) => {
                const priorityColor = item.priority === 'high' ? '#EF4444' : item.priority === 'medium' ? '#F59E0B' : '#10B981';
                return (
                  <div
                    key={i}
                    style={{
                      background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-lg)',
                      border: '1px solid rgba(255,255,255,0.08)', padding: 'var(--space-4)',
                      borderLeft: `4px solid ${priorityColor}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>
                          💊 {item.product_name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                          {item.batch_number && `${item.batch_number} · `}
                          {item.days_left <= 0 ? '❌ Expired' : `${item.days_left} days left`}
                          {' · '}{item.stock} units · ₹{Math.round(item.value).toLocaleString()}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.65rem', fontWeight: 700,
                          color: priorityColor, textTransform: 'uppercase',
                          background: `${priorityColor}20`, padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        {item.priority}
                      </span>
                    </div>

                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: 'rgba(13,148,136,0.1)', borderRadius: 'var(--radius-md)',
                      padding: '8px 12px', marginBottom: 'var(--space-2)',
                      fontWeight: 600, fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-primary-light)',
                    }}>
                      {ACTION_ICONS[item.recommended_action] || '📋'} {item.action_label}
                    </div>

                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                      {item.rationale}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-2)', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                      <span>📊 Est. Recovery: {item.estimated_recovery_pct}%</span>
                      <span>💰 ~₹{Math.round(item.value * item.estimated_recovery_pct / 100).toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Detailed Batch Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'auto' }}>
        <div style={{ padding: 'var(--space-4) var(--space-4) var(--space-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0 }}>📋 {selectedMonthLabel ? `${selectedMonthLabel} Batches` : 'All Batches'}</h3>
            {hasAnyFilter && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                {selectedMonth && (
                  <span style={{
                    fontSize: '0.7rem', background: 'rgba(13,148,136,0.15)', color: 'var(--color-primary-light)',
                    padding: '3px 10px', borderRadius: 'var(--radius-full)', fontWeight: 600,
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                  }}>
                    📅 {selectedMonthLabel}
                    <span
                      style={{ cursor: 'pointer', marginLeft: 2, opacity: 0.7 }}
                      onClick={(e) => { e.stopPropagation(); setSelectedMonth(null); }}
                    >✕</span>
                  </span>
                )}
                {riskFilter && (
                  <span style={{
                    fontSize: '0.7rem', background: `${RISK_CONFIG[riskFilter].color}20`, color: RISK_CONFIG[riskFilter].color,
                    padding: '3px 10px', borderRadius: 'var(--radius-full)', fontWeight: 600,
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                  }}>
                    {RISK_CONFIG[riskFilter].label}
                    <span
                      style={{ cursor: 'pointer', marginLeft: 2, opacity: 0.7 }}
                      onClick={(e) => { e.stopPropagation(); setRiskFilter(null); }}
                    >✕</span>
                  </span>
                )}
              </div>
            )}
          </div>
          {hasAnyFilter && (
            <button className="btn btn-ghost btn-sm" onClick={clearAllFilters} style={{ fontSize: '0.75rem' }}>
              ✕ Clear all filters
            </button>
          )}
        </div>

        {/* Result count */}
        {hasAnyFilter && (
          <div style={{ padding: '0 var(--space-4) var(--space-2)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Showing {filteredBatches.length} of {batches.length} batches
          </div>
        )}

        {filteredBatches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>📦</div>
            <p>{hasAnyFilter ? 'No batches match the current filters.' : 'No batches found. Add batches via the Upload page to start tracking expiry dates.'}</p>
            {hasAnyFilter && (
              <button className="btn btn-ghost btn-sm" onClick={clearAllFilters} style={{ marginTop: 'var(--space-2)' }}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Batch</th>
                <th>Category</th>
                <th>Expiry Date</th>
                <th>Days Left</th>
                <th>Stock</th>
                <th>Unit Cost</th>
                <th>Value at Risk</th>
                <th>Risk</th>
              </tr>
            </thead>
            <tbody>
              {filteredBatches.map((b) => {
                const rc = RISK_CONFIG[b.risk];
                return (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 600 }}>{b.product_name}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{b.batch_number || '—'}</td>
                    <td style={{ textTransform: 'capitalize' }}>{b.category || '—'}</td>
                    <td>{new Date(b.expiry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: rc.color }}>
                        {b.days_to_expiry <= 0 ? 'EXPIRED' : `${b.days_to_expiry} days`}
                      </span>
                    </td>
                    <td>{b.quantity}</td>
                    <td>₹{b.unit_cost}</td>
                    <td style={{ fontWeight: 600 }}>₹{Math.round(b.total_value).toLocaleString()}</td>
                    <td><span className={`badge ${rc.class}`}>{rc.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
