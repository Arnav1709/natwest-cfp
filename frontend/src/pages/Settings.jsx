import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { User, Bell, MessageCircle, Save, Globe, Smartphone, Mail, RefreshCw, CheckCircle2, AlertTriangle, Wifi, WifiOff, Loader2, QrCode, ChevronRight } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { settingsApi, whatsappApi } from '../services/api';
import GlowCard from '../components/GlowCard';
import ShimmerButton from '../components/ShimmerButton';

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
  const [waQR, setWaQR] = useState(null);
  const [waState, setWaState] = useState('idle');
  const [waError, setWaError] = useState('');
  const pollRef = useRef(null);

  const pollStatus = useCallback(async () => {
    try {
      const status = await whatsappApi.status();
      setWaStatus(status);
      if (status.connected) {
        setWaState('connected');
        setWaQR(null);
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
      pollStatus();
      pollRef.current = setInterval(pollStatus, 3000);
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [activeTab, pollStatus]);

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
        if (!pollRef.current) {
          pollRef.current = setInterval(pollStatus, 3000);
        }
      } else if (data.status === 'initializing') {
        setWaState('loading');
        setWaError('WhatsApp bot is starting up. Please wait a moment and try again.');
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
    { key: 'profile',       label: t('settings.profile'),      icon: User },
    { key: 'notifications', label: t('settings.notifications'), icon: Bell },
    { key: 'whatsapp',      label: t('settings.whatsapp'),      icon: MessageCircle },
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

  const formatUptime = (seconds) => {
    if (!seconds) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="max-w-[900px] mx-auto space-y-6 animate-fade-in-up">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="h-1 w-6 rounded-full bg-violet-500"></div>
          <span className="text-xs font-bold tracking-wider text-violet-400 uppercase">Configuration</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">{t('settings.title')}</h1>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 p-1.5 bg-slate-900/50 rounded-2xl border border-slate-800 w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive 
                  ? 'bg-slate-800 text-white shadow-lg ring-1 ring-white/10' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
              id={`tab-${tab.key}`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <GlowCard className="p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-violet-500/20">
              {profile.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Business Profile</h2>
              <p className="text-sm text-slate-400">Manage your account and business details</p>
            </div>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-5">
            {[
              { label: 'Full Name', key: 'name', icon: User },
              { label: 'Email', key: 'email', icon: Mail },
              { label: 'Phone', key: 'phone', icon: Smartphone },
              { label: 'Business Name', key: 'businessName', icon: null },
              { label: 'City', key: 'city', icon: null },
              { label: 'State', key: 'state', icon: null },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-slate-300 mb-2">{field.label}</label>
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all font-medium placeholder:text-slate-600"
                  value={profile[field.key]}
                  onChange={(e) => setProfile(prev => ({ ...prev, [field.key]: e.target.value }))}
                  id={`setting-${field.key}`}
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Globe className="w-4 h-4 inline mr-1.5" />
              Language Preference
            </label>
            <div className="relative w-64">
              <select
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all font-medium"
                value={i18n.language}
                onChange={(e) => { i18n.changeLanguage(e.target.value); localStorage.setItem('stocksense-lang', e.target.value); }}
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
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                <ChevronRight className="w-4 h-4 text-slate-400 rotate-90" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <ShimmerButton id="btn-save-profile">
              <span className="flex items-center gap-2"><Save className="w-4 h-4" /> {t('common.save')} Profile</span>
            </ShimmerButton>
            <button className="px-5 py-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 font-medium border border-slate-700/50 transition-colors">
              {t('common.cancel')}
            </button>
          </div>
        </GlowCard>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <GlowCard className="p-6 space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
              <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Alert Preferences</h2>
                <p className="text-sm text-slate-400">Customize when and how you're notified</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {[
                { key: 'stockout_alerts',   label: 'Stockout Alerts',    desc: 'Get notified when inventory reaches zero', color: '#EF4444' },
                { key: 'low_stock_alerts',  label: 'Low Stock Alerts',   desc: 'Alert when stock falls below reorder point', color: '#F59E0B' },
                { key: 'daily_briefing',    label: 'Daily Briefing',     desc: 'Receive daily summary of inventory status', color: '#3B82F6' },
                { key: 'weekly_summary',    label: 'Weekly Summary',     desc: 'End-of-week performance & forecast report', color: '#8B5CF6' },
                { key: 'seasonal_warnings', label: 'Seasonal Warnings',  desc: 'AI-powered disease/season demand alerts', color: '#10B981' },
                { key: 'anomaly_alerts',    label: 'Anomaly Detection',  desc: 'Alert on unusual demand patterns', color: '#EC4899' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }}></div>
                    <div>
                      <div className="font-semibold text-sm text-white group-hover:text-white transition-colors">{item.label}</div>
                      <div className="text-xs text-slate-500">{item.desc}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleNotif(item.key)}
                    className={`relative w-12 h-7 rounded-full transition-all duration-300 ${notifs[item.key] ? 'shadow-lg' : 'bg-slate-700'}`}
                    style={notifs[item.key] ? { backgroundColor: item.color, boxShadow: `0 0 16px ${item.color}40` } : {}}
                    id={`toggle-${item.key}`}
                  >
                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${notifs[item.key] ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
              ))}
            </div>
          </GlowCard>

          <GlowCard className="p-6">
            <h3 className="text-lg font-bold text-white mb-4">Notification Channels</h3>
            <div className="flex gap-3 flex-wrap">
              {[
                { key: 'channel_in_app',    label: 'In-App',    icon: Smartphone, color: '#8B5CF6' },
                { key: 'channel_whatsapp',  label: 'WhatsApp',  icon: MessageCircle, color: '#22C55E' },
                { key: 'channel_email',     label: 'Email',     icon: Mail, color: '#3B82F6' },
              ].map(ch => {
                const active = notifs[ch.key];
                const Icon = ch.icon;
                return (
                  <button
                    key={ch.key}
                    onClick={() => toggleNotif(ch.key)}
                    className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border font-semibold transition-all ${
                      active 
                        ? 'ring-1 text-white' 
                        : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                    style={active ? { backgroundColor: `${ch.color}15`, borderColor: `${ch.color}50`, color: ch.color, boxShadow: `0 0 20px ${ch.color}15` } : {}}
                    id={ch.key}
                  >
                    <Icon className="w-5 h-5" />
                    {ch.label}
                    {active && <CheckCircle2 className="w-4 h-4 ml-1" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-6">
              <ShimmerButton id="btn-save-notifs">
                <span className="flex items-center gap-2"><Save className="w-4 h-4" /> {t('common.save')} Preferences</span>
              </ShimmerButton>
            </div>
          </GlowCard>
        </div>
      )}

      {/* WhatsApp Tab */}
      {activeTab === 'whatsapp' && (
        <GlowCard className="p-8 text-center relative overflow-hidden" glowColor="#22C55E">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-20 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

          {/* Connected State */}
          {waState === 'connected' && (
            <div className="relative z-10 space-y-4">
              <div className="w-20 h-20 mx-auto bg-emerald-500/10 rounded-full flex items-center justify-center border-2 border-emerald-500/30 shadow-lg shadow-emerald-500/10">
                <Wifi className="w-10 h-10 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-emerald-400">WhatsApp Connected</h2>
              <p className="text-slate-400 max-w-md mx-auto">
                {waStatus.phone ? `Connected as ${waStatus.phone}` : 'Your WhatsApp is connected and ready.'}
              </p>
              {waStatus.uptime > 0 && (
                <p className="text-xs text-slate-500 tabular-nums">Uptime: {formatUptime(waStatus.uptime)}</p>
              )}
              <div className="max-w-md mx-auto mt-6 p-5 bg-slate-900/80 rounded-xl border border-slate-700 text-left space-y-3">
                <div className="font-bold text-sm text-white flex items-center gap-2 mb-3">
                  <MessageCircle className="w-4 h-4 text-emerald-400" /> Available Commands
                </div>
                {[
                  { cmd: 'REORDER', desc: 'Get AI reorder list' },
                  { cmd: 'LIST',    desc: 'View inventory status' },
                  { cmd: 'STATUS',  desc: 'Stock health summary' },
                  { cmd: 'REPORT',  desc: 'Forecast report link' },
                  { cmd: 'STOP',    desc: 'Pause notifications' },
                  { cmd: 'HELP',    desc: 'Show all commands' },
                ].map(c => (
                  <div key={c.cmd} className="flex items-center gap-3 text-sm">
                    <code className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold text-xs border border-emerald-500/20">
                      {c.cmd}
                    </code>
                    <span className="text-slate-400">{c.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QR Ready State */}
          {waState === 'qr_ready' && waQR && (
            <div className="relative z-10 space-y-5">
              <div className="w-16 h-16 mx-auto bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/30">
                <QrCode className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Scan QR Code</h2>
              <p className="text-slate-400 max-w-md mx-auto text-sm">
                Open WhatsApp → Linked Devices → Link a Device → Point camera at the QR code below.
              </p>
              <div className="w-72 h-72 mx-auto bg-white rounded-2xl p-4 shadow-2xl shadow-black/30">
                <QRCodeSVG value={waQR} size={248} level="M" includeMargin={false} bgColor="#ffffff" fgColor="#000000" />
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Waiting for scan... (checking every 3 seconds)
              </div>
              <button
                onClick={handleGenerateQR}
                className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium border border-slate-700 transition-colors"
                id="btn-refresh-qr"
              >
                <RefreshCw className="w-4 h-4" /> Refresh QR
              </button>
            </div>
          )}

          {/* Idle / Error State */}
          {(waState === 'idle' || waState === 'error') && (
            <div className="relative z-10 space-y-5">
              <div className="w-20 h-20 mx-auto bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
                <MessageCircle className="w-10 h-10 text-slate-500" />
              </div>
              <h2 className="text-2xl font-bold text-white">Connect WhatsApp</h2>
              <p className="text-slate-400 max-w-lg mx-auto text-sm leading-relaxed">
                Scan the QR code with WhatsApp to enable inventory management via chat. Get daily briefings, reorder alerts, and manage stock from your phone.
              </p>
              {waError && (
                <div className="max-w-md mx-auto bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-3 text-red-400 text-sm text-left">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  {waError}
                </div>
              )}
              <ShimmerButton onClick={handleGenerateQR} id="btn-connect-whatsapp">
                <span className="flex items-center gap-2"><QrCode className="w-5 h-5" /> Generate QR Code</span>
              </ShimmerButton>
              <p className="text-xs text-slate-600">WhatsApp Bot server must be running on port 3001</p>
            </div>
          )}

          {/* Loading State */}
          {waState === 'loading' && (
            <div className="relative z-10 space-y-4">
              <div className="w-20 h-20 mx-auto bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/30">
                <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-white">Connecting...</h2>
              <p className="text-slate-400">{waError || 'Fetching QR code from WhatsApp bot...'}</p>
              <button
                onClick={handleGenerateQR}
                className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium border border-slate-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" /> Retry
              </button>
            </div>
          )}

          {/* Bot Offline State */}
          {waState === 'bot_offline' && (
            <div className="relative z-10 space-y-4">
              <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/30">
                <WifiOff className="w-10 h-10 text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-red-400">WhatsApp Bot Offline</h2>
              <p className="text-slate-400 max-w-lg mx-auto text-sm leading-relaxed">
                The WhatsApp bot service is not running. Make sure the Docker container <code className="bg-slate-800 px-1.5 py-0.5 rounded text-xs text-white">stocksense-whatsapp</code> is up on port 3001.
              </p>
              <ShimmerButton onClick={handleGenerateQR} id="btn-retry-whatsapp">
                <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Retry Connection</span>
              </ShimmerButton>
            </div>
          )}
        </GlowCard>
      )}
    </div>
  );
}
