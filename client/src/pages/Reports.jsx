import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import AssessmentIcon from "@mui/icons-material/Assessment";
import ArchitectureIcon from "@mui/icons-material/Architecture";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import PeopleIcon from "@mui/icons-material/People";
import PaymentsIcon from "@mui/icons-material/Payments";
import DescriptionIcon from "@mui/icons-material/Description";
import { deleteInvoice, getInvoices } from "../services/invoiceService";
import { deleteProduct, getProducts } from "../services/productService";
import { deleteCustomer, getCustomers, updateCustomer } from "../services/customerService";
import { formatCurrency, getInvoicePaymentMetrics } from "../utils/invoiceMetrics";
import { useNavigate } from "react-router-dom";

/* ── Design tokens (matches CustomerPayments) ── */
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
};

/* ── Input style — zero radius ── */
const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 0,
    background: T.surface,
    fontSize: 13,
    "& fieldset": { borderColor: T.border },
    "&:hover fieldset": { borderColor: T.primary },
    "&.Mui-focused fieldset": { borderColor: T.primary, borderWidth: 1.5 },
    "&.Mui-focused": { boxShadow: "0 0 0 3px rgba(26,86,160,.08)" },
  },
  "& .MuiInputLabel-root":             { fontSize: 13, color: T.muted },
  "& .MuiInputLabel-root.Mui-focused": { color: T.primary },
};

/* ── Badge ── */
const Badge = ({ label, color, bg, border }) => (
  <Box component="span" sx={{ display: "inline-flex", alignItems: "center", px: 1, py: "2px", fontSize: 10.5, fontWeight: 700, color, background: bg, border: `1px solid ${border}` }}>
    {label}
  </Box>
);

const statusBadge = (status) => {
  if (status === "Paid")    return <Badge label="Paid"    color={T.success} bg={T.successLight} border="#bbf7d0" />;
  if (status === "Partial") return <Badge label="Partial" color={T.warning} bg={T.warningLight} border="#fde68a" />;
  return                           <Badge label="Pending" color={T.danger}  bg={T.dangerLight}  border="#fecaca" />;
};

const stockBadge = (status) => {
  if (status === "OK")        return <Badge label="OK"           color={T.success} bg={T.successLight} border="#bbf7d0" />;
  if (status === "Low Stock") return <Badge label="Low Stock"    color={T.warning} bg={T.warningLight} border="#fde68a" />;
  return                             <Badge label="Out of Stock" color={T.danger}  bg={T.dangerLight}  border="#fecaca" />;
};

/* ── Action button ── */
const ActionBtn = ({ children, onClick, disabled, danger }) => (
  <Box
    onClick={!disabled ? onClick : undefined}
    sx={{
      display: "inline-flex", alignItems: "center",
      px: 1.4, py: "5px", fontSize: 12, fontWeight: 600,
      cursor: disabled ? "default" : "pointer", userSelect: "none",
      border: `1px solid ${danger ? "#fecaca" : T.border}`,
      background: danger ? T.dangerLight : T.surface,
      color: disabled ? T.faint : (danger ? T.danger : T.primary),
      opacity: disabled ? 0.5 : 1,
      "&:hover": !disabled ? { background: danger ? "#fecaca" : T.primaryLight, borderColor: danger ? T.danger : T.primary } : {},
      transition: "all .12s",
    }}
  >
    {children}
  </Box>
);

/* ── Metric card ── */
const MetricCard = ({ label, value, tone, accent }) => (
  <Box sx={{ background: T.surface, border: `1px solid ${T.border}`, borderTop: `3px solid ${accent || tone || T.primary}`, p: 1.8 }}>
    <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".07em", mb: 0.5 }}>{label}</Typography>
    <Typography sx={{ fontSize: 22, fontWeight: 800, color: tone || T.dark, lineHeight: 1.1, fontFamily: "'DM Mono', monospace" }}>{value}</Typography>
  </Box>
);

/* ── Table header / data cells ── */
const TH = ({ children, align = "left" }) => (
  <TableCell align={align} sx={{ py: 1.2, px: 2, fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".07em", background: T.surfaceAlt, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>
    {children}
  </TableCell>
);
const TD = ({ children, align = "left", mono, sx: sxProp }) => (
  <TableCell align={align} sx={{ py: 1.3, px: 2, fontSize: 13, borderBottom: `1px solid ${T.borderLight}`, fontFamily: mono ? "'DM Mono', monospace" : "inherit", color: T.text, ...sxProp }}>
    {children}
  </TableCell>
);

/* ── TypePill ── */
const TypePill = ({ label }) => (
  <Box component="span" sx={{ fontSize: 11, fontWeight: 600, color: T.muted, background: T.bg, border: `1px solid ${T.border}`, px: 0.8, py: "2px" }}>{label}</Box>
);

/* ── Helpers ── */
const normalizeCustomerType = (invoice = {}) => {
  const raw = invoice?.customerType || invoice?.saleType || invoice?.customer?.customerType || invoice?.customer?.saleType || "Retail Customer";
  if (raw === "Dealer" || raw === "Wholesale")    return "Dealer";
  if (raw === "Contractor" || raw === "B2B")      return "Contractor";
  if (raw === "Builder / Project")                return "Builder / Project";
  return "Retail Customer";
};
const parseInvoiceDate = (invoice = {}) => {
  const d = new Date(invoice?.createdAt || invoice?.date || Date.now());
  return Number.isNaN(d.getTime()) ? new Date() : d;
};
const isQuotationDoc = (invoice = {}) =>
  String(invoice?.documentType || "").toLowerCase() === "quotation" ||
  String(invoice?.invoiceNo || "").toUpperCase().startsWith("QTN");

const inPeriod = (date, period) => {
  const now      = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target   = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (period === "all")        return true;
  if (period === "today")      return target.getTime() === dayStart.getTime();
  if (period === "this_week")  { const s = new Date(dayStart); s.setDate(dayStart.getDate() - dayStart.getDay()); return target >= s && target <= now; }
  if (period === "this_month") return target.getMonth() === now.getMonth() && target.getFullYear() === now.getFullYear();
  if (period === "last_month") { const l = new Date(now.getFullYear(), now.getMonth() - 1, 1); return target.getMonth() === l.getMonth() && target.getFullYear() === l.getFullYear(); }
  return true;
};

const exportCSV = (headers, rows, filename) => {
  const esc   = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))];
  const a     = document.createElement("a");
  a.href      = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
  a.download  = filename;
  a.click();
};

