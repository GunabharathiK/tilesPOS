import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Card,
  Chip,
  CircularProgress,
  Tabs,
  Tab,
  Avatar,
} from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import PaymentsIcon from "@mui/icons-material/Payments";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
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
import { useLocation } from "react-router-dom";
import CustomerCreate from "../components/customers/CustomerCreate";
import CustomerBill from "../components/customers/CustomerBill";
import CustomerDetails from "../components/customers/CustomerDetails";
import CustomerPayments from "../components/customers/CustomerPayments";
import { getCustomers } from "../services/customerService";
import { getInvoices } from "../services/invoiceService";
import { formatCurrency, groupInvoicesByCustomer } from "../utils/invoiceMetrics";

/* ── Design tokens ─────────────────────────────────────────────────────── */
const C = {
  navy:       "#0f172a",
  blue:       "#1a56a0",
  blueMid:    "#1d4ed8",
  blueSoft:   "#eff6ff",
  blueLight:  "#dbeafe",
  yellow:     "#facc15",
  yellowSoft: "#fefce8",
  green:      "#15803d",
  greenSoft:  "#f0fdf4",
  greenMid:   "#dcfce7",
  amber:      "#b45309",
  amberSoft:  "#fffbeb",
  red:        "#c0392b",
  redSoft:    "#fef2f2",
  violet:     "#7c3aed",
  violetSoft: "#f5f3ff",
  border:     "#e2e8f0",
  borderMid:  "#cbd5e1",
  bg:         "#f1f5f9",
  white:      "#ffffff",
  text:       "#0f172a",
  textMid:    "#334155",
  muted:      "#64748b",
  faint:      "#94a3b8",
};

/* ── Helpers ───────────────────────────────────────────────────────────── */
const CUSTOMER_TYPE_TABS = ["All", "Retail Customer", "Dealer", "Contractor", "Builder / Project"];

const getCustomerType = (customer = {}) => {
  const raw = String(customer.customerType || customer.saleType || "Retail Customer")
    .trim().toLowerCase();
  if (raw === "dealer" || raw === "wholesale") return "Dealer";
  if (raw === "contractor" || raw === "b2b") return "Contractor";
  if (raw.includes("builder")) return "Builder / Project";
  return "Retail Customer";
};

const statusColor = (status) => {
  if (status === "Paid")    return { bg: "#dcfce7", color: "#15803d", dot: "#16a34a" };
  if (status === "Partial") return { bg: "#fef9c3", color: "#a16207", dot: "#ca8a04" };
  return                           { bg: "#fee2e2", color: "#b91c1c", dot: "#dc2626" };
};

const typeAccent = (type) => {
  if (type === "Dealer")            return { color: "#1a56a0", bg: "#eff6ff" };
  if (type === "Contractor")        return { color: "#7c3aed", bg: "#f5f3ff" };
  if (type === "Builder / Project") return { color: "#b45309", bg: "#fffbeb" };
  return                                   { color: "#15803d", bg: "#f0fdf4" };
};

const initials = (name = "") =>
  name.split(" ").slice(0, 2).map((w) => w[0] || "").join("").toUpperCase() || "?";

