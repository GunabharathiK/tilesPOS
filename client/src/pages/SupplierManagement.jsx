import { useEffect, useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from "recharts";
import TrendingUpIcon           from "@mui/icons-material/TrendingUp";
import TrendingDownIcon         from "@mui/icons-material/TrendingDown";
import LocalShippingIcon        from "@mui/icons-material/LocalShipping";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import CheckCircleIcon          from "@mui/icons-material/CheckCircle";
import HourglassEmptyIcon       from "@mui/icons-material/HourglassEmpty";
import InventoryIcon            from "@mui/icons-material/Inventory";
import WarningAmberIcon         from "@mui/icons-material/WarningAmber";
import ArrowForwardIcon         from "@mui/icons-material/ArrowForward";
import { useNavigate } from "react-router-dom";
import { getSuppliers } from "../services/supplierService";

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
const INR = (n = 0) => "₹" + Number(n).toLocaleString("en-IN");

const getPayStatus = s => {
  const due  = Number(s.totalDue  || 0);
  const paid = Number(s.totalPaid || 0);
  if (due <= 0) return "Paid";
  if (paid > 0) return "Partial";
  return "Pending";
};

/* ── View All button ── */
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
        background: T.primary, color: "#fff", borderColor: T.primary,
        "& .arrow-icon": { transform: "translateX(2px)" },
      },
    }}
  >
    {label}
    <ArrowForwardIcon className="arrow-icon" sx={{ fontSize: 12, transition: "transform .15s" }} />
  </Box>
);

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
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#fff", fontFamily: "'DM Mono', monospace" }}>{INR(p.value)}</Typography>
        </Box>
      ))}
    </Box>
  );
};

/* ── Metric card ── */
const MetricCard = ({ label, value, sub, delta, icon, accent, accentLight }) => {
  const pos = delta >= 0;
  return (
    <Box sx={{ background: T.surface, border: `1px solid ${T.border}`, borderTop: `3px solid ${accent}`, p: "16px 18px", display: "flex", flexDirection: "column", gap: 0.8 }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".07em" }}>{label}</Typography>
        <Box sx={{ width: 34, height: 34, background: accentLight, display: "flex", alignItems: "center", justifyContent: "center", color: accent, flexShrink: 0 }}>
          {icon}
        </Box>
      </Box>
      <Typography sx={{ fontSize: 22, fontWeight: 800, color: T.dark, lineHeight: 1.1, fontFamily: "'DM Mono', monospace" }}>{value}</Typography>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography sx={{ fontSize: 11, color: T.faint }}>{sub}</Typography>
        {delta !== undefined && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
            {pos ? <TrendingUpIcon sx={{ fontSize: 13, color: T.success }} /> : <TrendingDownIcon sx={{ fontSize: 13, color: T.danger }} />}
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: pos ? T.success : T.danger }}>
              {pos ? "+" : ""}{delta}% vs last month
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

/* ── Panel ── */
const Panel = ({ title, subtitle, accent, right, children, noPad }) => (
  <Box sx={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: "0 1px 3px rgba(15,23,42,.06)", overflow: "hidden", display: "flex", flexDirection: "column", height: "100%" }}>
    <Box sx={{ px: 2.5, py: 1.5, borderBottom: `2px solid ${accent || T.primary}`, background: `linear-gradient(to right, ${T.primaryLight}, ${T.surface})`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexShrink: 0 }}>
      <Box>
        <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: T.dark, lineHeight: 1.2 }}>{title}</Typography>
        {subtitle && <Typography sx={{ fontSize: 11.5, color: T.muted, mt: 0.3 }}>{subtitle}</Typography>}
      </Box>
      {right && <Box sx={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 1 }}>{right}</Box>}
    </Box>
    <Box sx={noPad ? {} : { p: 2 }}>{children}</Box>
  </Box>
);

