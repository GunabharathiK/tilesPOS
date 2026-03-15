import { useEffect, useState, useMemo } from "react";
import { Box, Typography } from "@mui/material";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line, PieChart, Pie, Cell, Area, AreaChart,
} from "recharts";
import TrendingUpIcon           from "@mui/icons-material/TrendingUp";
import TrendingDownIcon         from "@mui/icons-material/TrendingDown";
import ReceiptLongIcon          from "@mui/icons-material/ReceiptLong";
import ShoppingCartIcon         from "@mui/icons-material/ShoppingCart";
import HourglassEmptyIcon       from "@mui/icons-material/HourglassEmpty";
import LocalShippingIcon        from "@mui/icons-material/LocalShipping";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import CheckCircleIcon          from "@mui/icons-material/CheckCircle";
import WarningAmberIcon         from "@mui/icons-material/WarningAmber";
import InventoryIcon            from "@mui/icons-material/Inventory";
import PeopleIcon               from "@mui/icons-material/People";
import SpeedIcon                from "@mui/icons-material/Speed";
import API from "../services/api";
import { getSuppliers } from "../services/supplierService";

/* ── Design tokens — unified across entire app ── */
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
const INR       = (n = 0) => "₹" + Number(n).toLocaleString("en-IN");
const DAYS      = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS    = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const parseDate = v => { const d = new Date(v); return isNaN(d.getTime()) ? null : d; };
const getMonthKey = ds => { const d = new Date(ds); return isNaN(d) ? null : `${d.getFullYear()}-${d.getMonth()}`; };

const normalizeCustomerType = inv => {
  const raw = inv?.customerType || inv?.saleType || inv?.customer?.customerType || inv?.customer?.saleType || "Retail Customer";
  if (raw === "Dealer" || raw === "Wholesale")    return "Dealer";
  if (raw === "Contractor" || raw === "B2B")      return "Contractor";
  if (raw === "Builder / Project")                return "Builder / Project";
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

/* ── Chart tooltip ── */
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ background: T.dark, px: 1.8, py: 1.3, border: `1px solid #1e293b`, boxShadow: "0 8px 20px rgba(0,0,0,.3)" }}>
      <Typography sx={{ fontSize: 10.5, color: "rgba(255,255,255,.5)", mb: 0.6, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>{label}</Typography>
      {payload.map(p => (
        <Box key={p.name} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.2 }}>
          <Box sx={{ width: 7, height: 7, background: p.color, flexShrink: 0 }} />
          <Typography sx={{ fontSize: 11, color: "rgba(255,255,255,.7)", mr: 0.5 }}>{p.name}</Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#fff", fontFamily: "'DM Mono', monospace" }}>
            {p.value > 999 ? INR(p.value) : p.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

/* ── Metric card (top row) ── */
const MetricCard = ({ label, value, sub, delta, icon, accent, accentLight }) => {
  const isPositive = delta >= 0;
  return (
    <Box sx={{ background: T.surface, border: `1px solid ${T.border}`, borderTop: `3px solid ${accent}`, p: "16px 18px", display: "flex", flexDirection: "column", gap: 0.8 }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".07em" }}>{label}</Typography>
        <Box sx={{ width: 34, height: 34, background: accentLight, display: "flex", alignItems: "center", justifyContent: "center", color: accent, flexShrink: 0 }}>
          {icon}
        </Box>
      </Box>
      <Typography sx={{ fontSize: 24, fontWeight: 800, color: T.dark, lineHeight: 1.1, fontFamily: "'DM Mono', monospace" }}>{value}</Typography>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography sx={{ fontSize: 11, color: T.faint }}>{sub}</Typography>
        {delta !== undefined && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
            {isPositive
              ? <TrendingUpIcon   sx={{ fontSize: 13, color: T.success }} />
              : <TrendingDownIcon sx={{ fontSize: 13, color: T.danger  }} />}
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: isPositive ? T.success : T.danger }}>
              {isPositive ? "+" : ""}{delta}% vs last month
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

/* ── Section panel ── */
const Panel = ({ title, subtitle, right, children, accent, noPad }) => (
  <Box sx={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: "0 1px 3px rgba(15,23,42,.06)", overflow: "hidden", display: "flex", flexDirection: "column", height: "100%" }}>
    <Box sx={{ px: 2.5, py: 1.5, borderBottom: `2px solid ${accent || T.primary}`, background: `linear-gradient(to right, ${T.primaryLight}, ${T.surface})`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1, flexShrink: 0 }}>
      <Box>
        <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: T.dark, lineHeight: 1.2 }}>{title}</Typography>
        {subtitle && <Typography sx={{ fontSize: 11.5, color: T.muted, mt: 0.3 }}>{subtitle}</Typography>}
      </Box>
      {right && <Box sx={{ flexShrink: 0 }}>{right}</Box>}
    </Box>
    <Box sx={noPad ? {} : { p: 2 }}>{children}</Box>
  </Box>
);

/* ── Status badge ── */
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
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, px: 0.9, py: "2px", fontSize: 10, fontWeight: 700, color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
      <Box sx={{ width: 5, height: 5, background: s.color, flexShrink: 0 }} />
      {label}
    </Box>
  );
};

