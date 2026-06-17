import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Bell, Save, Globe, Smartphone, Mail, CheckCircle2, ChevronRight } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { settingsApi } from '../services/api';
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

  const tabs = [
    { key: 'profile',       label: t('settings.profile'),      icon: User },
    { key: 'notifications', label: t('settings.notifications'), icon: Bell },
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
    </div>
  );
}
