import { useEffect, useMemo, useState } from "react";
import { Box, Chip, CircularProgress, Typography } from "@mui/material";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { getSuppliers } from "../services/supplierService";

const T = {
  dark: "#1c2333",
  muted: "#718096",
  bg: "#f0f4f8",
  white: "#ffffff",
  border: "#e5e7eb",
  primary: "#2563eb",
  success: "#15803d",
  danger: "#b91c1c",
  warning: "#b45309",
};

const fmt = (n = 0) => "Rs." + Number(n).toLocaleString("en-IN");

const formatToday = () =>
  new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

const getPayStatus = (supplier) => {
  const due = Number(supplier.totalDue || 0);
  const paid = Number(supplier.totalPaid || 0);
  if (due <= 0) return "Paid";
  if (paid > 0) return "Partial";
  return "Pending";
};

const StatCard = ({ icon, label, value, sub, accent, iconBg }) => (
  <Box
    sx={{
      background: T.white,
      border: `1px solid ${T.border}`,
      borderRadius: "12px",
      px: 2,
      py: 1.7,
      display: "flex",
      alignItems: "center",
      gap: 1.5,
      minHeight: 98,
      borderTop: `3px solid ${accent}`,
      boxShadow: "0 1px 4px rgba(0,0,0,.05)",
    }}
  >
    <Box
      sx={{
        width: 40,
        height: 40,
        borderRadius: "10px",
        background: iconBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        flexShrink: 0,
      }}
    >
      {icon}
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: 11, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", mb: 0.2 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 20, fontWeight: 800, color: T.dark, lineHeight: 1.1, fontFamily: "'Rajdhani', sans-serif" }}>
        {value}
      </Typography>
      {sub ? <Typography sx={{ fontSize: 11, color: T.muted, mt: 0.2 }}>{sub}</Typography> : null}
    </Box>
  </Box>
);

const Panel = ({ title, right, children }) => (
  <Box
    sx={{
      background: T.white,
      border: `1px solid ${T.border}`,
      borderRadius: "12px",
      boxShadow: "0 1px 4px rgba(0,0,0,.05)",
      overflow: "hidden",
      height: "100%",
    }}
  >
    <Box
      sx={{
        px: 2.2,
        py: 1.5,
        borderBottom: `1px solid ${T.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: T.dark }}>{title}</Typography>
      {right}
    </Box>
    <Box sx={{ p: 2 }}>{children}</Box>
  </Box>
);

const SupplierManagement = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getSuppliers();
        setSuppliers(Array.isArray(res.data) ? res.data : []);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const totalAmount = suppliers.reduce((s, x) => s + Number(x.totalValue || 0), 0);
    const totalPaid = suppliers.reduce((s, x) => s + Number(x.totalPaid || 0), 0);
    const totalPending = suppliers.reduce((s, x) => s + Number(x.totalDue || 0), 0);
    const allProducts = suppliers.flatMap((x) => {
      if (Array.isArray(x.productsSupplied)) return x.productsSupplied;
      if (Array.isArray(x.items)) return x.items.map((i) => i.name).filter(Boolean);
      return [];
    });
    return {
      total: suppliers.length,
      totalAmount,
      totalPaid,
      totalPending,
      totalProducts: new Set(allProducts).size,
    };
  }, [suppliers]);

  const pendingList = useMemo(
    () =>
      suppliers
        .filter((s) => Number(s.totalDue || 0) > 0)
        .sort((a, b) => Number(b.totalDue || 0) - Number(a.totalDue || 0))
        .slice(0, 8),
    [suppliers]
  );

  const chartData = useMemo(
    () =>
      pendingList.map((s) => ({
        name: (s.companyName || s.name || "-").slice(0, 12),
        Paid: Number(s.totalPaid || 0),
        Due: Number(s.totalDue || 0),
      })),
    [pendingList]
  );

  const cards = [
    { icon: "🏭", label: "Total Suppliers", value: stats.total, sub: "registered suppliers", accent: "#2563eb", iconBg: "#eff6ff" },
    { icon: "💰", label: "Total Purchase", value: fmt(stats.totalAmount), sub: "cumulative value", accent: "#7c3aed", iconBg: "#f5f3ff" },
    { icon: "✅", label: "Total Paid", value: fmt(stats.totalPaid), sub: "amount cleared", accent: "#15803d", iconBg: "#f0fdf4" },
    { icon: "⏳", label: "Pending", value: fmt(stats.totalPending), sub: "amount due", accent: "#b91c1c", iconBg: "#fef2f2" },
    { icon: "📦", label: "Products", value: stats.totalProducts, sub: "unique product types", accent: "#b45309", iconBg: "#fffbeb" },
  ];

  if (loading) {
    return (
      <Box sx={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 0, background: T.bg, minHeight: "100%" }}>
      <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", mb: 0.8 }}>
        <Typography sx={{ fontSize: 22, fontWeight: 700, color: T.dark, fontFamily: "'Rajdhani', sans-serif" }}>
          Supplier Management
        </Typography>
        <Typography sx={{ fontSize: 12, color: T.muted }}>{formatToday()}</Typography>
      </Box>

      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(5, minmax(0, 1fr))" }, mb: 2 }}>
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </Box>

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 2fr) minmax(0, 1fr)" }, alignItems: "stretch" }}>
        <Panel
          title="Supplier Payment Overview"
          right={<Typography sx={{ fontSize: 11, color: T.muted }}>Top pending suppliers</Typography>}
        >
          {chartData.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: T.muted, py: 8, textAlign: "center" }}>
              No pending supplier data.
            </Typography>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => (v > 999 ? `${Math.round(v / 1000)}k` : v)} axisLine={false} tickLine={false} width={40} />
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Paid" fill={T.success} radius={[5, 5, 0, 0]} />
                <Bar dataKey="Due" fill={T.danger} radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel
          title="Supplier Pending Payments"
          right={<Chip label={`${pendingList.length} suppliers`} size="small" color="warning" />}
        >
          {pendingList.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: T.muted, py: 8, textAlign: "center" }}>
              No pending supplier payments.
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {pendingList.map((s) => {
                const status = getPayStatus(s);
                const statusColor =
                  status === "Paid" ? { bg: "#f0fdf4", color: T.success } :
                  status === "Partial" ? { bg: "#fffbeb", color: T.warning } :
                  { bg: "#fef2f2", color: T.danger };

                return (
                  <Box
                    key={s._id}
                    sx={{
                      border: `1px solid ${T.border}`,
                      borderRadius: "9px",
                      px: 1.2,
                      py: 1,
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 1,
                      alignItems: "center",
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.dark, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {s.companyName || s.name}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: T.muted }}>
                        Paid: {fmt(s.totalPaid || 0)} | Due: {fmt(s.totalDue || 0)}
                      </Typography>
                    </Box>
                    <Box sx={{ px: 1, py: 0.35, borderRadius: "12px", background: statusColor.bg, color: statusColor.color, fontSize: 10, fontWeight: 700 }}>
                      {status}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </Panel>
      </Box>
    </Box>
  );
};

export default SupplierManagement;