/* ── Table atoms ── */
const TH = ({ children, align = "left" }) => (
  <th style={{ padding: "9px 14px", textAlign: align, fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".07em", borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt, whiteSpace: "nowrap" }}>
    {children}
  </th>
);
const TD = ({ children, align = "left", mono, bold, color }) => (
  <td style={{ padding: "10px 14px", textAlign: align, color: color || T.text, fontWeight: bold ? 700 : 500, fontFamily: mono ? "'DM Mono', monospace" : "'Noto Sans', sans-serif", fontSize: 13, borderBottom: `1px solid ${T.borderLight}` }}>
    {children}
  </td>
);

/* ── Mini KPI strip (no icon, just numbers) ── */
const StripItem = ({ label, value, color }) => (
  <Box sx={{ px: 1.8, py: 1.2, borderRight: `1px solid ${T.border}`, flex: 1, minWidth: 0 }}>
    <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".07em", mb: 0.4 }}>{label}</Typography>
    <Typography sx={{ fontSize: 18, fontWeight: 800, color: color || T.dark, fontFamily: "'DM Mono', monospace", lineHeight: 1.1 }}>{value}</Typography>
  </Box>
);

const PIE_COLORS = [T.primary, T.success, "#f59e0b", T.violet, T.orange, T.faint];