/* ── Status badge ── */
const Badge = ({ status }) => {
  const cfg =
    status === "Paid"    ? { color: T.success, bg: T.successLight, border: "#bbf7d0" } :
    status === "Partial" ? { color: T.warning, bg: T.warningLight, border: "#fde68a" } :
                           { color: T.danger,  bg: T.dangerLight,  border: "#fecaca" };
  return (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, px: 0.9, py: "2px", fontSize: 10, fontWeight: 700, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <Box sx={{ width: 5, height: 5, background: cfg.color, flexShrink: 0 }} />
      {status}
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

/* ── Progress bar ── */
const ProgressBar = ({ value, max, color }) => {
  const pctVal = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <Box sx={{ height: 5, background: T.bg, border: `1px solid ${T.border}`, overflow: "hidden", mt: 0.5 }}>
      <Box sx={{ height: "100%", width: `${pctVal}%`, background: color, transition: "width .4s" }} />
    </Box>
  );
};

/* ── Strip item ── */
const StripItem = ({ label, value, color }) => (
  <Box sx={{ px: 2, py: 1.2, borderRight: `1px solid ${T.border}`, flex: 1, minWidth: 0 }}>
    <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".07em", mb: 0.4 }}>{label}</Typography>
    <Typography sx={{ fontSize: 18, fontWeight: 800, color: color || T.dark, fontFamily: "'DM Mono', monospace", lineHeight: 1.1 }}>{value}</Typography>
  </Box>
);

