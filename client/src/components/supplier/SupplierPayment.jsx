import { useEffect, useRef, useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Checkbox,
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
import { useLocation, useNavigate } from "react-router-dom";
import {
  getSuppliers,
  getPurchases,
  updatePurchasePayment,
} from "../../services/supplierService";

/* ── Design tokens (mirrors CustomerPayments) ── */
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

/* ── Input style — matches CustomerPayments exactly ── */
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
    outline:  { bg: T.surface,  color: T.primary, border: `1px solid ${T.border}`, hover: { bg: T.primaryLight, border: T.primary } },
    primary:  { bg: T.primary,  color: "#fff",    border: "none",                  hover: { bg: T.primaryDark } },
    whatsapp: { bg: "#22c55e",  color: "#fff",    border: "none",                  hover: { bg: "#16a34a" } },
  };
  const s = styles[variant] || styles.outline;
  return (
    <Box
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      sx={{
        display: "inline-flex", alignItems: "center", gap: "5px",
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
const IconPay = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="1" y="4" width="14" height="10" /><path d="M1 8h14" /><path d="M4 12h2" />
  </svg>
);
const IconWA = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

/* ── Helpers ── */
const PAYMENT_MODES = ["Cash", "NEFT / Online Transfer", "Cheque", "UPI", "Card"];
const ROWS_PER_PAGE = 8;

const normPhone = (v) => String(v || "").replace(/\D/g, "");

const fmt = (n = 0) =>
  Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime())
    ? d
    : `${String(dt.getDate()).padStart(2, "0")}-${String(dt.getMonth() + 1).padStart(2, "0")}-${dt.getFullYear()}`;
};

const todayStr = () => new Date().toISOString().split("T")[0];
const genSPAY  = () => `SPAY-${String(Date.now()).slice(-4)}`;

const getPurchaseDue = (p) => {
  if (!p) return 0;
  const total = Number(p.finalPayable ?? p.grandTotal ?? p.totalInvoiceAmount ?? p.total ?? 0);
  const paid  = Number(p.totalPaid ?? p.paidAmount ?? p.paid ?? 0);
  return Math.max(0, Number(p.totalDue ?? Math.max(0, total - paid)));
};

const normalisedMode = (mode) =>
  mode === "NEFT / Online Transfer" ? "Net Banking" : mode;

const openWhatsApp = (phone, message) => {
  const isMobile = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent || "");
  const url = isMobile
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
};

/* Distribute a payment amount across purchases (oldest first) */
const simulatePayment = (purchases = [], paying = 0) => {
  let balance = Math.max(0, Number(paying) || 0);
  const map = new Map();
  const pending = purchases
    .map((p) => ({ p, due: getPurchaseDue(p) }))
    .filter((r) => r.due > 0)
    .sort((a, b) => new Date(a.p.createdAt || 0) - new Date(b.p.createdAt || 0));

  for (const row of pending) {
    const payNow  = balance > 0 ? Math.min(balance, row.due) : 0;
    const newPaid = Number(row.p.totalPaid || 0) + payNow;
    const newDue  = Math.max(0, row.due - payNow);
    const status  = newDue <= 0 ? "Paid" : newPaid > 0 ? "Partial" : "Pending";
    map.set(String(row.p._id || ""), { payNow, newPaid, newDue, status });
    balance -= payNow;
  }
  return map;
};

