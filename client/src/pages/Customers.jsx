import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Tabs,
  Tab,
} from "@mui/material";
import PeopleIcon         from "@mui/icons-material/People";
import PaymentsIcon       from "@mui/icons-material/Payments";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import ReceiptLongIcon    from "@mui/icons-material/ReceiptLong";
import TrendingUpIcon     from "@mui/icons-material/TrendingUp";
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { useLocation, useNavigate } from "react-router-dom";
import CustomerCreate   from "../components/customers/CustomerCreate";
import CustomerBill     from "../components/customers/CustomerBill";
import CustomerDetails  from "../components/customers/CustomerDetails";
import CustomerPayments from "../components/customers/CustomerPayments";
import { getCustomers }  from "../services/customerService";
import { getInvoices }   from "../services/invoiceService";
import { formatCurrency, groupInvoicesByCustomer } from "../utils/invoiceMetrics";

/* ── Design tokens — matches CustomerPayments / Reports / Settings ── */
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
};

/* ── Helpers ─────────────────────────────────────────────────────── */
const CUSTOMER_TYPE_TABS = ["All", "Retail Customer", "Dealer", "Contractor", "Builder / Project"];

const getCustomerType = (customer = {}) => {
  const raw = String(customer.customerType || customer.saleType || "Retail Customer").trim().toLowerCase();
  if (raw === "dealer" || raw === "wholesale") return "Dealer";
  if (raw === "contractor" || raw === "b2b")   return "Contractor";
  if (raw.includes("builder"))                 return "Builder / Project";
  return "Retail Customer";
};

const statusCfg = (status) => {
  if (status === "Paid")    return { color: T.success, bg: T.successLight, border: "#bbf7d0" };
  if (status === "Partial") return { color: T.warning, bg: T.warningLight, border: "#fde68a" };
  return                           { color: T.danger,  bg: T.dangerLight,  border: "#fecaca" };
};

const typeCfg = (type) => {
  if (type === "Dealer")            return { color: T.primary,  bg: T.primaryLight  };
  if (type === "Contractor")        return { color: T.violet,   bg: T.violetLight   };
  if (type === "Builder / Project") return { color: T.warning,  bg: T.warningLight  };
  return                                   { color: T.success,  bg: T.successLight  };
};

const initials = (name = "") =>
  name.split(" ").slice(0, 2).map(w => w[0] || "").join("").toUpperCase() || "?";