/* ── Sub-components ────────────────────────────────────────────────────── */
const StatCard = ({ icon, label, value, accent, iconBg, sub }) => (
  <Box
    sx={{
      background: C.white,
      border: `1px solid ${C.border}`,
      borderRadius: "14px",
      p: "18px 20px",
      display: "flex",
      alignItems: "flex-start",
      gap: 1.8,
      borderLeft: `4px solid ${accent}`,
      boxShadow: "0 1px 6px rgba(15,23,42,.05)",
      transition: "box-shadow .18s, transform .18s",
      "&:hover": { boxShadow: "0 6px 18px rgba(15,23,42,.1)", transform: "translateY(-1px)" },
    }}
  >
    <Box
      sx={{
        width: 42, height: 42,
        borderRadius: "11px",
        background: iconBg,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: accent, flexShrink: 0, mt: 0.2,
      }}
    >
      {icon}
    </Box>
    <Box>
      <Typography sx={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", lineHeight: 1 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 22, fontWeight: 800, color: C.text, lineHeight: 1.15, mt: 0.5, fontFamily: "'Rajdhani', sans-serif" }}>
        {value}
      </Typography>
      {sub && (
        <Typography sx={{ fontSize: 11, color: C.muted, mt: 0.4 }}>{sub}</Typography>
      )}
    </Box>
  </Box>
);

/* Custom recharts tooltip */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ background: C.navy, borderRadius: "10px", px: 1.8, py: 1.4, boxShadow: "0 8px 20px rgba(0,0,0,.22)" }}>
      <Typography sx={{ fontSize: 11, color: "rgba(255,255,255,.6)", mb: 0.6, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>
        {label}
      </Typography>
      {payload.map((p) => (
        <Box key={p.name} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.3 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: p.fill, flexShrink: 0 }} />
          <Typography sx={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>
            {p.name}: <span style={{ color: p.fill }}>₹{formatCurrency(p.value)}</span>
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

/* ── Section card shell ─────────────────────────────────────────────────── */
const Section = ({ title, subtitle, children, action, noPad = false }) => (
  <Card
    sx={{
      borderRadius: "16px",
      border: `1px solid ${C.border}`,
      boxShadow: "0 4px 16px rgba(15,23,42,.06)",
      overflow: "hidden",
      background: C.white,
    }}
  >
    <Box
      sx={{
        px: 2.5, py: 1.8,
        borderBottom: `1px solid ${C.border}`,
        background: "#fafcfe",
        display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1,
      }}
    >
      <Box>
        <Typography sx={{ fontSize: 14, fontWeight: 800, color: C.text, lineHeight: 1.2 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography sx={{ fontSize: 11.5, color: C.muted, mt: 0.35 }}>{subtitle}</Typography>
        )}
      </Box>
      {action}
    </Box>
    <Box sx={noPad ? {} : { p: 2 }}>{children}</Box>
  </Card>
);

/* ── Main component ─────────────────────────────────────────────────────── */
const Customers = () => {
  const location = useLocation();
  const [customers, setCustomers]       = useState([]);
  const [invoices, setInvoices]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [pendingTypeTab, setPendingTypeTab] = useState(0);

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

  const groupedCustomers = useMemo(() => groupInvoicesByCustomer(invoices), [invoices]);

  const totals = useMemo(() =>
    groupedCustomers.reduce(
      (acc, entry) => {
        acc.amount += entry.totals.amount;
        acc.paid   += entry.totals.paid;
        acc.due    += entry.totals.due;
        if (entry.status === "Paid")    acc.paidCustomers    += 1;
        if (entry.status === "Partial") acc.partialCustomers += 1;
        if (entry.status === "Pending") acc.pendingCustomers += 1;
        return acc;
      },
      { amount: 0, paid: 0, due: 0, paidCustomers: 0, partialCustomers: 0, pendingCustomers: 0 }
    ),
    [groupedCustomers]
  );

  const fallbackCustomers = useMemo(() => {
    const existingKeys = new Set(
      groupedCustomers.map((e) => `${e.customer.name || ""}|${e.customer.phone || ""}`)
    );
    return customers
      .filter((c) => !existingKeys.has(`${c.name || ""}|${c.phone || ""}`))
      .map((c) => ({
        customer: c,
        totals: { amount: 0, paid: 0, due: 0 },
        invoiceCount: 0,
        status: c.status || "Pending",
      }));
  }, [customers, groupedCustomers]);

  const customerTypeLookup = useMemo(() => {
    const byPhone = new Map();
    const byName  = new Map();
    customers.forEach((c) => {
      const t       = getCustomerType(c);
      const phoneKey = String(c?.phone || "").replace(/\D/g, "");
      const nameKey  = String(c?.name  || "").trim().toLowerCase();
      if (phoneKey) byPhone.set(phoneKey, t);
      if (nameKey)  byName.set(nameKey, t);
    });
    return { byPhone, byName };
  }, [customers]);

  const resolveCustomerType = (customer) => {
    const phoneKey = String(customer?.phone || "").replace(/\D/g, "");
    const nameKey  = String(customer?.name  || "").trim().toLowerCase();
    if (phoneKey && customerTypeLookup.byPhone.has(phoneKey)) return customerTypeLookup.byPhone.get(phoneKey);
    if (nameKey  && customerTypeLookup.byName.has(nameKey))   return customerTypeLookup.byName.get(nameKey);
    return getCustomerType(customer);
  };

  const overviewRows = useMemo(() => {
    const computed = groupedCustomers.map((entry) => ({
      key: entry.key,
      customer: entry.customer,
      totals: entry.totals,
      invoiceCount: entry.invoiceCount,
      status: entry.status,
    }));
    return [
      ...computed,
      ...fallbackCustomers.map((entry) => ({
        key: `${entry.customer.name}|${entry.customer.phone}`,
        customer: entry.customer,
        totals: entry.totals,
        invoiceCount: entry.invoiceCount,
        status: entry.status,
      })),
    ];
  }, [groupedCustomers, fallbackCustomers]);

  const filteredPendingRows = useMemo(() => {
    const selectedType = CUSTOMER_TYPE_TABS[pendingTypeTab] || "All";
    return overviewRows
      .filter((row) => Number(row.totals.due || 0) > 0)
      .filter((row) => selectedType === "All" || resolveCustomerType(row.customer) === selectedType)
      .sort((a, b) => Number(b.totals.due) - Number(a.totals.due))
      .slice(0, 12);
  }, [overviewRows, pendingTypeTab, customerTypeLookup]);

  /* chart data */
  const chartData = useMemo(() =>
    ["Retail Customer", "Dealer", "Contractor", "Builder / Project"].map((type) => {
      const rows = overviewRows.filter((row) => resolveCustomerType(row.customer) === type);
      return {
        name: type === "Builder / Project" ? "Builder" : type.split(" ")[0],
        Paid: rows.reduce((s, r) => s + Number(r.totals.paid || 0), 0),
        Due:  rows.reduce((s, r) => s + Number(r.totals.due  || 0), 0),
      };
    }),
    [overviewRows, customerTypeLookup]
  );

  /* ── Overview render ───────────────────────────────────────────────────── */
  const renderOverview = () => {
    if (loading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 320 }}>
          <CircularProgress sx={{ color: C.blue }} />
        </Box>
      );
    }

    const collectionRate = totals.amount > 0
      ? Math.round((totals.paid / totals.amount) * 100)
      : 0;

    return (
      <Box>

        {/* ── Hero banner ─────────────────────────────────────────────── */}
        <Box
          sx={{
            mb: 3,
            p: { xs: "22px 24px", md: "28px 36px" },
            borderRadius: "20px",
            background: `linear-gradient(130deg, ${C.navy} 0%, #1a3a6e 60%, #1e4fa0 100%)`,
            color: "#fff",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 16px 40px rgba(15,23,42,.28)",
          }}
        >
          {/* Decorative circles */}
          <Box sx={{ position: "absolute", top: -40, right: -40, width: 220, height: 220, borderRadius: "50%", background: "rgba(250,204,21,.07)", pointerEvents: "none" }} />
          <Box sx={{ position: "absolute", bottom: -60, right: 100, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,.04)", pointerEvents: "none" }} />
          <Box sx={{ position: "absolute", top: 10, right: 180, width: 80, height: 80, borderRadius: "50%", background: "rgba(250,204,21,.05)", pointerEvents: "none" }} />

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2, flexWrap: "wrap", position: "relative" }}>
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, mb: 0.6 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: "50%", background: C.yellow }} />
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.5)", textTransform: "uppercase", letterSpacing: ".12em" }}>
                  Customer Management
                </Typography>
              </Box>
              <Typography sx={{ fontSize: { xs: 26, md: 32 }, fontWeight: 800, fontFamily: "'Rajdhani', sans-serif", lineHeight: 1.05, letterSpacing: "-.5px" }}>
                Customer Dashboard
              </Typography>
              <Typography sx={{ mt: 0.8, fontSize: 13, color: "rgba(255,255,255,.65)", maxWidth: 440, lineHeight: 1.6 }}>
                Billing history, collection status, and payment analytics across all customer types
              </Typography>
            </Box>

            {/* Quick stats in hero */}
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "flex-start" }}>
              {[
                { label: "Collection Rate", value: `${collectionRate}%`, accent: C.yellow },
                { label: "Pending Accounts", value: totals.pendingCustomers + totals.partialCustomers, accent: "#f87171" },
              ].map(({ label, value, accent }) => (
                <Box
                  key={label}
                  sx={{
                    background: "rgba(255,255,255,.08)",
                    border: "1px solid rgba(255,255,255,.13)",
                    borderRadius: "12px",
                    px: 2.2, py: 1.4,
                    backdropFilter: "blur(8px)",
                    minWidth: 110,
                  }}
                >
                  <Typography sx={{ fontSize: 9, color: "rgba(255,255,255,.5)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em" }}>
                    {label}
                  </Typography>
                  <Typography sx={{ fontSize: 22, fontWeight: 800, color: accent, fontFamily: "'Rajdhani', sans-serif", lineHeight: 1.15, mt: 0.3 }}>
                    {value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        {/* ── Stat cards ──────────────────────────────────────────────── */}
        <Box
          sx={{
            display: "grid",
            gap: 1.8,
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" },
            mb: 3,
          }}
        >
          <StatCard
            icon={<PeopleIcon sx={{ fontSize: 20 }} />}
            label="Total Customers"
            value={overviewRows.length}
            accent={C.blue}
            iconBg={C.blueSoft}
            sub={`${totals.paidCustomers} fully paid`}
          />
          <StatCard
            icon={<PaymentsIcon sx={{ fontSize: 20 }} />}
            label="Total Collected"
            value={`₹${formatCurrency(totals.paid)}`}
            accent={C.green}
            iconBg={C.greenSoft}
            sub={`of ₹${formatCurrency(totals.amount)} billed`}
          />
          <StatCard
            icon={<HourglassBottomIcon sx={{ fontSize: 20 }} />}
            label="Outstanding Due"
            value={`₹${formatCurrency(totals.due)}`}
            accent={C.red}
            iconBg={C.redSoft}
            sub={`${totals.pendingCustomers + totals.partialCustomers} accounts pending`}
          />
          <StatCard
            icon={<ReceiptLongIcon sx={{ fontSize: 20 }} />}
            label="Active Bills"
            value={invoices.length}
            accent={C.violet}
            iconBg={C.violetSoft}
            sub={`across ${overviewRows.length} customers`}
          />
        </Box>

        {/* ── Bottom two-column section ────────────────────────────────── */}
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", lg: "3fr 2fr" },
            alignItems: "start",
          }}
        >
          {/* ── Pending payments list ──────────────────────────────────── */}
          <Section
            title="Pending Payments"
            subtitle="Sorted highest due first · max 12 accounts shown"
            noPad
          >
            {/* Type filter tabs */}
            <Box sx={{ px: 0.5, pt: 0.5, borderBottom: `1px solid ${C.border}`, background: "#fafcfe" }}>
              <Tabs
                value={pendingTypeTab}
                onChange={(_, val) => setPendingTypeTab(val)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  minHeight: 38,
                  "& .MuiTab-root": {
                    textTransform: "none",
                    minHeight: 38,
                    fontSize: 12,
                    fontWeight: 600,
                    color: C.muted,
                    px: 1.6,
                    py: 0,
                  },
                  "& .MuiTab-root.Mui-selected": { color: C.blue, fontWeight: 700 },
                  "& .MuiTabs-indicator": { background: C.blue, height: 2, borderRadius: "2px 2px 0 0" },
                }}
              >
                {CUSTOMER_TYPE_TABS.map((type) => (
                  <Tab key={type} label={type} />
                ))}
              </Tabs>
            </Box>

            {/* Rows */}
            <Box sx={{ p: 1.6, display: "flex", flexDirection: "column", gap: 0.9, maxHeight: 400, overflowY: "auto" }}>
              {filteredPendingRows.length === 0 ? (
                <Box sx={{ py: 8, textAlign: "center" }}>
                  <Typography sx={{ fontSize: 28, mb: 1 }}>✅</Typography>
                  <Typography sx={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>No pending dues in this category</Typography>
                </Box>
              ) : (
                filteredPendingRows.map((row) => {
                  const sc   = statusColor(row.status);
                  const type = resolveCustomerType(row.customer);
                  const ta   = typeAccent(type);
                  return (
                    <Box
                      key={row.key}
                      sx={{
                        border: `1px solid ${C.border}`,
                        borderRadius: "11px",
                        px: 1.6, py: 1.1,
                        display: "flex",
                        alignItems: "center",
                        gap: 1.4,
                        background: C.white,
                        transition: "background .14s, border-color .14s",
                        "&:hover": { background: C.bg, borderColor: C.borderMid },
                        cursor: "default",
                      }}
                    >
                      {/* Avatar */}
                      <Avatar
                        sx={{
                          width: 36, height: 36,
                          fontSize: 12, fontWeight: 800,
                          background: ta.bg,
                          color: ta.color,
                          border: `1.5px solid ${ta.color}22`,
                          flexShrink: 0,
                        }}
                      >
                        {initials(row.customer.name)}
                      </Avatar>

                      {/* Name + type */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontSize: 13, fontWeight: 700, color: C.text,
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          }}
                        >
                          {row.customer.name || "—"}
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, mt: 0.3 }}>
                          <Box
                            sx={{
                              fontSize: 10, fontWeight: 700,
                              color: ta.color, background: ta.bg,
                              border: `1px solid ${ta.color}30`,
                              borderRadius: "4px", px: 0.8, py: 0.1,
                              lineHeight: 1.5, letterSpacing: ".04em",
                            }}
                          >
                            {type}
                          </Box>
                          <Typography sx={{ fontSize: 10, color: C.faint }}>
                            {row.invoiceCount} bill{row.invoiceCount !== 1 ? "s" : ""}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Amount + status */}
                      <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                        <Typography
                          sx={{
                            fontSize: 14, fontWeight: 800,
                            color: C.red, fontFamily: "'Rajdhani', sans-serif",
                            letterSpacing: "-.3px",
                          }}
                        >
                          ₹{formatCurrency(row.totals.due)}
                        </Typography>
                        <Box
                          sx={{
                            mt: 0.3, display: "inline-flex", alignItems: "center", gap: 0.5,
                            background: sc.bg, borderRadius: "5px",
                            px: 0.8, py: 0.15,
                          }}
                        >
                          <Box sx={{ width: 5, height: 5, borderRadius: "50%", background: sc.dot, flexShrink: 0 }} />
                          <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: sc.color, letterSpacing: ".05em", textTransform: "uppercase" }}>
                            {row.status}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  );
                })
              )}
            </Box>
          </Section>

          {/* ── Chart + summary ───────────────────────────────────────── */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>

            <Section
              title="Paid vs Due by Type"
              subtitle="Grouped by customer category"
              noPad
            >
              <Box sx={{ px: 1.5, pt: 1.5, pb: 1 }}>
                {overviewRows.length === 0 ? (
                  <Box sx={{ py: 6, textAlign: "center" }}>
                    <Typography sx={{ fontSize: 13, color: C.muted }}>No data yet</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }} barSize={18} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: C.muted, fontWeight: 600 }}
                        axisLine={false} tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: C.faint }}
                        tickFormatter={(v) => v > 999 ? `${Math.round(v / 1000)}k` : v}
                        axisLine={false} tickLine={false} width={34}
                      />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(0,0,0,.03)" }} />
                      <Legend
                        wrapperStyle={{ fontSize: 11, paddingTop: 10, fontWeight: 600 }}
                        iconType="circle" iconSize={7}
                      />
                      <Bar dataKey="Paid" fill="#15803d" radius={[5, 5, 0, 0]} />
                      <Bar dataKey="Due"  fill="#c0392b" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </Section>

            {/* Collection summary mini-card */}
            <Box
              sx={{
                background: C.white,
                border: `1px solid ${C.border}`,
                borderRadius: "14px",
                p: "18px 20px",
                boxShadow: "0 2px 8px rgba(15,23,42,.05)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.8 }}>
                <TrendingUpIcon sx={{ fontSize: 16, color: C.blue }} />
                <Typography sx={{ fontSize: 12, fontWeight: 800, color: C.text, textTransform: "uppercase", letterSpacing: ".07em" }}>
                  Collection Summary
                </Typography>
              </Box>

              {[
                { label: "Total Billed",   value: totals.amount, color: C.blue,  bg: C.blueSoft },
                { label: "Collected",      value: totals.paid,   color: C.green, bg: C.greenSoft },
                { label: "Outstanding",    value: totals.due,    color: C.red,   bg: C.redSoft },
              ].map(({ label, value, color, bg }) => (
                <Box
                  key={label}
                  sx={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    px: 1.4, py: 1,
                    borderRadius: "9px",
                    background: bg,
                    mb: 0.7,
                  }}
                >
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: C.textMid }}>{label}</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 800, color, fontFamily: "'Rajdhani', sans-serif" }}>
                    ₹{formatCurrency(value)}
                  </Typography>
                </Box>
              ))}

              {/* Progress bar */}
              <Box sx={{ mt: 1.6 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.6 }}>
                  <Typography sx={{ fontSize: 10.5, color: C.muted, fontWeight: 600 }}>Collection progress</Typography>
                  <Typography sx={{ fontSize: 10.5, color: C.green, fontWeight: 800 }}>{collectionRate}%</Typography>
                </Box>
                <Box sx={{ height: 7, borderRadius: "4px", background: C.bg, overflow: "hidden" }}>
                  <Box
                    sx={{
                      height: "100%",
                      width: `${Math.min(collectionRate, 100)}%`,
                      borderRadius: "4px",
                      background: `linear-gradient(90deg, ${C.green} 0%, #22c55e 100%)`,
                      transition: "width .6s cubic-bezier(.4,0,.2,1)",
                    }}
                  />
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
    <Box sx={{ p: 0, background: C.bg, minHeight: "100%" }}>
      {renderContent()}
    </Box>
  );
};

export default Customers;
