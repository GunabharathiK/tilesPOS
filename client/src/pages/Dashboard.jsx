import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
} from "@mui/material";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import InventoryIcon from "@mui/icons-material/Inventory";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import API from "../services/api";

// ─── helpers ────────────────────────────────────────────────
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const getMonthKey = (dateStr) => {
  // dateStr can be "3/15/2025, 10:30:00 AM" or ISO
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return `${d.getFullYear()}-${d.getMonth()}`;
};

const getMonthLabel = (year, month) =>
  `${MONTH_NAMES[month]} ${year}`;

// ─── stat card ──────────────────────────────────────────────
const StatCard = ({ title, value, subtitle, icon, color, bg }) => (
  <Card
    sx={{
      height: "100%",
      borderRadius: 3,
      background: bg,
      boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
      transition: "transform 0.2s",
      "&:hover": { transform: "translateY(-3px)", boxShadow: "0 6px 20px rgba(0,0,0,0.12)" },
    }}
  >
    <CardContent sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="body2" color="text.secondary" fontWeight={500} mb={0.5}>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={700} color={color}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            width: 48, height: 48, borderRadius: 2,
            background: `${color}18`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

// ─── main component ─────────────────────────────────────────
const Dashboard = () => {
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [invRes, prodRes] = await Promise.all([
          API.get("/invoices"),
          API.get("/products"),
        ]);
        setInvoices(invRes.data);
        setProducts(prodRes.data);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // ── this month stats ──────────────────────────────────────
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const thisMonthInvoices = invoices.filter((inv) => {
    const d = new Date(inv.date);
    return !isNaN(d) && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });

  const totalSalesThisMonth = thisMonthInvoices.reduce(
    (acc, inv) => acc + (Number(inv.payment?.amount) || 0), 0
  );

  const paidCount = invoices.filter((i) => i.status === "Paid").length;
  const pendingCount = invoices.filter((i) => i.status !== "Paid").length;

  const paidAmount = invoices
    .filter((i) => i.status === "Paid")
    .reduce((acc, i) => acc + (Number(i.payment?.amount) || 0), 0);

  const pendingAmount = invoices
    .filter((i) => i.status !== "Paid")
    .reduce((acc, i) => acc + (Number(i.payment?.amount) || 0), 0);

  // ── low stock products (< 10) ─────────────────────────────
  const lowStockProducts = products
    .filter((p) => Number(p.stock) < 10)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 6);

  // ── monthly chart data (last 6 months) ────────────────────
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(thisYear, thisMonth - 5 + i, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const chartData = last6Months.map(({ year, month }) => {
    const key = `${year}-${month}`;
    const monthInvoices = invoices.filter((inv) => getMonthKey(inv.date) === key);

    const sales = monthInvoices.reduce(
      (acc, inv) => acc + (Number(inv.payment?.amount) || 0), 0
    );

    // Profit estimate = sales - sum of (price * qty) per item
    const cost = monthInvoices.reduce((acc, inv) => {
      const itemCost = (inv.items || []).reduce(
        (s, item) => s + (Number(item.price) || 0) * (Number(item.quantity) || 0) * 0.6,
        0
      );
      return acc + itemCost;
    }, 0);

    const profit = Math.max(0, sales - cost);

    return {
      name: getMonthLabel(year, month),
      Sales: Math.round(sales),
      Profit: Math.round(profit),
    };
  });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, background: "#f8fafc", minHeight: "100vh" }}>
      {/* Page Title */}
      <Typography variant="h4" fontWeight={700} mb={0.5}>
        Dashboard
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        {MONTH_NAMES[thisMonth]} {thisYear} overview
      </Typography>

      {/* ── STAT CARDS ── */}
      <Box sx={{ display: "flex", gap: 2.5, mb: 3, flexWrap: "nowrap" }}>
        <Box sx={{ flex: 1 }}>
          <StatCard
            title="This Month Sales"
            value={`₹${totalSalesThisMonth.toLocaleString("en-IN")}`}
            subtitle={`${thisMonthInvoices.length} invoices`}
            icon={<TrendingUpIcon sx={{ color: "#0ea5e9" }} />}
            color="#0ea5e9"
            bg="#fff"
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <StatCard
            title="Paid"
            value={`₹${paidAmount.toLocaleString("en-IN")}`}
            subtitle={`${paidCount} invoices`}
            icon={<CheckCircleIcon sx={{ color: "#22c55e" }} />}
            color="#22c55e"
            bg="#fff"
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <StatCard
            title="Pending"
            value={`₹${pendingAmount.toLocaleString("en-IN")}`}
            subtitle={`${pendingCount} invoices`}
            icon={<HourglassEmptyIcon sx={{ color: "#f59e0b" }} />}
            color="#f59e0b"
            bg="#fff"
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <StatCard
            title="Total Products"
            value={products.length}
            subtitle={`${lowStockProducts.length} low stock`}
            icon={<InventoryIcon sx={{ color: "#8b5cf6" }} />}
            color="#8b5cf6"
            bg="#fff"
          />
        </Box>
      </Box>

      {/* ── CHART + LOW STOCK side by side ── */}
      <Box sx={{ display: "flex", gap: 2.5, mb: 2.5 }}>
        {/* Chart — takes 65% */}
        <Box sx={{ flex: "0 0 65%" }}>
          <Card sx={{ borderRadius: 3, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", p: 1, height: "100%" }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={0.5}>Sales & Profit</Typography>
              <Typography variant="caption" color="text.secondary" display="block" mb={2}>Last 6 months</Typography>
              <ResponsiveContainer width="100%" height={350} debounce={50}>
                <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} width={65} />
                  <Tooltip
                    formatter={(value) => [`₹${value.toLocaleString("en-IN")}`, undefined]}
                    contentStyle={{ borderRadius: 8, fontSize: 13 }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="Sales" stroke="#0ea5e9" strokeWidth={2.5} fill="url(#salesGrad)" />
                  <Area type="monotone" dataKey="Profit" stroke="#22c55e" strokeWidth={2.5} fill="url(#profitGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Box>

        {/* Low Stock — takes 35% */}
        <Box sx={{ flex: "0 0 35%" }}>
          <Card sx={{ borderRadius: 3, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", height: "100%" }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <WarningAmberIcon sx={{ color: "#f59e0b", fontSize: 20 }} />
                <Typography variant="h6" fontWeight={600}>Low Stock</Typography>
                {lowStockProducts.length > 0 && (
                  <Chip label={lowStockProducts.length} size="small" color="warning" sx={{ ml: "auto" }} />
                )}
              </Box>
              {lowStockProducts.length === 0 ? (
                <Box textAlign="center" py={3}>
                  <Typography color="text.secondary" fontSize={14}>All products are well stocked ✅</Typography>
                </Box>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ background: "#f8fafc" }}>
                      <TableCell sx={{ fontWeight: 600, fontSize: 12, color: "text.secondary" }}>Product</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: 12, color: "text.secondary" }}>Code</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: 12, color: "text.secondary" }} align="right">Stock</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lowStockProducts.map((p) => (
                      <TableRow key={p._id} hover>
                        <TableCell sx={{ fontSize: 13, fontWeight: 500 }}>{p.name}</TableCell>
                        <TableCell sx={{ fontSize: 12, color: "text.secondary" }}>{p.code ? p.code.toUpperCase() : "—"}</TableCell>
                        <TableCell align="right">
                          <Chip
                            label={`${p.stock} ${p.uom || ""}`}
                            size="small"
                            sx={{
                              background: p.stock === 0 ? "#fee2e2" : "#fef3c7",
                              color: p.stock === 0 ? "#b91c1c" : "#92400e",
                              fontWeight: 600, fontSize: 12,
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* ROW 2 — Recent Invoices full width */}
      <Grid container spacing={2.5}>
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 3, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>Recent Invoices</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: "text.secondary", fontSize: 12 }}>Invoice No</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "text.secondary", fontSize: 12 }}>Customer</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "text.secondary", fontSize: 12 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "text.secondary", fontSize: 12 }} align="right">Amount</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "text.secondary", fontSize: 12 }} align="center">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoices.slice(0, 5).map((inv) => {
                    const name = typeof inv.customer === "object"
                      ? inv.customer?.name : inv.customer;
                    return (
                      <TableRow key={inv._id} hover>
                        <TableCell sx={{ fontSize: 13, fontWeight: 500 }}>{inv.invoiceNo}</TableCell>
                        <TableCell sx={{ fontSize: 13 }}>{name || "—"}</TableCell>
                        <TableCell sx={{ fontSize: 13, color: "text.secondary" }}>
                          {inv.date?.split(" ")[0] || "—"}
                        </TableCell>
                        <TableCell sx={{ fontSize: 13, fontWeight: 600 }} align="right">
                          ₹{Number(inv.payment?.amount || 0).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={inv.status || "Pending"}
                            size="small"
                            color={inv.status === "Paid" ? "success" : "warning"}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {invoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ color: "text.secondary", py: 3 }}>
                        No invoices yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
