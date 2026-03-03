import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import Dashboard from "../pages/Dashboard";
import Products from "../pages/Products";
import Invoice from "../pages/Invoice";
import InvoicePreview from "../pages/InvoicePreview";
import CustomerList from "../pages/CustomerList";
import BillFormat from "../components/billing/BillFormat";
import Login from "../pages/Login";
import UserManagement from "../pages/UserManagement";
import { PrivateRoute, AdminRoute } from "./PrivateRoute";
import { useAuth } from "../context/AuthContext";

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        {/* ─── Public ─── */}
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <Login />}
        />

        {/* ─── Protected (all logged-in users) ─── */}
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
          <Route path="invoice" element={<Invoice />} />
          <Route path="invoice-preview" element={<InvoicePreview />} />

          {/* ─── Admin only ─── */}
          <Route
            path="CustomerList"
            element={
              <AdminRoute>
                <CustomerList />
              </AdminRoute>
            }
          />
          <Route
            path="bill-format"
            element={
              <AdminRoute>
                <BillFormat />
              </AdminRoute>
            }
          />
          <Route
            path="users"
            element={
              <AdminRoute>
                <UserManagement />
              </AdminRoute>
            }
          />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