/* ── Config ── */
const reportDefs = [
  { key: "sales",      label: "Sales Report",      hint: "Daily/Monthly with totals",         icon: <AssessmentIcon    sx={{ fontSize: 18 }} />, color: "#1a56a0" },
  { key: "bulk",       label: "Bulk / Dealer",      hint: "Business customer sales",           icon: <ArchitectureIcon  sx={{ fontSize: 18 }} />, color: "#6c3fc5" },
  { key: "stock",      label: "Stock Report",       hint: "Current stock and value",           icon: <Inventory2Icon    sx={{ fontSize: 18 }} />, color: "#d4820a" },
  { key: "pnl",        label: "Profit & Loss",      hint: "Revenue, COGS, gross profit",       icon: <TrendingUpIcon    sx={{ fontSize: 18 }} />, color: "#1a7a4a" },
  { key: "gst",        label: "GST Report",         hint: "Taxable and GST summary",           icon: <ReceiptLongIcon   sx={{ fontSize: 18 }} />, color: "#b45309" },
  { key: "supplier",   label: "Supplier Report",    hint: "Suppliers and product lines",       icon: <LocalShippingIcon sx={{ fontSize: 18 }} />, color: "#0e7a6e" },
  { key: "customer",   label: "Customer Report",    hint: "Sales and outstanding by customer", icon: <PeopleIcon        sx={{ fontSize: 18 }} />, color: "#2563eb" },
  { key: "collection", label: "Collection Report",  hint: "Cash/UPI/Card split",               icon: <PaymentsIcon      sx={{ fontSize: 18 }} />, color: "#15803d" },
  { key: "quotation",  label: "Quotation History",  hint: "Quotation count and value",         icon: <DescriptionIcon   sx={{ fontSize: 18 }} />, color: "#7c3aed" },
];

const periodOptions = [
  { value: "today",      label: "Today"      },
  { value: "this_week",  label: "This Week"  },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "all",        label: "All Time"   },
];

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

