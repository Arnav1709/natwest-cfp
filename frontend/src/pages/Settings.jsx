import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '../hooks/useApi';
import { settingsApi } from '../services/api';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('profile');
  const { data: rawNotifs, loading, setData: setRawNotifs } = useApi(() => settingsApi.getNotifications(), []);
  
  const notifs = rawNotifs || {};
  
  const [profile, setProfile] = useState({
    name: 'Priya Admin',
    email: 'priya@stocksense.in',
    phone: '+91 9876543210',
    businessName: JSON.parse(localStorage.getItem('stocksense-shop') || '{}').shopName || 'Priya Medical Store',
    city: JSON.parse(localStorage.getItem('stocksense-shop') || '{}').city || 'Hyderabad',
    state: JSON.parse(localStorage.getItem('stocksense-shop') || '{}').state || 'Telangana',
  });

  const tabs = [
    { key: 'profile',       label: t('settings.profile'),        icon: '👤' },
    { key: 'notifications', label: t('settings.notifications'),   icon: '🔔' },
    { key: 'whatsapp',      label: t('settings.whatsapp'),        icon: '💬' },
  ];

  const toggleNotif = async (key) => {
    const newValue = !notifs[key];
    setRawNotifs({ ...notifs, [key]: newValue });
    try {
      await settingsApi.updateNotifications({ [key]: newValue });
    } catch (e) {
      console.error(e);
      setRawNotifs({ ...notifs, [key]: !newValue });
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
        {t('settings.title')}
      </h1>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`btn ${activeTab === tab.key ? 'btn-primary' : 'btn-ghost'} btn-sm`}
            onClick={() => setActiveTab(tab.key)}
            id={`tab-${tab.key}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="glass-card">
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Business Profile</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            {[
              { label: 'Full Name', key: 'name' },
              { label: 'Email', key: 'email' },
              { label: 'Phone', key: 'phone' },
              { label: 'Business Name', key: 'businessName' },
              { label: 'City', key: 'city' },
              { label: 'State', key: 'state' },
            ].map(field => (
              <div className="form-group" key={field.key}>
                <label className="form-label">{field.label}</label>
                <input
                  className="form-input"
                  value={profile[field.key]}
                  onChange={(e) => setProfile(prev => ({ ...prev, [field.key]: e.target.value }))}
                  id={`setting-${field.key}`}
                />
              </div>
            ))}
          </div>

          <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
            <label className="form-label">Language Preference</label>
            <select
              className="form-select"
              value={i18n.language}
              onChange={(e) => { i18n.changeLanguage(e.target.value); localStorage.setItem('stocksense-lang', e.target.value); }}
              style={{ maxWidth: 200 }}
              id="setting-language"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
            </select>
          </div>

          <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-2)' }}>
            <button className="btn btn-primary" id="btn-save-profile">{t('common.save')} Profile</button>
            <button className="btn btn-secondary">{t('common.cancel')}</button>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="glass-card">
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Notification Preferences</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {[
              { key: 'stockout_alerts',   label: 'Stockout Alerts',    desc: 'Get notified when inventory reaches zero' },
              { key: 'low_stock_alerts',  label: 'Low Stock Alerts',   desc: 'Alert when stock falls below reorder point' },
              { key: 'daily_briefing',    label: 'Daily Briefing',     desc: 'Receive daily summary of inventory status' },
              { key: 'weekly_summary',    label: 'Weekly Summary',     desc: 'End-of-week performance & forecast report' },
              { key: 'seasonal_warnings', label: 'Seasonal Warnings',  desc: 'AI-powered disease/season demand alerts' },
              { key: 'anomaly_alerts',    label: 'Anomaly Detection',  desc: 'Alert on unusual demand patterns' },
            ].map(item => (
              <div key={item.key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
                background: 'var(--color-bg-card)', border: '1px solid var(--color-border)'
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>{item.label}</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{item.desc}</div>
                </div>
                <div
                  onClick={() => toggleNotif(item.key)}
                  style={{
                    width: 44, height: 24, borderRadius: 'var(--radius-full)', cursor: 'pointer',
                    background: notifs[item.key] ? 'var(--color-primary)' : 'var(--color-bg-active)',
                    position: 'relative', transition: 'background 0.2s ease',
                  }}
                  id={`toggle-${item.key}`}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', background: 'white',
                    position: 'absolute', top: 3,
                    left: notifs[item.key] ? 23 : 3,
                    transition: 'left 0.2s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>

          <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 'var(--space-6) 0 var(--space-3)' }}>
            Notification Channels
          </h3>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            {[
              { key: 'channel_in_app', label: '📱 In-App', active: notifs.channel_in_app },
              { key: 'channel_whatsapp', label: '💬 WhatsApp', active: notifs.channel_whatsapp },
              { key: 'channel_email', label: '📧 Email', active: notifs.channel_email },
            ].map(ch => (
              <div
                key={ch.key}
                className={`onboarding-card ${ch.active ? 'selected' : ''}`}
                onClick={() => toggleNotif(ch.key)}
                style={{ padding: 'var(--space-3) var(--space-4)', cursor: 'pointer' }}
                id={ch.key}
              >
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{ch.label}</span>
              </div>
            ))}
          </div>

          <button className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }} id="btn-save-notifs">
            {t('common.save')} Preferences
          </button>
        </div>
      )}

      {/* WhatsApp Tab */}
      {activeTab === 'whatsapp' && (
        <div className="glass-card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>💬</div>
          <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
            Connect WhatsApp
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', maxWidth: '400px', margin: '0 auto var(--space-6)' }}>
            Scan the QR code with WhatsApp to enable inventory management via chat. Get daily briefings, reorder alerts, and manage stock from your phone.
          </p>
          <div style={{
            width: 200, height: 200, margin: '0 auto var(--space-4)',
            background: 'white', borderRadius: 'var(--radius-lg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.875rem', color: '#333', padding: 'var(--space-4)', textAlign: 'center'
          }}>
            QR Code will appear here when WhatsApp Bot is running
          </div>
          <button className="btn btn-primary btn-lg" id="btn-connect-whatsapp">
            🔄 Generate QR Code
          </button>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-3)' }}>
            WhatsApp Bot server must be running on port 3001
          </p>
        </div>
      )}
    </div>
  );
}
