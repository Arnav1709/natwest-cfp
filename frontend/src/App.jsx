import { Component } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import LanguageSelection from './pages/onboarding/LanguageSelection';
import BusinessType from './pages/onboarding/BusinessType';
import ShopSetup from './pages/onboarding/ShopSetup';
import Upload from './pages/upload/Upload';
import Verify from './pages/upload/Verify';
import Overview from './pages/dashboard/Overview';
import Forecasting from './pages/dashboard/Forecasting';
import InventoryHealth from './pages/dashboard/InventoryHealth';
import Scenarios from './pages/dashboard/Scenarios';
import ProductCatalog from './pages/products/ProductCatalog';
import ProductDetail from './pages/products/ProductDetail';
import Reorder from './pages/Reorder';
import ExpiryTracker from './pages/ExpiryTracker';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';
import RecordSales from './pages/sales/RecordSales';

/**
 * Top-level error boundary — catches crashes and shows a styled recovery
 * page instead of a blank white screen.
 */
class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('App crash caught by AppErrorBoundary:', error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#0B1120', color: '#F8FAFC', fontFamily: 'Inter, system-ui, sans-serif',
        }}>
          <div style={{ textAlign: 'center', maxWidth: 480, padding: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Something went wrong</h1>
            <p style={{ color: '#94A3B8', marginBottom: '1rem', fontSize: '0.875rem' }}>
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <p style={{ color: '#475569', marginBottom: '1.5rem', fontSize: '0.75rem', fontFamily: 'monospace', 
              background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: 6, wordBreak: 'break-all' }}>
              {this.state.error?.stack?.split('\n')[0] || ''}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 24px', background: 'linear-gradient(135deg, #0D9488, #10B981)',
                color: 'white', border: 'none', borderRadius: 8, fontWeight: 600,
                cursor: 'pointer', fontSize: '0.9rem',
              }}
            >
              🔄 Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * ProtectedRoute — redirects to /login if no auth token is found.
 * Simple synchronous localStorage check (original behavior).
 */
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('SupplySense-token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <AppErrorBoundary>
      <Router>
        <Routes>
          {/* Public routes — no sidebar */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding/language" element={<LanguageSelection />} />
          <Route path="/onboarding/business-type" element={<BusinessType />} />
          <Route path="/onboarding/setup" element={<ShopSetup />} />

          {/* Protected app routes — with sidebar layout */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/upload" element={<Upload />} />
            <Route path="/upload/verify" element={<Verify />} />
            <Route path="/dashboard" element={<Navigate to="/dashboard/overview" replace />} />
            <Route path="/dashboard/overview" element={<Overview />} />
            <Route path="/dashboard/forecasting" element={<Forecasting />} />
            <Route path="/dashboard/inventory" element={<InventoryHealth />} />
            <Route path="/dashboard/scenarios" element={<Scenarios />} />
            <Route path="/products" element={<ProductCatalog />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/reorder" element={<Reorder />} />
            <Route path="/expiry" element={<ExpiryTracker />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/sales" element={<RecordSales />} />
          </Route>
        </Routes>
      </Router>
    </AppErrorBoundary>
  );
}

export default App;
