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
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';
import RecordSales from './pages/sales/RecordSales';

/**
 * ProtectedRoute — redirects to /login if no auth token is found.
 */
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('stocksense-token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
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
          <Route path="/dashboard/overview" element={<Overview />} />
          <Route path="/dashboard/forecasting" element={<Forecasting />} />
          <Route path="/dashboard/inventory" element={<InventoryHealth />} />
          <Route path="/dashboard/scenarios" element={<Scenarios />} />
          <Route path="/products" element={<ProductCatalog />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/reorder" element={<Reorder />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/sales" element={<RecordSales />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
