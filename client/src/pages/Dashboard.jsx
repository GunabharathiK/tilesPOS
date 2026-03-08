import { useEffect, useState, useMemo } from "react";
import { Box, Typography } from "@mui/material";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from "recharts";
import TrendingUpIcon           from "@mui/icons-material/TrendingUp";
import ReceiptLongIcon          from "@mui/icons-material/ReceiptLong";
import ShoppingCartIcon         from "@mui/icons-material/ShoppingCart";
import HourglassEmptyIcon       from "@mui/icons-material/HourglassEmpty";
import LocalShippingIcon        from "@mui/icons-material/LocalShipping";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import CheckCircleIcon          from "@mui/icons-material/CheckCircle";
import WarningAmberIcon         from "@mui/icons-material/WarningAmber";
import API from "../services/api";
import { getSuppliers } from "../services/supplierService";

// ─── helpers ─────────────────────────────────────────────────
const INR  = (n = 0) => "₹" + Number(n).toLocaleString("en-IN");
const DAYS  = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const getMonthKey = (dateStr) => {
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return `${d.getFullYear()}-${d.getMonth()}`;
};

const parseDate = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const normalizeCustomerType = (invoice) => {
  const raw =
    invoice?.customerType ||
    invoice?.saleType ||
    invoice?.customer?.customerType ||
    invoice?.customer?.saleType ||
    "Retail Customer";
  if (raw === "Dealer" || raw === "Wholesale") return "Dealer";
  if (raw === "Contractor" || raw === "B2B") return "Contractor";
  if (raw === "Builder / Project") return "Builder / Project";
  return "Retail Customer";
};

const getInvoiceAmount = (invoice) => {
  const amount = Number(invoice?.payment?.amount);
  if (Number.isFinite(amount) && amount > 0) return amount;
  return Number(invoice?.items?.reduce((sum, item) => (
    sum + ((Number(item.quantity) || 0) * (Number(item.price) || 0))
  ), 0) || 0);
};

const getInvoiceDue = (invoice) => {
  if (invoice?.status === "Paid") return 0;
  const due = Number(invoice?.payment?.dueAmount);
  if (Number.isFinite(due) && due >= 0) return due;
  const amount = getInvoiceAmount(invoice);
  const paid = Number(invoice?.payment?.paidAmount || 0);
  return Math.max(0, amount - paid);
};

