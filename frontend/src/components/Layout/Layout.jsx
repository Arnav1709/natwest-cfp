import { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const navItems = [
  { label: 'nav.dashboard',   path: '/dashboard/overview',    icon: '📊' },
  { label: 'nav.forecasting', path: '/dashboard/forecasting', icon: '📈' },
  { label: 'nav.inventory',   path: '/dashboard/inventory',   icon: '📦' },
  { label: 'nav.products',    path: '/products',              icon: '🏷️' },
  { label: 'nav.upload',      path: '/upload',                icon: '📤' },
  { label: 'nav.reorder',     path: '/reorder',               icon: '🔄' },
  { label: 'nav.alerts',      path: '/alerts',                icon: '🔔', badge: 3 },
  { label: 'nav.settings',    path: '/settings',              icon: '⚙️' },
];

const bottomItems = [
  { label: 'nav.support', path: '#', icon: '💬' },
  { label: 'nav.logout',  path: '/', icon: '🚪' },
];

export default function Layout() {
  const { t } = useTranslation();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('overview'))    return t('dashboard.overview_title');
    if (path.includes('forecasting')) return t('forecast.title');
    if (path.includes('inventory'))   return 'Inventory Health';
    if (path.includes('scenarios'))   return 'Scenario Planning';
    if (path.includes('products'))    return t('products.title');
    if (path.includes('reorder'))     return t('reorder.title');
    if (path.includes('alerts'))      return t('alerts.title');
    if (path.includes('settings'))    return t('settings.title');
    if (path.includes('upload'))      return t('upload.title');
    return t('app_name');
  };

  return (
    <div className="app-layout">
      {/* Sidebar Overlay for Mobile */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">📦</div>
          <div className="sidebar-brand-text">
            <h1>{t('app_name')}</h1>
            <p>{t('tagline')}</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-link ${isActive || location.pathname.startsWith(item.path.split('/').slice(0, -1).join('/') + '/') && item.path === location.pathname ? 'active' : ''}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              <span>{t(item.label)}</span>
              {item.badge && <span className="sidebar-link-badge">{item.badge}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {bottomItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              className="sidebar-link"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              <span>{t(item.label)}</span>
            </NavLink>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              ☰
            </button>
            <h2 className="topbar-title">{getPageTitle()}</h2>
            <div className="topbar-search">
              <span>🔍</span>
              <input type="text" placeholder="Search inventory..." id="topbar-search-input" />
            </div>
          </div>
          <div className="topbar-right">
            <button className="topbar-icon-btn" id="btn-notifications" title="Notifications">
              🔔
              <span className="badge-dot" />
            </button>
            <button className="topbar-icon-btn" id="btn-theme" title="Theme">
              🌙
            </button>
            <div className="topbar-user">
              <div className="topbar-avatar">PA</div>
              <div className="topbar-user-info">
                <span className="topbar-user-name">Priya Admin</span>
                <span className="topbar-user-role">Manager Access</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="page-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