/* ════════════════════════════════════════════════════ */
const SupplierManagement = () => {
  const navigate   = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getSuppliers();
        setSuppliers(Array.isArray(res.data) ? res.data : []);
      } finally { setLoading(false); }
    })();
  }, []);

  const stats = useMemo(() => {
    const totalAmount  = suppliers.reduce((s, x) => s + Number(x.totalValue || 0), 0);
    const totalPaid    = suppliers.reduce((s, x) => s + Number(x.totalPaid  || 0), 0);
    const totalPending = suppliers.reduce((s, x) => s + Number(x.totalDue   || 0), 0);
    const allProducts  = suppliers.flatMap(x =>
      Array.isArray(x.productsSupplied) ? x.productsSupplied :
      Array.isArray(x.items)            ? x.items.map(i => i.name).filter(Boolean) : []
    );
    const paidCount    = suppliers.filter(s => getPayStatus(s) === "Paid").length;
    const partialCount = suppliers.filter(s => getPayStatus(s) === "Partial").length;
    const pendingCount = suppliers.filter(s => getPayStatus(s) === "Pending").length;
    const colRate      = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0;
    return { total: suppliers.length, totalAmount, totalPaid, totalPending, totalProducts: new Set(allProducts).size, paidCount, partialCount, pendingCount, colRate };
  }, [suppliers]);

  const pendingList = useMemo(() =>
    suppliers.filter(s => Number(s.totalDue || 0) > 0).sort((a, b) => Number(b.totalDue || 0) - Number(a.totalDue || 0)).slice(0, 8),
    [suppliers]
  );

  const topSuppliers = useMemo(() =>
    [...suppliers].sort((a, b) => Number(b.totalValue || 0) - Number(a.totalValue || 0)).slice(0, 6),
    [suppliers]
  );

  const chartData = useMemo(() =>
    pendingList.map(s => ({
      name: (s.companyName || s.name || "-").slice(0, 10),
      Paid: Number(s.totalPaid || 0),
      Due:  Number(s.totalDue  || 0),
    })), [pendingList]
  );

  const categoryData = useMemo(() => {
    const map = {};
    suppliers.forEach(s => {
      const cats = Array.isArray(s.categories) ? s.categories : Array.isArray(s.productsSupplied) ? s.productsSupplied : [];
      cats.forEach(c => { const k = String(c || "").trim(); if (k) map[k] = (map[k] || 0) + 1; });
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, count }));
  }, [suppliers]);

  const termsData = useMemo(() => {
    const map = {};
    suppliers.forEach(s => { const k = s.paymentTerms || "Unknown"; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([term, count]) => ({ term, count }));
  }, [suppliers]);

  if (loading) return (
    <Box sx={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Box sx={{ width: 32, height: 32, border: `3px solid ${T.border}`, borderTop: `3px solid ${T.primary}`, borderRadius: "50%", animation: "spin .8s linear infinite", "@keyframes spin": { to: { transform: "rotate(360deg)" } } }} />
    </Box>
  );

  return (
    <Box sx={{ p: 0, background: T.bg, minHeight: "100%", fontFamily: "'Noto Sans', sans-serif" }}>

      {/* ── Page header ── */}
      <Box sx={{ px: 3, py: 1.8, background: T.surface, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
        <Box>
          <Typography sx={{ fontSize: 20, fontWeight: 800, color: T.dark, lineHeight: 1.2, letterSpacing: "-.01em" }}>Supplier Management</Typography>
          <Typography sx={{ fontSize: 12, color: T.muted, mt: 0.2 }}>
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0 }}>
          {[
            { label: "Collection Rate",   value: `${stats.colRate}%`,   color: stats.colRate >= 80 ? T.success : stats.colRate >= 50 ? T.warning : T.danger },
            { label: "Pending Suppliers", value: stats.pendingCount,    color: stats.pendingCount > 0 ? T.danger : T.success },
            { label: "Partial Payments",  value: stats.partialCount,    color: stats.partialCount > 0 ? T.warning : T.success },
          ].map(({ label, value, color }, i) => (
            <Box key={label} sx={{ pl: i === 0 ? 0 : 2.5, pr: 2.5, borderLeft: i > 0 ? `1px solid ${T.border}` : "none", textAlign: "center", minWidth: 90 }}>
              <Typography sx={{ fontSize: 10, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", whiteSpace: "nowrap", mb: 0.4 }}>{label}</Typography>
              <Typography sx={{ fontSize: 22, fontWeight: 800, fontFamily: "'DM Mono', monospace", color, lineHeight: 1 }}>{value}</Typography>
            </Box>
          ))}
          <Box sx={{ ml: 2, display: "flex", gap: 1 }}>
            <Box onClick={() => navigate("/suppliers/create")}
              sx={{ display: "inline-flex", alignItems: "center", gap: "5px", px: 2, py: "8px", background: T.primary, cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: "#fff", "&:hover": { background: T.primaryDark }, transition: "background .13s" }}>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 2v12M2 8h12" strokeLinecap="round"/></svg>
              Add Supplier
            </Box>
            <Box onClick={() => navigate("/suppliers/details")}
              sx={{ display: "inline-flex", alignItems: "center", gap: "5px", px: 2, py: "8px", border: `1px solid ${T.border}`, background: T.surface, cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: T.primary, "&:hover": { background: T.primaryLight, borderColor: T.primary }, transition: "all .13s" }}>
              View All
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ px: 2.5, display: "flex", flexDirection: "column", gap: 2, pb: 3 }}>

        {/* ══ ROW 1 — KPI cards ══ */}
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2,1fr)", xl: "repeat(5,1fr)" } }}>
          <MetricCard label="Total Suppliers"  value={stats.total}             sub={`${stats.paidCount} fully paid`}                            accent={T.primary}  accentLight={T.primaryLight}  icon={<LocalShippingIcon        sx={{ fontSize: 18 }} />} />
          <MetricCard label="Total Purchase"   value={INR(stats.totalAmount)}  sub="Cumulative purchase value"                                  accent={T.violet}   accentLight={T.violetLight}   icon={<AccountBalanceWalletIcon sx={{ fontSize: 18 }} />} />
          <MetricCard label="Amount Paid"      value={INR(stats.totalPaid)}    sub="Cleared to suppliers"                                       accent={T.success}  accentLight={T.successLight}  icon={<CheckCircleIcon          sx={{ fontSize: 18 }} />} />
          <MetricCard label="Amount Pending"   value={INR(stats.totalPending)} sub={`${stats.pendingCount + stats.partialCount} suppliers due`} accent={T.danger}   accentLight={T.dangerLight}   icon={<HourglassEmptyIcon       sx={{ fontSize: 18 }} />} />
          <MetricCard label="Product Types"    value={stats.totalProducts}     sub="Unique products supplied"                                   accent={T.orange}   accentLight={T.orangeLight}   icon={<InventoryIcon            sx={{ fontSize: 18 }} />} />
        </Box>

        {/* ══ ROW 2 — Summary strip ══ */}
        <Box sx={{ background: T.surface, border: `1px solid ${T.border}`, display: "flex", overflow: "hidden" }}>
          <Box sx={{ width: 4, background: T.primary, flexShrink: 0 }} />
          <StripItem label="Total Suppliers" value={stats.total}        color={T.primary} />
          <StripItem label="Fully Paid"      value={stats.paidCount}    color={T.success} />
          <StripItem label="Partial"         value={stats.partialCount} color={T.warning} />
          <StripItem label="Pending"         value={stats.pendingCount} color={T.danger}  />
          <Box sx={{ px: 2, py: 1.2, flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".07em", mb: 0.4 }}>Collection Rate</Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography sx={{ fontSize: 18, fontWeight: 800, color: stats.colRate >= 80 ? T.success : stats.colRate >= 50 ? T.warning : T.danger, fontFamily: "'DM Mono', monospace", lineHeight: 1.1 }}>{stats.colRate}%</Typography>
              <Box sx={{ flex: 1, height: 6, background: T.bg, border: `1px solid ${T.border}`, overflow: "hidden" }}>
                <Box sx={{ height: "100%", width: `${stats.colRate}%`, background: stats.colRate >= 80 ? T.success : stats.colRate >= 50 ? "#f59e0b" : T.danger, transition: "width .4s" }} />
              </Box>
            </Box>
          </Box>
        </Box>

        {/* ══ ROW 3 — Bar chart + Pending list ══ */}
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "minmax(0,2fr) minmax(0,1fr)" }, alignItems: "stretch" }}>

          <Panel
            title="Supplier Payment Overview"
            subtitle="Paid vs Due — top pending suppliers"
            accent={T.primary}
            noPad
            right={
              <Box sx={{ display: "flex", gap: 1.5 }}>
                {[{ l: "Paid", c: T.success }, { l: "Due", c: T.danger }].map(x => (
                  <Box key={x.l} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, background: x.c }} />
                    <Typography sx={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>{x.l}</Typography>
                  </Box>
                ))}
              </Box>
            }
          >
            <Box sx={{ p: 2 }}>
              {chartData.length === 0 ? (
                <Box sx={{ py: 8, textAlign: "center" }}><Typography sx={{ fontSize: 13, color: T.faint }}>No pending supplier data</Typography></Box>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={20} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.borderLight} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: T.muted }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: T.faint }} tickFormatter={v => v > 999 ? `${Math.round(v/1000)}k` : v} axisLine={false} tickLine={false} width={40} />
                    <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(0,0,0,.03)" }} />
                    <Bar dataKey="Paid" fill={T.success} />
                    <Bar dataKey="Due"  fill={T.danger}  />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Box>
          </Panel>

          <Panel
            title="Pending Payments"
            subtitle="Suppliers with outstanding dues"
            accent={T.danger}
            noPad
            right={
              <Box sx={{ px: 1.2, py: "2px", background: T.dangerLight, border: `1px solid #fecaca`, display: "flex", alignItems: "center", gap: 0.5 }}>
                <WarningAmberIcon sx={{ fontSize: 12, color: T.danger }} />
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.danger }}>{pendingList.length}</Typography>
              </Box>
            }
          >
            {pendingList.length === 0 ? (
              <Box sx={{ py: 6, textAlign: "center" }}><Typography sx={{ fontSize: 13, color: T.faint }}>No pending supplier payments 🎉</Typography></Box>
            ) : pendingList.map((s, idx) => {
              const status = getPayStatus(s);
              return (
                <Box key={s._id} sx={{ px: 2, py: 1.2, display: "flex", alignItems: "center", gap: 1.4, borderBottom: `1px solid ${T.borderLight}`, background: idx % 2 === 0 ? T.surface : T.surfaceAlt, "&:hover": { background: T.primaryLight }, transition: "background .12s" }}>
                  <Box sx={{ width: 20, textAlign: "right", flexShrink: 0 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.faint }}>{idx + 1}</Typography>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {s.companyName || s.name}
                    </Typography>
                    <ProgressBar value={Number(s.totalPaid || 0)} max={Number(s.totalValue || s.totalPaid || 1) + Number(s.totalDue || 0)} color={T.primary} />
                  </Box>
                  <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: T.danger, fontFamily: "'DM Mono', monospace" }}>{INR(s.totalDue || 0)}</Typography>
                    <Badge status={status} />
                  </Box>
                </Box>
              );
            })}
          </Panel>
        </Box>

        {/* ══ ROW 4 — Top Suppliers + Payment Terms + Categories ══ */}
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "minmax(0,3fr) minmax(0,2fr)" }, alignItems: "stretch" }}>

          {/* ── Top Suppliers — with View All button ── */}
          <Panel
            title="Top Suppliers by Purchase Value"
            subtitle="Highest cumulative purchase suppliers"
            accent={T.success}
            noPad
            right={
              <ViewAllBtn onClick={() => navigate("/suppliers/details")} label="View All Suppliers" />
            }
          >
            <Box sx={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <TH>#</TH>
                    <TH>Supplier</TH>
                    <TH>City</TH>
                    <TH>Terms</TH>
                    <TH align="right">Purchase Total</TH>
                    <TH align="right">Paid</TH>
                    <TH align="right">Due</TH>
                    <TH>Status</TH>
                  </tr>
                </thead>
                <tbody>
                  {topSuppliers.map((s, idx) => (
                    <tr key={s._id} style={{ background: idx % 2 === 0 ? T.surface : T.surfaceAlt }}>
                      <td style={{ padding: "10px 14px", borderBottom: `1px solid ${T.borderLight}`, width: 32 }}>
                        <Box sx={{ width: 22, height: 22, background: idx === 0 ? "#fef3c7" : T.surfaceAlt, border: `1px solid ${idx === 0 ? "#fcd34d" : T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: idx === 0 ? "#b45309" : T.muted }}>
                          {idx + 1}
                        </Box>
                      </td>
                      <TD bold color={T.primary}>{s.companyName || s.name || "—"}</TD>
                      <TD>{s.city || "—"}</TD>
                      <TD color={T.muted}>{s.paymentTerms || "—"}</TD>
                      <TD align="right" mono bold>{INR(s.totalValue || 0)}</TD>
                      <TD align="right" mono color={T.success}>{INR(s.totalPaid || 0)}</TD>
                      <TD align="right" mono color={Number(s.totalDue || 0) > 0 ? T.danger : T.faint}>{INR(s.totalDue || 0)}</TD>
                      <td style={{ padding: "10px 14px", borderBottom: `1px solid ${T.borderLight}` }}>
                        <Badge status={getPayStatus(s)} />
                      </td>
                    </tr>
                  ))}
                  {topSuppliers.length === 0 && (
                    <tr><td colSpan={8} style={{ padding: "32px", textAlign: "center", color: T.faint, fontSize: 13 }}>No suppliers yet</td></tr>
                  )}
                </tbody>
              </table>
            </Box>
          </Panel>

          {/* Right column */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Panel title="Payment Terms Distribution" subtitle="How many suppliers per term" accent={T.violet}>
              {termsData.length === 0 ? (
                <Typography sx={{ fontSize: 13, color: T.faint, textAlign: "center", py: 3 }}>No data</Typography>
              ) : termsData.map(({ term, count }) => (
                <Box key={term} sx={{ mb: 1.2 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.4 }}>
                    <Typography sx={{ fontSize: 12, color: T.text, fontWeight: 600 }}>{term}</Typography>
                    <Typography sx={{ fontSize: 12, color: T.muted, fontFamily: "'DM Mono', monospace" }}>{count}</Typography>
                  </Box>
                  <ProgressBar value={count} max={Math.max(...termsData.map(t => t.count))} color={T.violet} />
                </Box>
              ))}
            </Panel>

            <Panel title="Product Categories" subtitle="Categories supplied by vendors" accent={T.orange}>
              {categoryData.length === 0 ? (
                <Typography sx={{ fontSize: 13, color: T.faint, textAlign: "center", py: 3 }}>No categories yet</Typography>
              ) : categoryData.map(({ name, count }) => (
                <Box key={name} sx={{ mb: 1.2 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.4 }}>
                    <Typography sx={{ fontSize: 12, color: T.text, fontWeight: 600 }}>{name}</Typography>
                    <Typography sx={{ fontSize: 12, color: T.muted, fontFamily: "'DM Mono', monospace" }}>{count} supplier{count !== 1 ? "s" : ""}</Typography>
                  </Box>
                  <ProgressBar value={count} max={Math.max(...categoryData.map(c => c.count))} color={T.orange} />
                </Box>
              ))}
            </Panel>
          </Box>
        </Box>

        {/* ══ ROW 5 — Quick summary bar ══ */}
        <Box sx={{ background: T.surface, border: `1px solid ${T.border}`, overflow: "hidden" }}>
          <Box sx={{ px: 2.5, py: 1.2, borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".07em" }}>Quick Summary</Typography>
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", overflow: "hidden" }}>
            {[
              { label: "Total Suppliers",  value: stats.total,            color: T.primary, icon: <LocalShippingIcon        sx={{ fontSize: 16 }} />, path: "/suppliers/details" },
              { label: "Fully Paid",       value: stats.paidCount,        color: T.success, icon: <CheckCircleIcon          sx={{ fontSize: 16 }} />, path: "/suppliers/details" },
              { label: "Partial Payments", value: stats.partialCount,     color: T.warning, icon: <HourglassEmptyIcon       sx={{ fontSize: 16 }} />, path: "/suppliers/details" },
              { label: "Pending Payments", value: stats.pendingCount,     color: T.danger,  icon: <WarningAmberIcon         sx={{ fontSize: 16 }} />, path: "/suppliers/details" },
              { label: "Product Types",    value: stats.totalProducts,    color: T.orange,  icon: <InventoryIcon            sx={{ fontSize: 16 }} />, path: "/products"          },
              { label: "Collection Rate",  value: `${stats.colRate}%`,    color: stats.colRate >= 80 ? T.success : stats.colRate >= 50 ? T.warning : T.danger, icon: <AccountBalanceWalletIcon sx={{ fontSize: 16 }} />, path: "/suppliers/details" },
            ].map(({ label, value, color, icon, path }, i) => (
              <Box
                key={label}
                onClick={() => navigate(path)}
                sx={{
                  px: 2, py: 1.6,
                  borderRight: i < 5 ? `1px solid ${T.border}` : "none",
                  display: "flex", alignItems: "center", gap: 1.2,
                  cursor: "pointer", transition: "background .12s",
                  "&:hover": { background: T.primaryLight },
                  "&:hover .arrow": { opacity: 1, transform: "translateX(0)" },
                }}
              >
                <Box sx={{ color, flexShrink: 0 }}>{icon}</Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</Typography>
                  <Typography sx={{ fontSize: 18, fontWeight: 800, color, fontFamily: "'DM Mono', monospace", lineHeight: 1.2 }}>{value}</Typography>
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

export default SupplierManagement;