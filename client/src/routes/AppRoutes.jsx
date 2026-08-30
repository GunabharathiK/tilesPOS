import { BrowserRouter, HashRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import BillFormat from "../components/billing/BillFormat";
import SupplierCreate from "../components/supplier/SupplierCreate";
import SupplierDetails from "../components/supplier/SupplierDetails";
import SupplierPayment from "../components/supplier/SupplierPayment";
import SupplierProducts from "../components/supplier/SupplierProduct";
import { useAuth } from "../context/AuthContext";
import CustomerList from "../pages/CustomerList";
import Customers from "../pages/Customers";
import Dashboard from "../pages/Dashboard";
import Invoice from "../pages/Invoice";
import LicenseManagement from "../pages/LicenseManagement";
import LicensePage from "../pages/LicensePage";
import Login from "../pages/Login";
import Products from "../pages/Products";
import PurchaseDetails from "../pages/PurchaseDetails";
import Reports from "../pages/Reports";
import Settings from "../pages/Settings";
import SupplierManagement from "../pages/SupplierManagement";
import { AdminRoute, OwnerRoute, PrivateRoute } from "./PrivateRoute";

const SupplierCreateWrapper = () => {
  const navigate = useNavigate();
  return <SupplierCreate onBack={() => navigate("/suppliers")} onSaved={() => navigate("/suppliers")} />;
};

const SupplierProductWrapper = () => {
  const navigate = useNavigate();
  return <SupplierProducts onBack={() => navigate("/suppliers")} />;
};

const SupplierPaymentWrapper = () => {
  const navigate = useNavigate();
  return <SupplierPayment onBack={() => navigate("/suppliers")} />;
};

const AppRoutes = () => {
  const { user, licenseStatus, isOwner } = useAuth();
  const canAccessApp = Boolean(user && (isOwner || licenseStatus?.isActive));
  const Router = typeof window !== "undefined" && window.location.protocol === "file:" ? HashRouter : BrowserRouter;

  return (
    <Router>
      <Routes>
        <Route path="/login" element={canAccessApp ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/license" element={<LicensePage />} />

        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="products/add" element={<Products />} />
          <Route path="products/supplier" element={<Products />} />
          <Route path="products/details" element={<Products />} />
          <Route path="invoice" element={<Invoice />} />
          <Route path="quotation" element={<Invoice mode="quotation" />} />
          <Route path="customers" element={<AdminRoute><Customers /></AdminRoute>} />
          <Route path="customers/create" element={<AdminRoute><Customers /></AdminRoute>} />
          <Route path="customers/bill" element={<AdminRoute><Customers /></AdminRoute>} />
          <Route path="customers/details" element={<AdminRoute><Customers /></AdminRoute>} />
          <Route path="customers/payments" element={<AdminRoute><Customers /></AdminRoute>} />
          <Route path="reports" element={<AdminRoute><Reports /></AdminRoute>} />
          <Route path="bill-format" element={<AdminRoute><BillFormat /></AdminRoute>} />
          <Route path="CustomerList" element={<AdminRoute><CustomerList /></AdminRoute>} />
          <Route path="settings" element={<AdminRoute><Navigate to="/company-profile" replace /></AdminRoute>} />
          <Route path="company-profile" element={<AdminRoute><Settings section="company-profile" /></AdminRoute>} />
          <Route path="invoice-settings" element={<AdminRoute><Settings section="invoice-settings" /></AdminRoute>} />
          <Route path="product-defaults" element={<AdminRoute><Settings section="product-defaults" /></AdminRoute>} />
          <Route path="user-management" element={<AdminRoute><Settings section="user-management" /></AdminRoute>} />
          <Route path="backup-data" element={<AdminRoute><Settings section="backup-data" /></AdminRoute>} />
          <Route path="license-management" element={<OwnerRoute><LicenseManagement /></OwnerRoute>} />
          <Route path="suppliers" element={<SupplierManagement />} />
          <Route path="suppliers/create" element={<SupplierCreateWrapper />} />
          <Route path="suppliers/details" element={<SupplierDetails />} />
          <Route path="suppliers/products" element={<SupplierProductWrapper />} />
          <Route path="suppliers/payment" element={<SupplierPaymentWrapper />} />
          <Route path="purchase/details" element={<AdminRoute><PurchaseDetails /></AdminRoute>} />
        </Route>

        <Route path="*" element={<Navigate to={isOwner || licenseStatus?.isActive ? "/" : "/license"} replace />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
