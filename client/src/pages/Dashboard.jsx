import { useEffect, useState, useMemo } from "react";
import { Box, Typography } from "@mui/material";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart,
} from "recharts";
import TrendingUpIcon           from "@mui/icons-material/TrendingUp";
import TrendingDownIcon         from "@mui/icons-material/TrendingDown";
import ReceiptLongIcon          from "@mui/icons-material/ReceiptLong";
import ShoppingCartIcon         from "@mui/icons-material/ShoppingCart";
import HourglassEmptyIcon       from "@mui/icons-material/HourglassEmpty";
import LocalShippingIcon        from "@mui/icons-material/LocalShipping";
import CheckCircleIcon          from "@mui/icons-material/CheckCircle";
import WarningAmberIcon         from "@mui/icons-material/WarningAmber";
import InventoryIcon            from "@mui/icons-material/Inventory";
import PeopleIcon               from "@mui/icons-material/People";
import ArrowForwardIcon         from "@mui/icons-material/ArrowForward";
import OpenInNewIcon            from "@mui/icons-material/OpenInNew";
import API from "../services/api";
import { getSuppliers } from "../services/supplierService";
import { useNavigate } from "react-router-dom";

/* ── Design tokens ── */
const T = {
  primary:      "#1a56a0",
  primaryDark:  "#0f3d7a",
  primaryLight: "#eef4fd",
  success:      "#15803d",
  successLight: "#f0fdf4",
  danger:       "#b91c1c",
  dangerLight:  "#fef2f2",
  warning:      "#92400e",
  warningLight: "#fef3c7",
  dark:         "#0f172a",
  text:         "#1e293b",
  muted:        "#64748b",
  faint:        "#94a3b8",
  border:       "#dde3ed",
  borderLight:  "#e8eef6",
  bg:           "#f1f5f9",
  surface:      "#ffffff",
  surfaceAlt:   "#f8fafc",
  violet:       "#6d28d9",
  violetLight:  "#f5f3ff",
  orange:       "#c2410c",
  orangeLight:  "#fff7ed",
};

/* ── Helpers ── */
const INR    = (n = 0) => "₹" + Number(n).toLocaleString("en-IN");
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const parseDate  = v => { const d = new Date(v); return isNaN(d.getTime()) ? null : d; };
const getMonthKey = ds => { const d = new Date(ds); return isNaN(d) ? null : `${d.getFullYear()}-${d.getMonth()}`; };

const normalizeCustomerType = inv => {
  const raw = inv?.customerType || inv?.saleType || inv?.customer?.customerType || inv?.customer?.saleType || "Retail Customer";
  if (raw === "Dealer" || raw === "Wholesale")  return "Dealer";
  if (raw === "Contractor" || raw === "B2B")    return "Contractor";
  if (raw === "Builder / Project")              return "Builder / Project";
  return "Retail Customer";
};

const getAmount = inv => {
  const a = Number(inv?.payment?.amount);
  if (Number.isFinite(a) && a > 0) return a;
  return Number(inv?.items?.reduce((s, i) => s + (Number(i.quantity)||0) * (Number(i.price)||0), 0) || 0);
};

const getDue = inv => {
  if (inv?.status === "Paid") return 0;
  const due = Number(inv?.payment?.dueAmount);
  if (Number.isFinite(due) && due >= 0) return due;
  return Math.max(0, getAmount(inv) - Number(inv?.payment?.paidAmount || 0));
};

const pctChange = (curr, prev) => {
  if (!prev) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
};

const collectionRate = invoices => {
  const total = invoices.reduce((s, i) => s + getAmount(i), 0);
  const paid  = invoices.reduce((s, i) => s + (getAmount(i) - getDue(i)), 0);
  return total > 0 ? Math.round((paid / total) * 100) : 0;
};

const PIE_COLORS = [T.primary, T.success, "#f59e0b", T.violet, T.orange, T.faint];