/* ═══════════════════════════════════════════════════════ */
const SupplierPayment = () => {
  const location = useLocation();
  const navigate = useNavigate();

  /* ── Prefill refs ── */
  const prefillSupplierRef = useRef(location.state?.supplier        || null);
  const prefillPurchaseRef = useRef(location.state?.prefillPurchase || null);
  const hasPrefillRef      = useRef(Boolean(
    location.state?.supplier || location.state?.prefillPurchase || location.state?.supplierId
  ));
  const hasPrefill = hasPrefillRef.current;

  /* ── Data ── */
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);

  /* ── Form ── */
  const [selectedKey,  setSelectedKey]  = useState("");
  const [selectedGRNs, setSelectedGRNs] = useState([]);
  const [payDate,      setPayDate]      = useState(todayStr());
  const [amountPaying, setAmountPaying] = useState("");
  const [paymentMode,  setPaymentMode]  = useState("NEFT / Online Transfer");
  const [txnRef,       setTxnRef]       = useState("");
  const [remarks,      setRemarks]      = useState("");
  const [saving,       setSaving]       = useState(false);
  const [spayNo]                        = useState(genSPAY);

  /* ── Table ── */
  const [searchQuery,    setSearchQuery]    = useState("");
  const [currentPage,    setCurrentPage]    = useState(1);
  const [expandedRowKey, setExpandedRowKey] = useState(null);

  const formTopRef       = useRef(null);
  const skipNextResetRef = useRef(false);
  const prefillDoneRef   = useRef(false);

  /* ── Load ── */
  const loadData = async () => {
    try {
      const [sRes, pRes] = await Promise.all([getSuppliers(), getPurchases()]);
      setSuppliers(Array.isArray(sRes.data) ? sRes.data : []);
      setPurchases(Array.isArray(pRes.data) ? pRes.data : []);
    } catch { toast.error("Failed to load data"); }
  };

  useEffect(() => {
    if (hasPrefill) navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { loadData(); }, []);

  /* ── Supplier buckets ── */
  const allBuckets = useMemo(() => {
    const map = new Map();
    purchases.filter((p) => !p.isDraft).forEach((purchase) => {
      const sid   = purchase.supplierId?._id || purchase.supplierId || "unknown";
      const sData = suppliers.find((s) => s._id === sid) || (typeof purchase.supplierId === "object" ? purchase.supplierId : {});
      const name  = sData.companyName || sData.name || "Unknown";
      const phone = sData.companyPhone || sData.phone || sData.supplierPhone || "";
      const key   = sid;
      if (!map.has(key)) map.set(key, { key, supplierId: sid, supplier: sData, name, phone, purchases: [], due: 0 });
      const bucket = map.get(key);
      bucket.purchases.push(purchase);
      bucket.due += getPurchaseDue(purchase);
    });
    return Array.from(map.values()).sort((a, b) => b.due - a.due);
  }, [purchases, suppliers]);

  const buckets = useMemo(() => allBuckets.filter((b) => b.due > 0), [allBuckets]);

  /* ── Filtered + paginated ── */
  const filteredBuckets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return buckets;
    return buckets.filter((b) =>
      b.name.toLowerCase().includes(q) ||
      normPhone(b.phone).includes(q.replace(/\D/g, "")) ||
      b.phone.includes(q)
    );
  }, [buckets, searchQuery]);

  const totalPages   = Math.max(1, Math.ceil(filteredBuckets.length / ROWS_PER_PAGE));
  const pagedBuckets = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredBuckets.slice(start, start + ROWS_PER_PAGE);
  }, [filteredBuckets, currentPage]);

  /* ── Prefill ── */
  useEffect(() => {
    if (!hasPrefill || prefillDoneRef.current || allBuckets.length === 0) return;
    const pS  = prefillSupplierRef.current;
    const pP  = prefillPurchaseRef.current;
    const sid = pS?._id || pP?.supplierId?._id || pP?.supplierId || location.state?.supplierId;
    if (sid) {
      const found = allBuckets.find((b) => b.supplierId === sid);
      if (found) {
        prefillDoneRef.current   = true;
        skipNextResetRef.current = true;
        setSelectedKey(found.key);
        if (pP?._id) {
          setSelectedGRNs([String(pP._id)]);
          const due = getPurchaseDue(pP);
          if (due > 0) setAmountPaying(String(due));
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allBuckets, hasPrefill]);

  /* ── Selected bucket ── */
  const selectedBucket = useMemo(
    () => allBuckets.find((b) => b.key === selectedKey) || null,
    [allBuckets, selectedKey]
  );

  useEffect(() => {
    if (skipNextResetRef.current) { skipNextResetRef.current = false; return; }
    setSelectedGRNs([]);
    setAmountPaying("");
  }, [selectedKey]);

  /* ── Purchase options ── */
  const purchaseOptions = useMemo(() => {
    if (!selectedBucket) return [];
    return selectedBucket.purchases
      .slice()
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .map((p) => {
        const due    = getPurchaseDue(p);
        const paid   = Number(p.totalPaid || 0);
        const isPaid = due <= 0;
        const status = isPaid ? "Paid" : paid > 0 ? "Partial" : "Pending";
        return { id: p._id, grnNo: p.grnNo || p.invoiceNo || "GRN", isPaid, status, due, paid };
      });
  }, [selectedBucket]);

  /* ── Outstanding ── */
  const totalOutstanding = Number(selectedBucket?.due || 0);

  const selectedPurchases = useMemo(() => {
    if (!selectedBucket || selectedGRNs.length === 0) return [];
    const idSet = new Set(selectedGRNs);
    return selectedBucket.purchases.filter((p) => idSet.has(p._id));
  }, [selectedBucket, selectedGRNs]);

  const selectedOutstanding = selectedPurchases.reduce((s, p) => s + getPurchaseDue(p), 0);
  const payableOutstanding  = selectedGRNs.length > 0 ? selectedOutstanding : totalOutstanding;

  const allSelectedPaid = useMemo(() => {
    if (selectedGRNs.length === 0) return false;
    return selectedPurchases.every((p) => getPurchaseDue(p) <= 0);
  }, [selectedPurchases, selectedGRNs]);

  /* ── Live simulation ── */
  const liveAmount    = Number(amountPaying) || 0;
  const basePurchases = selectedPurchases.length > 0 ? selectedPurchases : selectedBucket?.purchases || [];
  const paySimulation = useMemo(() => simulatePayment(basePurchases, liveAmount), [basePurchases, liveAmount]);
  const remainingOutstanding = Math.max(0, payableOutstanding - liveAmount);

  /* ── Handlers ── */
  const handleAmountChange = (value) => {
    if (allSelectedPaid) { toast.error("Selected purchase(s) already fully paid", { id: "paid-warn" }); return; }
    if (value === "") { setAmountPaying(""); return; }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    setAmountPaying(String(Math.max(0, Math.min(parsed, payableOutstanding))));
  };

  const handleQuick = (val) => {
    if (allSelectedPaid) { toast.error("Selected purchase(s) already fully paid", { id: "paid-warn" }); return; }
    setAmountPaying(String(Math.min(payableOutstanding, val)));
  };

  const handleGRNSelection = (value) => {
    if (!Array.isArray(value)) { setSelectedGRNs([]); return; }
    if (value.includes("__ALL__")) { setSelectedGRNs([]); setAmountPaying(""); return; }
    setSelectedGRNs(value);
    const sel = purchaseOptions.filter((o) => value.includes(o.id));
    if (sel.length > 0 && sel.every((o) => o.isPaid)) {
      toast.error("Selected purchase(s) already fully paid", { id: "paid-warn" });
      setAmountPaying("");
    }
  };

  const handlePayFromRow = (bucket) => {
    const top = bucket.purchases
      .map((p) => ({ p, due: getPurchaseDue(p) }))
      .filter((r) => r.due > 0)
      .sort((a, b) => b.due - a.due)[0]?.p || null;

    skipNextResetRef.current = true;
    setSelectedKey(bucket.key);
    setSelectedGRNs(top ? [String(top._id)] : []);
    setAmountPaying("");
    setExpandedRowKey(null);
    setTimeout(() => formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  const handleSendInvoiceFromRow = (bucket) => {
    const phone = normPhone(bucket.phone);
    if (!phone) { toast.error("No phone number for this supplier"); return; }
    const fullPhone    = phone.length === 10 ? `91${phone}` : phone;
    const pendingCount = bucket.purchases.filter((p) => getPurchaseDue(p) > 0).length;
    const invoiceLines = bucket.purchases
      .filter((p) => getPurchaseDue(p) > 0)
      .map((p, i) => `  ${i + 1}. ${p.grnNo || p.invoiceNo || "GRN"} — Rs.${fmt(getPurchaseDue(p))}`)
      .join("\n");

    const message = [
      `Dear ${bucket.name},`,
      "",
      `This is a reminder regarding ${pendingCount} pending payment(s) totalling Rs.${fmt(bucket.due)}.`,
      "",
      `*Pending Invoice(s):*`,
      invoiceLines,
      "",
      `*Total Outstanding: Rs.${fmt(bucket.due)}*`,
      "",
      `Date: ${fmtDate(todayStr())}`,
      "",
      "Kindly arrange payment at your earliest convenience. Thank you.",
    ].join("\n");

    openWhatsApp(fullPhone, message);
  };

  const handleSave = async () => {
    if (!selectedBucket) { toast.error("Select a supplier"); return; }
    if (allSelectedPaid)  { toast.error("Selected purchase(s) already fully paid", { id: "paid-warn" }); return; }
    if (!amountPaying || liveAmount <= 0) { toast.error("Enter a valid amount to pay"); return; }
    if (!paymentMode)  { toast.error("Select a payment mode"); return; }
    if (liveAmount > payableOutstanding) { toast.error(`Amount exceeds outstanding of Rs.${fmt(payableOutstanding)}`); return; }

    setSaving(true);
    try {
      const targets = selectedPurchases.length > 0
        ? selectedPurchases
        : (selectedBucket?.purchases || []).filter((p) => getPurchaseDue(p) > 0);

      let remaining = liveAmount;
      for (const p of targets) {
        if (remaining <= 0) break;
        const due     = getPurchaseDue(p);
        const payNow  = Math.min(remaining, due);
        const sim     = paySimulation.get(String(p._id || ""));
        const newPaid = sim?.newPaid ?? (Number(p.totalPaid || 0) + payNow);
        const newDue  = sim?.newDue  ?? Math.max(0, due - payNow);
        const payable = Number(p.finalPayable || p.grandTotal || p.totalInvoiceAmount || 0);
        await updatePurchasePayment(p._id, {
          totalPaid:   newPaid,
          finalPayable: payable,
          paymentMode:  normalisedMode(paymentMode),
          paymentType:  newDue <= 0 ? "Full Payment" : "Partial",
          paymentDate:  payDate,
          referenceNo:  txnRef,
          remarks,
        });
        remaining -= payNow;
      }
      toast.success("Payment recorded successfully");
      await loadData();
      resetForm();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Payment failed");
    } finally {
      setSaving(false);
    }
  };

  const handleAdvice = () => {
    if (!selectedBucket) { toast.error("Select a supplier first"); return; }
    const targets = selectedPurchases.length > 0
      ? selectedPurchases
      : (selectedBucket?.purchases || []).filter((p) => getPurchaseDue(p) > 0);
    const lines = targets
      .map((p) => `${p.grnNo || p.invoiceNo} — Rs.${fmt(getPurchaseDue(p))}`)
      .join(", ");
    const popup = window.open("", "_blank");
    if (!popup) return;
    popup.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Payment Advice</title>
    <style>body{font-family:Arial,sans-serif;padding:28px;color:#1f2937}h2{color:#1a56a0;margin:0 0 16px}
    .row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e5e7eb}
    .muted{color:#64748b;font-size:12px}.val{font-size:13px;font-weight:600}.amt{font-weight:700;color:#15803d;font-size:15px}
    </style></head><body>
    <h2>Payment Advice</h2>
    <div class="row"><span class="muted">Supplier</span><span class="val">${selectedBucket.name}</span></div>
    <div class="row"><span class="muted">Phone</span><span class="val">${selectedBucket.phone || "—"}</span></div>
    <div class="row"><span class="muted">Payment Date</span><span class="val">${fmtDate(payDate)}</span></div>
    <div class="row"><span class="muted">Payment Mode</span><span class="val">${paymentMode}</span></div>
    <div class="row"><span class="muted">Reference No.</span><span class="val">${txnRef || "—"}</span></div>
    <div class="row"><span class="muted">Against Invoice(s)</span><span class="val">${lines || "—"}</span></div>
    <div class="row"><span class="muted">Remarks</span><span class="val">${remarks || "—"}</span></div>
    <div class="row"><span class="muted">Amount Paying</span><span class="amt">Rs.${fmt(liveAmount || 0)}</span></div>
    </body></html>`);
    popup.document.close();
    popup.focus();
  };

  const resetForm = () => {
    setSelectedKey(""); setSelectedGRNs([]); setAmountPaying("");
    setPaymentMode("NEFT / Online Transfer"); setTxnRef(""); setRemarks("");
    setPayDate(todayStr());
  };

  /* ── Pagination ── */
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
      } else if (
        (i === currentPage - 2 && currentPage > 3) ||
        (i === currentPage + 2 && currentPage < totalPages - 2)
      ) {
        pages.push(<Box key={`ellipsis-${i}`} sx={{ display: "inline-flex", alignItems: "center", px: 0.5, fontSize: 12, color: T.faint }}>…</Box>);
      }
    }
    return pages;
  };

  /* ══════════════════════════════════════════════════════ */
  return (
    <Box ref={formTopRef} sx={{ p: 0, background: T.bg, minHeight: "100%", fontFamily: "'Noto Sans', sans-serif" }}>

      {/* ── Page header ── */}
      <Box sx={{ px: 3, py: 1.8, background: T.surface, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
        <Box>
          <Typography sx={{ fontSize: 20, fontWeight: 800, color: T.dark, lineHeight: 1.2, letterSpacing: "-.01em" }}>
            Pay to Supplier
          </Typography>
          <Typography sx={{ fontSize: 12, color: T.muted }}>
            {new Date(`${payDate}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </Typography>
        </Box>
        <Box sx={{ fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700, color: T.primary, background: T.primaryLight, border: `1px solid #c3d9f5`, px: 1.5, py: 0.6, letterSpacing: "1.5px" }}>
          {spayNo}
        </Box>
      </Box>

      <Box sx={{ px: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>

        {/* ── Payment form ── */}
        <Box sx={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: "0 1px 3px rgba(15,23,42,.06), 0 4px 16px rgba(15,23,42,.04)", overflow: "hidden" }}>
          <Box sx={{ px: 2.5, py: 1.6, borderBottom: `2px solid ${T.primary}`, background: `linear-gradient(to right, ${T.primaryLight}, ${T.surface})` }}>
            <Typography sx={{ fontSize: 14, fontWeight: 800, color: T.dark }}>Pay to Supplier</Typography>
          </Box>

          <Box sx={{ p: 2.5 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: "14px" }}>

              {/* Supplier */}
              <Box>
                <Lbl required>Supplier</Lbl>
                <Autocomplete
                  options={allBuckets}
                  value={selectedBucket}
                  onChange={(_, value) => {
                    skipNextResetRef.current = false;
                    setSelectedKey(value?.key || "");
                  }}
                  getOptionLabel={(opt) => opt?.name || ""}
                  renderOption={(props, opt) => (
                    <Box component="li" {...props} sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start !important", px: 2, py: 1 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: T.dark }}>{opt.name}</Typography>
                      {opt.phone && <Typography sx={{ fontSize: 11, color: T.muted }}>{opt.phone}</Typography>}
                    </Box>
                  )}
                  renderInput={(params) => (
                    <TextField {...params} size="small" placeholder="Type supplier name or phone" sx={inputSx} />
                  )}
                />
              </Box>

              {/* Payment Date */}
              <Box>
                <Lbl>Payment Date</Lbl>
                <TextField fullWidth size="small" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} sx={inputSx} />
              </Box>

              {/* Outstanding Balance */}
              <Box>
                <Lbl>Outstanding Balance</Lbl>
                <TextField
                  fullWidth size="small"
                  value={selectedBucket ? `Rs.${fmt(remainingOutstanding)}` : "—"}
                  sx={{
                    ...inputSx,
                    "& .MuiOutlinedInput-root": {
                      ...inputSx["& .MuiOutlinedInput-root"],
                      background: payableOutstanding > 0 ? "#fff8f8" : T.successLight,
                      "& input": { fontWeight: 700, color: payableOutstanding > 0 ? T.danger : T.success },
                    },
                  }}
                  InputProps={{ readOnly: true }}
                />
                {liveAmount > 0 && (
                  <Typography sx={{ mt: 0.6, fontSize: 11, color: T.muted }}>
                    Before payment: Rs.{fmt(payableOutstanding)}
                  </Typography>
                )}
              </Box>

              {/* Amount Paying */}
              <Box>
                <Lbl required>Amount Paying (Rs.)</Lbl>
                <TextField
                  fullWidth size="small" type="number"
                  value={amountPaying}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  onClick={() => { if (allSelectedPaid) toast.error("Selected purchase(s) already fully paid", { id: "paid-warn" }); }}
                  disabled={allSelectedPaid}
                  sx={{
                    ...inputSx,
                    "& .MuiOutlinedInput-root": {
                      ...inputSx["& .MuiOutlinedInput-root"],
                      background: allSelectedPaid ? T.successLight : T.surface,
                    },
                  }}
                  inputProps={{ min: 0, max: payableOutstanding, step: "0.01" }}
                />
                {allSelectedPaid ? (
                  <Typography sx={{ mt: 0.6, fontSize: 11, color: T.success, fontWeight: 600 }}>
                    Purchase already fully paid — no amount due
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

              {/* Payment Mode */}
              <Box>
                <Lbl required>Payment Mode</Lbl>
                <TextField select fullWidth size="small" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} sx={inputSx}>
                  {PAYMENT_MODES.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                </TextField>
              </Box>

              {/* Txn Ref */}
              <Box>
                <Lbl>Transaction / Ref No.</Lbl>
                <TextField fullWidth size="small" value={txnRef} onChange={(e) => setTxnRef(e.target.value)} sx={inputSx} placeholder="UPI ref / Cheque no." />
              </Box>

              {/* Against GRN(s) */}
              <Box>
                <Lbl>Against Invoice(s)</Lbl>
                <TextField
                  select fullWidth size="small"
                  value={selectedGRNs}
                  onChange={(e) => handleGRNSelection(e.target.value)}
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
                    <Checkbox size="small" checked={selectedGRNs.length === 0} />
                    <ListItemText primary="All Pending Invoices" />
                  </MenuItem>
                  {purchaseOptions.map((opt) => (
                    <MenuItem key={opt.id} value={opt.id} sx={{ opacity: opt.isPaid ? 0.6 : 1 }}>
                      <Checkbox size="small" checked={selectedGRNs.includes(opt.id)} />
                      <ListItemText primary={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 600, color: opt.isPaid ? T.muted : T.dark }}>{opt.grnNo}</Typography>
                          <Typography sx={{ fontSize: 12, color: opt.isPaid ? T.faint : T.danger, fontWeight: 700 }}>
                            {opt.isPaid ? "Due: Rs.0" : `Due: Rs.${fmt(opt.due)}`}
                          </Typography>
                          <StatusBadge status={opt.status} />
                        </Box>
                      } />
                    </MenuItem>
                  ))}
                </TextField>

                {/* Live GRN preview */}
                <Box sx={{ mt: 0.8, p: 1.2, border: `1px solid ${T.border}`, background: T.surfaceAlt, maxHeight: 110, overflowY: "auto" }}>
                  {selectedGRNs.length > 0 ? (
                    selectedPurchases.map((p) => {
                      const due    = getPurchaseDue(p);
                      const sim    = paySimulation.get(String(p._id || ""));
                      const simDue = sim?.newDue  ?? due;
                      const payNow = sim?.payNow   ?? 0;
                      const status = sim?.status   ?? (due <= 0 ? "Paid" : Number(p.totalPaid || 0) > 0 ? "Partial" : "Pending");
                      const isPaid = simDue <= 0;
                      return (
                        <Box key={p._id} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.4, flexWrap: "wrap" }}>
                          <Typography sx={{ fontSize: 12, fontWeight: 600, color: T.text }}>{p.grnNo || p.invoiceNo || "GRN"}</Typography>
                          <Typography sx={{ fontSize: 12, color: isPaid ? T.faint : T.danger, fontWeight: 700 }}>
                            {isPaid ? "Due: Rs.0" : `Due: Rs.${fmt(simDue)}`}
                          </Typography>
                          {payNow > 0 && (
                            <Typography sx={{ fontSize: 11, color: T.success, fontWeight: 700 }}>
                              Paying now: Rs.{fmt(payNow)}
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
              <Btn onClick={handleSave} disabled={saving || allSelectedPaid} bg={T.success}>
                {saving ? "Saving..." : "Save Payment"}
              </Btn>
              <Btn onClick={handleAdvice} disabled={saving || !selectedBucket}>
                Payment Advice ↗
              </Btn>
              <Btn onClick={resetForm} disabled={saving} bg={T.muted}>Cancel</Btn>
            </Box>
          </Box>
        </Box>

        {/* ── Pending Collections ── */}
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
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); setExpandedRowKey(null); }}
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
                  {["Supplier", "Invoice #", "Status", "Outstanding", ""].map((col, i) => (
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
                ) : pagedBuckets.map((bucket) => {
                  const isSelected   = selectedKey === bucket.key;
                  const isExpanded   = expandedRowKey === bucket.key;
                  const pendingCount = bucket.purchases.filter((p) => getPurchaseDue(p) > 0).length;
                  const hasPartial   = bucket.purchases.some((p) => {
                    const due = getPurchaseDue(p);
                    return due > 0 && Number(p.totalPaid || 0) > 0;
                  });
                  const statusLabel = hasPartial ? "Partial" : "Pending";
                  const sCfg = hasPartial
                    ? { color: T.warning, bg: T.warningLight, border: "#fde68a" }
                    : { color: T.danger,  bg: T.dangerLight,  border: "#fecaca" };

                  return (
                    <>
                      {/* ── Main row ── */}
                      <TableRow
                        key={bucket.key}
                        onClick={() => {
                          setExpandedRowKey(isExpanded ? null : bucket.key);
                          setSelectedKey(isSelected && isExpanded ? "" : bucket.key);
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
                            {bucket.name}
                          </Typography>
                          <Typography sx={{ fontSize: 11.5, color: T.muted, mt: 0.2 }}>{bucket.phone || "—"}</Typography>
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
                          <Typography sx={{ fontSize: 14, fontWeight: 800, color: T.danger }}>Rs.{fmt(bucket.due)}</Typography>
                          <Typography sx={{ fontSize: 10, color: T.faint, mt: 0.2 }}>outstanding</Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 1.4, px: 1.5, borderBottom: isExpanded ? "none" : `1px solid ${T.borderLight}`, width: 32 }}>
                          <Box sx={{ color: T.faint, fontSize: 14, lineHeight: 1, transition: "transform .2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block" }}>▾</Box>
                        </TableCell>
                      </TableRow>

                      {/* ── Action tray ── */}
                      {isExpanded && (
                        <TableRow key={`${bucket.key}-actions`}>
                          <TableCell colSpan={5} sx={{ p: 0, borderBottom: `1px solid ${T.border}` }}>
                            <Box sx={{ px: 2.5, py: 1.2, background: "#f0f6ff", borderLeft: `3px solid ${T.primary}`, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                              <TblBtn variant="primary" icon={<IconPay />} onClick={() => handlePayFromRow(bucket)}>
                                Pay
                              </TblBtn>
                              <TblBtn variant="whatsapp" icon={<IconWA />} onClick={() => handleSendInvoiceFromRow(bucket)}>
                                Send Invoice
                              </TblBtn>
                              <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 0.8 }}>
                                <Typography sx={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>Outstanding:</Typography>
                                <Typography sx={{ fontSize: 13, fontWeight: 800, color: T.danger, fontFamily: "'DM Mono', monospace" }}>
                                  Rs.{fmt(bucket.due)}
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

          {/* Pagination */}
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

          {/* Total footer */}
          {filteredBuckets.length > 0 && (
            <Box sx={{ px: 2.5, py: 1.2, borderTop: `2px solid ${T.border}`, background: T.surfaceAlt, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: T.muted }}>
                Total Payable ({filteredBuckets.length} suppliers)
              </Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 800, color: T.danger, fontFamily: "'DM Mono', monospace" }}>
                Rs.{fmt(filteredBuckets.reduce((sum, b) => sum + Number(b.due || 0), 0))}
              </Typography>
            </Box>
          )}
        </Box>

      </Box>
    </Box>
  );
};

export default SupplierPayment;