/* ═══════════════════════════════════════════════════ */
const Reports = () => {
  const navigate = useNavigate();
  const [loading,               setLoading]               = useState(true);
  const [invoices,              setInvoices]              = useState([]);
  const [products,              setProducts]              = useState([]);
  const [customers,             setCustomers]             = useState([]);
  const [activeReport,          setActiveReport]          = useState("sales");
  const [period,                setPeriod]                = useState("this_month");
  const [searchTerm,            setSearchTerm]            = useState("");
  const [pageSize,              setPageSize]              = useState(10);
  const [page,                  setPage]                  = useState(1);
  const [editingCustomer,       setEditingCustomer]       = useState(null);
  const [editingCustomerSaving, setEditingCustomerSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [invRes, prodRes, custRes] = await Promise.all([getInvoices(), getProducts(), getCustomers()]);
        setInvoices(Array.isArray(invRes?.data)   ? invRes.data   : []);
        setProducts(Array.isArray(prodRes?.data)  ? prodRes.data  : []);
        setCustomers(Array.isArray(custRes?.data) ? custRes.data  : []);
      } finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => { setPage(1); }, [activeReport, searchTerm, pageSize, period]);

  /* ── Derived data ── */
  const filteredInvoices = useMemo(() => invoices.filter((inv) => inPeriod(parseInvoiceDate(inv), period)), [invoices, period]);

  const invoiceRows = useMemo(() =>
    filteredInvoices.map((inv) => {
      const metrics = getInvoicePaymentMetrics(inv);
      return {
        invoice: inv, date: parseInvoiceDate(inv), type: normalizeCustomerType(inv), metrics,
        qty: Array.isArray(inv?.items) ? inv.items.reduce((s, i) => s + Number(i?.quantity || 0), 0) : 0,
        avgItemDiscount: Array.isArray(inv?.items) && inv.items.length ? inv.items.reduce((s, i) => s + Number(i?.discount || 0), 0) / inv.items.length : 0,
      };
    }), [filteredInvoices]);

  const summary = useMemo(() => ({
    bills:      invoiceRows.length,
    totalSales: invoiceRows.reduce((s, r) => s + r.metrics.amount, 0),
    totalPaid:  invoiceRows.reduce((s, r) => s + r.metrics.paidAmount, 0),
    totalDue:   invoiceRows.reduce((s, r) => s + r.metrics.dueAmount, 0),
    qty:        invoiceRows.reduce((s, r) => s + r.qty, 0),
  }), [invoiceRows]);

  const salesTableRows = useMemo(() =>
    [...invoiceRows].sort((a, b) => b.date - a.date).map((r) => ({
      invoice: r.invoice, invoiceNo: r.invoice?.invoiceNo || "-",
      date: r.date.toLocaleDateString("en-GB"), customer: r.invoice?.customer?.name || "-",
      type: r.type, amount: r.metrics.amount, paid: r.metrics.paidAmount,
      due: r.metrics.dueAmount, status: r.metrics.status,
    })), [invoiceRows]);

  const bulkRows = useMemo(() => invoiceRows.filter((r) => r.type !== "Retail Customer"), [invoiceRows]);

  const customerIndex = useMemo(() => {
    const map = new Map();
    customers.forEach((c) => map.set(`${c.name || ""}|${c.phone || ""}`, c));
    return map;
  }, [customers]);

  const bulkByCustomer = useMemo(() => {
    const map = new Map();
    bulkRows.forEach((r) => {
      const key = `${r.invoice?.customer?.name || "Unknown"}|${r.invoice?.customer?.phone || ""}`;
      if (!map.has(key)) map.set(key, { name: r.invoice?.customer?.name || "Unknown", type: r.type, total: 0, due: 0, discountSum: 0, count: 0 });
      const row = map.get(key);
      row.total += r.metrics.amount; row.due += r.metrics.dueAmount; row.discountSum += r.avgItemDiscount; row.count += 1;
    });
    return Array.from(map.entries()).map(([key, r]) => ({ ...r, key, customer: customerIndex.get(key) || null, avgDiscount: r.count ? r.discountSum / r.count : 0 }));
  }, [bulkRows, customerIndex]);

  const stockRows = useMemo(() =>
    products.map((p) => {
      const stock = Number(p?.stock || 0), min = Number(p?.minStock || p?.lowStockThreshold || 0), cost = Number(p?.costPrice || 0);
      return { product: p, sku: p?.code || p?._id?.slice(-6) || "-", name: p?.name || "-", stock, value: stock * cost, status: stock <= 0 ? "Out of Stock" : stock <= min ? "Low Stock" : "OK" };
    }), [products]);

  const pnl = useMemo(() => {
    const productMap = new Map(products.map((p) => [String(p?._id), Number(p?.costPrice || 0)]));
    let cogs = 0;
    invoiceRows.forEach((r) => (r.invoice?.items || []).forEach((item) => {
      const qty = Number(item?.quantity || 0), rate = Number(item?.price || 0);
      cogs += qty * (productMap.get(String(item?.productId)) || rate * 0.75);
    }));
    const revenue = summary.totalSales, gross = revenue - cogs, margin = revenue > 0 ? (gross / revenue) * 100 : 0;
    return { revenue, cogs, gross, margin };
  }, [invoiceRows, products, summary.totalSales]);

  const gst = useMemo(() => {
    const taxable = invoiceRows.reduce((s, r) => s + Math.max(0, r.metrics.amount - Number(r.invoice?.taxAmount || 0)), 0);
    const gstTotal = invoiceRows.reduce((s, r) => s + Number(r.invoice?.taxAmount || 0), 0);
    return { taxable, gstTotal, cgst: gstTotal / 2, sgst: gstTotal / 2 };
  }, [invoiceRows]);

  const collections = useMemo(() => {
    const out = { CASH: 0, UPI: 0, CARD: 0, "BANK TRANSFER": 0, CHEQUE: 0, OTHER: 0 };
    invoiceRows.forEach((r) => {
      const method = String(r.invoice?.payment?.method || "").toUpperCase().trim();
      const paid   = Number(r.metrics.paidAmount || 0);
      if (!paid) return;
      if      (method.includes("CASH"))   out.CASH              += paid;
      else if (method.includes("UPI"))    out.UPI               += paid;
      else if (method.includes("CARD"))   out.CARD              += paid;
      else if (method.includes("BANK"))   out["BANK TRANSFER"]  += paid;
      else if (method.includes("CHEQUE")) out.CHEQUE            += paid;
      else                                out.OTHER             += paid;
    });
    return out;
  }, [invoiceRows]);

  const customerRows = useMemo(() => {
    const map = new Map();
    invoiceRows.forEach((r) => {
      const key = `${r.invoice?.customer?.name || "Unknown"}|${r.invoice?.customer?.phone || ""}`;
      if (!map.has(key)) map.set(key, { name: r.invoice?.customer?.name || "Unknown", phone: r.invoice?.customer?.phone || "-", amount: 0, due: 0, count: 0 });
      const row = map.get(key); row.amount += r.metrics.amount; row.due += r.metrics.dueAmount; row.count += 1;
    });
    return Array.from(map.entries()).map(([key, r]) => ({ ...r, key, customer: customerIndex.get(key) || null })).sort((a, b) => b.amount - a.amount);
  }, [invoiceRows, customerIndex]);

  const quotationRows = useMemo(() =>
    invoices.filter((inv) => isQuotationDoc(inv)).map((inv) => {
      const metrics = getInvoicePaymentMetrics(inv);
      return { invoice: inv, date: parseInvoiceDate(inv), type: normalizeCustomerType(inv), metrics, qty: Array.isArray(inv?.items) ? inv.items.reduce((s, i) => s + Number(i?.quantity || 0), 0) : 0 };
    }), [invoices]);

  /* ── Handlers ── */
  const filterRows = (rows, fields) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => fields.some((f) => String(r[f] ?? "").toLowerCase().includes(q)));
  };
  const handleEditInvoice = (invoice) => {
    if (!invoice) return;
    if (isQuotationDoc(invoice)) {
      navigate("/quotation", { state: { editInvoice: invoice } });
      return;
    }
    navigate("/customers/bill", { state: { editInvoice: invoice, editCustomer: invoice?.customer } });
  };
  const paginateRows = (rows) => {
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    const pageSafe   = Math.min(page, totalPages);
    return { paged: rows.slice((pageSafe - 1) * pageSize, pageSafe * pageSize), totalPages, pageSafe, total: rows.length };
  };

  const handleDeleteInvoice  = async (id) => { if (!id || !window.confirm("Delete this invoice?"))  return; try { await deleteInvoice(id);  setInvoices((p)  => p.filter((x) => x._id !== id)); } catch { /**/ } };
  const handleDeleteProduct  = async (id) => { if (!id || !window.confirm("Delete this product?"))  return; try { await deleteProduct(id);  setProducts((p)  => p.filter((x) => x._id !== id)); } catch { /**/ } };
  const handleDeleteCustomer = async (id) => { if (!id || !window.confirm("Delete this customer?")) return; try { await deleteCustomer(id); setCustomers((p) => p.filter((x) => x._id !== id)); } catch { /**/ } };
  const openCustomerEdit     = (customer) => { if (customer) setEditingCustomer({ ...customer }); };
  const handleCustomerSave   = async () => {
    if (!editingCustomer?._id) return;
    setEditingCustomerSaving(true);
    try {
      const { _id, __v, createdAt, updatedAt, ...payload } = editingCustomer;
      const res = await updateCustomer(_id, payload);
      setCustomers((prev) => prev.map((c) => (c._id === _id ? res.data : c)));
      setEditingCustomer(null);
    } finally { setEditingCustomerSaving(false); }
  };

  const handleExport = () => {
    if (activeReport === "sales") {
      const f = filterRows(salesTableRows, ["invoiceNo", "date", "customer", "type", "status"]);
      exportCSV(["Bill No","Date","Customer","Type","Amount","Paid","Due","Status"], f.map((r) => [r.invoiceNo,r.date,r.customer,r.type,r.amount,r.paid,r.due,r.status]), "sales-report.csv");
    } else if (activeReport === "stock") {
      const f = filterRows(stockRows, ["sku", "name", "status"]);
      exportCSV(["SKU","Product","Stock","Value","Status"], f.map((r) => [r.sku,r.name,r.stock,r.value,r.status]), "stock-report.csv");
    } else if (activeReport === "customer") {
      const f = filterRows(customerRows, ["name", "phone"]);
      exportCSV(["Customer","Mobile","Bills","Sales","Outstanding"], f.map((r) => [r.name,r.phone,r.count,r.amount,r.due]), "customer-report.csv");
    } else if (activeReport === "bulk") {
      const f = filterRows(bulkByCustomer, ["name", "type"]);
      exportCSV(["Customer","Type","Total","Avg Discount","Outstanding"], f.map((r) => [r.name,r.type,r.total,`${r.avgDiscount.toFixed(1)}%`,r.due]), "bulk-report.csv");
    }
  };

  /* ── Pagination bar ── */
  const renderPager = ({ total, totalPages, pageSafe }) => {
    const start = total === 0 ? 0 : (pageSafe - 1) * pageSize + 1;
    const end   = Math.min(pageSafe * pageSize, total);
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
      .filter((p) => p === 1 || p === totalPages || (p >= pageSafe - 1 && p <= pageSafe + 1))
      .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push("…"); acc.push(p); return acc; }, []);

    return (
      <Box sx={{ px: 2, py: 1.2, borderTop: `1px solid ${T.border}`, background: T.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
        <Typography sx={{ fontSize: 12, color: T.muted }}>Showing {start}–{end} of {total}</Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {/* Prev */}
          <Box onClick={() => pageSafe > 1 && setPage(pageSafe - 1)}
            sx={{ minWidth: 30, height: 28, px: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, cursor: pageSafe <= 1 ? "default" : "pointer", border: `1px solid ${T.border}`, background: T.surface, color: pageSafe <= 1 ? T.faint : T.muted, opacity: pageSafe <= 1 ? 0.45 : 1, "&:hover": pageSafe > 1 ? { borderColor: T.primary, color: T.primary, background: T.primaryLight } : {}, transition: "all .1s" }}>‹</Box>
          {pages.map((p, i) =>
            p === "…"
              ? <Box key={`e${i}`} sx={{ px: 0.5, fontSize: 12, color: T.faint, display: "inline-flex", alignItems: "center" }}>…</Box>
              : <Box key={p} onClick={() => setPage(p)}
                  sx={{ minWidth: 30, height: 28, px: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: p === pageSafe ? 700 : 500, cursor: "pointer", border: `1px solid ${p === pageSafe ? T.primary : T.border}`, background: p === pageSafe ? T.primary : T.surface, color: p === pageSafe ? "#fff" : T.muted, "&:hover": p !== pageSafe ? { borderColor: T.primary, color: T.primary, background: T.primaryLight } : {}, transition: "all .1s" }}>{p}</Box>
          )}
          {/* Next */}
          <Box onClick={() => pageSafe < totalPages && setPage(pageSafe + 1)}
            sx={{ minWidth: 30, height: 28, px: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, cursor: pageSafe >= totalPages ? "default" : "pointer", border: `1px solid ${T.border}`, background: T.surface, color: pageSafe >= totalPages ? T.faint : T.muted, opacity: pageSafe >= totalPages ? 0.45 : 1, "&:hover": pageSafe < totalPages ? { borderColor: T.primary, color: T.primary, background: T.primaryLight } : {}, transition: "all .1s" }}>›</Box>
        </Box>
      </Box>
    );
  };

  /* ── Metric cards ── */
  const cardsForActive = () => {
    const accent = reportDefs.find((r) => r.key === activeReport)?.color || T.primary;
    if (activeReport === "sales")  return [
      { label: "Total Sales", value: `Rs.${formatCurrency(summary.totalSales)}`, tone: T.success, accent },
      { label: "Total Bills", value: summary.bills,                               tone: T.dark,   accent },
      { label: "Qty Sold",    value: summary.qty,                                 tone: T.dark,   accent },
      { label: "Pending",     value: `Rs.${formatCurrency(summary.totalDue)}`,    tone: T.danger, accent },
    ];
    if (activeReport === "bulk") {
      const avg = bulkRows.length ? bulkRows.reduce((s, r) => s + r.avgItemDiscount, 0) / bulkRows.length : 0;
      return [
        { label: "Bulk Revenue", value: `Rs.${formatCurrency(bulkRows.reduce((s, r) => s + r.metrics.amount, 0))}`, tone: "#6c3fc5", accent },
        { label: "Dealer Bills", value: bulkRows.length,                                                              tone: T.dark,    accent },
        { label: "Bulk Qty",     value: bulkRows.reduce((s, r) => s + r.qty, 0),                                     tone: T.dark,    accent },
        { label: "Avg Discount", value: `${avg.toFixed(1)}%`,                                                        tone: T.success, accent },
      ];
    }
    if (activeReport === "stock") {
      const low = stockRows.filter((r) => r.status !== "OK").length;
      return [
        { label: "Total SKUs",  value: stockRows.length,                                                           tone: T.dark,    accent },
        { label: "Total Stock", value: stockRows.reduce((s, r) => s + r.stock, 0),                                tone: T.dark,    accent },
        { label: "Stock Value", value: `Rs.${formatCurrency(stockRows.reduce((s, r) => s + r.value, 0))}`,        tone: T.primary, accent },
        { label: "Low / Out",   value: low,                                                                        tone: T.danger,  accent },
      ];
    }
    if (activeReport === "pnl") return [
      { label: "Revenue",      value: `Rs.${formatCurrency(pnl.revenue)}`, tone: T.primary,                              accent },
      { label: "COGS",         value: `Rs.${formatCurrency(pnl.cogs)}`,    tone: "#b45309",                              accent },
      { label: "Gross Profit", value: `Rs.${formatCurrency(pnl.gross)}`,   tone: pnl.gross  >= 0 ? T.success : T.danger, accent },
      { label: "Margin",       value: `${pnl.margin.toFixed(1)}%`,         tone: pnl.margin >= 0 ? T.success : T.danger, accent },
    ];
    if (activeReport === "gst") return [
      { label: "Taxable",   value: `Rs.${formatCurrency(gst.taxable)}`,   tone: T.dark,    accent },
      { label: "GST Total", value: `Rs.${formatCurrency(gst.gstTotal)}`,  tone: "#b45309", accent },
      { label: "CGST",      value: `Rs.${formatCurrency(gst.cgst)}`,      tone: T.dark,    accent },
      { label: "SGST",      value: `Rs.${formatCurrency(gst.sgst)}`,      tone: T.dark,    accent },
    ];
    if (activeReport === "supplier") return [
      { label: "Suppliers",           value: customers.length,                                                       tone: T.dark,    accent },
      { label: "Products",            value: products.length,                                                        tone: T.dark,    accent },
      { label: "Invoices",            value: summary.bills,                                                          tone: T.dark,    accent },
      { label: "Total Purchase Est.", value: `Rs.${formatCurrency(stockRows.reduce((s, r) => s + r.value, 0))}`,    tone: T.primary, accent },
    ];
    if (activeReport === "customer") return [
      { label: "Customers",   value: customerRows.length,                        tone: T.dark,    accent },
      { label: "Collected",   value: `Rs.${formatCurrency(summary.totalPaid)}`,  tone: T.success, accent },
      { label: "Outstanding", value: `Rs.${formatCurrency(summary.totalDue)}`,   tone: T.danger,  accent },
      { label: "Bills",       value: summary.bills,                               tone: T.dark,    accent },
    ];
    if (activeReport === "quotation") {
      const qVal  = quotationRows.reduce((s, r) => s + r.metrics.amount, 0);
      const qQty  = quotationRows.reduce((s, r) => s + r.qty, 0);
      return [
        { label: "Quotations",      value: quotationRows.length,            tone: T.dark,    accent },
        { label: "Quotation Value", value: `Rs.${formatCurrency(qVal)}`,    tone: "#7c3aed", accent },
        { label: "Qty (sqft)",      value: qQty,                            tone: T.dark,    accent },
      ];
    }
    const tot = Object.values(collections).reduce((s, n) => s + n, 0);
    return [
      { label: "Cash",          value: `Rs.${formatCurrency(collections.CASH)}`,                      tone: T.dark,    accent },
      { label: "UPI",           value: `Rs.${formatCurrency(collections.UPI)}`,                       tone: T.dark,    accent },
      { label: "Cheque / Card", value: `Rs.${formatCurrency(collections.CHEQUE + collections.CARD)}`, tone: T.dark,    accent },
      { label: "Total",         value: `Rs.${formatCurrency(tot)}`,                                   tone: T.success, accent },
    ];
  };

  /* ── Table / content renderer ── */
  const renderTable = () => {
    if (loading) return <Box sx={{ p: 4, textAlign: "center" }}><Typography sx={{ fontSize: 13, color: T.muted }}>Loading report data…</Typography></Box>;

    /* Sales */
    if (activeReport === "sales") {
      const pager = paginateRows(filterRows(salesTableRows, ["invoiceNo", "date", "customer", "type", "status"]));
      return (<>
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small" sx={{ minWidth: 700 }}>
            <TableHead><TableRow>{["Bill No","Date","Customer","Type","Amount","Paid","Status","Actions"].map((h, i) => <TH key={h} align={i === 4 || i === 5 ? "right" : "left"}>{h}</TH>)}</TableRow></TableHead>
            <TableBody>
              {pager.paged.length === 0
                ? <TableRow><TableCell colSpan={8} align="center" sx={{ py: 5, color: T.faint, fontSize: 13, border: "none" }}>No records found.</TableCell></TableRow>
                : pager.paged.map((r) => (
                  <TableRow key={`${r.invoiceNo}-${r.date}`} sx={{ "&:hover": { background: T.surfaceAlt }, transition: "background .1s" }}>
                    <TD mono>{r.invoiceNo}</TD>
                    <TD>{r.date}</TD>
                    <TD sx={{ fontWeight: 600 }}>{r.customer}</TD>
                    <TD><TypePill label={r.type} /></TD>
                    <TD align="right" sx={{ fontWeight: 700, color: T.dark }}>Rs.{formatCurrency(r.amount)}</TD>
                    <TD align="right" sx={{ fontWeight: 600, color: T.success }}>Rs.{formatCurrency(r.paid)}</TD>
                    <TD>{statusBadge(r.status)}</TD>
                    <TD><Box sx={{ display: "flex", gap: 0.6 }}>
                      <ActionBtn onClick={() => handleEditInvoice(r.invoice)}>Edit</ActionBtn>
                      <ActionBtn danger onClick={() => handleDeleteInvoice(r.invoice?._id)}>Delete</ActionBtn>
                    </Box></TD>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </Box>
        {renderPager(pager)}
      </>);
    }

    /* Bulk */
    if (activeReport === "bulk") {
      const pager = paginateRows(filterRows(bulkByCustomer, ["name", "type"]));
      return (<>
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small" sx={{ minWidth: 600 }}>
            <TableHead><TableRow>{["Customer","Type","Total","Avg Discount","Outstanding","Actions"].map((h, i) => <TH key={h} align={i >= 2 && i <= 4 ? "right" : "left"}>{h}</TH>)}</TableRow></TableHead>
            <TableBody>
              {pager.paged.length === 0
                ? <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5, color: T.faint, fontSize: 13, border: "none" }}>No records found.</TableCell></TableRow>
                : pager.paged.map((r) => (
                  <TableRow key={r.key} sx={{ "&:hover": { background: T.surfaceAlt }, transition: "background .1s" }}>
                    <TD sx={{ fontWeight: 600 }}>{r.name}</TD>
                    <TD><TypePill label={r.type} /></TD>
                    <TD align="right" sx={{ fontWeight: 700, color: T.dark }}>Rs.{formatCurrency(r.total)}</TD>
                    <TD align="right">{r.avgDiscount.toFixed(1)}%</TD>
                    <TD align="right" sx={{ fontWeight: 700, color: r.due > 0 ? T.danger : T.success }}>Rs.{formatCurrency(r.due)}</TD>
                    <TD><Box sx={{ display: "flex", gap: 0.6 }}>
                      <ActionBtn disabled={!r.customer} onClick={() => openCustomerEdit(r.customer)}>Edit</ActionBtn>
                      <ActionBtn danger disabled={!r.customer} onClick={() => handleDeleteCustomer(r.customer?._id)}>Delete</ActionBtn>
                    </Box></TD>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </Box>
        {renderPager(pager)}
      </>);
    }

    /* Stock */
    if (activeReport === "stock") {
      const pager = paginateRows(filterRows(stockRows, ["sku", "name", "status"]));
      return (<>
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small" sx={{ minWidth: 560 }}>
            <TableHead><TableRow>{["SKU","Product","Stock","Value","Status","Actions"].map((h, i) => <TH key={h} align={i === 2 || i === 3 ? "right" : "left"}>{h}</TH>)}</TableRow></TableHead>
            <TableBody>
              {pager.paged.length === 0
                ? <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5, color: T.faint, fontSize: 13, border: "none" }}>No products found.</TableCell></TableRow>
                : pager.paged.map((r) => (
                  <TableRow key={r.sku} sx={{ "&:hover": { background: T.surfaceAlt }, transition: "background .1s" }}>
                    <TD mono>{r.sku}</TD>
                    <TD sx={{ fontWeight: 600 }}>{r.name}</TD>
                    <TD align="right">{r.stock}</TD>
                    <TD align="right" sx={{ fontWeight: 600 }}>Rs.{formatCurrency(r.value)}</TD>
                    <TD>{stockBadge(r.status)}</TD>
                    <TD><Box sx={{ display: "flex", gap: 0.6 }}>
                      <ActionBtn onClick={() => navigate("/products/add", { state: { editProduct: r.product } })}>Edit</ActionBtn>
                      <ActionBtn danger onClick={() => handleDeleteProduct(r.product?._id)}>Delete</ActionBtn>
                    </Box></TD>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </Box>
        {renderPager(pager)}
      </>);
    }

    /* P&L */
    if (activeReport === "pnl") return (
      <Box sx={{ p: 2.5 }}>
        {[
          { label: "Total Revenue",             value: `Rs.${formatCurrency(pnl.revenue)}`, note: "All invoiced sales in period",           color: T.primary },
          { label: "Cost of Goods Sold (COGS)",  value: `Rs.${formatCurrency(pnl.cogs)}`,   note: "Estimated from product cost prices",      color: "#b45309" },
          { label: "Gross Profit",              value: `Rs.${formatCurrency(pnl.gross)}`,   note: "Revenue minus COGS",                      color: pnl.gross  >= 0 ? T.success : T.danger },
          { label: "Gross Margin",              value: `${pnl.margin.toFixed(1)}%`,         note: "Gross Profit / Revenue × 100",            color: pnl.margin >= 0 ? T.success : T.danger },
        ].map((row) => (
          <Box key={row.label} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1.4, borderBottom: `1px solid ${T.borderLight}` }}>
            <Box><Typography sx={{ fontSize: 13.5, fontWeight: 600, color: T.dark }}>{row.label}</Typography><Typography sx={{ fontSize: 11.5, color: T.muted }}>{row.note}</Typography></Box>
            <Typography sx={{ fontSize: 16, fontWeight: 800, color: row.color || T.dark, fontFamily: "'DM Mono', monospace" }}>{row.value}</Typography>
          </Box>
        ))}
      </Box>
    );

    /* GST */
    if (activeReport === "gst") return (
      <Box sx={{ p: 2.5 }}>
        {[
          { label: "Taxable Amount (Base)", value: `Rs.${formatCurrency(gst.taxable)}`,  note: "Invoice total excluding GST" },
          { label: "CGST Collected",        value: `Rs.${formatCurrency(gst.cgst)}`,     note: "Central GST (50% of total GST)" },
          { label: "SGST Collected",        value: `Rs.${formatCurrency(gst.sgst)}`,     note: "State GST (50% of total GST)" },
          { label: "Total GST",             value: `Rs.${formatCurrency(gst.gstTotal)}`, note: "CGST + SGST", color: "#b45309" },
        ].map((row) => (
          <Box key={row.label} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1.4, borderBottom: `1px solid ${T.borderLight}` }}>
            <Box><Typography sx={{ fontSize: 13.5, fontWeight: 600, color: T.dark }}>{row.label}</Typography><Typography sx={{ fontSize: 11.5, color: T.muted }}>{row.note}</Typography></Box>
            <Typography sx={{ fontSize: 16, fontWeight: 800, color: row.color || T.dark, fontFamily: "'DM Mono', monospace" }}>{row.value}</Typography>
          </Box>
        ))}
      </Box>
    );

    /* Collection */
    if (activeReport === "collection") {
      const total = Object.values(collections).reduce((s, n) => s + n, 0);
      return (
        <Box sx={{ p: 2.5 }}>
          {Object.entries(collections).map(([method, amount]) => (
            <Box key={method} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1.3, borderBottom: `1px solid ${T.borderLight}` }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: T.dark, minWidth: 130 }}>{method}</Typography>
                {total > 0 && <>
                  <Box sx={{ height: 6, background: T.primaryLight, border: `1px solid ${T.border}`, width: 160 }}>
                    <Box sx={{ height: "100%", background: T.primary, width: `${Math.round((amount / total) * 100)}%`, transition: "width .3s" }} />
                  </Box>
                  <Typography sx={{ fontSize: 11.5, color: T.muted }}>{Math.round((amount / total) * 100)}%</Typography>
                </>}
              </Box>
              <Typography sx={{ fontSize: 15, fontWeight: 800, color: amount > 0 ? T.success : T.faint, fontFamily: "'DM Mono', monospace" }}>Rs.{formatCurrency(amount)}</Typography>
            </Box>
          ))}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pt: 1.5 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: T.dark }}>Total Collected</Typography>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: T.success, fontFamily: "'DM Mono', monospace" }}>Rs.{formatCurrency(total)}</Typography>
          </Box>
        </Box>
      );
    }

    /* Supplier */
    if (activeReport === "supplier") {
      const pager = paginateRows(filterRows(stockRows, ["sku", "name"]));
      return (<>
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small" sx={{ minWidth: 500 }}>
            <TableHead><TableRow>{["SKU","Product","Stock","Cost Value","Status"].map((h, i) => <TH key={h} align={i === 2 || i === 3 ? "right" : "left"}>{h}</TH>)}</TableRow></TableHead>
            <TableBody>
              {pager.paged.length === 0
                ? <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5, color: T.faint, fontSize: 13, border: "none" }}>No products found.</TableCell></TableRow>
                : pager.paged.map((r) => (
                  <TableRow key={r.sku} sx={{ "&:hover": { background: T.surfaceAlt }, transition: "background .1s" }}>
                    <TD mono>{r.sku}</TD>
                    <TD sx={{ fontWeight: 600 }}>{r.name}</TD>
                    <TD align="right">{r.stock}</TD>
                    <TD align="right" sx={{ fontWeight: 600 }}>Rs.{formatCurrency(r.value)}</TD>
                    <TD>{stockBadge(r.status)}</TD>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </Box>
        {renderPager(pager)}
      </>);
    }

    /* Customer */
    if (activeReport === "customer") {
      const pager = paginateRows(filterRows(customerRows, ["name", "phone"]));
      return (<>
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small" sx={{ minWidth: 600 }}>
            <TableHead><TableRow>{["Customer","Mobile","Bills","Sales","Outstanding","Actions"].map((h, i) => <TH key={h} align={i >= 2 && i <= 4 ? "right" : "left"}>{h}</TH>)}</TableRow></TableHead>
            <TableBody>
              {pager.paged.length === 0
                ? <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5, color: T.faint, fontSize: 13, border: "none" }}>No customers found.</TableCell></TableRow>
                : pager.paged.map((r) => (
                  <TableRow key={r.key} sx={{ "&:hover": { background: T.surfaceAlt }, transition: "background .1s" }}>
                    <TD sx={{ fontWeight: 600 }}>{r.name}</TD>
                    <TD sx={{ color: T.muted }}>{r.phone}</TD>
                    <TD align="right">{r.count}</TD>
                    <TD align="right" sx={{ fontWeight: 700, color: T.dark }}>Rs.{formatCurrency(r.amount)}</TD>
                    <TD align="right" sx={{ fontWeight: 700, color: r.due > 0 ? T.danger : T.success }}>Rs.{formatCurrency(r.due)}</TD>
                    <TD><Box sx={{ display: "flex", gap: 0.6 }}>
                      <ActionBtn disabled={!r.customer} onClick={() => openCustomerEdit(r.customer)}>Edit</ActionBtn>
                      <ActionBtn danger disabled={!r.customer} onClick={() => handleDeleteCustomer(r.customer?._id)}>Delete</ActionBtn>
                    </Box></TD>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </Box>
        {renderPager(pager)}
      </>);
    }

    /* Quotation */
    if (activeReport === "quotation") {
      const rows  = quotationRows.slice().sort((a, b) => b.date - a.date).map((r) => ({ invoice: r.invoice, invoiceNo: r.invoice?.invoiceNo || "-", date: r.date.toLocaleDateString("en-GB"), customer: r.invoice?.customer?.name || "-", type: r.type, amount: r.metrics.amount }));
      const pager = paginateRows(filterRows(rows, ["invoiceNo", "date", "customer", "type"]));
      return (<>
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small" sx={{ minWidth: 560 }}>
            <TableHead><TableRow>{["Quotation No","Date","Customer","Type","Amount","Actions"].map((h, i) => <TH key={h} align={i === 4 ? "right" : "left"}>{h}</TH>)}</TableRow></TableHead>
            <TableBody>
              {pager.paged.length === 0
                ? <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5, color: T.faint, fontSize: 13, border: "none" }}>No quotations found.</TableCell></TableRow>
                : pager.paged.map((r) => (
                  <TableRow key={`${r.invoiceNo}-${r.date}`} sx={{ "&:hover": { background: T.surfaceAlt }, transition: "background .1s" }}>
                    <TD mono>{r.invoiceNo}</TD>
                    <TD>{r.date}</TD>
                    <TD sx={{ fontWeight: 600 }}>{r.customer}</TD>
                    <TD><TypePill label={r.type} /></TD>
                    <TD align="right" sx={{ fontWeight: 700, color: T.dark }}>Rs.{formatCurrency(r.amount)}</TD>
                    <TD><Box sx={{ display: "flex", gap: 0.6 }}>
                      <ActionBtn onClick={() => handleEditInvoice(r.invoice)}>Edit</ActionBtn>
                      <ActionBtn danger onClick={() => handleDeleteInvoice(r.invoice?._id)}>Delete</ActionBtn>
                    </Box></TD>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </Box>
        {renderPager(pager)}
      </>);
    }

    return null;
  };

  const activeReportDef = reportDefs.find((r) => r.key === activeReport);

  /* ── Render ── */
  return (
    <Box sx={{ p: 0, background: T.bg, minHeight: "100%", fontFamily: "'Noto Sans', sans-serif" }}>

      <Box sx={{ px: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>

        {/* Report type selector */}
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 1 }}>
          {reportDefs.map((r) => {
            const isActive = activeReport === r.key;
            return (
              <Box key={r.key} onClick={() => setActiveReport(r.key)}
                sx={{ p: 1.6, background: T.surface, border: `1px solid ${isActive ? r.color : T.border}`, borderTop: `3px solid ${isActive ? r.color : T.border}`, cursor: "pointer", boxShadow: isActive ? "0 4px 16px rgba(0,0,0,.08)" : "none", "&:hover": { borderColor: r.color, borderTopColor: r.color }, transition: "all .13s" }}>
                <Box sx={{ width: 34, height: 34, background: isActive ? r.color : T.bg, color: isActive ? "#fff" : r.color, display: "flex", alignItems: "center", justifyContent: "center", mb: 1, transition: "all .13s" }}>
                  {r.icon}
                </Box>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: isActive ? r.color : T.dark }}>{r.label}</Typography>
                <Typography sx={{ fontSize: 11.5, color: T.muted, mt: 0.3 }}>{r.hint}</Typography>
              </Box>
            );
          })}
        </Box>

        {/* Active report panel */}
        <Box sx={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: "0 1px 3px rgba(15,23,42,.06)", overflow: "hidden", mb: 2.5 }}>

          {/* Panel header */}
          <Box sx={{ px: 2.5, py: 1.5, borderBottom: `2px solid ${activeReportDef?.color || T.primary}`, background: `linear-gradient(to right, ${T.primaryLight}, ${T.surface})`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ color: activeReportDef?.color || T.primary }}>{activeReportDef?.icon}</Box>
              <Typography sx={{ fontSize: 14, fontWeight: 800, color: T.dark }}>{activeReportDef?.label}</Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
              {/* Search */}
              <TextField size="small" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search…" sx={{ minWidth: 180, ...inputSx }}
                InputProps={{ startAdornment: <Box component="span" sx={{ mr: 0.8, color: T.faint, display: "flex" }}><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6.5" cy="6.5" r="4.5" /><path d="M10.5 10.5L14 14" strokeLinecap="round" /></svg></Box> }}
              />
              {/* Rows per page */}
              <TextField select size="small" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} sx={{ minWidth: 110, ...inputSx }}>
                {ROWS_PER_PAGE_OPTIONS.map((n) => <MenuItem key={n} value={n}>{n} / page</MenuItem>)}
              </TextField>
              {/* Period */}
              <TextField select size="small" value={period} onChange={(e) => setPeriod(e.target.value)} sx={{ minWidth: 140, ...inputSx }}>
                {periodOptions.map((opt) => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
              </TextField>
              {/* Export CSV */}
              {["sales","bulk","stock","customer"].includes(activeReport) && (
                <Box onClick={handleExport} sx={{ display: "inline-flex", alignItems: "center", gap: "5px", px: 1.8, py: "8px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", userSelect: "none", border: `1px solid ${T.border}`, background: T.surface, color: T.primary, "&:hover": { background: T.primaryLight, borderColor: T.primary }, transition: "all .12s" }}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2v8M5 7l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" /><path d="M2 12h12" strokeLinecap="round" /></svg>
                  Export CSV
                </Box>
              )}
            </Box>
          </Box>

          {/* Metric cards */}
          <Box sx={{ p: 2, borderBottom: `1px solid ${T.border}` }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", lg: "repeat(4, 1fr)" }, gap: 1.2 }}>
              {cardsForActive().map((c) => <MetricCard key={c.label} label={c.label} value={loading ? "—" : c.value} tone={c.tone} accent={c.accent} />)}
            </Box>
          </Box>

          {/* Table / content */}
          <Box>{renderTable()}</Box>
        </Box>
      </Box>

      {/* Edit customer dialog */}
      <Dialog open={!!editingCustomer} onClose={() => setEditingCustomer(null)} fullWidth maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 0, boxShadow: "0 24px 64px rgba(0,0,0,.16)" } }}>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 800, color: T.dark, borderBottom: `2px solid ${T.primary}`, background: T.primaryLight }}>
          Edit Customer
        </DialogTitle>
        <DialogContent sx={{ pt: "16px !important" }}>
          {editingCustomer && (
            <Box sx={{ display: "grid", gap: 1.4 }}>
              <TextField size="small" label="Customer Name" value={editingCustomer.name    || ""} onChange={(e) => setEditingCustomer((p) => ({ ...p, name:         e.target.value }))} sx={inputSx} />
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.4 }}>
                <TextField size="small" label="Mobile" value={editingCustomer.phone || ""} onChange={(e) => setEditingCustomer((p) => ({ ...p, phone: e.target.value }))} sx={inputSx} />
                <TextField size="small" label="City"   value={editingCustomer.city  || ""} onChange={(e) => setEditingCustomer((p) => ({ ...p, city:  e.target.value }))} sx={inputSx} />
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.4 }}>
                <TextField size="small" label="GSTIN"         value={editingCustomer.gstin        || ""} onChange={(e) => setEditingCustomer((p) => ({ ...p, gstin:        e.target.value }))} sx={inputSx} />
                <TextField size="small" label="Payment Terms" value={editingCustomer.paymentTerms || ""} onChange={(e) => setEditingCustomer((p) => ({ ...p, paymentTerms: e.target.value }))} sx={inputSx} />
              </Box>
              <TextField size="small" label="Address" value={editingCustomer.address || ""} onChange={(e) => setEditingCustomer((p) => ({ ...p, address: e.target.value }))} sx={inputSx} />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 1.8, borderTop: `1px solid ${T.border}`, gap: 1 }}>
          <Box onClick={() => setEditingCustomer(null)} sx={{ px: 2, py: "8px", fontSize: 13, fontWeight: 600, cursor: "pointer", border: `1px solid ${T.border}`, color: T.muted, "&:hover": { borderColor: T.primary, color: T.primary } }}>Cancel</Box>
          <Box onClick={handleCustomerSave} sx={{ px: 2, py: "8px", fontSize: 13, fontWeight: 700, cursor: editingCustomerSaving ? "default" : "pointer", background: editingCustomerSaving ? "#e2e8f0" : T.primary, color: editingCustomerSaving ? T.faint : "#fff", opacity: editingCustomerSaving ? 0.7 : 1 }}>
            {editingCustomerSaving ? "Saving…" : "Save Changes"}
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Reports;