/* ═══════════════════════════════════════════════════ */
const Dashboard = () => {
  const [invoices,  setInvoices]  = useState([]);
  const [products,  setProducts]  = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState("week"); // week | month

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

  /* ── KPI derivations ── */
  const todaySales   = salesInvoices.filter(i => parseDate(i.date || i.createdAt)?.toDateString() === todayStr).reduce((s, i) => s + getAmount(i), 0);
  const ordersToday  = salesInvoices.filter(i => parseDate(i.date || i.createdAt)?.toDateString() === todayStr).length;
  const totalRevenue = salesInvoices.reduce((s, i) => s + getAmount(i), 0);
  const totalDue     = salesInvoices.reduce((s, i) => s + getDue(i), 0);
  const colRate      = collectionRate(salesInvoices);

  /* Month-over-month delta */
  const thisMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthKey = `${prevMonthDate.getFullYear()}-${prevMonthDate.getMonth()}`;
  const thisMonthSales = salesInvoices.filter(i => getMonthKey(i.date || i.createdAt) === thisMonthKey).reduce((s, i) => s + getAmount(i), 0);
  const prevMonthSales = salesInvoices.filter(i => getMonthKey(i.date || i.createdAt) === prevMonthKey).reduce((s, i) => s + getAmount(i), 0);
  const revDelta = pctChange(thisMonthSales, prevMonthSales);

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

  const topTiles = useMemo(() => {
    const m = {};
    salesInvoices.forEach(inv => (inv.items || []).forEach(item => {
      const n = item.name || item.productName || "Unknown";
      m[n] = (m[n] || 0) + (Number(item.quantity) || 0);
    }));
    const sorted = Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const total  = sorted.reduce((a, [, v]) => a + v, 0) || 1;
    return sorted.map(([name, qty]) => ({ name, value: Math.round((qty / total) * 100), qty }));
  }, [salesInvoices]);

  /* ── Real-world derived lists ── */
  const lowStock        = products.filter(p => Number(p.stock) < 10).sort((a, b) => a.stock - b.stock).slice(0, 8);
  const outOfStock      = products.filter(p => Number(p.stock) === 0).length;
  const custPending     = useMemo(() => salesInvoices.filter(i => getDue(i) > 0).sort((a, b) => getDue(b) - getDue(a)).slice(0, 6), [salesInvoices]);
  const suppPendingList = useMemo(() => suppliers.filter(s => Number(s.totalDue || 0) > 0).sort((a, b) => Number(b.totalDue) - Number(a.totalDue)).slice(0, 6), [suppliers]);

  /* ── Top customers by revenue ── */
  const topCustomers = useMemo(() => {
    const m = new Map();
    salesInvoices.forEach(inv => {
      const name = (typeof inv.customer === "object" ? inv.customer?.name : inv.customer) || "Unknown";
      const key  = name;
      if (!m.has(key)) m.set(key, { name, total: 0, count: 0 });
      const r = m.get(key);
      r.total += getAmount(inv);
      r.count += 1;
    });
    return Array.from(m.values()).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [salesInvoices]);

  /* ── Overdue invoices (due > 30 days) ── */
  const overdueInvoices = useMemo(() => {
    const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 30);
    return salesInvoices
      .filter(i => getDue(i) > 0 && parseDate(i.date || i.createdAt) < cutoff)
      .sort((a, b) => getDue(b) - getDue(a))
      .slice(0, 5);
  }, [salesInvoices]);

  /* ── Customer type breakdown ── */
  const typeBreakdown = useMemo(() => {
    const types = ["Retail Customer", "Dealer", "Contractor", "Builder / Project"];
    return types.map(t => ({
      name: t === "Builder / Project" ? "Builder" : t.split(" ")[0],
      total: salesInvoices.filter(i => normalizeCustomerType(i) === t).reduce((s, i) => s + getAmount(i), 0),
    })).filter(t => t.total > 0);
  }, [salesInvoices]);

  if (loading) return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
      <Box sx={{ width: 32, height: 32, border: `3px solid ${T.border}`, borderTop: `3px solid ${T.primary}`, borderRadius: "50%", animation: "spin .8s linear infinite", "@keyframes spin": { to: { transform: "rotate(360deg)" } } }} />
    </Box>
  );

  /* ══════════════════════════════════ RENDER ══════════════ */
  return (
    <Box sx={{ p: 0, background: T.bg, minHeight: "100%", fontFamily: "'Noto Sans', sans-serif" }}>

      {/* ── Page header ── */}
      <Box sx={{ px: 3, py: 1.8, background: T.surface, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
        <Box>
          <Typography sx={{ fontSize: 20, fontWeight: 800, color: T.dark, lineHeight: 1.2, letterSpacing: "-.01em" }}>Dashboard</Typography>
          <Typography sx={{ fontSize: 12, color: T.muted, mt: 0.2 }}>
            {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </Typography>
        </Box>
        {/* Health indicators */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0 }}>
          {[
            { label: "Collection Rate", value: `${colRate}%`,             color: colRate >= 80 ? T.success : colRate >= 50 ? T.warning : T.danger },
            { label: "Out of Stock",    value: `${outOfStock}`,           color: outOfStock > 0 ? T.danger : T.success },
            { label: "Overdue (>30d)",  value: `${overdueInvoices.length}`, color: overdueInvoices.length > 0 ? T.danger : T.success },
          ].map(({ label, value, color }, i) => (
            <Box key={label} sx={{ pl: i === 0 ? 0 : 2.5, pr: 2.5, borderLeft: i > 0 ? `1px solid ${T.border}` : "none", textAlign: "center", minWidth: 90 }}>
              <Typography sx={{ fontSize: 10, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", whiteSpace: "nowrap", mb: 0.4 }}>
                {label}
              </Typography>
              <Typography sx={{ fontSize: 22, fontWeight: 800, fontFamily: "'DM Mono', monospace", color, lineHeight: 1 }}>
                {value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{ px: 2.5, display: "flex", flexDirection: "column", gap: 2, pb: 3 }}>

        {/* ══ ROW 1 — KPI cards ══ */}
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2,1fr)", xl: "repeat(4,1fr)" } }}>
          <MetricCard label="Today's Sales"    value={INR(todaySales)}    sub={`${ordersToday} bill${ordersToday !== 1 ? "s" : ""} today`}   delta={revDelta}   accent={T.primary}  accentLight={T.primaryLight} icon={<TrendingUpIcon    sx={{ fontSize: 18 }} />} />
          <MetricCard label="Total Revenue"    value={INR(totalRevenue)}  sub="Lifetime billing total"                                                           accent={T.success}  accentLight={T.successLight} icon={<ReceiptLongIcon   sx={{ fontSize: 18 }} />} />
          <MetricCard label="Pending Amount"   value={INR(totalDue)}      sub={`${custPending.length} customer${custPending.length !== 1 ? "s" : ""} pending`}   accent={T.danger}   accentLight={T.dangerLight}  icon={<HourglassEmptyIcon sx={{ fontSize: 18 }} />} />
          <MetricCard label="Total Orders"     value={salesInvoices.length} sub={`${products.length} products · ${suppliers.length} suppliers`}                  accent={T.violet}   accentLight={T.violetLight}  icon={<ShoppingCartIcon  sx={{ fontSize: 18 }} />} />
        </Box>

        {/* ══ ROW 2 — Supplier KPIs strip ══ */}
        <Box sx={{ background: T.surface, border: `1px solid ${T.border}`, display: "flex", overflow: "hidden" }}>
          <Box sx={{ width: 4, background: T.primary, flexShrink: 0 }} />
          <StripItem label="Total Suppliers"  value={suppliers.length}   color={T.primary} />
          <StripItem label="Purchase Total"   value={INR(supplierTotal)} color={T.dark} />
          <StripItem label="Supplier Paid"    value={INR(supplierPaid)}  color={T.success} />
          <Box sx={{ px: 1.8, py: 1.2, flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".07em", mb: 0.4 }}>Supplier Pending</Typography>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: T.danger, fontFamily: "'DM Mono', monospace", lineHeight: 1.1 }}>{INR(supplierPending)}</Typography>
          </Box>
        </Box>

        {/* ══ ROW 3 — Sales chart + Customer type pie ══ */}
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "minmax(0,2fr) minmax(0,1fr)" }, alignItems: "stretch" }}>

          {/* Sales chart with week / month toggle */}
          <Panel
            title={activeTab === "week" ? "Last 7 Days — Sales by Type" : "Monthly Sales Trend"}
            subtitle={activeTab === "week" ? "Retail, Dealer, Contractor, Builder" : "Sales vs Due — last 6 months"}
            accent={T.primary}
            noPad
            right={
              <Box sx={{ display: "flex", border: `1px solid ${T.border}`, overflow: "hidden" }}>
                {["week","month"].map(tab => (
                  <Box key={tab} onClick={() => setActiveTab(tab)} sx={{ px: 1.6, py: "5px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", background: activeTab === tab ? T.primary : T.surface, color: activeTab === tab ? "#fff" : T.muted, transition: "all .13s", "&:hover": activeTab !== tab ? { background: T.primaryLight, color: T.primary } : {} }}>
                    {tab === "week" ? "7 Days" : "Monthly"}
                  </Box>
                ))}
              </Box>
            }
          >
            <Box sx={{ p: 2 }}>
              {activeTab === "week" ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={last7Days} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={12} barGap={3}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.borderLight} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: T.muted }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: T.faint }} tickFormatter={v => v > 999 ? `${(v/1000).toFixed(0)}k` : v} axisLine={false} tickLine={false} width={36} />
                    <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(0,0,0,.03)" }} />
                    <Bar dataKey="Retail"     fill={T.primary}  radius={[0,0,0,0]} />
                    <Bar dataKey="Dealer"     fill="#0ea5e9"    radius={[0,0,0,0]} />
                    <Bar dataKey="Contractor" fill="#f59e0b"    radius={[0,0,0,0]} />
                    <Bar dataKey="Builder"    fill={T.violet}   radius={[0,0,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
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
              {/* Legend */}
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

          {/* Customer type breakdown */}
          <Panel title="Revenue by Customer Type" subtitle="Lifetime sales breakdown" accent={T.violet} noPad>
            <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 0 }}>
              {typeBreakdown.length === 0 ? (
                <Typography sx={{ color: T.faint, fontSize: 13, py: 4, textAlign: "center" }}>No sales data yet</Typography>
              ) : (
                <>
                  <Box sx={{ display: "flex", justifyContent: "center", mb: 1.5 }}>
                    <PieChart width={140} height={140}>
                      <Pie data={typeBreakdown} cx={65} cy={65} innerRadius={32} outerRadius={62} dataKey="total" paddingAngle={2}>
                        {typeBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />)}
                      </Pie>
                      <Tooltip formatter={v => INR(v)} />
                    </PieChart>
                  </Box>
                  {typeBreakdown.map((t, i) => {
                    const pct = Math.round((t.total / typeBreakdown.reduce((s, x) => s + x.total, 0)) * 100);
                    return (
                      <Box key={t.name} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.8, borderBottom: `1px solid ${T.borderLight}` }}>
                        <Box sx={{ width: 8, height: 8, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                        <Typography sx={{ fontSize: 12, color: T.text, fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</Typography>
                        <Typography sx={{ fontSize: 11, color: T.muted, fontFamily: "'DM Mono', monospace", mr: 0.5 }}>{pct}%</Typography>
                        <Typography sx={{ fontSize: 12, color: T.dark, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{INR(t.total)}</Typography>
                      </Box>
                    );
                  })}
                </>
              )}
            </Box>
          </Panel>
        </Box>

        {/* ══ ROW 4 — Recent Sales + Top Products ══ */}
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "minmax(0,3fr) minmax(0,2fr)" }, alignItems: "stretch" }}>

          {/* Recent Sales */}
          <Panel title="Recent Sales" subtitle="Latest invoices" accent={T.primary} noPad>
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
                        <TD>{dateStr}</TD>
                        <TD bold>{name}</TD>
                        <TD><Box component="span" sx={{ fontSize: 10.5, fontWeight: 700, color: T.muted, background: T.bg, border: `1px solid ${T.border}`, px: 0.8, py: "1px" }}>{normalizeCustomerType(inv).split(" ")[0]}</Box></TD>
                        <TD align="right" mono bold>{INR(getAmount(inv))}</TD>
                        <td style={{ padding: "10px 14px", borderBottom: `1px solid ${T.borderLight}` }}><Badge label={inv.status === "Paid" ? "Paid" : (Number(inv.payment?.paidAmount || 0) > 0 ? "Partial" : "Pending")} /></td>
                      </tr>
                    );
                  })}
                  {recentInvoices.length === 0 && <tr><td colSpan={6} style={{ padding: "32px", textAlign: "center", color: T.faint, fontSize: 13 }}>No invoices yet</td></tr>}
                </tbody>
              </table>
            </Box>
          </Panel>

          {/* Top Customers */}
          <Panel title="Top Customers" subtitle="By lifetime revenue" accent={T.success} noPad>
            <Box sx={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><TH>#</TH><TH>Customer</TH><TH>Bills</TH><TH align="right">Revenue</TH></tr></thead>
                <tbody>
                  {topCustomers.map((c, idx) => (
                    <tr key={c.name} style={{ background: idx % 2 === 0 ? T.surface : T.surfaceAlt }}>
                      <td style={{ padding: "10px 14px", borderBottom: `1px solid ${T.borderLight}`, width: 32 }}>
                        <Box sx={{ width: 22, height: 22, background: idx === 0 ? "#fef3c7" : idx === 1 ? T.surfaceAlt : T.surfaceAlt, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: idx === 0 ? "#b45309" : T.muted }}>
                          {idx + 1}
                        </Box>
                      </td>
                      <TD bold>{c.name}</TD>
                      <TD>{c.count}</TD>
                      <TD align="right" mono bold color={T.success}>{INR(c.total)}</TD>
                    </tr>
                  ))}
                  {topCustomers.length === 0 && <tr><td colSpan={4} style={{ padding: "32px", textAlign: "center", color: T.faint, fontSize: 13 }}>No customers yet</td></tr>}
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
            accent={T.danger}
            noPad
            right={
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                <Typography sx={{ fontSize: 11, color: T.muted }}>Total Due:</Typography>
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
                  {custPending.length === 0 && <tr><td colSpan={4} style={{ padding: "32px", textAlign: "center", color: T.faint, fontSize: 13 }}>No pending payments 🎉</td></tr>}
                </tbody>
              </table>
            </Box>
          </Panel>

          {/* Overdue >30 days */}
          <Panel
            title="Overdue Invoices (>30 Days)"
            subtitle="Requires immediate follow-up"
            accent="#7c2d12"
            noPad
            right={
              overdueInvoices.length > 0
                ? <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, px: 1, py: "3px", background: T.dangerLight, border: `1px solid #fecaca` }}><WarningAmberIcon sx={{ fontSize: 12, color: T.danger }} /><Typography sx={{ fontSize: 11, fontWeight: 700, color: T.danger }}>{overdueInvoices.length} overdue</Typography></Box>
                : null
            }
          >
            <Box sx={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><TH>Invoice</TH><TH>Customer</TH><TH>Date</TH><TH align="right">Due</TH></tr></thead>
                <tbody>
                  {overdueInvoices.map((inv, idx) => {
                    const name   = (typeof inv.customer === "object" ? inv.customer?.name : inv.customer) || "—";
                    const parsed = parseDate(inv.date || inv.createdAt);
                    const daysAgo = parsed ? Math.floor((now - parsed) / 86400000) : "?";
                    return (
                      <tr key={inv._id} style={{ background: idx % 2 === 0 ? T.surface : T.surfaceAlt }}>
                        <TD mono bold color={T.danger}>{inv.invoiceNo}</TD>
                        <TD bold>{name}</TD>
                        <TD color={T.danger}>{daysAgo}d ago</TD>
                        <TD align="right" mono bold color={T.danger}>{INR(getDue(inv))}</TD>
                      </tr>
                    );
                  })}
                  {overdueInvoices.length === 0 && <tr><td colSpan={4} style={{ padding: "32px", textAlign: "center", color: T.faint, fontSize: 13 }}>No overdue invoices ✅</td></tr>}
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
            accent={T.warning}
            noPad
            right={
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                <Typography sx={{ fontSize: 11, color: T.muted }}>Total Due:</Typography>
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
                      <TD align="right" mono>{INR(s.totalValue || 0)}</TD>
                      <td style={{ padding: "10px 14px", borderBottom: `1px solid ${T.borderLight}` }}><Badge label={Number(s.totalPaid || 0) > 0 ? "Partial" : "Pending"} /></td>
                    </tr>
                  ))}
                  {suppPendingList.length === 0 && <tr><td colSpan={4} style={{ padding: "32px", textAlign: "center", color: T.faint, fontSize: 13 }}>No pending supplier payments 🎉</td></tr>}
                </tbody>
              </table>
            </Box>
          </Panel>

          {/* Low Stock Alert */}
          <Panel
            title="Low Stock Alert"
            subtitle={`${lowStock.length} products below threshold`}
            accent={T.orange}
            noPad
            right={
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <WarningAmberIcon sx={{ color: T.orange, fontSize: 14 }} />
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.orange }}>{outOfStock} out of stock</Typography>
              </Box>
            }
          >
            <Box sx={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><TH>Product</TH><TH>Size</TH><TH align="right">Stock</TH><TH>Status</TH></tr></thead>
                <tbody>
                  {lowStock.map((p, idx) => (
                    <tr key={p._id} style={{ background: idx % 2 === 0 ? T.surface : T.surfaceAlt }}>
                      <TD bold>{p.name}</TD>
                      <TD>{p.size || "—"}</TD>
                      <TD align="right" mono bold color={Number(p.stock) === 0 ? T.danger : T.warning}>{p.stock}</TD>
                      <td style={{ padding: "10px 14px", borderBottom: `1px solid ${T.borderLight}` }}><Badge label={Number(p.stock) === 0 ? "Out of Stock" : "Low Stock"} /></td>
                    </tr>
                  ))}
                  {lowStock.length === 0 && <tr><td colSpan={4} style={{ padding: "32px", textAlign: "center", color: T.faint, fontSize: 13 }}>All products well stocked ✅</td></tr>}
                </tbody>
              </table>
            </Box>
          </Panel>
        </Box>

        {/* ══ ROW 7 — Quick summary bar ══ */}
        <Box sx={{ background: T.surface, border: `1px solid ${T.border}`, overflow: "hidden" }}>
          <Box sx={{ px: 2.5, py: 1.2, borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".07em" }}>Quick Summary</Typography>
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", overflow: "hidden" }}>
            {[
              { label: "Total Invoices",    value: salesInvoices.length,                                         color: T.primary, icon: <ReceiptLongIcon    sx={{ fontSize: 16 }} /> },
              { label: "Paid Invoices",     value: salesInvoices.filter(i => getDue(i) === 0).length,            color: T.success, icon: <CheckCircleIcon     sx={{ fontSize: 16 }} /> },
              { label: "Pending Invoices",  value: salesInvoices.filter(i => getDue(i) > 0).length,             color: T.danger,  icon: <HourglassEmptyIcon  sx={{ fontSize: 16 }} /> },
              { label: "Total Products",    value: products.length,                                              color: T.violet,  icon: <InventoryIcon       sx={{ fontSize: 16 }} /> },
              { label: "Active Suppliers",  value: suppliers.length,                                             color: "#0ea5e9", icon: <LocalShippingIcon   sx={{ fontSize: 16 }} /> },
              { label: "Unique Customers",  value: new Set(salesInvoices.map(i => (typeof i.customer === "object" ? i.customer?.name : i.customer) || "?")).size, color: "#7c3aed", icon: <PeopleIcon sx={{ fontSize: 16 }} /> },
            ].map(({ label, value, color, icon }, i) => (
              <Box key={label} sx={{ px: 2, py: 1.6, borderRight: i < 5 ? `1px solid ${T.border}` : "none", display: "flex", alignItems: "center", gap: 1.2 }}>
                <Box sx={{ color, flexShrink: 0 }}>{icon}</Box>
                <Box>
                  <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</Typography>
                  <Typography sx={{ fontSize: 18, fontWeight: 800, color, fontFamily: "'DM Mono', monospace", lineHeight: 1.2 }}>{value}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

      </Box>
    </Box>
  );
};

export default Dashboard; 