import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import {
  Autocomplete,
  Box,
  Checkbox,
  Dialog,
  DialogContent,
  MenuItem,
  ListItemText,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import toast from "react-hot-toast";
import { getInvoices, updateInvoice } from "../../services/invoiceService";
import { saveCustomer } from "../../services/customerService";
import { formatCurrency, getInvoicePaymentMetrics } from "../../utils/invoiceMetrics";
import { useLocation, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import InvoicePrint from "../billing/InvoicePrint";

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
};

/* ── Input style ── */
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

/* ── Field label ── */
const Lbl = ({ children, required }) => (
  <Typography sx={{ mb: "5px", fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".07em", display: "block" }}>
    {children}{required && <Box component="span" sx={{ color: T.danger }}> *</Box>}
  </Typography>
);

/* ── Status badge ── */
const StatusBadge = ({ status }) => {
  const cfg =
    status === "Paid"    ? { color: T.success, bg: T.successLight, border: "#bbf7d0" } :
    status === "Partial" ? { color: T.warning, bg: T.warningLight, border: "#fde68a" } :
                           { color: T.danger,  bg: T.dangerLight,  border: "#fecaca" };
  return (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", px: 1, py: "2px", fontSize: 10, fontWeight: 700, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, ml: 0.5 }}>
      {status}
    </Box>
  );
};

/* ── Action button ── */
const Btn = ({ children, onClick, disabled, bg, outlined, color }) => (
  <Box
    onClick={!disabled ? onClick : undefined}
    sx={{
      display: "inline-flex", alignItems: "center", gap: "6px",
      px: 2.2, py: "9px",
      fontSize: 13, fontWeight: 700,
      cursor: disabled ? "default" : "pointer",
      userSelect: "none",
      border: outlined ? `1.5px solid ${T.border}` : "none",
      background: disabled ? "#e2e8f0" : (outlined ? "transparent" : (bg || T.primary)),
      color: disabled ? T.faint : (outlined ? (color || T.primary) : "#fff"),
      boxShadow: (!disabled && !outlined) ? "0 2px 8px rgba(26,86,160,.18)" : "none",
      opacity: disabled ? 0.7 : 1,
      "&:hover": !disabled ? { filter: "brightness(1.07)", borderColor: outlined ? T.primary : undefined } : {},
      transition: "all .14s",
    }}>
    {children}
  </Box>
);

/* ── Inline table action button ── */
const TblBtn = ({ children, onClick, variant = "outline", icon }) => {
  const styles = {
    outline:  { bg: T.surface,       color: T.primary,  border: `1px solid ${T.border}`,   hover: { bg: T.primaryLight, border: T.primary } },
    primary:  { bg: T.primary,       color: "#fff",     border: "none",                     hover: { bg: T.primaryDark } },
    whatsapp: { bg: "#22c55e",       color: "#fff",     border: "none",                     hover: { bg: "#16a34a" } },
  };
  const s = styles[variant] || styles.outline;
  return (
    <Box
      onClick={e => { e.stopPropagation(); onClick?.(); }}
      sx={{
        display: "inline-flex", alignItems: "center", gap: "4px",
        px: 1.4, py: "5px", fontSize: 12, fontWeight: 700,
        cursor: "pointer", userSelect: "none",
        background: s.bg, color: s.color, border: s.border || "none",
        transition: "all .12s",
        "&:hover": { background: s.hover.bg, ...(s.hover.border ? { borderColor: s.hover.border } : {}) },
      }}
    >
      {icon && <Box component="span" sx={{ display: "flex", alignItems: "center" }}>{icon}</Box>}
      {children}
    </Box>
  );
};

/* ── SVG icons ── */
const IconPay  = () => <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="4" width="14" height="10"/><path d="M1 8h14"/><path d="M4 12h2"/></svg>;
const IconSend = () => <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2L9 7M14 2H10M14 2V6" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1V9" strokeLinecap="round"/></svg>;

/* ── Helpers ── */
const paymentModes = ["Cash", "UPI", "Card", "Bank Transfer", "Cheque"];

const normPhone = (v) => String(v || "").replace(/\D/g, "");

/**
 * Normalise any phone string to a dialable WhatsApp number.
 * Returns null if the result looks invalid.
 */
const toWhatsAppPhone = (raw) => {
  const digits = normPhone(raw);
  if (!digits) return null;
  // Already has country code (91 + 10 digits = 12, or starts with +91)
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length === 13 && digits.startsWith("091")) return digits.slice(1);
  // 10-digit Indian number
  if (digits.length === 10) return `91${digits}`;
  // Already long enough — trust it
  if (digits.length > 10) return digits;
  return null;
};

const openWhatsAppChat = (phone, message) => {
  const isMobile = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent || "");
  const url = isMobile
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
};

const ROWS_PER_PAGE = 8;

const simulateInvoicePayment = (invoices = [], received = 0) => {
  let balance = Math.max(0, Number(received) || 0);
  const pendingInvoices = invoices
    .map((inv) => ({ inv, metrics: getInvoicePaymentMetrics(inv) }))
    .filter((row) => row.metrics.dueAmount > 0)
    .sort((a, b) => new Date(a.inv.createdAt || 0) - new Date(b.inv.createdAt || 0));

  const invoiceMap = new Map();
  let lastUpdatedInvoice = null;

  for (const row of pendingInvoices) {
    const payNow     = balance > 0 ? Math.min(balance, row.metrics.dueAmount) : 0;
    const paidAmount = Number(row.metrics.paidAmount || 0) + payNow;
    const dueAmount  = Math.max(0, Number(row.metrics.dueAmount || 0) - payNow);
    const status     = dueAmount <= 0 ? "Paid" : paidAmount > 0 ? "Partial" : "Pending";
    const previewInvoice = {
      ...row.inv,
      status,
      payment: {
        ...(row.inv.payment || {}),
        amount: row.metrics.amount,
        paidAmount,
        dueAmount,
      },
    };

    invoiceMap.set(String(row.inv._id || ""), {
      ...row.metrics,
      paidNow: payNow,
      paidAmount,
      dueAmount,
      status,
      previewInvoice,
    });

    if (payNow > 0) lastUpdatedInvoice = previewInvoice;
    balance -= payNow;
  }

  return { invoiceMap, lastUpdatedInvoice };
};