/* ── Chart tooltip ── */
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ background: T.dark, px: 1.8, py: 1.3, border: `1px solid #1e293b`, boxShadow: "0 8px 20px rgba(0,0,0,.3)", minWidth: 130 }}>
      <Typography sx={{ fontSize: 10, color: "rgba(255,255,255,.45)", mb: 0.6, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>{label}</Typography>
      {payload.map(p => (
        <Box key={p.name} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.3 }}>
          <Box sx={{ width: 6, height: 6, background: p.color, flexShrink: 0 }} />
          <Typography sx={{ fontSize: 11, color: "rgba(255,255,255,.6)", flex: 1 }}>{p.name}</Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#fff", fontFamily: "'DM Mono', monospace" }}>
            {p.value > 999 ? INR(p.value) : p.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

/* ── View All Button ── */
const ViewAllBtn = ({ onClick, label = "View All" }) => (
  <Box
    onClick={onClick}
    sx={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      px: 1.4, py: "5px",
      fontSize: 11.5, fontWeight: 700, color: T.primary,
      border: `1px solid ${T.border}`,
      background: T.surface,
      cursor: "pointer", userSelect: "none",
      transition: "all .15s",
      "&:hover": {
        background: T.primary, color: "#fff",
        borderColor: T.primary,
        "& .arrow-icon": { transform: "translateX(2px)" },
      },
    }}
  >
    {label}
    <ArrowForwardIcon className="arrow-icon" sx={{ fontSize: 12, transition: "transform .15s" }} />
  </Box>
);

/* ── Metric card ── */
const MetricCard = ({ label, value, sub, delta, icon, accent, accentLight }) => {
  const isPositive = delta >= 0;
  return (
    <Box sx={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderTop: `3px solid ${accent}`,
      p: "18px 20px",
      display: "flex", flexDirection: "column", gap: 1,
      position: "relative", overflow: "hidden",
      transition: "box-shadow .15s",
      "&:hover": { boxShadow: "0 4px 16px rgba(15,23,42,.1)" },
    }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".07em" }}>{label}</Typography>
        <Box sx={{ width: 36, height: 36, background: accentLight, display: "flex", alignItems: "center", justifyContent: "center", color: accent, flexShrink: 0 }}>
          {icon}
        </Box>
      </Box>
      <Typography sx={{ fontSize: 26, fontWeight: 800, color: T.dark, lineHeight: 1, fontFamily: "'DM Mono', monospace" }}>{value}</Typography>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 0.2 }}>
        <Typography sx={{ fontSize: 11.5, color: T.faint }}>{sub}</Typography>
        {delta !== undefined && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.4, px: 1, py: "2px", background: isPositive ? T.successLight : T.dangerLight, border: `1px solid ${isPositive ? "#bbf7d0" : "#fecaca"}` }}>
            {isPositive
              ? <TrendingUpIcon   sx={{ fontSize: 11, color: T.success }} />
              : <TrendingDownIcon sx={{ fontSize: 11, color: T.danger  }} />}
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: isPositive ? T.success : T.danger }}>
              {isPositive ? "+" : ""}{delta}%
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

/* ── Panel ── */
const Panel = ({ title, subtitle, right, viewAllPath, viewAllLabel, children, accent, noPad, navigate }) => (
  <Box sx={{
    background: T.surface, border: `1px solid ${T.border}`,
    boxShadow: "0 1px 4px rgba(15,23,42,.05)",
    overflow: "hidden", display: "flex", flexDirection: "column", height: "100%",
    transition: "box-shadow .15s",
    "&:hover": { boxShadow: "0 4px 16px rgba(15,23,42,.08)" },
  }}>
    {/* Panel header */}
    <Box sx={{
      px: 2.5, py: 1.6,
      borderBottom: `2px solid ${accent || T.primary}`,
      background: `linear-gradient(105deg, ${T.primaryLight} 0%, ${T.surface} 70%)`,
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1,
      flexShrink: 0,
    }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: T.dark, lineHeight: 1.2 }}>{title}</Typography>
        {subtitle && <Typography sx={{ fontSize: 11, color: T.muted, mt: 0.3 }}>{subtitle}</Typography>}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
        {right && right}
        {viewAllPath && navigate && (
          <ViewAllBtn onClick={() => navigate(viewAllPath)} label={viewAllLabel || "View All"} />
        )}
      </Box>
    </Box>
    <Box sx={noPad ? { flex: 1 } : { p: 2, flex: 1 }}>{children}</Box>
  </Box>
);

/* ── Badge ── */
const Badge = ({ label }) => {
  const cfgs = {
    Paid:           { color: T.success, bg: T.successLight, border: "#bbf7d0" },
    Partial:        { color: T.warning, bg: T.warningLight, border: "#fde68a" },
    Pending:        { color: T.danger,  bg: T.dangerLight,  border: "#fecaca" },
    "Low Stock":    { color: T.warning, bg: T.warningLight, border: "#fde68a" },
    "Out of Stock": { color: T.danger,  bg: T.dangerLight,  border: "#fecaca" },
  };
  const s = cfgs[label] || cfgs.Pending;
  return (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, px: 1, py: "3px", fontSize: 10.5, fontWeight: 700, color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
      <Box sx={{ width: 5, height: 5, background: s.color, borderRadius: "50%", flexShrink: 0 }} />
      {label}
    </Box>
  );
};

/* ── Table atoms ── */
const TH = ({ children, align = "left", width }) => (
  <th style={{ padding: "9px 14px", textAlign: align, fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".07em", borderBottom: `2px solid ${T.border}`, background: T.surfaceAlt, whiteSpace: "nowrap", width }}>
    {children}
  </th>
);
const TD = ({ children, align = "left", mono, bold, color }) => (
  <td style={{ padding: "10px 14px", textAlign: align, color: color || T.text, fontWeight: bold ? 700 : 500, fontFamily: mono ? "'DM Mono', monospace" : "'Noto Sans', sans-serif", fontSize: 13, borderBottom: `1px solid ${T.borderLight}`, verticalAlign: "middle" }}>
    {children}
  </td>
);