// ─── Gradient stat card (top row) ────────────────────────────
const GradCard = ({ title, value, sub, icon, gradient }) => (
  <Box sx={{
    width: "100%",
    background: gradient,
    borderRadius: "14px",
    p: 2, pt: 2.2,
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
    display: "flex", flexDirection: "column", gap: 0.5,
    minHeight: 120,
    height: "100%",
  }}>
    <Box sx={{ position: "absolute", top: 12, right: 14 }}>
      <Box sx={{
        width: 36, height: 36, borderRadius: "9px",
        background: "rgba(255,255,255,0.18)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {icon}
      </Box>
    </Box>
    {/* sparkline bars decoration */}
    <Box sx={{
      position: "absolute", bottom: 10, right: 12,
      display: "flex", alignItems: "flex-end", gap: "2px",
    }}>
      {[40,65,45,80,55,70,60].map((h, i) => (
        <Box key={i} sx={{
          width: 3, height: h * 0.28,
          borderRadius: "2px",
          background: "rgba(255,255,255,0.22)",
        }} />
      ))}
    </Box>
    <Typography sx={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.82)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {title}
    </Typography>
    <Typography sx={{ fontSize: 24, fontWeight: 800, color: "#fff", fontFamily: "'Rajdhani', sans-serif", lineHeight: 1.1 }}>
      {value}
    </Typography>
    <Typography sx={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
      {sub}
    </Typography>
  </Box>
);

// ─── White stat card (supplier row) ──────────────────────────
const WhiteCard = ({ title, value, sub, icon, accentColor }) => (
  <Box sx={{
    width: "100%",
    background: "#fff",
    borderRadius: "12px",
    p: 2,
    border: "1px solid #e8eef6",
    borderTop: `3px solid ${accentColor}`,
    boxShadow: "0 2px 10px rgba(15,35,80,0.05)",
    display: "flex", alignItems: "center", gap: 1.5,
    transition: "box-shadow 0.2s",
    minHeight: 104,
    height: "100%",
    "&:hover": { boxShadow: "0 6px 20px rgba(15,35,80,0.10)" },
  }}>
    <Box sx={{
      width: 40, height: 40, borderRadius: "10px",
      background: accentColor + "18",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      {icon}
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: 10, fontWeight: 700, color: "#8896a9", textTransform: "uppercase", letterSpacing: "0.07em" }}>
        {title}
      </Typography>
      <Typography sx={{ fontSize: 20, fontWeight: 800, color: "#0d1b36", fontFamily: "'Rajdhani', sans-serif", lineHeight: 1.2 }}>
        {value}
      </Typography>
      {sub && <Typography sx={{ fontSize: 11, color: "#a0aec0", mt: 0.1 }}>{sub}</Typography>}
    </Box>
  </Box>
);

// ─── Panel wrapper ────────────────────────────────────────────
const Panel = ({ children, sx = {} }) => (
  <Box sx={{
    background: "#fff",
    borderRadius: "14px",
    border: "1px solid #e8eef6",
    boxShadow: "0 2px 12px rgba(15,35,80,0.05)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    height: "100%",
    ...sx,
  }}>
    {children}
  </Box>
);

const PanelHeader = ({ title, right }) => (
  <Box sx={{
    px: 2.5, py: 1.8,
    borderBottom: "1px solid #f0f4f9",
    display: "flex", alignItems: "center", justifyContent: "space-between",
  }}>
    <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#0d1b36" }}>{title}</Typography>
    {right && <Box>{right}</Box>}
  </Box>
);

// ─── Tooltip components ───────────────────────────────────────
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ background: "#0f1629", borderRadius: "9px", px: 1.8, py: 1.3, border: "1px solid rgba(255,255,255,0.08)" }}>
      <Typography sx={{ fontSize: 11, color: "rgba(255,255,255,0.5)", mb: 0.6, fontFamily: "'DM Mono', monospace" }}>{label}</Typography>
      {payload.map((p) => (
        <Box key={p.name} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.2 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: "50%", background: p.color }} />
          <Typography sx={{ fontSize: 11, color: "rgba(255,255,255,0.7)", mr: 0.5 }}>{p.name}</Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#fff", fontFamily: "'DM Mono', monospace" }}>
            {p.value > 999 ? INR(p.value) : p.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

const PieTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ background: "#0f1629", borderRadius: "8px", px: 1.5, py: 1, border: "1px solid rgba(255,255,255,0.08)" }}>
      <Typography sx={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>{payload[0].name}</Typography>
      <Typography sx={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>{payload[0].value}%</Typography>
    </Box>
  );
};

// ─── Status badge ─────────────────────────────────────────────
const StatusBadge = ({ label }) => {
  const cfg = {
    "Paid":      { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
    "Partial":   { bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
    "Pending":   { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
    "Low Stock": { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
    "Out of Stock": { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
    "Last Due":  { bg: "#fdf4ff", color: "#7e22ce", border: "#e9d5ff" },
  };
  const s = cfg[label] || cfg["Pending"];
  return (
    <Box sx={{
      display: "inline-flex", alignItems: "center", gap: 0.5,
      px: 1, py: 0.3, borderRadius: "5px",
      background: s.bg, border: `1px solid ${s.border}`,
    }}>
      <Box sx={{ width: 5, height: 5, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
      <Typography sx={{ fontSize: 10, fontWeight: 700, color: s.color, whiteSpace: "nowrap" }}>{label}</Typography>
    </Box>
  );
};

// ─── Table helpers ────────────────────────────────────────────
const TH = ({ children }) => (
  <th style={{ padding: "9px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#8896a9", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid #eef2f7", background: "#f8fafd", whiteSpace: "nowrap" }}>
    {children}
  </th>
);
const TD = ({ children, mono, bold, red, blue }) => (
  <td style={{
    padding: "10px 14px",
    color: red ? "#ef4444" : blue ? "#2563eb" : "#374151",
    fontWeight: bold ? 700 : 500,
    fontFamily: mono ? "'DM Mono', monospace" : "'Noto Sans', sans-serif",
    fontSize: mono ? 11 : 12,
    borderBottom: "1px solid #f0f4f9",
  }}>
    {children}
  </td>
);

const PIE_COLORS = ["#3b82f6","#10b981","#f59e0b","#94a3b8","#f43f5e","#8b5cf6"];

// ═══════════════════════════════════════════════════════════════
const Dashboard = () => {
  const [invoices,  setInvoices]  = useState([]);
  const [products,  setProducts]  = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [invRes, prodRes, supRes] = await Promise.all([
          API.get("/invoices"),
          API.get("/products"),
          getSuppliers(),
        ]);
        setInvoices( Array.isArray(invRes.data)  ? invRes.data  : []);
        setProducts( Array.isArray(prodRes.data) ? prodRes.data : []);
        setSuppliers(Array.isArray(supRes.data)  ? supRes.data  : []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const now      = new Date();
  const todayStr = now.toDateString();
  const salesInvoices = useMemo(
    () =>
      invoices.filter((i) => {
        const isQuotation = String(i?.documentType || "").toLowerCase() === "quotation"
          || String(i?.invoiceNo || "").toUpperCase().startsWith("QTN");
        return !isQuotation;
      }),
    [invoices]
  );
  const recentInvoices = useMemo(
    () => [...salesInvoices].sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0)),
    [salesInvoices]
  );

  // ── Row 1 KPIs ────────────────────────────────────────────
  const todaySales = salesInvoices
    .filter((i) => parseDate(i.date || i.createdAt)?.toDateString() === todayStr)
    .reduce((a, i) => a + getInvoiceAmount(i), 0);

  const totalRevenue   = salesInvoices.reduce((a, i) => a + getInvoiceAmount(i), 0);
  const ordersToday    = salesInvoices.filter((i) => parseDate(i.date || i.createdAt)?.toDateString() === todayStr).length;
  const pendingAmount  = salesInvoices.reduce((a, i) => a + getInvoiceDue(i), 0);

  // ── Supplier KPIs ─────────────────────────────────────────
  const supplierTotal   = suppliers.reduce((a, s) => a + Number(s.totalValue || 0), 0);
  const supplierPaid    = suppliers.reduce((a, s) => a + Number(s.totalPaid  || 0), 0);
  const supplierPending = suppliers.reduce((a, s) => a + Number(s.totalDue   || 0), 0);

  // ── Last 7 days bar chart ─────────────────────────────────
  const last7Days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    const ds = d.toDateString();
    const day = salesInvoices.filter((inv) => parseDate(inv.date || inv.createdAt)?.toDateString() === ds);
    return {
      name:       DAYS[d.getDay()],
      Retail:     day.filter((x) => normalizeCustomerType(x) === "Retail Customer").reduce((a, x) => a + getInvoiceAmount(x), 0),
      Dealer:     day.filter((x) => normalizeCustomerType(x) === "Dealer").reduce((a, x) => a + getInvoiceAmount(x), 0),
      Contractor: day.filter((x) => normalizeCustomerType(x) === "Contractor").reduce((a, x) => a + getInvoiceAmount(x), 0),
      Builder:    day.filter((x) => normalizeCustomerType(x) === "Builder / Project").reduce((a, x) => a + getInvoiceAmount(x), 0),
    };
  }), [salesInvoices]);

  // ── Top selling tiles pie ─────────────────────────────────
  const topTiles = useMemo(() => {
    const m = {};
    salesInvoices.forEach((inv) => (inv.items || []).forEach((item) => {
      const name = item.name || item.productName || "Unknown";
      m[name] = (m[name] || 0) + (Number(item.quantity) || 0);
    }));
    const sorted = Object.entries(m).sort((a,b) => b[1]-a[1]).slice(0,5);
    const total  = sorted.reduce((a,[,v]) => a+v, 0) || 1;
    return sorted.map(([name, qty]) => ({ name, value: Math.round((qty/total)*100) }));
  }, [salesInvoices]);

  // ── Low stock ─────────────────────────────────────────────
  const lowStock = products.filter((p) => Number(p.stock) < 10).sort((a,b) => a.stock - b.stock).slice(0,6);

  // ── Monthly bar chart (last 6 months) ────────────────────
  const monthlySales = useMemo(() => {
    const tm = now.getMonth(), ty = now.getFullYear();
    return Array.from({ length: 6 }, (_, i) => {
      const d   = new Date(ty, tm - 5 + i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const mi  = salesInvoices.filter((inv) => getMonthKey(inv.date || inv.createdAt) === key);
      const sales  = mi.reduce((a, inv) => a + getInvoiceAmount(inv), 0);
      const due    = mi.reduce((a, inv) => a + getInvoiceDue(inv), 0);
      return {
        name: `${MONTH_NAMES[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`,
        Sales:  Math.round(sales),
        Due: Math.round(due),
      };
    });
  }, [salesInvoices]);

  // ── Pending lists ─────────────────────────────────────────
  const custPending = useMemo(() =>
    salesInvoices
      .filter((i) => getInvoiceDue(i) > 0)
      .sort((a, b) => getInvoiceDue(b) - getInvoiceDue(a))
      .slice(0, 5)
  , [salesInvoices]);

  const suppPendingList = useMemo(() =>
    suppliers.filter((s) => Number(s.totalDue||0) > 0).sort((a,b) => Number(b.totalDue)-Number(a.totalDue)).slice(0,5)
  , [suppliers]);

  if (loading) {
    return (
      <Box sx={{ display:"flex", justifyContent:"center", alignItems:"center", minHeight:"60vh" }}>
        <Box sx={{ width:32, height:32, border:"3px solid #e2e8f0", borderTop:"3px solid #2563eb", borderRadius:"50%", animation:"spin 0.8s linear infinite", "@keyframes spin": { to:{ transform:"rotate(360deg)" } } }} />
      </Box>
    );
  }

  return (
    <Box sx={{
      p: 0,
      background: "#f0f4f9",
      minHeight: "100%",
      fontFamily: "'Noto Sans', sans-serif",
      display: "flex", flexDirection: "column", gap: 2,
    }}>

      {/* ═══ ROW 1 — Customer KPI gradient cards ═══ */}
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" }, alignItems: "stretch" }}>
        <GradCard title="Today's Sales"     value={INR(todaySales)}     sub="📦 Boxes Sold"  icon={<TrendingUpIcon     sx={{color:"#fff",fontSize:20}} />} gradient="linear-gradient(135deg,#2563eb,#1d4ed8)" />
        <GradCard title="Total Revenue"     value={INR(totalRevenue)}   sub="💳 Payment"     icon={<ReceiptLongIcon    sx={{color:"#fff",fontSize:20}} />} gradient="linear-gradient(135deg,#0ea5e9,#0284c7)" />
        <GradCard title="Orders Today"      value={ordersToday}         sub="🚚 Sending"     icon={<ShoppingCartIcon   sx={{color:"#fff",fontSize:20}} />} gradient="linear-gradient(135deg,#f59e0b,#d97706)" />
        <GradCard title="Pending Payments"  value={INR(pendingAmount)}  sub="⏳ Pending"     icon={<HourglassEmptyIcon sx={{color:"#fff",fontSize:20}} />} gradient="linear-gradient(135deg,#ef4444,#dc2626)" />
      </Box>

      {/* ═══ ROW 2 — Supplier KPI white cards ═══ */}
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" }, alignItems: "stretch" }}>
        <WhiteCard title="Total Suppliers"  value={suppliers.length}    sub="Registered"          icon={<LocalShippingIcon        sx={{color:"#2563eb",fontSize:20}} />} accentColor="#2563eb" />
        <WhiteCard title="Supplier Amount"  value={INR(supplierTotal)}  sub="Total purchase"      icon={<AccountBalanceWalletIcon sx={{color:"#7c3aed",fontSize:20}} />} accentColor="#7c3aed" />
        <WhiteCard title="Supplier Paid"    value={INR(supplierPaid)}   sub="Amount cleared"      icon={<CheckCircleIcon          sx={{color:"#16a34a",fontSize:20}} />} accentColor="#16a34a" />
        <WhiteCard title="Supplier Pending" value={INR(supplierPending)} sub="Amount due"         icon={<HourglassEmptyIcon       sx={{color:"#ea580c",fontSize:20}} />} accentColor="#ea580c" />
      </Box>

      {/* ═══ ROW 3 — Last 7 Days Sales + Top Selling Tiles ═══ */}
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 2fr) minmax(0, 1fr)" }, alignItems: "stretch" }}>

        {/* Last 7 Days bar chart */}
        <Panel>
          <PanelHeader
            title="Last 7 Days Sales"
            right={
              <Box sx={{ display:"flex", gap:1.5 }}>
                {[{ l:"Retail",color:"#3b82f6" },{ l:"Dealer",color:"#0ea5e9" },{ l:"Contractor",color:"#f59e0b" }, { l: "Builder", color: "#8b5cf6" }].map((x) => (
                  <Box key={x.l} sx={{ display:"flex", alignItems:"center", gap:0.5 }}>
                    <Box sx={{ width:8, height:8, borderRadius:"50%", background:x.color }} />
                    <Typography sx={{ fontSize:11, color:"#8896a9" }}>{x.l}</Typography>
                  </Box>
                ))}
              </Box>
            }
          />
          <Box sx={{ p:2 }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={last7Days} margin={{ top:8, right:5, left:0, bottom:0 }} barSize={13} barGap={2}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6"/><stop offset="100%" stopColor="#1d4ed8"/></linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0ea5e9"/><stop offset="100%" stopColor="#0284c7"/></linearGradient>
                  <linearGradient id="g3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b"/><stop offset="100%" stopColor="#d97706"/></linearGradient>
                  <linearGradient id="g4" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6"/><stop offset="100%" stopColor="#6d28d9"/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize:11, fill:"#8896a9" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:10, fill:"#8896a9" }} tickFormatter={(v) => v>999?`${(v/1000).toFixed(0)}k`:v} axisLine={false} tickLine={false} width={38} />
                <Tooltip content={<ChartTip />} cursor={{ fill:"rgba(0,0,0,0.03)" }} />
                <Bar dataKey="Retail"     fill="url(#g1)" radius={[4,4,0,0]} />
                <Bar dataKey="Dealer"     fill="url(#g2)" radius={[4,4,0,0]} />
                <Bar dataKey="Contractor" fill="url(#g3)" radius={[4,4,0,0]} />
                <Bar dataKey="Builder" fill="url(#g4)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Panel>

        {/* Top Selling Tiles donut */}
        <Panel>
          <PanelHeader title="Top Selling Tiles" />
          <Box sx={{ p:2, display:"flex", flexDirection:"column", alignItems:"center", gap:1.5 }}>
            {topTiles.length === 0 ? (
              <Typography sx={{ color:"#8896a9", fontSize:13, py:5 }}>No sales data yet</Typography>
            ) : (
              <>
                <PieChart width={155} height={155}>
                  <Pie data={topTiles} cx={73} cy={73} innerRadius={36} outerRadius={68} dataKey="value" paddingAngle={2}>
                    {topTiles.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />)}
                  </Pie>
                  <Tooltip content={<PieTip />} />
                </PieChart>
                <Box sx={{ width:"100%", display:"flex", flexDirection:"column", gap:0.7 }}>
                  {topTiles.map((t, i) => (
                    <Box key={t.name} sx={{ display:"flex", alignItems:"center", gap:1 }}>
                      <Box sx={{ width:10, height:10, borderRadius:"3px", background:PIE_COLORS[i % PIE_COLORS.length], flexShrink:0 }} />
                      <Typography sx={{ fontSize:12, color:"#374151", fontWeight:500, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.name}</Typography>
                      <Typography sx={{ fontSize:11, color:"#8896a9", fontFamily:"'DM Mono',monospace", flexShrink:0 }}>{t.value}%</Typography>
                    </Box>
                  ))}
                </Box>
              </>
            )}
          </Box>
        </Panel>
      </Box>

      {/* ═══ ROW 4 — Recent Invoices + Low Stock ═══ */}
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 2fr) minmax(0, 1fr)" }, alignItems: "stretch" }}>

        {/* Recent Invoices */}
        <Panel>
          <PanelHeader
            title="Recent Sales"
            right={<Typography sx={{ fontSize:11, color:"#2563eb", fontWeight:600, cursor:"pointer" }}>View All →</Typography>}
          />
          <Box sx={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr><TH>Invoice</TH><TH>Date</TH><TH>Customer</TH><TH>Amount</TH><TH>Status</TH></tr></thead>
              <tbody>
                {recentInvoices.slice(0,5).map((inv, idx) => {
                  const name   = typeof inv.customer === "object" ? inv.customer?.name : inv.customer;
                  const parsed = parseDate(inv.date || inv.createdAt);
                  const isToday = parsed?.toDateString() === todayStr;
                  const dateStr = isToday ? "Today" : (parsed ? parsed.toLocaleDateString("en-IN") : "—");
                  return (
                    <tr key={inv._id} style={{ background: idx%2===0?"#fff":"#fafbfd" }}>
                      <TD mono blue bold>{inv.invoiceNo}</TD>
                      <TD>{dateStr}</TD>
                      <TD bold>{name || "—"}</TD>
                      <TD mono bold>{INR(getInvoiceAmount(inv))}</TD>
                      <td style={{ padding:"10px 14px", borderBottom:"1px solid #f0f4f9" }}>
                        <StatusBadge label={inv.status === "Paid" ? "Paid" : (inv.status || "Pending")} />
                      </td>
                    </tr>
                  );
                })}
                {recentInvoices.length === 0 && (
                  <tr><td colSpan={5} style={{ padding:"32px", textAlign:"center", color:"#8896a9" }}>No invoices yet</td></tr>
                )}
              </tbody>
            </table>
          </Box>
        </Panel>

        {/* Low Stock Alert */}
        <Panel>
          <PanelHeader
            title="Low Stock Alert"
            right={
              <Box sx={{ display:"flex", alignItems:"center", gap:0.5 }}>
                <WarningAmberIcon sx={{ color:"#ea580c", fontSize:14 }} />
                <Typography sx={{ fontSize:11, color:"#ea580c", fontWeight:700 }}>Low Stock</Typography>
              </Box>
            }
          />
          <Box sx={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr><TH>Name</TH><TH>Size</TH><TH>Status</TH></tr></thead>
              <tbody>
                {lowStock.map((p, idx) => (
                  <tr key={p._id} style={{ background: idx%2===0?"#fff":"#fafbfd" }}>
                    <TD bold>{p.name}</TD>
                    <TD>{p.size || "—"}</TD>
                    <td style={{ padding:"10px 14px", borderBottom:"1px solid #f0f4f9" }}>
                      <StatusBadge label={p.stock === 0 ? "Out of Stock" : "Low Stock"} />
                    </td>
                  </tr>
                ))}
                {lowStock.length === 0 && (
                  <tr><td colSpan={3} style={{ padding:"32px", textAlign:"center", color:"#8896a9" }}>All products in stock ✅</td></tr>
                )}
              </tbody>
            </table>
          </Box>
        </Panel>
      </Box>

      {/* ═══ ROW 5 — Customer Pending + Supplier Pending ═══ */}
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) minmax(0, 1fr)" }, alignItems: "stretch" }}>

        {/* Customer Pending */}
        <Panel>
          <PanelHeader
            title="Customer Pending Payments"
            right={
              <Box sx={{ display:"flex", alignItems:"center", gap:0.5 }}>
                <Typography sx={{ fontSize:11, color:"#8896a9" }}>Due:</Typography>
                <Typography sx={{ fontSize:13, fontWeight:800, color:"#ef4444", fontFamily:"'Rajdhani',sans-serif" }}>{INR(pendingAmount)}</Typography>
              </Box>
            }
          />
          <Box sx={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr><TH>Invoice</TH><TH>Customer</TH><TH>Due</TH><TH>Status</TH></tr></thead>
              <tbody>
                {custPending.map((inv, idx) => {
                  const name = typeof inv.customer === "object" ? inv.customer?.name : inv.customer;
                  return (
                    <tr key={inv._id} style={{ background: idx%2===0?"#fff":"#fafbfd" }}>
                      <TD mono blue bold>{inv.invoiceNo}</TD>
                      <TD bold>{name || "—"}</TD>
                      <TD mono bold red>{INR(getInvoiceDue(inv))}</TD>
                      <td style={{ padding:"10px 14px", borderBottom:"1px solid #f0f4f9" }}>
                        <StatusBadge label={getInvoiceDue(inv) === 0 ? "Paid" : (Number(inv.payment?.paidAmount || 0) > 0 ? "Partial" : "Pending")} />
                      </td>
                    </tr>
                  );
                })}
                {custPending.length === 0 && (
                  <tr><td colSpan={4} style={{ padding:"32px", textAlign:"center", color:"#8896a9" }}>No pending payments 🎉</td></tr>
                )}
              </tbody>
            </table>
          </Box>
        </Panel>

        {/* Supplier Pending */}
        <Panel>
          <PanelHeader
            title="Supplier Pending Payments"
            right={
              <Box sx={{ display:"flex", alignItems:"center", gap:0.5 }}>
                <Typography sx={{ fontSize:11, color:"#8896a9" }}>Due:</Typography>
                <Typography sx={{ fontSize:13, fontWeight:800, color:"#ef4444", fontFamily:"'Rajdhani',sans-serif" }}>{INR(supplierPending)}</Typography>
              </Box>
            }
          />
          <Box sx={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr><TH>Supplier</TH><TH>Due</TH><TH>Total Rev</TH><TH>Status</TH></tr></thead>
              <tbody>
                {suppPendingList.map((s, idx) => (
                  <tr key={s._id} style={{ background: idx%2===0?"#fff":"#fafbfd" }}>
                    <TD bold>{s.companyName || s.name}</TD>
                    <TD mono bold red>{INR(s.totalDue || 0)}</TD>
                    <TD mono>{INR(s.totalValue || 0)}</TD>
                    <td style={{ padding:"10px 14px", borderBottom:"1px solid #f0f4f9" }}>
                      <StatusBadge label={Number(s.totalDue || 0) <= 0 ? "Paid" : (Number(s.totalPaid || 0) > 0 ? "Partial" : "Pending")} />
                    </td>
                  </tr>
                ))}
                {suppPendingList.length === 0 && (
                  <tr><td colSpan={4} style={{ padding:"32px", textAlign:"center", color:"#8896a9" }}>No pending supplier payments 🎉</td></tr>
                )}
              </tbody>
            </table>
          </Box>
        </Panel>
      </Box>

      {/* ═══ ROW 6 — Monthly Sales Bar Chart + Quick Summary ═══ */}
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 2fr) minmax(0, 1fr)" }, alignItems: "stretch" }}>

        {/* Monthly bar chart */}
        <Panel>
          <PanelHeader
            title="Monthly Sales & Due"
            right={<Typography sx={{ fontSize:11, color:"#8896a9" }}>Last 6 months</Typography>}
          />
          <Box sx={{ p:2 }}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlySales} margin={{ top:8, right:5, left:0, bottom:0 }} barSize={20} barGap={4}>
                <defs>
                  <linearGradient id="ms" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb"/><stop offset="100%" stopColor="#1e40af"/></linearGradient>
                  <linearGradient id="md" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444"/><stop offset="100%" stopColor="#b91c1c"/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize:11, fill:"#8896a9" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:10, fill:"#8896a9" }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} width={50} />
                <Tooltip content={<ChartTip />} cursor={{ fill:"rgba(0,0,0,0.03)" }} />
                <Legend wrapperStyle={{ fontSize:11, color:"#8896a9", paddingTop:10 }} iconType="circle" iconSize={7} />
                <Bar dataKey="Sales"  fill="url(#ms)" radius={[5,5,0,0]} name="Sales" />
                <Bar dataKey="Due" fill="url(#md)" radius={[5,5,0,0]} name="Due" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Panel>

        {/* Quick Summary */}
        <Panel>
          <PanelHeader title="Quick Summary" />
          <Box sx={{ p:2, display:"flex", flexDirection:"column", gap:1.2 }}>
            {[
              { label:"Total Invoices",   value:salesInvoices.length,                                       color:"#2563eb" },
              { label:"Paid Invoices",    value:salesInvoices.filter(i => getInvoiceDue(i) === 0).length, color:"#16a34a" },
              { label:"Pending Invoices", value:salesInvoices.filter(i => getInvoiceDue(i) > 0).length,   color:"#ea580c" },
              { label:"Total Products",   value:products.length,                                          color:"#7c3aed" },
              { label:"Low Stock Items",  value:lowStock.length,                                          color:"#ef4444" },
              { label:"Active Suppliers", value:suppliers.length,                                         color:"#0ea5e9" },
            ].map((item) => (
              <Box key={item.label} sx={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                px:1.5, py:1.1, borderRadius:"9px",
                background:"#f8fafd", border:"1px solid #eef2f7",
              }}>
                <Typography sx={{ fontSize:12, color:"#374151", fontWeight:500 }}>{item.label}</Typography>
                <Typography sx={{ fontSize:16, fontWeight:800, color:item.color, fontFamily:"'Rajdhani',sans-serif" }}>
                  {item.value}
                </Typography>
              </Box>
            ))}
          </Box>
        </Panel>
      </Box>

    </Box>
  );
};

export default Dashboard;