/* ═══════════════════════════════════════════════════════ */
const CustomerPayments = () => {
  const location = useLocation();
  const navigate = useNavigate();

  /* ── Prefill refs ── */
  const prefillCustomerRef = useRef(location.state?.prefillCustomer || {});
  const prefillInvoiceRef  = useRef(location.state?.prefillInvoice  || {});
  const hasPrefillRef      = useRef(Boolean(
    location.state?.fromPayAction ||
    location.state?.fromMoveToPayment ||
    location.state?.prefillCustomer ||
    location.state?.prefillInvoice
  ));
  const hasPrefill = hasPrefillRef.current;

  /* ── Form state ── */
  const [invoices,           setInvoices]           = useState([]);
  const [loading,            setLoading]            = useState(false);
  const [selectedKey,        setSelectedKey]        = useState("");
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);
  const [receiptDate,        setReceiptDate]        = useState(new Date().toISOString().slice(0, 10));
  const [amountReceived,     setAmountReceived]     = useState("");
  const [paymentMode,        setPaymentMode]        = useState("Cash");
  const [transactionRef,     setTransactionRef]     = useState("");
  const [remarks,            setRemarks]            = useState("");
  const [previewOpen,        setPreviewOpen]        = useState(false);
  const [previewData,        setPreviewData]        = useState(null);
  const [previewInvoice,     setPreviewInvoice]     = useState(null);

  /* ── Pending list state ── */
  const [searchQuery,    setSearchQuery]    = useState("");
  const [currentPage,    setCurrentPage]    = useState(1);
  const [expandedRowKey, setExpandedRowKey] = useState(null);
  const [showPendingCollections, setShowPendingCollections] = useState(() => !hasPrefill);

  const previewRef  = useRef(null);
  const formTopRef  = useRef(null);

  /* ── Data fetch ── */
  const fetchInvoices = async () => {
    try {
      const res = await getInvoices();
      setInvoices(Array.isArray(res.data) ? res.data : []);
    } catch { toast.error("Failed to load invoices"); }
  };

  useEffect(() => {
    if (hasPrefill) navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { fetchInvoices(); }, []);
  useEffect(() => {
    if (!hasPrefill || !prefillInvoiceRef.current?.id) return;
    const timer = setTimeout(() => fetchInvoices(), 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Buckets ── */
  const allBuckets = useMemo(() => {
    const map = new Map();
    invoices.forEach((invoice) => {
      const customer = invoice?.customer || {};
      const key = `${customer.name || "Unknown"}|${customer.phone || ""}`;
      if (!map.has(key)) map.set(key, { key, customer, invoices: [], due: 0 });
      const bucket  = map.get(key);
      const metrics = getInvoicePaymentMetrics(invoice);
      bucket.invoices.push(invoice);
      bucket.due += Number(metrics.dueAmount || 0);
    });
    return Array.from(map.values()).sort((a, b) => b.due - a.due);
  }, [invoices]);

  const buckets = useMemo(() => allBuckets.filter((e) => e.due > 0), [allBuckets]);

  /* ── Filtered & paginated pending list ── */
  const filteredBuckets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return buckets;
    return buckets.filter((e) =>
      (e.customer?.name || "").toLowerCase().includes(q) ||
      normPhone(e.customer?.phone).includes(q.replace(/\D/g, "")) ||
      (e.customer?.phone || "").includes(q)
    );
  }, [buckets, searchQuery]);

  const totalPages   = Math.max(1, Math.ceil(filteredBuckets.length / ROWS_PER_PAGE));
  const pagedBuckets = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredBuckets.slice(start, start + ROWS_PER_PAGE);
  }, [filteredBuckets, currentPage]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
    setExpandedRowKey(null);
  };

  /* ── Prefill logic ── */
  const customerPrefillDoneRef = useRef(false);
  const invoicePrefillDoneRef  = useRef(false);
  const amountPrefillDoneRef   = useRef(false);
  const skipNextResetRef       = useRef(false);

  useEffect(() => {
    if (!hasPrefill || allBuckets.length === 0) return;
    const pInvoice  = prefillInvoiceRef.current;
    const pCustomer = prefillCustomerRef.current;
    if ((pInvoice?.id || pInvoice?.invoiceNo) && !invoicePrefillDoneRef.current) {
      const invoiceBucket = allBuckets.find((e) =>
        e.invoices?.some((inv) =>
          String(inv._id || "") === String(pInvoice.id || "") ||
          String(inv.invoiceNo || "").trim().toLowerCase() === String(pInvoice.invoiceNo || "").trim().toLowerCase()
        )
      );
      if (invoiceBucket) {
        customerPrefillDoneRef.current = true;
        skipNextResetRef.current = true;
        setSelectedKey(invoiceBucket.key);
        return;
      }
    }
    if (!customerPrefillDoneRef.current && pCustomer?.name) {
      const prefilled = allBuckets.find((e) =>
        (e.customer?.name || "").trim().toLowerCase() === pCustomer.name.trim().toLowerCase() &&
        (pCustomer.phone ? normPhone(e.customer?.phone) === normPhone(pCustomer.phone) : true)
      );
      if (prefilled) {
        customerPrefillDoneRef.current = true;
        if (!pInvoice?.id) invoicePrefillDoneRef.current = true;
        skipNextResetRef.current = true;
        setSelectedKey(prefilled.key);
      }
    }
  }, [allBuckets, hasPrefill]);

  const selectedBucket = useMemo(() => allBuckets.find((e) => e.key === selectedKey) || null, [allBuckets, selectedKey]);

  useEffect(() => {
    if (!hasPrefill || invoicePrefillDoneRef.current || !selectedBucket) return;
    const pInvoice = prefillInvoiceRef.current;
    if (!pInvoice?.id && !pInvoice?.invoiceNo) { invoicePrefillDoneRef.current = true; return; }
    const match = selectedBucket.invoices?.find((inv) =>
      String(inv._id || "") === String(pInvoice.id || "") ||
      String(inv.invoiceNo || "").trim().toLowerCase() === String(pInvoice.invoiceNo || "").trim().toLowerCase()
    );
    if (match?._id) {
      invoicePrefillDoneRef.current = true;
      setSelectedInvoiceIds([String(match._id)]);
    }
  }, [selectedBucket, hasPrefill]);

  useEffect(() => {
    if (!customerPrefillDoneRef.current || !invoicePrefillDoneRef.current) return;
    if (skipNextResetRef.current) { skipNextResetRef.current = false; return; }
    setAmountReceived(""); setSelectedInvoiceIds([]);
  }, [selectedKey]);

  /* ── Derived form values ── */
  const selectedInvoices = useMemo(() => {
    if (!selectedBucket || selectedInvoiceIds.length === 0) return [];
    const idSet = new Set(selectedInvoiceIds);
    return selectedBucket.invoices?.filter((inv) => idSet.has(inv._id)) || [];
  }, [selectedBucket, selectedInvoiceIds]);

  const allSelectedArePaid = useMemo(() => {
    if (selectedInvoiceIds.length === 0) return false;
    return selectedInvoices.every((inv) => getInvoicePaymentMetrics(inv).dueAmount <= 0);
  }, [selectedInvoices, selectedInvoiceIds]);

  const invoiceOptions = useMemo(() => {
    if (!selectedBucket) return [];
    return selectedBucket.invoices.slice()
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .map((inv) => {
        const m      = getInvoicePaymentMetrics(inv);
        const isPaid = m.dueAmount <= 0;
        const status = isPaid ? "Paid" : Number(m.paidAmount || 0) > 0 ? "Partial" : "Pending";
        return {
          id: inv._id, invoiceNo: inv.invoiceNo || "INV",
          label: isPaid
            ? `${inv.invoiceNo || "INV"} | Due: ₹0  (Paid)`
            : `${inv.invoiceNo || "INV"} | Due: ₹${formatCurrency(m.dueAmount)} | ${status}`,
          isPaid, status, dueAmount: m.dueAmount, amount: m.amount,
        };
      });
  }, [selectedBucket]);

  const outstanding                 = Number(selectedBucket?.due || 0);
  const selectedInvoicesOutstanding = selectedInvoices.reduce(
    (sum, inv) => sum + Number(getInvoicePaymentMetrics(inv).dueAmount || 0), 0
  );
  const payableOutstanding  = selectedInvoices.length > 0 ? selectedInvoicesOutstanding : outstanding;
  const receiptNo           = useMemo(() => `RCP-${String(Date.now()).slice(-4)}`, []);
  const liveReceivedAmount  = Number(amountReceived) || 0;
  const invoicesForLivePreview = selectedInvoices.length > 0 ? selectedInvoices : selectedBucket?.invoices || [];

  const paymentSimulation = useMemo(
    () => simulateInvoicePayment(invoicesForLivePreview, liveReceivedAmount),
    [invoicesForLivePreview, liveReceivedAmount]
  );

  const remainingOutstanding = Math.max(0, payableOutstanding - liveReceivedAmount);

  useEffect(() => {
    if (!hasPrefill || amountPrefillDoneRef.current) return;
    if (!customerPrefillDoneRef.current || !invoicePrefillDoneRef.current) return;
    const pInvoice = prefillInvoiceRef.current || {};
    const rawDue   = Number(pInvoice.dueAmount);
    const due      = Number.isFinite(rawDue) ? rawDue : payableOutstanding;
    const next     = Math.max(0, Math.min(Number(due) || 0, payableOutstanding));
    setAmountReceived(next > 0 ? String(next) : "");
    amountPrefillDoneRef.current = true;
  }, [hasPrefill, payableOutstanding]);

  useEffect(() => {
    if (amountReceived === "") return;
    const current = Number(amountReceived) || 0;
    const clamped = Math.max(0, Math.min(current, payableOutstanding));
    if (clamped !== current) setAmountReceived(String(clamped));
  }, [payableOutstanding, amountReceived]);

  /* ── Form handlers ── */
  const handleAmountChange = (value) => {
    if (allSelectedArePaid) { toast.error("This invoice is already paid. No amount due.", { id: "paid-invoice-warn", icon: "🚫" }); return; }
    if (value === "") { setAmountReceived(""); return; }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    setAmountReceived(String(Math.max(0, Math.min(parsed, payableOutstanding))));
  };

  const handleQuick = (val) => {
    if (allSelectedArePaid) { toast.error("This invoice is already paid. No amount due.", { id: "paid-invoice-warn", icon: "🚫" }); return; }
    setAmountReceived(String(Math.min(payableOutstanding, val)));
  };

  const handleInvoiceSelection = (value) => {
    if (!Array.isArray(value)) { setSelectedInvoiceIds([]); return; }
    if (value.includes("__ALL__")) { setSelectedInvoiceIds([]); setAmountReceived(""); return; }
    setSelectedInvoiceIds(value);
    const selectedOpts = invoiceOptions.filter((o) => value.includes(o.id));
    if (selectedOpts.length > 0 && selectedOpts.every((o) => o.isPaid)) {
      toast.error("Selected invoice(s) are already fully paid.", { id: "paid-invoice-warn", icon: "🚫" });
      setAmountReceived("");
    }
  };

  const againstInvoices = useMemo(() => {
    if (!selectedBucket) return "";
    const list = selectedInvoices.length > 0 ? selectedInvoices : selectedBucket.invoices;
    return list.slice()
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .map((inv) => {
        const m = getInvoicePaymentMetrics(inv);
        const s = m.dueAmount <= 0 ? "Paid" : Number(m.paidAmount || 0) > 0 ? "Partial" : "Pending";
        return `${inv.invoiceNo || "INV"} | Due: ₹${formatCurrency(m.dueAmount)} | ${s}`;
      }).join("\n");
  }, [selectedBucket, selectedInvoices]);

  /* ── Pay from table row ── */
  const handlePayFromRow = (entry) => {
    const topInvoice = entry.invoices
      .map(inv => ({ inv, due: Number(getInvoicePaymentMetrics(inv).dueAmount || 0) }))
      .filter(r => r.due > 0)
      .sort((a, b) => b.due - a.due)[0]?.inv || null;

    skipNextResetRef.current = true;
    setSelectedKey(entry.key);
    setSelectedInvoiceIds(topInvoice ? [String(topInvoice._id)] : []);
    setAmountReceived("");
    setExpandedRowKey(null);

    setTimeout(() => {
      formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  /* ── WhatsApp from row ── */
  const handleSendInvoiceFromRow = (entry) => {
    const phone = toWhatsAppPhone(entry.customer?.phone || "");
    if (!phone) { toast.error("No valid phone number for this customer"); return; }
    const pendingCount = entry.invoices.filter(inv => getInvoicePaymentMetrics(inv).dueAmount > 0).length;
    const msg = [
      `Hello ${entry.customer?.name || "Customer"},`,
      `You have ${pendingCount} pending bill(s) with a total due of Rs.${formatCurrency(entry.due)}.`,
      "Please contact us to clear the outstanding amount.",
    ].join("\n");
    openWhatsAppChat(phone, msg);
  };

  /* ── Save payment ── */
  const applyPayment = async () => {
    if (!selectedBucket) { toast.error("Select customer"); return null; }
    if (allSelectedArePaid) { toast.error("Selected invoice(s) are already fully paid.", { id: "paid-invoice-warn", icon: "🚫" }); return null; }
    const received = Number(amountReceived) || 0;
    if (received <= 0) { toast.error("Enter valid received amount"); return null; }
    if (received > payableOutstanding) { toast.error("Received amount cannot exceed selected outstanding"); return null; }
    setLoading(true);
    try {
      const beforeOutstanding = payableOutstanding;
      let balance = received;
      const baseInvoices = selectedInvoices.length > 0 ? selectedInvoices : selectedBucket.invoices;
      const updatedInvoices = [];
      const pendingInvoices = baseInvoices
        .map((inv) => ({ inv, metrics: getInvoicePaymentMetrics(inv) }))
        .filter((row) => row.metrics.dueAmount > 0)
        .sort((a, b) => new Date(a.inv.createdAt || 0) - new Date(b.inv.createdAt || 0));
      for (const row of pendingInvoices) {
        if (balance <= 0) break;
        const simulated  = paymentSimulation.invoiceMap.get(String(row.inv._id || ""));
        const payNow     = Math.min(balance, row.metrics.dueAmount);
        const paidAmount = simulated?.paidAmount ?? (Number(row.metrics.paidAmount || 0) + payNow);
        const dueAmount  = simulated?.dueAmount  ?? Math.max(0, Number(row.metrics.dueAmount || 0) - payNow);
        const status     = simulated?.status     ?? (dueAmount <= 0 ? "Paid" : paidAmount > 0 ? "Partial" : "Pending");
        const updateRes  = await updateInvoice(row.inv._id, {
          status,
          payment: { ...(row.inv.payment || {}), amount: row.metrics.amount, method: paymentMode === "Cash" ? "CASH" : paymentMode, paidAmount, dueAmount, paymentType: dueAmount <= 0 ? "Full Payment" : "Partial", referenceNo: transactionRef },
          notes: remarks || row.inv.notes || "",
        });
        updatedInvoices.push(updateRes?.data || { ...row.inv, status });
        balance -= payNow;
      }
      await saveCustomer({ ...(selectedBucket.customer || {}), amount: 0, status: received >= payableOutstanding ? "Paid" : "Partial", method: paymentMode === "Cash" ? "CASH" : paymentMode });
      const payload = {
        receiptNo, date: receiptDate,
        customerName: selectedBucket.customer?.name || "", customerPhone: selectedBucket.customer?.phone || "",
        mode: paymentMode, received, outstandingBefore: beforeOutstanding, outstandingAfter: Math.max(0, beforeOutstanding - received),
        transactionRef, remarks, againstInvoices, invoicePreviewData: updatedInvoices[updatedInvoices.length - 1] || null,
      };
      toast.success("Payment saved");
      setAmountReceived(""); setTransactionRef(""); setRemarks("");
      await fetchInvoices();
      return payload;
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to save payment");
      return null;
    } finally { setLoading(false); }
  };

  /* ─────────────────────────────────────────────────────
   * FIX 1: buildPreviewInvoice and buildPreviewPayload now
   * accept explicit `received` and `invoiceList` args so
   * they ALWAYS use the current form values — no stale
   * closure over state.
   * ───────────────────────────────────────────────────── */
  const buildPreviewInvoice = useCallback((received, invoiceList) => {
    if (!selectedBucket) return null;
    const baseInvoices = (invoiceList && invoiceList.length > 0)
      ? invoiceList
      : (selectedInvoices.length > 0 ? selectedInvoices : selectedBucket.invoices || []);
    if (baseInvoices.length === 0) return null;
    const simulation    = simulateInvoicePayment(baseInvoices, received);
    const previewInv    = simulation.lastUpdatedInvoice || baseInvoices[0] || null;
    if (!previewInv) return null;
    return {
      ...previewInv,
      payment: {
        ...(previewInv.payment || {}),
        method:      paymentMode === "Cash" ? "CASH" : paymentMode,
        paymentType: Number(previewInv.payment?.dueAmount || 0) <= 0 ? "Full Payment" : "Partial",
        referenceNo: transactionRef,
      },
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBucket, selectedInvoices, paymentMode, transactionRef]);

  const buildPreviewPayload = useCallback(({ silent = false, receivedOverride, invoiceListOverride } = {}) => {
    if (!selectedBucket) { if (!silent) toast.error("Select customer"); return null; }
    if (allSelectedArePaid) { if (!silent) toast.error("Selected invoice(s) are already fully paid.", { id: "paid-invoice-warn", icon: "🚫" }); return null; }

    // ← FIX: use the override if provided (so Generate Invoice always passes current values)
    const received = receivedOverride !== undefined ? receivedOverride : (Number(amountReceived) || 0);
    if (received <= 0) { if (!silent) toast.error("Enter valid received amount"); return null; }
    if (received > payableOutstanding) { if (!silent) toast.error("Received amount cannot exceed selected outstanding"); return null; }

    const previewInv = buildPreviewInvoice(received, invoiceListOverride);
    return {
      receiptNo, date: receiptDate,
      customerName: selectedBucket.customer?.name || "", customerPhone: selectedBucket.customer?.phone || "",
      mode: paymentMode, received,
      outstandingBefore: payableOutstanding,
      outstandingAfter:  Math.max(0, payableOutstanding - received),
      transactionRef, remarks, againstInvoices,
      invoicePreviewData: previewInv,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBucket, allSelectedArePaid, amountReceived, payableOutstanding, buildPreviewInvoice,
      receiptNo, receiptDate, paymentMode, transactionRef, remarks, againstInvoices]);

  /* ── Keep preview in sync when dialog is open and form values change ── */
  useEffect(() => {
    if (!previewOpen) return;
    const payload = buildPreviewPayload({ silent: true });
    if (!payload) return;
    setPreviewData(payload);
    setPreviewInvoice(payload.invoicePreviewData || null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewOpen, amountReceived, selectedInvoiceIds, selectedKey, paymentMode, transactionRef, remarks, receiptDate]);

  const handleSave = async () => {
    const payload = await applyPayment();
    if (!payload) return;
    setSelectedKey(""); setSelectedInvoiceIds([]); setAmountReceived("");
    setPaymentMode("Cash"); setTransactionRef(""); setRemarks("");
    setReceiptDate(new Date().toISOString().slice(0, 10));
    setShowPendingCollections(true);
  };

  const resetPaymentFields = () => {
    setSelectedKey(""); setSelectedInvoiceIds([]); setAmountReceived("");
    setPaymentMode("Cash"); setTransactionRef(""); setRemarks("");
    setReceiptDate(new Date().toISOString().slice(0, 10));
    setShowPendingCollections(true);
  };

  /* ─────────────────────────────────────────────────────
   * FIX 2: handleGenerateInvoice now captures current
   * form values synchronously and passes them into
   * buildPreviewPayload, bypassing any stale closure.
   * ───────────────────────────────────────────────────── */
  const handleGenerateInvoice = () => {
    // ── Guard: require a specific invoice to be selected ──
    if (selectedInvoiceIds.length === 0) {
      toast.error("Please select a specific invoice to generate the invoice.", {
        id: "select-invoice-warn",
        icon: "🧾",
        duration: 3500,
      });
      return;
    }

    const currentReceived = Number(amountReceived) || 0;
    const currentInvoices = selectedInvoices.length > 0 ? selectedInvoices : selectedBucket?.invoices || [];

    const payload = buildPreviewPayload({
      receivedOverride:    currentReceived,
      invoiceListOverride: currentInvoices,
    });
    if (!payload) return;

    setPreviewData(payload);
    setPreviewInvoice(payload.invoicePreviewData || null);
    setPreviewOpen(true);
  };

  const handlePreviewPrint = () => {
    const html = previewRef.current?.innerHTML;
    if (!html) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Receipt</title></head><body>${html}</body></html>`);
    w.document.close(); w.focus(); w.print(); w.close();
  };

  const buildPreviewPdf = async () => {
    if (!previewRef.current) return null;
    const canvas = await html2canvas(previewRef.current, { scale: 2 });
    const pdf    = new jsPDF("p", "mm", "a4");
    const imgW   = 210;
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, imgW, (canvas.height * imgW) / canvas.width);
    return { pdf, fileName: `Receipt-${previewData?.receiptNo || "RCP"}.pdf` };
  };

  const handlePreviewDownload = async () => {
    const doc = await buildPreviewPdf();
    if (!doc) return;
    doc.pdf.save(doc.fileName);
  };

  /* ─────────────────────────────────────────────────────
   * FIX 3: handlePreviewWhatsapp — robust phone handling
   * and guaranteed fallback so WhatsApp always opens.
   * ───────────────────────────────────────────────────── */
  const handlePreviewWhatsapp = async () => {
    if (!previewData) { toast.error("Generate invoice first"); return; }

    const phone = toWhatsAppPhone(previewData.customerPhone || "");
    if (!phone) { toast.error("Customer phone number is required for WhatsApp"); return; }

    const invoiceNo = previewData?.invoicePreviewData?.invoiceNo || "Payment Receipt";
    const message   = [
      `Hello ${previewData.customerName || "Customer"},`,
      "Your payment receipt is ready.",
      `Invoice No: ${invoiceNo}`,
      `Amount Received: Rs.${formatCurrency(previewData.received || 0)}`,
      `Outstanding After: Rs.${formatCurrency(previewData.outstandingAfter || 0)}`,
      `Date: ${previewData.date || receiptDate}`,
    ].join("\n");

    // Try PDF share (mobile only) — if anything fails, fall back to WA link
    try {
      const doc = await buildPreviewPdf();
      if (doc) {
        const pdfBlob = doc.pdf.output("blob");
        const pdfFile = new File([pdfBlob], doc.fileName, { type: "application/pdf" });
        if (navigator.share && navigator.canShare?.({ files: [pdfFile] })) {
          await navigator.share({ title: doc.fileName, text: message, files: [pdfFile] });
          return; // shared successfully via native sheet
        }
        // Desktop — download PDF then open WA
        doc.pdf.save(doc.fileName);
        toast.success("PDF downloaded. Attach it in WhatsApp.");
      }
    } catch {
      // PDF generation failed — still open WhatsApp with text
    }

    // Always open WhatsApp (whether PDF succeeded or not)
    openWhatsAppChat(phone, message);
  };

  const handlePreviewDone = () => {
    setPreviewOpen(false); setPreviewData(null); setPreviewInvoice(null);
    toast.success("Done");
  };

  /* ── Pagination buttons ── */
  const renderPageButtons = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      const isActive = i === currentPage;
      if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
        pages.push(
          <Box key={i} onClick={() => setCurrentPage(i)}
            sx={{ minWidth: 30, height: 28, px: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: isActive ? 700 : 500, cursor: "pointer", border: `1px solid ${isActive ? T.primary : T.border}`, background: isActive ? T.primary : T.surface, color: isActive ? "#fff" : T.muted, "&:hover": !isActive ? { borderColor: T.primary, color: T.primary, background: T.primaryLight } : {}, transition: "all .1s" }}>
            {i}
          </Box>
        );
      } else if ((i === currentPage - 2 && currentPage > 3) || (i === currentPage + 2 && currentPage < totalPages - 2)) {
        pages.push(<Box key={`ellipsis-${i}`} sx={{ display: "inline-flex", alignItems: "center", px: 0.5, fontSize: 12, color: T.faint }}>…</Box>);
      }
    }
    return pages;
  };

  /* ══════════════════════════════════════════════════════ */
  return (
    <Box ref={formTopRef} sx={{ p: 0, background: T.bg, minHeight: "100%", fontFamily: "'Noto Sans', sans-serif" }}>

      {/* Page header */}
      <Box sx={{ px: 3, py: 1.8, background: T.surface, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
        <Box>
          <Typography sx={{ fontSize: 20, fontWeight: 800, color: T.dark, lineHeight: 1.2, letterSpacing: "-.01em" }}>
            Receive Payment
          </Typography>
          <Typography sx={{ fontSize: 12, color: T.muted }}>
            {new Date(`${receiptDate}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </Typography>
        </Box>
        <Box sx={{ fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700, color: T.primary, background: T.primaryLight, border: `1px solid #c3d9f5`, px: 1.5, py: 0.6, letterSpacing: "1.5px" }}>
          {receiptNo}
        </Box>
      </Box>

      <Box sx={{ px: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>

        {/* ── Payment form ── */}
        <Box sx={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: "0 1px 3px rgba(15,23,42,.06), 0 4px 16px rgba(15,23,42,.04)", overflow: "hidden" }}>
          <Box sx={{ px: 2.5, py: 1.6, borderBottom: `2px solid ${T.primary}`, background: `linear-gradient(to right, ${T.primaryLight}, ${T.surface})` }}>
            <Typography sx={{ fontSize: 14, fontWeight: 800, color: T.dark }}>Receive Payment from Customer</Typography>
          </Box>

          <Box sx={{ p: 2.5 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: "14px" }}>

              {/* Customer */}
              <Box>
                <Lbl required>Customer</Lbl>
                <Autocomplete
                  options={allBuckets}
                  value={selectedBucket}
                  onChange={(_, value) => setSelectedKey(value?.key || "")}
                  getOptionLabel={(opt) => opt?.customer?.name || ""}
                  renderInput={(params) => <TextField {...params} size="small" sx={inputSx} />}
                />
              </Box>

              {/* Receipt date */}
              <Box>
                <Lbl>Receipt Date</Lbl>
                <TextField fullWidth size="small" type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} sx={inputSx} />
              </Box>

              {/* Outstanding */}
              <Box>
                <Lbl>Outstanding Balance</Lbl>
                <TextField fullWidth size="small"
                  value={`Rs.${formatCurrency(remainingOutstanding)}`}
                  sx={{ ...inputSx, "& .MuiOutlinedInput-root": { ...inputSx["& .MuiOutlinedInput-root"], background: payableOutstanding > 0 ? "#fff8f8" : T.successLight } }}
                  InputProps={{ readOnly: true }}
                />
                {liveReceivedAmount > 0 && (
                  <Typography sx={{ mt: 0.6, fontSize: 11, color: T.muted }}>
                    Before payment: Rs.{formatCurrency(payableOutstanding)}
                  </Typography>
                )}
              </Box>

              {/* Amount received */}
              <Box>
                <Lbl required>Amount Received (Rs.)</Lbl>
                <TextField
                  fullWidth size="small" type="number"
                  value={amountReceived}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  onClick={() => { if (allSelectedArePaid) toast.error("This invoice is already paid. No amount due.", { id: "paid-invoice-warn", icon: "🚫" }); }}
                  disabled={allSelectedArePaid}
                  sx={{ ...inputSx, "& .MuiOutlinedInput-root": { ...inputSx["& .MuiOutlinedInput-root"], background: allSelectedArePaid ? T.successLight : T.surface } }}
                  inputProps={{ min: 0, max: payableOutstanding, step: "0.01" }}
                />
                {allSelectedArePaid ? (
                  <Typography sx={{ mt: 0.6, fontSize: 11, color: T.success, fontWeight: 600 }}>
                    Invoice already fully paid - no amount due
                  </Typography>
                ) : (
                  <Box sx={{ mt: 0.8, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                    {[500, 1000, 5000, 10000, 50000].map((val) => (
                      <Box key={val} onClick={() => handleQuick(val)}
                        sx={{ px: 1.2, py: "3px", border: `1px solid ${T.border}`, fontSize: 11.5, fontWeight: 600, color: T.muted, cursor: "pointer", userSelect: "none", "&:hover": { borderColor: T.primary, color: T.primary, background: T.primaryLight }, transition: "all .12s" }}>
                        {val >= 1000 ? `${val / 1000}K` : val}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>

              {/* Payment mode */}
              <Box>
                <Lbl required>Payment Mode</Lbl>
                <TextField select fullWidth size="small" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} sx={inputSx}>
                  {paymentModes.map((mode) => <MenuItem key={mode} value={mode}>{mode}</MenuItem>)}
                </TextField>
              </Box>

              {/* Txn ref */}
              <Box>
                <Lbl>Transaction / Ref No.</Lbl>
                <TextField fullWidth size="small" value={transactionRef} onChange={(e) => setTransactionRef(e.target.value)} sx={inputSx} placeholder="UPI ref / Cheque no." />
              </Box>

              {/* Against invoices */}
              <Box>
                <Lbl>Against Invoice(s)</Lbl>
                <TextField
                  select fullWidth size="small"
                  value={selectedInvoiceIds}
                  onChange={(e) => handleInvoiceSelection(e.target.value)}
                  sx={inputSx}
                  disabled={!selectedBucket}
                  SelectProps={{
                    multiple: true,
                    displayEmpty: true,
                    renderValue: (selected) => {
                      const ids = Array.isArray(selected) ? selected : [];
                      return ids.length === 0 ? "All Pending Invoices" : `${ids.length} invoice(s) selected`;
                    },
                  }}
                >
                  <MenuItem value="__ALL__">
                    <Checkbox size="small" checked={selectedInvoiceIds.length === 0} />
                    <ListItemText primary="All Pending Invoices" />
                  </MenuItem>
                  {invoiceOptions.map((opt) => (
                    <MenuItem key={opt.id} value={opt.id} sx={{ opacity: opt.isPaid ? 0.6 : 1 }}>
                      <Checkbox size="small" checked={selectedInvoiceIds.includes(opt.id)} />
                      <ListItemText primary={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 600, color: opt.isPaid ? T.muted : T.dark }}>{opt.invoiceNo}</Typography>
                          <Typography sx={{ fontSize: 12, color: opt.isPaid ? T.faint : T.danger, fontWeight: 700 }}>
                            {opt.isPaid ? "Due: Rs.0" : `Due: Rs.${formatCurrency(opt.dueAmount)}`}
                          </Typography>
                          <StatusBadge status={opt.status} />
                        </Box>
                      } />
                    </MenuItem>
                  ))}
                </TextField>

                {/* Selected invoice preview */}
                <Box sx={{ mt: 0.8, p: 1.2, border: `1px solid ${T.border}`, background: T.surfaceAlt, maxHeight: 110, overflowY: "auto" }}>
                  {selectedInvoiceIds.length > 0 ? (
                    selectedInvoices.map((inv) => {
                      const m         = getInvoicePaymentMetrics(inv);
                      const simulated = paymentSimulation.invoiceMap.get(String(inv._id || ""));
                      const dueAmount = simulated?.dueAmount ?? m.dueAmount;
                      const status    = simulated?.status   ?? (dueAmount <= 0 ? "Paid" : Number(m.paidAmount || 0) > 0 ? "Partial" : "Pending");
                      const isPaid    = dueAmount <= 0;
                      const paidNow   = Number(simulated?.paidNow || 0);
                      return (
                        <Box key={inv._id} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.4 }}>
                          <Typography sx={{ fontSize: 12, fontWeight: 600, color: T.text }}>{inv.invoiceNo || "INV"}</Typography>
                          <Typography sx={{ fontSize: 12, color: isPaid ? T.faint : T.danger, fontWeight: 700 }}>
                            {isPaid ? "Due: Rs.0" : `Due: Rs.${formatCurrency(dueAmount)}`}
                          </Typography>
                          {paidNow > 0 && (
                            <Typography sx={{ fontSize: 11, color: T.success, fontWeight: 700 }}>
                              Paying now: Rs.{formatCurrency(paidNow)}
                            </Typography>
                          )}
                          <StatusBadge status={status} />
                        </Box>
                      );
                    })
                  ) : (
                    <Typography sx={{ fontSize: 12, color: T.muted }}>All pending invoices will be included.</Typography>
                  )}
                </Box>
              </Box>

              {/* Remarks */}
              <Box>
                <Lbl>Remarks</Lbl>
                <TextField fullWidth size="small" multiline rows={4} value={remarks} onChange={(e) => setRemarks(e.target.value)} sx={inputSx} placeholder="Part payment / full payment" />
              </Box>
            </Box>

            {/* Action buttons */}
            <Box sx={{ mt: 2.5, pt: 2, borderTop: `1px solid ${T.border}`, display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Btn onClick={handleSave} disabled={loading || allSelectedArePaid} bg={T.success}>
                {loading ? "Saving..." : "Save Payment"}
              </Btn>
              <Btn onClick={handleGenerateInvoice} disabled={loading || allSelectedArePaid}>
                {loading ? "Processing..." : "Generate Invoice"}
              </Btn>
              {hasPrefill && (
                <Btn
                  onClick={() => setShowPendingCollections((prev) => !prev)}
                  disabled={loading}
                  outlined
                  color={T.primary}
                >
                  {showPendingCollections ? "Hide Pending List" : "Show Pending List"}
                </Btn>
              )}
              <Btn onClick={resetPaymentFields} disabled={loading} bg={T.muted}>Cancel</Btn>
            </Box>
          </Box>
        </Box>

        {/* ── Pending Collections ── */}
        {showPendingCollections && (
        <Box sx={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: "0 1px 3px rgba(15,23,42,.06)", overflow: "hidden", mb: 2.5 }}>

          {/* Panel header */}
          <Box sx={{ px: 2.5, py: 1.4, borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 800, color: T.dark }}>Pending Collections</Typography>
              <Box sx={{ px: 1.2, py: "2px", background: T.dangerLight, border: `1px solid #fecaca` }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.danger }}>{filteredBuckets.length}</Typography>
              </Box>
            </Box>
            <Box sx={{ flex: 1, maxWidth: 320 }}>
              <TextField
                fullWidth size="small"
                placeholder="Search by name or phone…"
                value={searchQuery}
                onChange={handleSearchChange}
                sx={{ ...inputSx, "& .MuiOutlinedInput-root": { ...inputSx["& .MuiOutlinedInput-root"], fontSize: 12.5 } }}
                InputProps={{
                  startAdornment: (
                    <Box component="span" sx={{ mr: 0.8, color: T.faint, display: "flex", alignItems: "center" }}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="6.5" cy="6.5" r="4.5" /><path d="M10.5 10.5L14 14" strokeLinecap="round" />
                      </svg>
                    </Box>
                  ),
                }}
              />
            </Box>
          </Box>

          {/* Table */}
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: 560 }}>
              <TableHead>
                <TableRow sx={{ background: T.surfaceAlt }}>
                  {["Customer", "Invoices", "Status", "Outstanding", ""].map((col, i) => (
                    <TableCell key={col || `col-${i}`} align={i === 3 ? "right" : "left"}
                      sx={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".07em", borderBottom: `1px solid ${T.border}`, py: 1.1, px: 2, background: T.surfaceAlt, whiteSpace: "nowrap" }}>
                      {col}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {pagedBuckets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 5, color: T.faint, fontSize: 13, border: "none" }}>
                      {searchQuery ? "No results found." : "No pending collections."}
                    </TableCell>
                  </TableRow>
                ) : pagedBuckets.map((entry) => {
                  const isSelected   = selectedKey === entry.key;
                  const isExpanded   = expandedRowKey === entry.key;
                  const pendingCount = entry.invoices.filter(inv => getInvoicePaymentMetrics(inv).dueAmount > 0).length;
                  const hasPartial   = entry.invoices.some(inv => { const m = getInvoicePaymentMetrics(inv); return m.dueAmount > 0 && Number(m.paidAmount || 0) > 0; });
                  const statusLabel  = hasPartial ? "Partial" : "Pending";
                  const sCfg         = hasPartial
                    ? { color: T.warning, bg: T.warningLight, border: "#fde68a" }
                    : { color: T.danger,  bg: T.dangerLight,  border: "#fecaca" };

                  return (
                    <>
                      <TableRow
                        key={entry.key}
                        onClick={() => {
                          setExpandedRowKey(isExpanded ? null : entry.key);
                          setSelectedKey(isSelected ? "" : entry.key);
                        }}
                        sx={{
                          cursor: "pointer",
                          background: isSelected ? T.primaryLight : T.surface,
                          "& td": { borderLeft: isSelected ? `3px solid ${T.primary}` : "3px solid transparent" },
                          "& td:not(:first-of-type)": { borderLeft: "none" },
                          "&:hover": { background: isSelected ? T.primaryLight : T.surfaceAlt },
                          transition: "background .1s",
                        }}
                      >
                        <TableCell sx={{ py: 1.4, px: 2, borderBottom: isExpanded ? "none" : `1px solid ${T.borderLight}`, borderLeft: `3px solid ${isSelected ? T.primary : "transparent"}` }}>
                          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: isSelected ? T.primary : T.dark, lineHeight: 1.3 }}>
                            {entry.customer.name || "-"}
                          </Typography>
                          <Typography sx={{ fontSize: 11.5, color: T.muted, mt: 0.2 }}>{entry.customer.phone || "-"}</Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1.4, px: 2, borderBottom: isExpanded ? "none" : `1px solid ${T.borderLight}` }}>
                          <Typography sx={{ fontSize: 13, color: T.muted }}>{pendingCount} invoice{pendingCount !== 1 ? "s" : ""}</Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1.4, px: 2, borderBottom: isExpanded ? "none" : `1px solid ${T.borderLight}` }}>
                          <Box component="span" sx={{ display: "inline-flex", alignItems: "center", px: 1, py: "3px", fontSize: 10.5, fontWeight: 700, color: sCfg.color, background: sCfg.bg, border: `1px solid ${sCfg.border}` }}>
                            {statusLabel}
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1.4, px: 2, borderBottom: isExpanded ? "none" : `1px solid ${T.borderLight}` }}>
                          <Typography sx={{ fontSize: 14, fontWeight: 800, color: T.danger }}>Rs.{formatCurrency(entry.due)}</Typography>
                          <Typography sx={{ fontSize: 10, color: T.faint, mt: 0.2 }}>outstanding</Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 1.4, px: 1.5, borderBottom: isExpanded ? "none" : `1px solid ${T.borderLight}`, width: 32 }}>
                          <Box sx={{ color: T.faint, fontSize: 14, lineHeight: 1, transition: "transform .2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block" }}>▾</Box>
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow key={`${entry.key}-actions`}>
                          <TableCell colSpan={5} sx={{ p: 0, borderBottom: `1px solid ${T.border}` }}>
                            <Box sx={{ px: 2.5, py: 1.2, background: "#f0f6ff", borderLeft: `3px solid ${T.primary}`, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                              <TblBtn variant="primary" icon={<IconPay />} onClick={() => handlePayFromRow(entry)}>Pay</TblBtn>
                              <TblBtn variant="whatsapp" icon={<IconSend />} onClick={() => handleSendInvoiceFromRow(entry)}>Send Invoice</TblBtn>
                              <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 0.8 }}>
                                <Typography sx={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>Outstanding:</Typography>
                                <Typography sx={{ fontSize: 13, fontWeight: 800, color: T.danger, fontFamily: "'DM Mono', monospace" }}>
                                  Rs.{formatCurrency(entry.due)}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </Box>

          {/* Pagination footer */}
          {filteredBuckets.length > ROWS_PER_PAGE && (
            <Box sx={{ px: 2.5, py: 1.2, borderTop: `1px solid ${T.border}`, background: T.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
              <Typography sx={{ fontSize: 12, color: T.muted }}>
                Showing {(currentPage - 1) * ROWS_PER_PAGE + 1}–{Math.min(currentPage * ROWS_PER_PAGE, filteredBuckets.length)} of {filteredBuckets.length}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                  sx={{ minWidth: 30, height: 28, px: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, cursor: currentPage === 1 ? "default" : "pointer", border: `1px solid ${T.border}`, background: T.surface, color: currentPage === 1 ? T.faint : T.muted, opacity: currentPage === 1 ? 0.45 : 1, "&:hover": currentPage > 1 ? { borderColor: T.primary, color: T.primary, background: T.primaryLight } : {}, transition: "all .1s" }}>‹</Box>
                {renderPageButtons()}
                <Box onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                  sx={{ minWidth: 30, height: 28, px: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, cursor: currentPage === totalPages ? "default" : "pointer", border: `1px solid ${T.border}`, background: T.surface, color: currentPage === totalPages ? T.faint : T.muted, opacity: currentPage === totalPages ? 0.45 : 1, "&:hover": currentPage < totalPages ? { borderColor: T.primary, color: T.primary, background: T.primaryLight } : {}, transition: "all .1s" }}>›</Box>
              </Box>
            </Box>
          )}
        </Box>
        )}
      </Box>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} fullWidth maxWidth="lg"
        PaperProps={{ sx: { borderRadius: 0, boxShadow: "0 8px 24px rgba(15,23,42,.12)" } }}>
        <Box sx={{ px: 2.5, py: 1.6, borderBottom: `1px solid ${T.border}`, background: T.surface, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box>
            <Typography sx={{ fontSize: 15, fontWeight: 800, color: T.dark }}>Payment Invoice</Typography>
            <Typography sx={{ fontSize: 11, color: T.muted }}>Receipt: {previewData?.receiptNo || "-"}</Typography>
          </Box>
          <Box onClick={() => setPreviewOpen(false)} sx={{ cursor: "pointer", color: T.faint, fontSize: 18, "&:hover": { color: T.danger } }}>✕</Box>
        </Box>
        <DialogContent sx={{ p: 2, background: T.surface }}>
          <Box ref={previewRef} sx={{ p: 1, border: `1px solid ${T.border}`, mb: 2, overflow: "hidden", borderRadius: 0, background: T.surface }}>
            {previewInvoice ? (
              <Box id="customer-payment-invoice-preview" sx={{ width: 620, mx: "auto" }}>
                <Box sx={{ width: 794, transform: "scale(0.78)", transformOrigin: "top left" }}>
                  <InvoicePrint data={previewInvoice} />
                </Box>
              </Box>
            ) : (
              <Box sx={{ p: 1.5 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 18, mb: 0.4 }}>Payment Receipt</Typography>
                <Typography sx={{ fontSize: 12, color: T.muted, mb: 1.5 }}>No: {previewData?.receiptNo || "-"} | Date: {previewData?.date || "-"}</Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", mb: 1.5, border: `1px solid ${T.border}`, overflow: "hidden" }}>
                  {[
                    ["Customer",           previewData?.customerName],
                    ["Mobile",             previewData?.customerPhone],
                    ["Payment Mode",       previewData?.mode],
                    ["Amount Received",    `Rs.${formatCurrency(previewData?.received || 0)}`],
                    ["Outstanding Before", `Rs.${formatCurrency(previewData?.outstandingBefore || 0)}`],
                    ["Outstanding After",  `Rs.${formatCurrency(previewData?.outstandingAfter || 0)}`],
                  ].map(([label, value], i) => (
                    <Box key={label} sx={{ px: 1.5, py: 1, borderRight: i % 2 === 0 ? `1px solid ${T.border}` : "none", borderBottom: i < 4 ? `1px solid ${T.border}` : "none", background: i % 2 === 0 ? T.surfaceAlt : T.surface }}>
                      <Typography sx={{ fontSize: 10, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", mb: 0.3 }}>{label}</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.dark }}>{value || "-"}</Typography>
                    </Box>
                  ))}
                </Box>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".07em", mb: 0.5 }}>Against Invoices</Typography>
                <Typography sx={{ fontSize: 12, whiteSpace: "pre-line", color: T.text }}>{previewData?.againstInvoices || "-"}</Typography>
                {previewData?.transactionRef && <Typography sx={{ fontSize: 12, mt: 1 }}><strong>Ref:</strong> {previewData.transactionRef}</Typography>}
                {previewData?.remarks       && <Typography sx={{ fontSize: 12 }}><strong>Remarks:</strong> {previewData.remarks}</Typography>}
              </Box>
            )}
          </Box>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Btn onClick={handlePreviewPrint}    outlined color={T.primary}>Print</Btn>
            <Btn onClick={handlePreviewDownload} outlined color={T.primary}>Download PDF</Btn>
            <Btn onClick={handlePreviewWhatsapp} bg="#22c55e">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 4 }}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Send to WhatsApp
            </Btn>
            <Btn onClick={handlePreviewDone}>Done</Btn>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default CustomerPayments;
