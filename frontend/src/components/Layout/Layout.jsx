import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { alertsApi } from '../../services/api';

const navItems = [
  { section: 'Main' },
  { path: '/dashboard/overview', icon: '📊', label: 'Overview' },
  { path: '/dashboard/forecasting', icon: '🔮', label: 'Forecasting' },
  { path: '/dashboard/inventory', icon: '📦', label: 'Inventory Health' },
  { path: '/dashboard/scenarios', icon: '🧪', label: 'Scenarios' },
  { section: 'Operations' },
  { path: '/products', icon: '🏷️', label: 'Products' },
  { path: '/sales', icon: '💳', label: 'Record Sales' },
  { path: '/reorder', icon: '🔄', label: 'Reorder' },
  { path: '/expiry', icon: '⏰', label: 'Expiry Tracker' },
  { path: '/alerts', icon: '🔔', label: 'Alerts', badge: true },
  { section: 'Data' },
  { path: '/upload', icon: '📤', label: 'Upload Data' },
  { section: 'System' },
  { path: '/settings', icon: '⚙️', label: 'Settings' },
];

export default function Layout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  const user = (() => {
    try { return JSON.parse(localStorage.getItem('SupplySense-user')) || {}; } catch { return {}; }
  })();

  const handleLogout = () => {
    localStorage.removeItem('SupplySense-token');
    localStorage.removeItem('SupplySense-user');
    navigate('/login');
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Fetch real alert count from API
  useEffect(() => {
    let cancelled = false;
    const fetchAlerts = async () => {
      try {
        const data = await alertsApi.list({ status: 'active' });
        if (!cancelled) {
          const alerts = Array.isArray(data) ? data : (data?.alerts || []);
          setAlertCount(alerts.filter(a => !a.dismissed).length);
        }
      } catch {
        // Silently fail — badge just shows 0
      }
    };
    fetchAlerts();
    return () => { cancelled = true; };
  }, [location.pathname]);

  // Get page title from current route
  const getPageTitle = () => {
    const item = navItems.find((n) => n.path && location.pathname.startsWith(n.path));
    return item?.label || 'Dashboard';
  };

  return (
    <div className={`app-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${mobileOpen ? 'visible' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* === Sidebar === */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''}`}>
        {/* Collapse toggle */}
        <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? '→' : '←'}
        </button>

        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">📦</div>
          <div className="sidebar-brand-text">
            Supply<span style={{ color: 'var(--color-primary-light)' }}>Sense</span>
            <span className="sidebar-brand-sub">AI Inventory</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map((item, i) => {
            if (item.section) {
              return (
                <div key={`section-${i}`} className="sidebar-section-label">
                  {t(`nav.${item.section.toLowerCase()}`, item.section)}
                </div>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <span className="sidebar-link-icon">{item.icon}</span>
                <span className="sidebar-link-label">{t(`nav.${item.label.toLowerCase().replace(/\s+/g, '_')}`, item.label)}</span>
                {item.badge && alertCount > 0 && (
                  <span className="sidebar-link-badge">{alertCount}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={handleLogout} title="Logout">
            <div className="sidebar-user-avatar">
              {(user.shop_name || user.phone || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user.shop_name || 'My Shop'}</div>
              <div className="sidebar-user-role">{user.phone || 'User'}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* === Main Area === */}
      <div className="app-layout-content">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu-toggle" onClick={() => setMobileOpen(true)}>
              ☰
            </button>
            <div>
              <div className="topbar-title">{getPageTitle()}</div>
              <div className="topbar-subtitle">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>

          <div className="topbar-right">
            <div className="topbar-search">
              <span className="topbar-search-icon">🔍</span>
              <input type="text" placeholder="Search..." />
            </div>

            <button className="topbar-action" onClick={() => navigate('/alerts')} title="Notifications">
              🔔
              {alertCount > 0 && <span className="notification-dot" />}
            </button>

            <button className="topbar-action" onClick={handleLogout} title="Logout">
              🚪
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
