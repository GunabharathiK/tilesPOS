import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Card,
  Grid,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  CircularProgress,
} from "@mui/material";
import { useLocation } from "react-router-dom";
import CustomerCreate from "../components/customers/CustomerCreate";
import CustomerBill from "../components/customers/CustomerBill";
import CustomerPaymentsDetails from "../components/customers/CustomerPaymentsDetails";
import { getCustomers } from "../services/customerService";
import { getInvoices } from "../services/invoiceService";

const fmt = (n = 0) => Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const Customers = () => {
  const location = useLocation();
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const pathParts = location.pathname.split("/").filter(Boolean);
  const active = pathParts[1] || "overview";

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [customerRes, invoiceRes] = await Promise.all([getCustomers(), getInvoices()]);
        setCustomers(Array.isArray(customerRes.data) ? customerRes.data : []);
        setInvoices(Array.isArray(invoiceRes.data) ? invoiceRes.data : []);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const totals = useMemo(() => {
    let amount = 0;
    let paid = 0;
    let due = 0;
    invoices.forEach((inv) => {
      const total = Number(inv?.payment?.amount || 0);
      const paidAmount = Number(inv?.payment?.paidAmount ?? (inv?.status === "Paid" ? total : 0));
      const dueAmount = Number(inv?.payment?.dueAmount ?? Math.max(0, total - paidAmount));
      amount += total;
      paid += paidAmount;
      due += dueAmount;
    });
    return { amount, paid, due };
  }, [invoices]);

  const renderOverview = () => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      );
    }

    return (
      <>
        <Typography variant="h4" fontWeight={700} mb={0.5}>
          Customer Management
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Overview of customer details and payment summary
        </Typography>

        <Grid container spacing={2.5} mb={3}>
          <Grid item xs={12} md={3}>
            <Card sx={{ p: 2.5, borderRadius: 3, background: "#eff6ff" }}>
              <Typography variant="body2" color="text.secondary">Total Customers</Typography>
              <Typography variant="h5" fontWeight={800} color="#1d4ed8">{customers.length}</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ p: 2.5, borderRadius: 3, background: "#f5f3ff" }}>
              <Typography variant="body2" color="text.secondary">Total Bills</Typography>
              <Typography variant="h5" fontWeight={800} color="#7c3aed">{invoices.length}</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ p: 2.5, borderRadius: 3, background: "#ecfdf5" }}>
              <Typography variant="body2" color="text.secondary">Paid Amount</Typography>
              <Typography variant="h5" fontWeight={800} color="#15803d">Rs.{fmt(totals.paid)}</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ p: 2.5, borderRadius: 3, background: "#fef2f2" }}>
              <Typography variant="body2" color="text.secondary">Pending Amount</Typography>
              <Typography variant="h5" fontWeight={800} color="#dc2626">Rs.{fmt(totals.due)}</Typography>
            </Card>
          </Grid>
        </Grid>

        <Card sx={{ borderRadius: 3, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
          <Box p={2.5}>
            <Typography variant="h6" fontWeight={700} mb={1}>
              Customer Details
            </Typography>
          </Box>
          <Box sx={{ overflowX: "auto" }}>
            <Table>
              <TableHead sx={{ background: "#f1f5f9" }}>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell>Total Spent</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customers.map((c, idx) => (
                  <TableRow key={c._id || `${c.name}-${idx}`} hover>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{c.name || "-"}</TableCell>
                    <TableCell>{c.phone || "-"}</TableCell>
                    <TableCell>{c.address || "-"}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#1d4ed8" }}>Rs.{fmt(c.totalSpent || 0)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={c.status || "Pending"}
                        color={c.status === "Paid" ? "success" : c.status === "Partial" ? "warning" : "error"}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {customers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>
                      No customer records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </Card>
      </>
    );
  };

  const renderContent = () => {
    if (active === "overview") return renderOverview();
    if (active === "create") return <CustomerCreate />;
    if (active === "bill") return <CustomerBill />;
    if (active === "payments") return <CustomerPaymentsDetails />;
    return null;
  };

  return <Box p={0}>{renderContent()}</Box>;
};

export default Customers;