/* ── Strip Item ── */
const StripItem = ({ label, value, color, borderRight = true }) => (
  <Box sx={{ px: 2, py: 1.4, borderRight: borderRight ? `1px solid ${T.border}` : "none", flex: 1, minWidth: 0 }}>
    <Typography sx={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".07em", mb: 0.4 }}>{label}</Typography>
    <Typography sx={{ fontSize: 20, fontWeight: 800, color: color || T.dark, fontFamily: "'DM Mono', monospace", lineHeight: 1.1 }}>{value}</Typography>
  </Box>
);

/* ═══════════════════════════════════════════════════ */
const Dashboard = () => {
  const navigate = useNavigate();
  const [invoices,  setInvoices]  = useState([]);
  const [products,  setProducts]  = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState("week");

  useEffect(() => {
    (async () => {
      try {
        const [invRes, prodRes, supRes] = await Promise.all([
          API.get("/invoices"), API.get("/products"), getSuppliers(),
        ]);
        setInvoices(Array.isArray(invRes.data)  ? invRes.data  : []);
        setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
        setSuppliers(Array.isArray(supRes.data) ? supRes.data  : []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const now      = new Date();
  const todayStr = now.toDateString();

  const salesInvoices = useMemo(() =>
    invoices.filter(i => {
      const isQ = String(i?.documentType || "").toLowerCase() === "quotation" || String(i?.invoiceNo || "").toUpperCase().startsWith("QTN");
      return !isQ;
    }), [invoices]
  );

  const recentInvoices = useMemo(() =>
    [...salesInvoices].sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0)),
    [salesInvoices]
  );

  /* ── KPIs ── */
  const todaySales   = salesInvoices.filter(i => parseDate(i.date || i.createdAt)?.toDateString() === todayStr).reduce((s, i) => s + getAmount(i), 0);
  const ordersToday  = salesInvoices.filter(i => parseDate(i.date || i.createdAt)?.toDateString() === todayStr).length;
  const totalRevenue = salesInvoices.reduce((s, i) => s + getAmount(i), 0);
  const totalDue     = salesInvoices.reduce((s, i) => s + getDue(i), 0);
  const colRate      = collectionRate(salesInvoices);

  const thisMonthKey   = `${now.getFullYear()}-${now.getMonth()}`;
  const prevMonthDate  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthKey   = `${prevMonthDate.getFullYear()}-${prevMonthDate.getMonth()}`;
  const thisMonthSales = salesInvoices.filter(i => getMonthKey(i.date || i.createdAt) === thisMonthKey).reduce((s, i) => s + getAmount(i), 0);
  const prevMonthSales = salesInvoices.filter(i => getMonthKey(i.date || i.createdAt) === prevMonthKey).reduce((s, i) => s + getAmount(i), 0);
  const revDelta       = pctChange(thisMonthSales, prevMonthSales);

  const supplierTotal   = suppliers.reduce((s, x) => s + Number(x.totalValue || 0), 0);
  const supplierPaid    = suppliers.reduce((s, x) => s + Number(x.totalPaid  || 0), 0);
  const supplierPending = suppliers.reduce((s, x) => s + Number(x.totalDue   || 0), 0);

  /* ── Chart data ── */
  const last7Days = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() - (6 - i));
      const ds  = d.toDateString();
      const day = salesInvoices.filter(inv => parseDate(inv.date || inv.createdAt)?.toDateString() === ds);
      return {
        name:       DAYS[d.getDay()],
        Retail:     day.filter(x => normalizeCustomerType(x) === "Retail Customer").reduce((s, x) => s + getAmount(x), 0),
        Dealer:     day.filter(x => normalizeCustomerType(x) === "Dealer").reduce((s, x) => s + getAmount(x), 0),
        Contractor: day.filter(x => normalizeCustomerType(x) === "Contractor").reduce((s, x) => s + getAmount(x), 0),
        Builder:    day.filter(x => normalizeCustomerType(x) === "Builder / Project").reduce((s, x) => s + getAmount(x), 0),
      };
    }), [salesInvoices]
  );

  const monthlySales = useMemo(() => {
    const tm = now.getMonth(), ty = now.getFullYear();
    return Array.from({ length: 6 }, (_, i) => {
      const d   = new Date(ty, tm - 5 + i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const mi  = salesInvoices.filter(inv => getMonthKey(inv.date || inv.createdAt) === key);
      return {
        name:  `${MONTHS[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`,
        Sales: Math.round(mi.reduce((s, i) => s + getAmount(i), 0)),
        Due:   Math.round(mi.reduce((s, i) => s + getDue(i), 0)),
        Count: mi.length,
      };
    });
  }, [salesInvoices]);

  const typeBreakdown = useMemo(() => {
    const types = ["Retail Customer", "Dealer", "Contractor", "Builder / Project"];
    return types.map(t => ({
      name: t === "Builder / Project" ? "Builder" : t.split(" ")[0],
      total: salesInvoices.filter(i => normalizeCustomerType(i) === t).reduce((s, i) => s + getAmount(i), 0),
    })).filter(t => t.total > 0);
  }, [salesInvoices]);

  /* ── Lists ── */
  const lowStock        = products.filter(p => Number(p.stock) < 10).sort((a, b) => a.stock - b.stock).slice(0, 8);
  const outOfStock      = products.filter(p => Number(p.stock) === 0).length;
  const custPending     = useMemo(() => salesInvoices.filter(i => getDue(i) > 0).sort((a, b) => getDue(b) - getDue(a)).slice(0, 6), [salesInvoices]);
  const suppPendingList = useMemo(() => suppliers.filter(s => Number(s.totalDue || 0) > 0).sort((a, b) => Number(b.totalDue) - Number(a.totalDue)).slice(0, 6), [suppliers]);

  const topCustomers = useMemo(() => {
    const m = new Map();
    salesInvoices.forEach(inv => {
      const name = (typeof inv.customer === "object" ? inv.customer?.name : inv.customer) || "Unknown";
      if (!m.has(name)) m.set(name, { name, total: 0, count: 0 });
      const r = m.get(name);
      r.total += getAmount(inv);
      r.count += 1;
    });
    return Array.from(m.values()).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [salesInvoices]);

  const overdueInvoices = useMemo(() => {
    const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 30);
    return salesInvoices
      .filter(i => getDue(i) > 0 && parseDate(i.date || i.createdAt) < cutoff)
      .sort((a, b) => getDue(b) - getDue(a))
      .slice(0, 5);
  }, [salesInvoices]);

  if (loading) return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
      <Box sx={{ width: 36, height: 36, border: `3px solid ${T.border}`, borderTop: `3px solid ${T.primary}`, borderRadius: "50%", animation: "spin .8s linear infinite", "@keyframes spin": { to: { transform: "rotate(360deg)" } } }} />
    </Box>
  );

  /* ══════════════════════════════════ RENDER ══════════════ */
  return (
    <Box sx={{ p: 0, background: T.bg, minHeight: "100%", fontFamily: "'Noto Sans', sans-serif" }}>

      {/* ── Page header ── */}
      <Box sx={{ px: 2.5, display: "flex", flexDirection: "column", gap: 2, py: 2.5 }}>

        {/* ══ ROW 1 — KPI cards ══ */}
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2,1fr)", xl: "repeat(4,1fr)" } }}>
          <MetricCard label="Today's Sales"  value={INR(todaySales)}        sub={`${ordersToday} bill${ordersToday !== 1 ? "s" : ""} today`}          delta={revDelta} accent={T.primary}  accentLight={T.primaryLight} icon={<TrendingUpIcon     sx={{ fontSize: 18 }} />} />
          <MetricCard label="Total Revenue"  value={INR(totalRevenue)}      sub="Lifetime billing total"                                                          accent={T.success}  accentLight={T.successLight} icon={<ReceiptLongIcon    sx={{ fontSize: 18 }} />} />
          <MetricCard label="Pending Amount" value={INR(totalDue)}          sub={`${custPending.length} customer${custPending.length !== 1 ? "s" : ""} pending`} accent={T.danger}   accentLight={T.dangerLight}  icon={<HourglassEmptyIcon sx={{ fontSize: 18 }} />} />
          <MetricCard label="Total Orders"   value={salesInvoices.length}   sub={`${products.length} products · ${suppliers.length} suppliers`}                  accent={T.violet}   accentLight={T.violetLight}  icon={<ShoppingCartIcon   sx={{ fontSize: 18 }} />} />
        </Box>

        {/* ══ ROW 2 — Supplier KPI strip ══ */}
        <Box sx={{ background: T.surface, border: `1px solid ${T.border}`, display: "flex", overflow: "hidden", boxShadow: "0 1px 4px rgba(15,23,42,.05)" }}>
          <Box sx={{ width: 4, background: T.primary, flexShrink: 0 }} />
          <StripItem label="Total Suppliers"  value={suppliers.length}   color={T.primary} />
          <StripItem label="Purchase Total"   value={INR(supplierTotal)} color={T.dark} />
          <StripItem label="Supplier Paid"    value={INR(supplierPaid)}  color={T.success} />
          <StripItem label="Supplier Pending" value={INR(supplierPending)} color={T.danger} borderRight={false} />
          <Box sx={{ px: 2, display: "flex", alignItems: "center", ml: "auto" }}>
            <ViewAllBtn onClick={() => navigate("/suppliers")} label="Suppliers" />
          </Box>
        </Box>

        {/* ══ ROW 3 — Charts ══ */}
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "minmax(0,2fr) minmax(0,1fr)" }, alignItems: "stretch" }}>

          {/* Sales chart */}
          <Panel
            title={activeTab === "week" ? "Last 7 Days — Sales by Type" : "Monthly Sales Trend"}
            subtitle={activeTab === "week" ? "Retail, Dealer, Contractor, Builder" : "Sales vs Due — last 6 months"}
            accent={T.primary}
            noPad
            navigate={navigate}
            viewAllPath="/invoices"
            viewAllLabel="All Invoices"
            right={
              <Box sx={{ display: "flex", border: `1px solid ${T.border}`, overflow: "hidden" }}>
                {["week","month"].map(tab => (
                  <Box key={tab} onClick={() => setActiveTab(tab)} sx={{ px: 1.5, py: "4px", fontSize: 11, fontWeight: 700, cursor: "pointer", background: activeTab === tab ? T.primary : T.surface, color: activeTab === tab ? "#fff" : T.muted, transition: "all .13s", "&:hover": activeTab !== tab ? { background: T.primaryLight, color: T.primary } : {} }}>
                    {tab === "week" ? "7 Days" : "Monthly"}
                  </Box>
                ))}
              </Box>
            }
          >
            <Box sx={{ p: 2 }}>
              {activeTab === "week" ? (
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={last7Days} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={11} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.borderLight} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: T.muted }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: T.faint }} tickFormatter={v => v > 999 ? `${(v/1000).toFixed(0)}k` : v} axisLine={false} tickLine={false} width={36} />
                    <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(0,0,0,.03)" }} />
                    <Bar dataKey="Retail"     fill={T.primary} />
                    <Bar dataKey="Dealer"     fill="#0ea5e9"   />
                    <Bar dataKey="Contractor" fill="#f59e0b"   />
                    <Bar dataKey="Builder"    fill={T.violet}  />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={210}>
                  <AreaChart data={monthlySales} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={T.primary} stopOpacity={0.15} />
                        <stop offset="100%" stopColor={T.primary} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradDue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={T.danger} stopOpacity={0.15} />
                        <stop offset="100%" stopColor={T.danger} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.borderLight} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: T.muted }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: T.faint }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} width={46} />
                    <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(0,0,0,.03)" }} />
                    <Area dataKey="Sales" stroke={T.primary} strokeWidth={2} fill="url(#gradSales)" name="Sales" dot={{ fill: T.primary, r: 3 }} />
                    <Area dataKey="Due"   stroke={T.danger}  strokeWidth={2} fill="url(#gradDue)"   name="Due"   dot={{ fill: T.danger,  r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
              <Box sx={{ display: "flex", gap: 2, mt: 1, flexWrap: "wrap" }}>
                {(activeTab === "week"
                  ? [{ l: "Retail", c: T.primary }, { l: "Dealer", c: "#0ea5e9" }, { l: "Contractor", c: "#f59e0b" }, { l: "Builder", c: T.violet }]
                  : [{ l: "Sales", c: T.primary }, { l: "Due", c: T.danger }]
                ).map(item => (
                  <Box key={item.l} sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                    <Box sx={{ width: 8, height: 8, background: item.c }} />
                    <Typography sx={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>{item.l}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Panel>

          {/* Revenue by type */}
          <Panel title="Revenue by Customer Type" subtitle="Lifetime sales breakdown" accent={T.violet} noPad navigate={navigate} viewAllPath="/customers" viewAllLabel="Customers">
            <Box sx={{ p: 2 }}>
              {typeBreakdown.length === 0 ? (
                <Typography sx={{ color: T.faint, fontSize: 13, py: 4, textAlign: "center" }}>No sales data yet</Typography>
              ) : (
                <>
                  <Box sx={{ display: "flex", justifyContent: "center", mb: 1.5 }}>
                    <PieChart width={130} height={130}>
                      <Pie data={typeBreakdown} cx={60} cy={60} innerRadius={28} outerRadius={56} dataKey="total" paddingAngle={2}>
                        {typeBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />)}
                      </Pie>
                      <Tooltip formatter={v => INR(v)} />
                    </PieChart>
                  </Box>
                  {typeBreakdown.map((t, i) => {
                    const total = typeBreakdown.reduce((s, x) => s + x.total, 0) || 1;
                    const pct   = Math.round((t.total / total) * 100);
                    return (
                      <Box key={t.name} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.9, borderBottom: `1px solid ${T.borderLight}` }}>
                        <Box sx={{ width: 7, height: 7, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                        <Typography sx={{ fontSize: 12, color: T.text, fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</Typography>
                        <Box sx={{ px: 0.8, py: "2px", background: T.bg, fontSize: 10, fontWeight: 700, color: T.muted }}>{pct}%</Box>
                        <Typography sx={{ fontSize: 12, color: T.dark, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{INR(t.total)}</Typography>
                      </Box>
                    );
                  })}
                </>
              )}
            </Box>
          </Panel>
        </Box>

        {/* ══ ROW 4 — Recent Sales + Top Customers ══ */}
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "minmax(0,3fr) minmax(0,2fr)" }, alignItems: "stretch" }}>

          {/* Recent Sales */}
          <Panel title="Recent Sales" subtitle="Latest invoices" accent={T.primary} noPad navigate={navigate} viewAllPath="/invoices" viewAllLabel="All Invoices">
            <Box sx={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><TH>Invoice No</TH><TH>Date</TH><TH>Customer</TH><TH>Type</TH><TH align="right">Amount</TH><TH>Status</TH></tr></thead>
                <tbody>
                  {recentInvoices.slice(0, 7).map((inv, idx) => {
                    const name    = (typeof inv.customer === "object" ? inv.customer?.name : inv.customer) || "—";
                    const parsed  = parseDate(inv.date || inv.createdAt);
                    const isToday = parsed?.toDateString() === todayStr;
                    const dateStr = isToday ? "Today" : (parsed ? parsed.toLocaleDateString("en-IN") : "—");
                    return (
                      <tr key={inv._id} style={{ background: idx % 2 === 0 ? T.surface : T.surfaceAlt }}>
                        <TD mono bold color={T.primary}>{inv.invoiceNo}</TD>
                        <TD>
                          {isToday
                            ? <Box component="span" sx={{ px: 0.8, py: "2px", background: T.successLight, color: T.success, fontSize: 10.5, fontWeight: 700, border: `1px solid #bbf7d0` }}>Today</Box>
                            : dateStr}
                        </TD>
                        <TD bold>{name}</TD>
                        <TD>
                          <Box component="span" sx={{ fontSize: 10, fontWeight: 700, color: T.muted, background: T.bg, border: `1px solid ${T.border}`, px: 0.8, py: "2px" }}>
                            {normalizeCustomerType(inv).split(" ")[0]}
                          </Box>
                        </TD>
                        <TD align="right" mono bold>{INR(getAmount(inv))}</TD>
                        <td style={{ padding: "10px 14px", borderBottom: `1px solid ${T.borderLight}` }}>
                          <Badge label={inv.status === "Paid" ? "Paid" : (Number(inv.payment?.paidAmount || 0) > 0 ? "Partial" : "Pending")} />
                        </td>
                      </tr>
                    );
                  })}
                  {recentInvoices.length === 0 && <tr><td colSpan={6} style={{ padding: "36px", textAlign: "center", color: T.faint, fontSize: 13 }}>No invoices yet</td></tr>}
                </tbody>
              </table>
            </Box>
          </Panel>

          {/* Top Customers */}
          <Panel title="Top Customers" subtitle="By lifetime revenue" accent={T.success} noPad navigate={navigate} viewAllPath="/customers" viewAllLabel="All Customers">
            <Box sx={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><TH width="36">#</TH><TH>Customer</TH><TH align="right">Bills</TH><TH align="right">Revenue</TH></tr></thead>
                <tbody>
                  {topCustomers.map((c, idx) => (
                    <tr key={c.name} style={{ background: idx % 2 === 0 ? T.surface : T.surfaceAlt }}>
                      <td style={{ padding: "10px 14px", borderBottom: `1px solid ${T.borderLight}`, width: 36 }}>
                        <Box sx={{ width: 22, height: 22, background: idx === 0 ? "#fef3c7" : T.surfaceAlt, border: `1px solid ${idx === 0 ? "#fcd34d" : T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: idx === 0 ? "#b45309" : T.muted }}>
                          {idx + 1}
                        </Box>
                      </td>
                      <TD bold>{c.name}</TD>
                      <TD align="right" color={T.muted}>{c.count}</TD>
                      <TD align="right" mono bold color={T.success}>{INR(c.total)}</TD>
                    </tr>
                  ))}
                  {topCustomers.length === 0 && <tr><td colSpan={4} style={{ padding: "36px", textAlign: "center", color: T.faint, fontSize: 13 }}>No customers yet</td></tr>}
                </tbody>
              </table>
            </Box>
          </Panel>
        </Box>

        {/* ══ ROW 5 — Pending + Overdue ══ */}
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "repeat(2,minmax(0,1fr))" }, alignItems: "stretch" }}>

          {/* Customer Pending */}
          <Panel
            title="Customer Pending Payments"
            subtitle={`${custPending.length} invoices with outstanding balance`}
            accent={T.danger}
            noPad
            navigate={navigate}
            viewAllPath="/customers"
            viewAllLabel="All Customers"
            right={
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, px: 1.2, py: "4px", background: T.dangerLight, border: `1px solid #fecaca` }}>
                <Typography sx={{ fontSize: 10.5, color: T.danger, fontWeight: 600 }}>Total:</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 800, color: T.danger, fontFamily: "'DM Mono', monospace" }}>{INR(totalDue)}</Typography>
              </Box>
            }
          >
            <Box sx={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><TH>Invoice</TH><TH>Customer</TH><TH align="right">Due</TH><TH>Status</TH></tr></thead>
                <tbody>
                  {custPending.map((inv, idx) => {
                    const name = (typeof inv.customer === "object" ? inv.customer?.name : inv.customer) || "—";
                    return (
                      <tr key={inv._id} style={{ background: idx % 2 === 0 ? T.surface : T.surfaceAlt }}>
                        <TD mono bold color={T.primary}>{inv.invoiceNo}</TD>
                        <TD bold>{name}</TD>
                        <TD align="right" mono bold color={T.danger}>{INR(getDue(inv))}</TD>
                        <td style={{ padding: "10px 14px", borderBottom: `1px solid ${T.borderLight}` }}><Badge label={Number(inv.payment?.paidAmount || 0) > 0 ? "Partial" : "Pending"} /></td>
                      </tr>
                    );
                  })}
                  {custPending.length === 0 && <tr><td colSpan={4} style={{ padding: "36px", textAlign: "center", color: T.faint, fontSize: 13 }}>No pending payments 🎉</td></tr>}
                </tbody>
              </table>
            </Box>
          </Panel>

          {/* Overdue >30d */}
          <Panel
            title="Overdue Invoices (>30 Days)"
            subtitle="Requires immediate follow-up"
            accent="#7c2d12"
            noPad
            navigate={navigate}
            viewAllPath="/invoices"
            viewAllLabel="All Invoices"
            right={
              overdueInvoices.length > 0 ? (
                <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, px: 1.1, py: "4px", background: T.dangerLight, border: `1px solid #fecaca` }}>
                  <WarningAmberIcon sx={{ fontSize: 12, color: T.danger }} />
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.danger }}>{overdueInvoices.length} overdue</Typography>
                </Box>
              ) : null
            }
          >
            <Box sx={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><TH>Invoice</TH><TH>Customer</TH><TH>Days Ago</TH><TH align="right">Due</TH></tr></thead>
                <tbody>
                  {overdueInvoices.map((inv, idx) => {
                    const name   = (typeof inv.customer === "object" ? inv.customer?.name : inv.customer) || "—";
                    const parsed = parseDate(inv.date || inv.createdAt);
                    const daysAgo = parsed ? Math.floor((now - parsed) / 86400000) : "?";
                    return (
                      <tr key={inv._id} style={{ background: idx % 2 === 0 ? T.surface : T.surfaceAlt }}>
                        <TD mono bold color={T.danger}>{inv.invoiceNo}</TD>
                        <TD bold>{name}</TD>
                        <td style={{ padding: "10px 14px", borderBottom: `1px solid ${T.borderLight}` }}>
                          <Box component="span" sx={{ px: 0.9, py: "2px", background: T.dangerLight, color: T.danger, fontSize: 11, fontWeight: 700, border: `1px solid #fecaca` }}>{daysAgo}d</Box>
                        </td>
                        <TD align="right" mono bold color={T.danger}>{INR(getDue(inv))}</TD>
                      </tr>
                    );
                  })}
                  {overdueInvoices.length === 0 && <tr><td colSpan={4} style={{ padding: "36px", textAlign: "center", color: T.faint, fontSize: 13 }}>No overdue invoices ✅</td></tr>}
                </tbody>
              </table>
            </Box>
          </Panel>
        </Box>

        {/* ══ ROW 6 — Supplier Pending + Low Stock ══ */}
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "repeat(2,minmax(0,1fr))" }, alignItems: "stretch" }}>

          {/* Supplier Pending */}
          <Panel
            title="Supplier Pending Payments"
            subtitle={`${suppPendingList.length} suppliers with outstanding dues`}
            accent={T.warning}
            noPad
            navigate={navigate}
            viewAllPath="/suppliers"
            viewAllLabel="All Suppliers"
            right={
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, px: 1.2, py: "4px", background: T.warningLight, border: `1px solid #fde68a` }}>
                <Typography sx={{ fontSize: 10.5, color: T.warning, fontWeight: 600 }}>Total:</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 800, color: T.danger, fontFamily: "'DM Mono', monospace" }}>{INR(supplierPending)}</Typography>
              </Box>
            }
          >
            <Box sx={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><TH>Supplier</TH><TH align="right">Due</TH><TH align="right">Total</TH><TH>Status</TH></tr></thead>
                <tbody>
                  {suppPendingList.map((s, idx) => (
                    <tr key={s._id} style={{ background: idx % 2 === 0 ? T.surface : T.surfaceAlt }}>
                      <TD bold>{s.companyName || s.name}</TD>
                      <TD align="right" mono bold color={T.danger}>{INR(s.totalDue || 0)}</TD>
                      <TD align="right" mono color={T.muted}>{INR(s.totalValue || 0)}</TD>
                      <td style={{ padding: "10px 14px", borderBottom: `1px solid ${T.borderLight}` }}><Badge label={Number(s.totalPaid || 0) > 0 ? "Partial" : "Pending"} /></td>
                    </tr>
                  ))}
                  {suppPendingList.length === 0 && <tr><td colSpan={4} style={{ padding: "36px", textAlign: "center", color: T.faint, fontSize: 13 }}>No pending supplier payments 🎉</td></tr>}
                </tbody>
              </table>
            </Box>
          </Panel>

          {/* Low Stock */}
          <Panel
            title="Low Stock Alert"
            subtitle={`${lowStock.length} products below threshold`}
            accent={T.orange}
            noPad
            navigate={navigate}
            viewAllPath="/products"
            viewAllLabel="All Products"
            right={
              <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, px: 1.1, py: "4px", background: T.dangerLight, border: `1px solid #fecaca` }}>
                <WarningAmberIcon sx={{ fontSize: 12, color: T.danger }} />
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.danger }}>{outOfStock} out of stock</Typography>
              </Box>
            }
          >
            <Box sx={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><TH>Product</TH><TH>Category</TH><TH>Size</TH><TH align="right">Stock</TH><TH>Status</TH></tr></thead>
                <tbody>
                  {lowStock.map((p, idx) => (
                    <tr key={p._id} style={{ background: idx % 2 === 0 ? T.surface : T.surfaceAlt }}>
                      <TD bold>{p.name}</TD>
                      <TD color={T.muted}>{p.category || "—"}</TD>
                      <TD color={T.muted}>{p.size || "—"}</TD>
                      <TD align="right" mono bold color={Number(p.stock) === 0 ? T.danger : T.warning}>{p.stock}</TD>
                      <td style={{ padding: "10px 14px", borderBottom: `1px solid ${T.borderLight}` }}><Badge label={Number(p.stock) === 0 ? "Out of Stock" : "Low Stock"} /></td>
                    </tr>
                  ))}
                  {lowStock.length === 0 && <tr><td colSpan={5} style={{ padding: "36px", textAlign: "center", color: T.faint, fontSize: 13 }}>All products well stocked ✅</td></tr>}
                </tbody>
              </table>
            </Box>
          </Panel>
        </Box>

        {/* ══ ROW 7 — Quick summary bar ══ */}
        <Box sx={{ background: T.surface, border: `1px solid ${T.border}`, overflow: "hidden", boxShadow: "0 1px 4px rgba(15,23,42,.05)" }}>
          <Box sx={{ px: 2.5, py: 1.2, borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".07em" }}>Quick Summary</Typography>
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", overflow: "hidden" }}>
            {[
              { label: "Total Invoices",   value: salesInvoices.length,                                                                                              color: T.primary, icon: <ReceiptLongIcon    sx={{ fontSize: 15 }} />, path: "/invoices"  },
              { label: "Paid Invoices",    value: salesInvoices.filter(i => getDue(i) === 0).length,                                                                  color: T.success, icon: <CheckCircleIcon    sx={{ fontSize: 15 }} />, path: "/invoices"  },
              { label: "Pending",          value: salesInvoices.filter(i => getDue(i) > 0).length,                                                                   color: T.danger,  icon: <HourglassEmptyIcon sx={{ fontSize: 15 }} />, path: "/invoices"  },
              { label: "Total Products",   value: products.length,                                                                                                    color: T.violet,  icon: <InventoryIcon      sx={{ fontSize: 15 }} />, path: "/products"  },
              { label: "Active Suppliers", value: suppliers.length,                                                                                                   color: "#0ea5e9", icon: <LocalShippingIcon  sx={{ fontSize: 15 }} />, path: "/suppliers" },
              { label: "Unique Customers", value: new Set(salesInvoices.map(i => (typeof i.customer === "object" ? i.customer?.name : i.customer) || "?")).size,     color: "#7c3aed", icon: <PeopleIcon         sx={{ fontSize: 15 }} />, path: "/customers" },
            ].map(({ label, value, color, icon, path }, i) => (
              <Box
                key={label}
                onClick={() => navigate(path)}
                sx={{
                  px: 2, py: 1.8,
                  borderRight: i < 5 ? `1px solid ${T.border}` : "none",
                  display: "flex", alignItems: "center", gap: 1.2,
                  cursor: "pointer",
                  transition: "background .12s",
                  "&:hover": { background: T.primaryLight },
                  "&:hover .arrow": { opacity: 1, transform: "translateX(0)" },
                }}
              >
                <Box sx={{ color, flexShrink: 0 }}>{icon}</Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</Typography>
                  <Typography sx={{ fontSize: 20, fontWeight: 800, color, fontFamily: "'DM Mono', monospace", lineHeight: 1.2 }}>{value}</Typography>
                </Box>
                <ArrowForwardIcon
                  className="arrow"
                  sx={{ fontSize: 13, color, opacity: 0, transform: "translateX(-4px)", transition: "all .15s", flexShrink: 0 }}
                />
              </Box>
            ))}
          </Box>
        </Box>

      </Box>
    </Box>
  );
};

export default Dashboard;
