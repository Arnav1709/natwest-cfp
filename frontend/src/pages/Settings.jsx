import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { useApi } from '../hooks/useApi';
import { settingsApi, whatsappApi } from '../services/api';

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

  // ── WhatsApp state ──
  const [waStatus, setWaStatus] = useState({ connected: false, phone: null, uptime: 0 });
  const [waQR, setWaQR] = useState(null);       // QR string (from bot)
  const [waState, setWaState] = useState('idle'); // idle | loading | qr_ready | connected | bot_offline | error
  const [waError, setWaError] = useState('');
  const pollRef = useRef(null);

  // ── Poll WhatsApp status every 3s when on whatsapp tab ──
  const pollStatus = useCallback(async () => {
    try {
      const status = await whatsappApi.status();
      setWaStatus(status);
      if (status.connected) {
        setWaState('connected');
        setWaQR(null);
        // Stop polling once connected
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    } catch (e) {
      console.warn('WhatsApp status poll failed:', e.message);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'whatsapp') {
      // Initial status check
      pollStatus();
      // Start polling
      pollRef.current = setInterval(pollStatus, 3000);
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [activeTab, pollStatus]);

  // ── Generate QR Code handler ──
  const handleGenerateQR = async () => {
    setWaState('loading');
    setWaError('');
    try {
      const data = await whatsappApi.connect();
      if (data.status === 'connected') {
        setWaState('connected');
        setWaQR(null);
      } else if (data.status === 'bot_offline') {
        setWaState('bot_offline');
        setWaQR(null);
      } else if (data.qr_code) {
        setWaQR(data.qr_code);
        setWaState('qr_ready');
        // Start polling for connection status
        if (!pollRef.current) {
          pollRef.current = setInterval(pollStatus, 3000);
        }
      } else if (data.status === 'initializing') {
        setWaState('loading');
        setWaError('WhatsApp bot is starting up. Please wait a moment and try again.');
        // Keep polling
        if (!pollRef.current) {
          pollRef.current = setInterval(pollStatus, 3000);
        }
      } else {
        setWaState('error');
        setWaError('Could not get QR code. Please try again.');
      }
    } catch (e) {
      setWaState('error');
      setWaError(e.message || 'Failed to connect to WhatsApp service.');
    }
  };

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

  // ── Format uptime for display ──
  const formatUptime = (seconds) => {
    if (!seconds) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
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
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="te">తెలుగు (Telugu)</option>
              <option value="mr">मराठी (Marathi)</option>
              <option value="bn">বাংলা (Bengali)</option>
              <option value="gu">ગુજરાતી (Gujarati)</option>
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

          {/* ── Connected State ── */}
          {waState === 'connected' && (
            <>
              <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>✅</div>
              <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--space-2)', color: 'var(--color-success, #22c55e)' }}>
                WhatsApp Connected
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
                {waStatus.phone ? `Connected as ${waStatus.phone}` : 'Your WhatsApp is connected and ready.'}
              </p>
              {waStatus.uptime > 0 && (
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                  Uptime: {formatUptime(waStatus.uptime)}
                </p>
              )}
              <div style={{
                marginTop: 'var(--space-4)', padding: 'var(--space-3)',
                background: 'var(--color-bg-card)', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)', textAlign: 'left', maxWidth: 400, margin: 'var(--space-4) auto 0',
              }}>
                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-2)' }}>
                  Available Commands
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
                  <div><strong>REORDER</strong> — Get AI reorder list</div>
                  <div><strong>LIST</strong> — View inventory status</div>
                  <div><strong>STATUS</strong> — Stock health summary</div>
                  <div><strong>REPORT</strong> — Forecast report link</div>
                  <div><strong>STOP</strong> — Pause notifications</div>
                  <div><strong>HELP</strong> — Show all commands</div>
                </div>
              </div>
            </>
          )}

          {/* ── QR Ready State ── */}
          {waState === 'qr_ready' && waQR && (
            <>
              <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>📱</div>
              <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                Scan QR Code
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', maxWidth: '400px', margin: '0 auto var(--space-4)' }}>
                Open WhatsApp on your phone → Linked Devices → Link a Device → Point camera at the QR code below.
              </p>
              <div style={{
                width: 280, height: 280, margin: '0 auto var(--space-4)',
                background: 'white', borderRadius: 'var(--radius-lg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
              }}>
                <QRCodeSVG
                  value={waQR}
                  size={248}
                  level="M"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', animation: 'pulse 1.5s infinite' }} />
                Waiting for scan... (checking every 3 seconds)
              </p>
              <button className="btn btn-secondary btn-sm" onClick={handleGenerateQR} style={{ marginTop: 'var(--space-3)' }} id="btn-refresh-qr">
                🔄 Refresh QR Code
              </button>
            </>
          )}

          {/* ── Idle / Default State ── */}
          {(waState === 'idle' || waState === 'error') && (
            <>
              <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>💬</div>
              <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                Connect WhatsApp
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', maxWidth: '400px', margin: '0 auto var(--space-6)' }}>
                Scan the QR code with WhatsApp to enable inventory management via chat. Get daily briefings, reorder alerts, and manage stock from your phone.
              </p>
              {waError && (
                <div style={{
                  padding: 'var(--space-3)', marginBottom: 'var(--space-4)',
                  background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-md)', color: '#ef4444', fontSize: 'var(--font-size-sm)',
                  maxWidth: 400, margin: '0 auto var(--space-4)',
                }}>
                  ⚠️ {waError}
                </div>
              )}
              <button
                className="btn btn-primary btn-lg"
                onClick={handleGenerateQR}
                id="btn-connect-whatsapp"
              >
                🔄 Generate QR Code
              </button>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-3)' }}>
                WhatsApp Bot server must be running on port 3001
              </p>
            </>
          )}

          {/* ── Loading State ── */}
          {waState === 'loading' && (
            <>
              <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>⏳</div>
              <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                Connecting...
              </h2>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                {waError || 'Fetching QR code from WhatsApp bot...'}
              </p>
              <button className="btn btn-secondary btn-sm" onClick={handleGenerateQR} style={{ marginTop: 'var(--space-4)' }}>
                🔄 Retry
              </button>
            </>
          )}

          {/* ── Bot Offline State ── */}
          {waState === 'bot_offline' && (
            <>
              <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>🔌</div>
              <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--space-2)', color: '#ef4444' }}>
                WhatsApp Bot Offline
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', maxWidth: '400px', margin: '0 auto var(--space-4)' }}>
                The WhatsApp bot service is not running. Make sure the Docker container <code>stocksense-whatsapp</code> is up on port 3001.
              </p>
              <button className="btn btn-primary" onClick={handleGenerateQR} id="btn-retry-whatsapp">
                🔄 Retry Connection
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