/* ── Stat card ───────────────────────────────────────────────────── */
const StatCard = ({ icon, label, value, accent, sub }) => (
  <Box sx={{
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderTop: `3px solid ${accent}`,
    p: "16px 18px",
    display: "flex", alignItems: "flex-start", gap: 1.6,
  }}>
    <Box sx={{ width: 40, height: 40, background: `${accent}15`, display: "flex", alignItems: "center", justifyContent: "center", color: accent, flexShrink: 0, mt: 0.2 }}>
      {icon}
    </Box>
    <Box>
      <Typography sx={{ fontSize: 10.5, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", lineHeight: 1 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 22, fontWeight: 800, color: T.dark, lineHeight: 1.15, mt: 0.5, fontFamily: "'DM Mono', monospace" }}>
        {value}
      </Typography>
      {sub && <Typography sx={{ fontSize: 11, color: T.faint, mt: 0.4 }}>{sub}</Typography>}
    </Box>
  </Box>
);

/* ── Custom chart tooltip ────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ background: T.dark, px: 1.8, py: 1.4, boxShadow: "0 8px 20px rgba(0,0,0,.22)", border: `1px solid #1e293b` }}>
      <Typography sx={{ fontSize: 10.5, color: "rgba(255,255,255,.55)", mb: 0.6, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>
        {label}
      </Typography>
      {payload.map(p => (
        <Box key={p.name} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.3 }}>
          <Box sx={{ width: 7, height: 7, background: p.fill, flexShrink: 0 }} />
          <Typography sx={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>
            {p.name}: <span style={{ color: p.fill }}>₹{formatCurrency(p.value)}</span>
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

/* ── Section card ────────────────────────────────────────────────── */
const Section = ({ title, subtitle, accent, children, noPad = false }) => (
  <Box sx={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: "0 1px 3px rgba(15,23,42,.06)", overflow: "hidden" }}>
    <Box sx={{ px: 2.5, py: 1.5, borderBottom: `2px solid ${accent || T.primary}`, background: `linear-gradient(to right, ${T.primaryLight}, ${T.surface})`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
      <Box>
        <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: T.dark, lineHeight: 1.2 }}>{title}</Typography>
        {subtitle && <Typography sx={{ fontSize: 11.5, color: T.muted, mt: 0.35 }}>{subtitle}</Typography>}
      </Box>
    </Box>
    <Box sx={noPad ? {} : { p: 2 }}>{children}</Box>
  </Box>
);

/* ── Status badge ────────────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const cfg = statusCfg(status);
  return (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, px: 0.9, py: "2px", fontSize: 10, fontWeight: 700, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <Box sx={{ width: 5, height: 5, background: cfg.color, flexShrink: 0 }} />
      {status}
    </Box>
  );
};

/* ── Type badge ──────────────────────────────────────────────────── */
const TypeBadge = ({ type }) => {
  const cfg = typeCfg(type);
  return (
    <Box component="span" sx={{ fontSize: 10, fontWeight: 700, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}28`, px: 0.8, py: "1px", letterSpacing: ".04em" }}>
      {type}
    </Box>
  );
};

/* ── Avatar initials box ─────────────────────────────────────────── */
const InitialsBox = ({ name, type }) => {
  const cfg = typeCfg(type);
  return (
    <Box sx={{ width: 36, height: 36, background: cfg.bg, color: cfg.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0, border: `1px solid ${cfg.color}28`, fontFamily: "'DM Mono', monospace" }}>
      {initials(name)}
    </Box>
  );
};

/* ═══════════════════════════════════════════════════════ */
const Customers = () => {
  const location = useLocation();
  const navigate  = useNavigate();
  const [customers,      setCustomers]      = useState([]);
  const [invoices,       setInvoices]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [pendingTypeTab, setPendingTypeTab] = useState(0);
  const [pendingSearch,  setPendingSearch]  = useState("");
  const [pendingPage,    setPendingPage]    = useState(1);
  const [selectedRowKey, setSelectedRowKey] = useState(null);
  const PENDING_PER_PAGE = 8;

  const pathParts = location.pathname.split("/").filter(Boolean);
  const active    = pathParts[1] || "overview";

  useEffect(() => {
    (async () => {
      try {
        const [custRes, invRes] = await Promise.all([getCustomers(), getInvoices()]);
        setCustomers(Array.isArray(custRes.data) ? custRes.data : []);
        setInvoices(Array.isArray(invRes.data)   ? invRes.data  : []);
      } finally { setLoading(false); }
    })();
  }, []);

  /* ── Data derivation ── */
  const groupedCustomers = useMemo(() => groupInvoicesByCustomer(invoices), [invoices]);

  const totals = useMemo(() =>
    groupedCustomers.reduce((acc, e) => {
      acc.amount += e.totals.amount;
      acc.paid   += e.totals.paid;
      acc.due    += e.totals.due;
      if (e.status === "Paid")    acc.paidCount    += 1;
      if (e.status === "Partial") acc.partialCount += 1;
      if (e.status === "Pending") acc.pendingCount += 1;
      return acc;
    }, { amount: 0, paid: 0, due: 0, paidCount: 0, partialCount: 0, pendingCount: 0 }),
    [groupedCustomers]
  );

  const fallbackCustomers = useMemo(() => {
    const existingKeys = new Set(groupedCustomers.map(e => `${e.customer.name || ""}|${e.customer.phone || ""}`));
    return customers
      .filter(c => !existingKeys.has(`${c.name || ""}|${c.phone || ""}`))
      .map(c => ({ customer: c, totals: { amount: 0, paid: 0, due: 0 }, invoiceCount: 0, status: c.status || "Pending" }));
  }, [customers, groupedCustomers]);

  const customerTypeLookup = useMemo(() => {
    const byPhone = new Map(), byName = new Map();
    customers.forEach(c => {
      const t        = getCustomerType(c);
      const phoneKey = String(c?.phone || "").replace(/\D/g, "");
      const nameKey  = String(c?.name  || "").trim().toLowerCase();
      if (phoneKey) byPhone.set(phoneKey, t);
      if (nameKey)  byName.set(nameKey, t);
    });
    return { byPhone, byName };
  }, [customers]);

  const resolveCustomerType = customer => {
    const phoneKey = String(customer?.phone || "").replace(/\D/g, "");
    const nameKey  = String(customer?.name  || "").trim().toLowerCase();
    if (phoneKey && customerTypeLookup.byPhone.has(phoneKey)) return customerTypeLookup.byPhone.get(phoneKey);
    if (nameKey  && customerTypeLookup.byName.has(nameKey))   return customerTypeLookup.byName.get(nameKey);
    return getCustomerType(customer);
  };

  const overviewRows = useMemo(() => [
    ...groupedCustomers.map(e => ({ key: e.key, customer: e.customer, totals: e.totals, invoiceCount: e.invoiceCount, status: e.status })),
    ...fallbackCustomers.map(e => ({ key: `${e.customer.name}|${e.customer.phone}`, customer: e.customer, totals: e.totals, invoiceCount: e.invoiceCount, status: e.status })),
  ], [groupedCustomers, fallbackCustomers]);

  const allPendingRows = useMemo(() => {
    const sel = CUSTOMER_TYPE_TABS[pendingTypeTab] || "All";
    const q   = pendingSearch.trim().toLowerCase();
    return overviewRows
      .filter(r => Number(r.totals.due || 0) > 0)
      .filter(r => sel === "All" || resolveCustomerType(r.customer) === sel)
      .filter(r => !q || (r.customer.name || "").toLowerCase().includes(q) || (r.customer.phone || "").includes(q))
      .sort((a, b) => Number(b.totals.due) - Number(a.totals.due));
  }, [overviewRows, pendingTypeTab, pendingSearch, customerTypeLookup]);

  const totalPendingPages = Math.max(1, Math.ceil(allPendingRows.length / PENDING_PER_PAGE));
  const safePendingPage   = Math.min(pendingPage, totalPendingPages);
  const pagedPendingRows  = allPendingRows.slice((safePendingPage - 1) * PENDING_PER_PAGE, safePendingPage * PENDING_PER_PAGE);

  const chartData = useMemo(() =>
    ["Retail Customer", "Dealer", "Contractor", "Builder / Project"].map(type => {
      const rows = overviewRows.filter(r => resolveCustomerType(r.customer) === type);
      return {
        name: type === "Builder / Project" ? "Builder" : type.split(" ")[0],
        Paid: rows.reduce((s, r) => s + Number(r.totals.paid || 0), 0),
        Due:  rows.reduce((s, r) => s + Number(r.totals.due  || 0), 0),
      };
    }), [overviewRows, customerTypeLookup]
  );

  /* ── Overview ── */
  const renderOverview = () => {
    if (loading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 320 }}>
          <CircularProgress sx={{ color: T.primary }} />
        </Box>
      );
    }

    const collectionRate = totals.amount > 0 ? Math.round((totals.paid / totals.amount) * 100) : 0;

    return (
      <Box>

        <Box sx={{ px: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>

          {/* ── Stat cards ── */}
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2,1fr)", xl: "repeat(4,1fr)" } }}>
            <StatCard
              icon={<PeopleIcon sx={{ fontSize: 20 }} />}
              label="Total Customers"
              value={overviewRows.length}
              accent={T.primary}
              sub={`${totals.paidCount} fully paid`}
            />
            <StatCard
              icon={<PaymentsIcon sx={{ fontSize: 20 }} />}
              label="Total Collected"
              value={`₹${formatCurrency(totals.paid)}`}
              accent={T.success}
              sub={`of ₹${formatCurrency(totals.amount)} billed`}
            />
            <StatCard
              icon={<HourglassBottomIcon sx={{ fontSize: 20 }} />}
              label="Outstanding Due"
              value={`₹${formatCurrency(totals.due)}`}
              accent={T.danger}
              sub={`${totals.pendingCount + totals.partialCount} accounts pending`}
            />
            <StatCard
              icon={<ReceiptLongIcon sx={{ fontSize: 20 }} />}
              label="Pending Accounts"
              value={totals.pendingCount + totals.partialCount}
              accent={T.violet}
              sub={`${collectionRate}% collection rate`}
            />
          </Box>

          {/* ── Two-column bottom ── */}
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "3fr 2fr" }, alignItems: "start" }}>

            {/* ── Pending Payments card ── */}
            <Box sx={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: "0 1px 3px rgba(15,23,42,.06)", overflow: "hidden" }}>

              {/* Header: title + search side by side */}
              <Box sx={{ px: 2.5, py: 1.5, borderBottom: `2px solid ${T.danger}`, background: `linear-gradient(to right, ${T.dangerLight}, ${T.surface})`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                <Box>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: T.dark, lineHeight: 1.2 }}>Pending Payments</Typography>
                  <Typography sx={{ fontSize: 11.5, color: T.muted, mt: 0.3 }}>Sorted highest due first</Typography>
                </Box>
                {/* Search */}
                <Box sx={{ position: "relative", flexShrink: 0 }}>
                  <Box component="span" sx={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: T.faint, display: "flex", pointerEvents: "none" }}>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M10.5 10.5L14 14" strokeLinecap="round"/></svg>
                  </Box>
                  <input
                    value={pendingSearch}
                    onChange={e => { setPendingSearch(e.target.value); setPendingPage(1); setSelectedRowKey(null); }}
                    placeholder="Search name or phone…"
                    style={{ height: 32, paddingLeft: 28, paddingRight: 10, fontSize: 12.5, fontFamily: "'Noto Sans', sans-serif", border: `1px solid ${T.border}`, outline: "none", background: T.surface, color: T.text, width: 210 }}
                    onFocus={e => { e.target.style.borderColor = T.primary; e.target.style.boxShadow = "0 0 0 3px rgba(26,86,160,.08)"; }}
                    onBlur={e  => { e.target.style.borderColor = T.border;  e.target.style.boxShadow = "none"; }}
                  />
                </Box>
              </Box>

              {/* Type filter tabs */}
              <Box sx={{ borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt }}>
                <Tabs
                  value={pendingTypeTab}
                  onChange={(_, val) => { setPendingTypeTab(val); setPendingPage(1); setSelectedRowKey(null); }}
                  variant="scrollable" scrollButtons="auto"
                  sx={{
                    minHeight: 38,
                    "& .MuiTab-root": { textTransform: "none", minHeight: 38, fontSize: 12, fontWeight: 600, color: T.muted, px: 1.8, py: 0 },
                    "& .MuiTab-root.Mui-selected": { color: T.primary, fontWeight: 700 },
                    "& .MuiTabs-indicator": { background: T.primary, height: 2, borderRadius: 0 },
                  }}
                >
                  {CUSTOMER_TYPE_TABS.map(type => <Tab key={type} label={type} />)}
                </Tabs>
              </Box>

              {/* Rows */}
              {pagedPendingRows.length === 0 ? (
                <Box sx={{ py: 8, textAlign: "center" }}>
                  <Typography sx={{ fontSize: 26, mb: 1 }}>✅</Typography>
                  <Typography sx={{ fontSize: 13, color: T.faint, fontWeight: 600 }}>
                    {pendingSearch ? "No results match your search" : "No pending dues in this category"}
                  </Typography>
                </Box>
              ) : pagedPendingRows.map((row, idx) => {
                const type       = resolveCustomerType(row.customer);
                const globalIdx  = (safePendingPage - 1) * PENDING_PER_PAGE + idx + 1;
                const isSelected = selectedRowKey === row.key;

                /* find top-due invoice for this customer to prefill CustomerPayments */
                const customerInvoices = invoices.filter(inv => {
                  const iPh = String(inv?.customer?.phone || "").replace(/\D/g, "");
                  const iNm = String(inv?.customer?.name  || "").trim().toLowerCase();
                  const rPh = String(row.customer?.phone  || "").replace(/\D/g, "");
                  const rNm = String(row.customer?.name   || "").trim().toLowerCase();
                  return (iPh && iPh === rPh) || (iNm && iNm === rNm);
                });
                const topInvoice = customerInvoices
                  .map(inv => ({ inv, due: Number(inv?.payment?.dueAmount || 0) }))
                  .sort((a, b) => b.due - a.due)[0]?.inv || null;

                return (
                  <Box key={row.key}>
                    {/* ── Main row ── */}
                    <Box
                      onClick={() => setSelectedRowKey(isSelected ? null : row.key)}
                      sx={{
                        px: 2, py: 1.3,
                        display: "flex", alignItems: "center", gap: 1.4,
                        borderBottom: isSelected ? "none" : `1px solid ${T.borderLight}`,
                        borderLeft: `3px solid ${isSelected ? T.primary : "transparent"}`,
                        background: isSelected ? T.primaryLight : T.surface,
                        cursor: "pointer",
                        "&:hover": { background: isSelected ? T.primaryLight : T.surfaceAlt },
                        transition: "background .12s, border-color .12s",
                      }}
                    >
                      {/* Rank */}
                      <Box sx={{ width: 22, textAlign: "right", flexShrink: 0 }}>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.faint }}>{globalIdx}</Typography>
                      </Box>

                      <InitialsBox name={row.customer.name} type={type} />

                      {/* Name + meta */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: isSelected ? T.primary : T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {row.customer.name || "—"}
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mt: 0.4, flexWrap: "wrap" }}>
                          <TypeBadge type={type} />
                          <Typography sx={{ fontSize: 10.5, color: T.faint }}>{row.invoiceCount} bill{row.invoiceCount !== 1 ? "s" : ""}</Typography>
                          {row.customer.phone && <Typography sx={{ fontSize: 10.5, color: T.faint }}>{row.customer.phone}</Typography>}
                        </Box>
                      </Box>

                      {/* Amount + status */}
                      <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 800, color: T.danger, fontFamily: "'DM Mono', monospace" }}>
                          ₹{formatCurrency(row.totals.due)}
                        </Typography>
                        <Box sx={{ mt: 0.4 }}><StatusBadge status={row.status} /></Box>
                      </Box>

                      {/* Chevron */}
                      <Box sx={{ color: T.faint, fontSize: 14, flexShrink: 0, lineHeight: 1, transition: "transform .2s", transform: isSelected ? "rotate(180deg)" : "rotate(0deg)" }}>▾</Box>
                    </Box>

                    {/* ── Action tray (visible when row selected) ── */}
                    {isSelected && (
                      <Box sx={{ px: 2, py: 1.1, borderBottom: `1px solid ${T.border}`, borderLeft: `3px solid ${T.primary}`, background: "#f0f6ff", display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>

                        {/* Pay */}
                        <Box
                          onClick={e => {
                            e.stopPropagation();
                            navigate("/customers/payments", {
                              state: {
                                fromPayAction: true,
                                prefillCustomer: { name: row.customer.name, phone: row.customer.phone },
                                prefillInvoice: topInvoice ? { id: topInvoice._id, invoiceNo: topInvoice.invoiceNo, dueAmount: Number(topInvoice?.payment?.dueAmount || 0) } : null,
                              },
                            });
                          }}
                          sx={{ display: "inline-flex", alignItems: "center", gap: "5px", px: 1.5, py: "5px", fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none", background: T.primary, color: "#fff", "&:hover": { background: T.primaryDark }, transition: "all .12s" }}
                        >
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="4" width="14" height="10" rx="0"/><path d="M1 8h14"/><path d="M4 12h2"/></svg>
                          Pay
                        </Box>

                        {/* Send Invoice via WhatsApp */}
                        <Box
                          onClick={e => {
                            e.stopPropagation();
                            const phone = String(row.customer.phone || "").replace(/\D/g, "");
                            if (!phone) return;
                            const fullPhone = phone.length === 10 ? `91${phone}` : phone;
                            const msg = [`Hello ${row.customer.name || "Customer"},`, `You have ${row.invoiceCount} pending bill(s) with a total due of ₹${formatCurrency(row.totals.due)}.`, "Please contact us to clear the outstanding amount."].join("\n");
                            const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
                            window.open(isMobile ? `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}` : `https://web.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(msg)}`, "_blank");
                          }}
                          sx={{ display: "inline-flex", alignItems: "center", gap: "5px", px: 1.5, py: "5px", fontSize: 12, fontWeight: 700, cursor: "pointer", border: `1px solid #bbf7d0`, background: T.successLight, color: T.success, "&:hover": { background: "#dcfce7", borderColor: T.success }, transition: "all .12s" }}
                        >
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2L9 7M14 2H10M14 2V6" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1V9" strokeLinecap="round"/></svg>
                          Send Invoice
                        </Box>

                        {/* Outstanding summary on the right */}
                        <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 0.8 }}>
                          <Typography sx={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>Outstanding:</Typography>
                          <Typography sx={{ fontSize: 13, fontWeight: 800, color: T.danger, fontFamily: "'DM Mono', monospace" }}>₹{formatCurrency(row.totals.due)}</Typography>
                        </Box>
                      </Box>
                    )}
                  </Box>
                );
              })}

              {/* ── Pagination footer ── */}
              {allPendingRows.length > 0 && (
                <Box sx={{ px: 2, py: 1.2, borderTop: `1px solid ${T.border}`, background: T.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                  <Typography sx={{ fontSize: 12, color: T.muted }}>
                    Showing {(safePendingPage - 1) * PENDING_PER_PAGE + 1}–{Math.min(safePendingPage * PENDING_PER_PAGE, allPendingRows.length)} of {allPendingRows.length}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Box onClick={() => safePendingPage > 1 && setPendingPage(safePendingPage - 1)} sx={{ minWidth: 28, height: 26, px: 0.8, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, cursor: safePendingPage <= 1 ? "default" : "pointer", border: `1px solid ${T.border}`, background: T.surface, color: safePendingPage <= 1 ? T.faint : T.muted, opacity: safePendingPage <= 1 ? 0.45 : 1, "&:hover": safePendingPage > 1 ? { borderColor: T.primary, color: T.primary, background: T.primaryLight } : {}, transition: "all .1s" }}>‹</Box>
                    {Array.from({ length: totalPendingPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPendingPages || (p >= safePendingPage - 1 && p <= safePendingPage + 1))
                      .reduce((acc, p, i, arr) => { if (i > 0 && p - arr[i - 1] > 1) acc.push("…"); acc.push(p); return acc; }, [])
                      .map((p, i) => p === "…"
                        ? <Box key={`e${i}`} sx={{ px: 0.5, fontSize: 12, color: T.faint, display: "inline-flex", alignItems: "center" }}>…</Box>
                        : <Box key={p} onClick={() => { setPendingPage(p); setSelectedRowKey(null); }} sx={{ minWidth: 28, height: 26, px: 0.8, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: p === safePendingPage ? 700 : 500, cursor: "pointer", border: `1px solid ${p === safePendingPage ? T.primary : T.border}`, background: p === safePendingPage ? T.primary : T.surface, color: p === safePendingPage ? "#fff" : T.muted, "&:hover": p !== safePendingPage ? { borderColor: T.primary, color: T.primary, background: T.primaryLight } : {}, transition: "all .1s" }}>{p}</Box>
                      )}
                    <Box onClick={() => safePendingPage < totalPendingPages && setPendingPage(safePendingPage + 1)} sx={{ minWidth: 28, height: 26, px: 0.8, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, cursor: safePendingPage >= totalPendingPages ? "default" : "pointer", border: `1px solid ${T.border}`, background: T.surface, color: safePendingPage >= totalPendingPages ? T.faint : T.muted, opacity: safePendingPage >= totalPendingPages ? 0.45 : 1, "&:hover": safePendingPage < totalPendingPages ? { borderColor: T.primary, color: T.primary, background: T.primaryLight } : {}, transition: "all .1s" }}>›</Box>
                  </Box>
                </Box>
              )}
            </Box>

            {/* Right column: chart + summary */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>

              {/* Bar chart */}
              <Section title="Paid vs Due by Type" subtitle="Grouped by customer category" accent={T.primary} noPad>
                <Box sx={{ px: 1.5, pt: 1.5, pb: 1 }}>
                  {overviewRows.length === 0 ? (
                    <Box sx={{ py: 6, textAlign: "center" }}>
                      <Typography sx={{ fontSize: 13, color: T.faint }}>No data yet</Typography>
                    </Box>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }} barSize={16} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke={T.borderLight} vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: T.muted, fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: T.faint }} tickFormatter={v => v > 999 ? `${Math.round(v / 1000)}k` : v} axisLine={false} tickLine={false} width={34} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(0,0,0,.03)" }} />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10, fontWeight: 600 }} iconType="square" iconSize={7} />
                        <Bar dataKey="Paid" fill={T.success} radius={[0, 0, 0, 0]} />
                        <Bar dataKey="Due"  fill={T.danger}  radius={[0, 0, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Box>
              </Section>

              {/* Collection summary */}
              <Box sx={{ background: T.surface, border: `1px solid ${T.border}`, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,23,42,.06)" }}>
                <Box sx={{ px: 2.5, py: 1.4, borderBottom: `2px solid ${T.success}`, background: `linear-gradient(to right, ${T.successLight}, ${T.surface})`, display: "flex", alignItems: "center", gap: 1 }}>
                  <TrendingUpIcon sx={{ fontSize: 16, color: T.success }} />
                  <Typography sx={{ fontSize: 13, fontWeight: 800, color: T.dark }}>Collection Summary</Typography>
                </Box>

                <Box sx={{ p: 2 }}>
                  {[
                    { label: "Total Billed",  value: totals.amount, color: T.primary, border: "#c3d9f5",  bg: T.primaryLight },
                    { label: "Collected",     value: totals.paid,   color: T.success, border: "#bbf7d0",  bg: T.successLight },
                    { label: "Outstanding",   value: totals.due,    color: T.danger,  border: "#fecaca",  bg: T.dangerLight  },
                  ].map(({ label, value, color, border, bg }) => (
                    <Box key={label} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 1.4, py: 1, background: bg, border: `1px solid ${border}`, mb: 0.8 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 600, color: T.text }}>{label}</Typography>
                      <Typography sx={{ fontSize: 14, fontWeight: 800, color, fontFamily: "'DM Mono', monospace" }}>
                        ₹{formatCurrency(value)}
                      </Typography>
                    </Box>
                  ))}

                  {/* Progress bar */}
                  <Box sx={{ mt: 1.4, pt: 1.2, borderTop: `1px solid ${T.border}` }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.8 }}>
                      <Typography sx={{ fontSize: 10.5, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em" }}>Collection Progress</Typography>
                      <Typography sx={{ fontSize: 10.5, color: collectionRate >= 80 ? T.success : collectionRate >= 50 ? T.warning : T.danger, fontWeight: 800 }}>
                        {collectionRate}%
                      </Typography>
                    </Box>
                    <Box sx={{ height: 6, background: T.bg, border: `1px solid ${T.border}`, overflow: "hidden" }}>
                      <Box sx={{
                        height: "100%",
                        width: `${Math.min(collectionRate, 100)}%`,
                        background: collectionRate >= 80 ? T.success : collectionRate >= 50 ? "#f59e0b" : T.danger,
                        transition: "width .6s cubic-bezier(.4,0,.2,1)",
                      }} />
                    </Box>
                    {/* Segment labels */}
                    <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.8 }}>
                      {[
                        { label: "Paid",    count: totals.paidCount,    color: T.success },
                        { label: "Partial", count: totals.partialCount, color: T.warning },
                        { label: "Pending", count: totals.pendingCount, color: T.danger  },
                      ].map(({ label, count, color }) => (
                        <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Box sx={{ width: 6, height: 6, background: color }} />
                          <Typography sx={{ fontSize: 10.5, color: T.muted, fontWeight: 600 }}>{label} ({count})</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  };

  const renderContent = () => {
    if (active === "overview")  return renderOverview();
    if (active === "create")    return <CustomerCreate />;
    if (active === "bill")      return <CustomerBill />;
    if (active === "details")   return <CustomerDetails />;
    if (active === "payments")  return <CustomerPayments />;
    return null;
  };

  return (
    <Box sx={{ p: 0, background: T.bg, minHeight: "100%" }}>
      {renderContent()}
    </Box>
  );
};

export default Customers;
