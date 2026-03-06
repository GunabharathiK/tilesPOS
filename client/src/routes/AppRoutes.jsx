import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Layout          from "../components/layout/Layout";
import Dashboard       from "../pages/Dashboard";
import Products        from "../pages/Products";
import Invoice         from "../pages/Invoice";
import InvoicePreview  from "../pages/InvoicePreview";
import CustomerList    from "../pages/CustomerList";
import Customers       from "../pages/Customers";
import BillFormat      from "../components/billing/BillFormat";
import Login           from "../pages/Login";
import UserManagement  from "../pages/UserManagement";

import SupplierPayment    from "../components/supplier/SupplierPayment";
import SupplierManagement from "../pages/SupplierManagement";
import SupplierCreate     from "../components/supplier/SupplierCreate";
import SupplierProducts   from "../components/supplier/SupplierProduct";

import { PrivateRoute, AdminRoute } from "./PrivateRoute";
import { useAuth } from "../context/AuthContext";

// Wrappers so useNavigate works inside Route elements
const SupplierCreateWrapper  = () => { const navigate = useNavigate(); return <SupplierCreate    onBack={() => navigate("/suppliers")} onSaved={() => navigate("/suppliers")} />; };
const SupplierProductWrapper = () => { const navigate = useNavigate(); return <SupplierProducts  onBack={() => navigate("/suppliers")} />; };
const SupplierPaymentWrapper = () => { const navigate = useNavigate(); return <SupplierPayment   onBack={() => navigate("/suppliers")} />; };

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <Login />}
        />

        {/* Protected */}
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
          <Route path="invoice"         element={<Invoice />} />
          <Route path="quotation"       element={<Invoice mode="quotation" />} />
          <Route path="invoice-preview" element={<InvoicePreview />} />
          <Route path="customers"          element={<AdminRoute><Customers /></AdminRoute>} />
          <Route path="customers/create"   element={<AdminRoute><Customers /></AdminRoute>} />
          <Route path="customers/bill"     element={<AdminRoute><Customers /></AdminRoute>} />
          <Route path="customers/payments" element={<AdminRoute><Customers /></AdminRoute>} />

          {/* Admin only */}
          <Route path="CustomerList" element={<AdminRoute><CustomerList /></AdminRoute>} />
          <Route path="bill-format"  element={<AdminRoute><BillFormat /></AdminRoute>} />
          <Route path="users"        element={<AdminRoute><UserManagement /></AdminRoute>} />

          {/* Supplier routes */}
          <Route path="suppliers"          element={<SupplierManagement />} />
          <Route path="suppliers/create"   element={<SupplierCreateWrapper  />} />
          <Route path="suppliers/products" element={<SupplierProductWrapper />} />
          <Route path="suppliers/payment"  element={<SupplierPaymentWrapper />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
