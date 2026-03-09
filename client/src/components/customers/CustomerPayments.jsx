import { useEffect, useMemo, useRef, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Card,
  Checkbox,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  ListItemText,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import toast from "react-hot-toast";
import { getInvoices, updateInvoice } from "../../services/invoiceService";
import { saveCustomer } from "../../services/customerService";
import { formatCurrency, getInvoicePaymentMetrics } from "../../utils/invoiceMetrics";
import { useLocation, useNavigate } from "react-router-dom";
import CloseIcon from "@mui/icons-material/Close";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import InvoicePrint from "../billing/InvoicePrint";

const sectionCardSx = {
  borderRadius: "12px",
  border: "1px solid #dbe5f0",
  boxShadow: "0 6px 20px rgba(15,35,60,0.06)",
  overflow: "hidden",
};

const headerSx = {
  px: 2,
  py: 1.4,
  background: "#fafcfe",
  borderBottom: "1px solid #e2e8f0",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "10px",
    background: "#fff",
    fontSize: 13,
    "& fieldset": { borderColor: "#d8e1eb" },
    "&:hover fieldset": { borderColor: "#1a56a0" },
    "&.Mui-focused fieldset": { borderColor: "#1a56a0", borderWidth: 2 },
  },
  "& .MuiInputLabel-root": { fontSize: 13 },
};

const fieldLabelSx = {
  mb: 0.55,
  fontSize: 10,
  fontWeight: 800,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: ".08em",
};

const paymentModes = ["Cash", "UPI", "Card", "Bank Transfer", "Cheque"];
const normPhone = (v) => String(v || "").replace(/\D/g, "");
const openWhatsAppChat = (phone, message) => {
  const isMobile = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent || "");
  const url = isMobile
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
};

// Status badge
const StatusBadge = ({ status }) => {
  const cfg =
    status === "Paid"
      ? { color: "#166534", bg: "#dcfce7", border: "#bbf7d0" }
      : status === "Partial"
      ? { color: "#92400e", bg: "#fef3c7", border: "#fde68a" }
      : { color: "#991b1b", bg: "#fee2e2", border: "#fecaca" };
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        px: 1,
        py: 0.15,
        borderRadius: "5px",
        fontSize: 10,
        fontWeight: 700,
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        ml: 0.5,
      }}
    >
      {status}
    </Box>
  );
};

const CustomerPayments = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // Store prefill data in refs so clearing navigation state doesn't lose them
  const prefillCustomerRef = useRef(location.state?.prefillCustomer || {});
  const prefillInvoiceRef = useRef(location.state?.prefillInvoice || {});
  const hasPrefillRef = useRef(Boolean(
    location.state?.fromPayAction ||
    location.state?.fromMoveToPayment ||
    location.state?.prefillCustomer ||
    location.state?.prefillInvoice
  ));
  const hasPrefill = hasPrefillRef.current;

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState("");
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10));
  const [amountReceived, setAmountReceived] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [transactionRef, setTransactionRef] = useState("");
  const [remarks, setRemarks] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const previewRef = useRef(null);

  const fetchInvoices = async () => {
    try {
      const res = await getInvoices();
      setInvoices(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load invoices");
    }
  };

  // Clear navigation state once on mount so back-navigation doesn't re-prefill
  useEffect(() => {
    if (hasPrefill) {
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchInvoices(); }, []);

  // When navigating from "Move to Payment", the new invoice may not be in the
  // first fetch response yet (DB write vs read race). Retry after a short delay.
  useEffect(() => {
    if (!hasPrefill || !prefillInvoiceRef.current?.id) return;
    const timer = setTimeout(() => fetchInvoices(), 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allBuckets = useMemo(() => {
    const map = new Map();
    invoices.forEach((invoice) => {
      const customer = invoice?.customer || {};
      const key = `${customer.name || "Unknown"}|${customer.phone || ""}`;
      if (!map.has(key)) map.set(key, { key, customer, invoices: [], due: 0 });
      const bucket = map.get(key);
      const metrics = getInvoicePaymentMetrics(invoice);
      bucket.invoices.push(invoice);
      bucket.due += Number(metrics.dueAmount || 0);
    });
    return Array.from(map.values()).sort((a, b) => b.due - a.due);
  }, [invoices]);

  const buckets = useMemo(() => allBuckets.filter((e) => e.due > 0), [allBuckets]);

  // Two separate refs: one for customer selection, one for invoice selection
  const customerPrefillDoneRef = useRef(false);
  const invoicePrefillDoneRef = useRef(false);
  const amountPrefillDoneRef = useRef(false);
  const skipNextResetRef = useRef(false);

  // ── Step 1: match customer bucket once invoices load ──────────────────
  useEffect(() => {
    if (!hasPrefill || allBuckets.length === 0) return;

    const pInvoice = prefillInvoiceRef.current;
    const pCustomer = prefillCustomerRef.current;

    // Always re-attempt invoice ID match on every allBuckets update (handles race with new invoice)
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
        return; // Step 2 will handle invoice selection
      }
    }

    // Fallback: match by customer name + phone (customer found but invoice not yet in DB)
    if (!customerPrefillDoneRef.current && pCustomer?.name) {
      const prefilled = allBuckets.find((e) =>
        (e.customer?.name || "").trim().toLowerCase() === pCustomer.name.trim().toLowerCase() &&
        (pCustomer.phone
          ? normPhone(e.customer?.phone) === normPhone(pCustomer.phone)
          : true)
      );
      if (prefilled) {
        customerPrefillDoneRef.current = true;
        // Only mark invoice done if there's no specific invoice ID to wait for
        if (!pInvoice?.id) invoicePrefillDoneRef.current = true;
        skipNextResetRef.current = true;
        setSelectedKey(prefilled.key);
      }
    }
  }, [allBuckets, hasPrefill]);

  const selectedBucket = useMemo(() => allBuckets.find((e) => e.key === selectedKey) || null, [allBuckets, selectedKey]);

  // ── Step 2: auto-select the specific invoice once it appears in the bucket ─
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
    // If not found yet, a subsequent fetchInvoices will update allBuckets → selectedBucket,
    // causing this effect to re-run until the invoice appears.
  }, [selectedBucket, hasPrefill]);

  // Reset form fields only on manual customer change (after prefill is fully done)
  useEffect(() => {
    // Both steps must be done before we allow reset on selectedKey change
    if (!customerPrefillDoneRef.current || !invoicePrefillDoneRef.current) return;
    if (skipNextResetRef.current) {
      skipNextResetRef.current = false;
      return;
    }
    setAmountReceived("");
    setSelectedInvoiceIds([]);
  }, [selectedKey]);

  const selectedInvoices = useMemo(() => {
    if (!selectedBucket || selectedInvoiceIds.length === 0) return [];
    const idSet = new Set(selectedInvoiceIds);
    return selectedBucket.invoices?.filter((inv) => idSet.has(inv._id)) || [];
  }, [selectedBucket, selectedInvoiceIds]);

  // ── All selected invoices are fully paid? ──────────────────────────────
  const allSelectedArePaid = useMemo(() => {
    if (selectedInvoiceIds.length === 0) return false;
    return selectedInvoices.every((inv) => getInvoicePaymentMetrics(inv).dueAmount <= 0);
  }, [selectedInvoices, selectedInvoiceIds]);

  // ── Invoice options: ALL invoices shown, but grouped & labelled clearly ─
  const invoiceOptions = useMemo(() => {
    if (!selectedBucket) return [];
    return selectedBucket.invoices
      .slice()
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .map((inv) => {
        const m = getInvoicePaymentMetrics(inv);
        const isPaid = m.dueAmount <= 0;
        const status = isPaid ? "Paid" : Number(m.paidAmount || 0) > 0 ? "Partial" : "Pending";
        return {
          id: inv._id,
          invoiceNo: inv.invoiceNo || "INV",
          // Show pending due amount — show 0 if paid
          label: isPaid
            ? `${inv.invoiceNo || "INV"} | Due: ₹0  (Paid)`
            : `${inv.invoiceNo || "INV"} | Due: ₹${formatCurrency(m.dueAmount)} | ${status}`,
          isPaid,
          status,
          dueAmount: m.dueAmount,
          amount: m.amount,
        };
      });
  }, [selectedBucket]);

  const outstanding = Number(selectedBucket?.due || 0);
  const selectedInvoicesOutstanding = selectedInvoices.reduce(
    (sum, inv) => sum + Number(getInvoicePaymentMetrics(inv).dueAmount || 0),
    0
  );
  const payableOutstanding = selectedInvoices.length > 0 ? selectedInvoicesOutstanding : outstanding;
  const receiptNo = useMemo(() => `RCP-${String(Date.now()).slice(-4)}`, []);

  // Step 3: auto-fill payment amount once selected invoice/customer is ready
  useEffect(() => {
    if (!hasPrefill || amountPrefillDoneRef.current) return;
    if (!customerPrefillDoneRef.current || !invoicePrefillDoneRef.current) return;

    const pInvoice = prefillInvoiceRef.current || {};
    const rawDue = Number(pInvoice.dueAmount);
    const due = Number.isFinite(rawDue) ? rawDue : payableOutstanding;
    const next = Math.max(0, Math.min(Number(due) || 0, payableOutstanding));
    setAmountReceived(next > 0 ? String(next) : "");
    amountPrefillDoneRef.current = true;
  }, [hasPrefill, payableOutstanding]);

  useEffect(() => {
    if (amountReceived === "") return;
    const current = Number(amountReceived) || 0;
    const clamped = Math.max(0, Math.min(current, payableOutstanding));
    if (clamped !== current) setAmountReceived(String(clamped));
  }, [payableOutstanding, amountReceived]);

  // ── Amount field change — guard paid invoices ──────────────────────────
  const handleAmountChange = (value) => {
    if (allSelectedArePaid) {
      toast.error("This invoice is already paid. No amount due.", { id: "paid-invoice-warn", icon: "🚫" });
      return;
    }
    if (value === "") { setAmountReceived(""); return; }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    const clamped = Math.max(0, Math.min(parsed, payableOutstanding));
    setAmountReceived(String(clamped));
  };

  const handleQuick = (val) => {
    if (allSelectedArePaid) {
      toast.error("This invoice is already paid. No amount due.", { id: "paid-invoice-warn", icon: "🚫" });
      return;
    }
    const next = Math.min(payableOutstanding, val);
    setAmountReceived(String(next));
  };

  // ── Invoice selection handler ──────────────────────────────────────────
  const handleInvoiceSelection = (value) => {
    if (!Array.isArray(value)) { setSelectedInvoiceIds([]); return; }
    if (value.includes("__ALL__")) { setSelectedInvoiceIds([]); setAmountReceived(""); return; }
    setSelectedInvoiceIds(value);
    // Check if ALL newly selected are paid
    const selectedOpts = invoiceOptions.filter((o) => value.includes(o.id));
    const allPaid = selectedOpts.length > 0 && selectedOpts.every((o) => o.isPaid);
    if (allPaid) {
      toast.error("Selected invoice(s) are already fully paid.", { id: "paid-invoice-warn", icon: "🚫" });
      setAmountReceived("");
    }
  };

  const againstInvoices = useMemo(() => {
    if (!selectedBucket) return "";
    if (selectedInvoices.length > 0) {
      return selectedInvoices.map((inv) => {
        const m = getInvoicePaymentMetrics(inv);
        const status = m.dueAmount <= 0 ? "Paid" : Number(m.paidAmount || 0) > 0 ? "Partial" : "Pending";
        return `${inv.invoiceNo || "INV"} | Due: ₹${formatCurrency(m.dueAmount)} | ${status}`;
      }).join("\n");
    }
    return selectedBucket.invoices.slice()
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .map((inv) => {
        const m = getInvoicePaymentMetrics(inv);
        const status = m.dueAmount <= 0 ? "Paid" : Number(m.paidAmount || 0) > 0 ? "Partial" : "Pending";
        return `${inv.invoiceNo || "INV"} | Due: ₹${formatCurrency(m.dueAmount)} | ${status}`;
      }).join("\n");
  }, [selectedBucket, selectedInvoices]);

  const applyPayment = async () => {
    if (!selectedBucket) { toast.error("Select customer"); return null; }
    if (allSelectedArePaid) {
      toast.error("Selected invoice(s) are already fully paid.", { id: "paid-invoice-warn", icon: "🚫" });
      return null;
    }
    const received = Number(amountReceived) || 0;
    if (received <= 0) { toast.error("Enter valid received amount"); return null; }
    if (received > payableOutstanding) { toast.error("Received amount cannot exceed selected outstanding"); return null; }

    setLoading(true);
    try {
      const beforeOutstanding = payableOutstanding;
      let balance = received;
      const baseInvoices = selectedInvoices.length > 0 ? selectedInvoices : selectedBucket.invoices;
      const pendingInvoices = baseInvoices
        .map((inv) => ({ inv, metrics: getInvoicePaymentMetrics(inv) }))
        .filter((row) => row.metrics.dueAmount > 0)
        .sort((a, b) => new Date(a.inv.createdAt || 0) - new Date(b.inv.createdAt || 0));
      const updatedInvoices = [];

      for (const row of pendingInvoices) {
        if (balance <= 0) break;
        const payNow = Math.min(balance, row.metrics.dueAmount);
        const paidAmount = Number(row.metrics.paidAmount || 0) + payNow;
        const dueAmount = Math.max(0, Number(row.metrics.dueAmount || 0) - payNow);
        const status = dueAmount <= 0 ? "Paid" : paidAmount > 0 ? "Partial" : "Pending";
        const updateRes = await updateInvoice(row.inv._id, {
          status,
          payment: {
            ...(row.inv.payment || {}),
            amount: row.metrics.amount,
            method: paymentMode === "Cash" ? "CASH" : paymentMode,
            paidAmount, dueAmount,
            paymentType: dueAmount <= 0 ? "Full Payment" : "Partial",
            referenceNo: transactionRef,
          },
          notes: remarks || row.inv.notes || "",
        });
        updatedInvoices.push(updateRes?.data || { ...row.inv, status });
        balance -= payNow;
      }

      await saveCustomer({
        ...(selectedBucket.customer || {}),
        amount: 0,
        status: received >= payableOutstanding ? "Paid" : "Partial",
        method: paymentMode === "Cash" ? "CASH" : paymentMode,
      });

      const payload = {
        receiptNo, date: receiptDate,
        customerName: selectedBucket.customer?.name || "",
        customerPhone: selectedBucket.customer?.phone || "",
        mode: paymentMode, received,
        outstandingBefore: beforeOutstanding,
        outstandingAfter: Math.max(0, beforeOutstanding - received),
        transactionRef, remarks, againstInvoices,
        invoicePreviewData: updatedInvoices[updatedInvoices.length - 1] || null,
      };

      toast.success("Payment saved");
      setAmountReceived(""); setTransactionRef(""); setRemarks("");
      await fetchInvoices();
      return payload;
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to save payment");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const payload = await applyPayment();
    if (!payload) return;
    setSelectedKey(""); setSelectedInvoiceIds([]); setAmountReceived("");
    setPaymentMode("Cash"); setTransactionRef(""); setRemarks("");
    setReceiptDate(new Date().toISOString().slice(0, 10));
  };

  const resetPaymentFields = () => {
    setSelectedKey("");
    setSelectedInvoiceIds([]);
    setAmountReceived("");
    setPaymentMode("Cash");
    setTransactionRef("");
    setRemarks("");
    setReceiptDate(new Date().toISOString().slice(0, 10));
  };

  const handleGenerateInvoice = async () => {
    const payload = await applyPayment();
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
    const pdf = new jsPDF("p", "mm", "a4");
    const imgWidth = 210;
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, imgWidth, (canvas.height * imgWidth) / canvas.width);
    const fileName = `Receipt-${previewData?.receiptNo || "RCP"}.pdf`;
    return { pdf, fileName };
  };

  const handlePreviewDownload = async () => {
    const doc = await buildPreviewPdf();
    if (!doc) return;
    doc.pdf.save(doc.fileName);
  };

  const handlePreviewWhatsapp = async () => {
    if (!previewData) { toast.error("Generate invoice first"); return; }
    const toDigits = String(previewData.customerPhone || "").replace(/\D/g, "");
    if (!toDigits) { toast.error("Customer phone number is required for WhatsApp"); return; }
    const phone = toDigits.length === 10 ? `91${toDigits}` : toDigits;
    const invoiceNo = previewData?.invoicePreviewData?.invoiceNo || "Payment Receipt";
    const message = [
      `Hello ${previewData.customerName || "Customer"},`,
      "Your payment receipt is ready.",
      `Invoice No: ${invoiceNo}`,
      `Amount Received: Rs.${formatCurrency(previewData.received || 0)}`,
      `Outstanding After: Rs.${formatCurrency(previewData.outstandingAfter || 0)}`,
      `Date: ${previewData.date || receiptDate}`,
    ].join("\n");
    try {
      const doc = await buildPreviewPdf();
      if (!doc) {
        openWhatsAppChat(phone, message);
        return;
      }

      const pdfBlob = doc.pdf.output("blob");
      const pdfFile = new File([pdfBlob], doc.fileName, { type: "application/pdf" });
      if (navigator.share && navigator.canShare?.({ files: [pdfFile] })) {
        await navigator.share({
          title: doc.fileName,
          text: message,
          files: [pdfFile],
        });
        return;
      }

      doc.pdf.save(doc.fileName);
      openWhatsAppChat(phone, message);
      toast.success("PDF downloaded. Please attach it in WhatsApp.");
    } catch {
      openWhatsAppChat(phone, message);
    }
  };

  const handlePreviewDone = () => {
    setPreviewOpen(false);
    setPreviewData(null);
    setPreviewInvoice(null);
    resetPaymentFields();
    toast.success("Done");
  };

  return (
    <Box sx={{ p: 0, background: "#f0f4f8", minHeight: "100%" }}>
      {/* ── Page header ── */}
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#0f172a", lineHeight: 1, fontFamily: "Rajdhani, sans-serif" }}>
          Receive Payment
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: 12, color: "#64748b" }}>
          {new Date(`${receiptDate}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </Typography>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 2fr) minmax(300px, 1fr)" }, gap: 1.8 }}>

        {/* ── Left: payment form ── */}
        <Card sx={sectionCardSx}>
          <Box sx={headerSx}>
            <Typography sx={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>Receive Payment from Customer</Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 800, color: "#1a56a0" }}>{receiptNo}</Typography>
          </Box>

          <Box sx={{ p: 2 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1.4 }}>

              {/* Customer */}
              <Box>
                <Typography sx={fieldLabelSx}>Customer *</Typography>
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
                <Typography sx={fieldLabelSx}>Receipt Date</Typography>
                <TextField fullWidth size="small" type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} sx={inputSx} />
              </Box>

              {/* Outstanding */}
              <Box>
                <Typography sx={fieldLabelSx}>Outstanding Balance</Typography>
                <TextField
                  fullWidth size="small"
                  value={`₹${formatCurrency(payableOutstanding)}`}
                  sx={{
                    ...inputSx,
                    "& .MuiOutlinedInput-root": {
                      ...inputSx["& .MuiOutlinedInput-root"],
                      background: payableOutstanding > 0 ? "#fff8f8" : "#f0fdf4",
                    },
                  }}
                  InputProps={{ readOnly: true }}
                />
              </Box>

              {/* Amount received */}
              <Box>
                <Typography sx={fieldLabelSx}>Amount Received (₹) *</Typography>
                <TextField
                  fullWidth size="small" type="number"
                  value={amountReceived}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  onClick={() => {
                    if (allSelectedArePaid)
                      toast.error("This invoice is already paid. No amount due.", { id: "paid-invoice-warn", icon: "🚫" });
                  }}
                  disabled={allSelectedArePaid}
                  sx={{
                    ...inputSx,
                    "& .MuiOutlinedInput-root": {
                      ...inputSx["& .MuiOutlinedInput-root"],
                      background: allSelectedArePaid ? "#f0fdf4" : "#fff",
                    },
                  }}
                  inputProps={{ min: 0, max: payableOutstanding, step: "0.01" }}
                />
                {allSelectedArePaid ? (
                  <Typography sx={{ mt: 0.6, fontSize: 11, color: "#166534", fontWeight: 600 }}>
                    ✓ Invoice already fully paid — no amount due
                  </Typography>
                ) : (
                  <Box sx={{ mt: 0.8, display: "flex", gap: 0.6, flexWrap: "wrap" }}>
                    {[500, 1000, 5000, 10000, 50000].map((val) => (
                      <Button
                        key={val}
                        size="small"
                        variant="outlined"
                        onClick={() => handleQuick(val)}
                        sx={{
                          minWidth: 44, py: 0.3, fontSize: 11, borderRadius: "7px",
                          borderColor: "#cbd5e1", color: "#475569",
                          "&:hover": { borderColor: "#1a56a0", color: "#1a56a0", background: "#eff6ff" },
                        }}
                      >
                        {val >= 1000 ? `${val / 1000}K` : val}
                      </Button>
                    ))}
                  </Box>
                )}
              </Box>

              {/* Payment mode */}
              <Box>
                <Typography sx={fieldLabelSx}>Payment Mode *</Typography>
                <TextField select fullWidth size="small" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} sx={inputSx}>
                  {paymentModes.map((mode) => <MenuItem key={mode} value={mode}>{mode}</MenuItem>)}
                </TextField>
              </Box>

              {/* Txn ref */}
              <Box>
                <Typography sx={fieldLabelSx}>Transaction / Ref No.</Typography>
                <TextField fullWidth size="small" value={transactionRef} onChange={(e) => setTransactionRef(e.target.value)} sx={inputSx} placeholder="UPI ref / Cheque no." />
              </Box>

              {/* Against invoices */}
              <Box>
                <Typography sx={fieldLabelSx}>Against Invoice(s)</Typography>
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
                      if (ids.length === 0) return "All Pending Invoices";
                      return `${ids.length} invoice(s) selected`;
                    },
                  }}
                >
                  {/* All pending option */}
                  <MenuItem value="__ALL__">
                    <Checkbox size="small" checked={selectedInvoiceIds.length === 0} />
                    <ListItemText primary="All Pending Invoices" />
                  </MenuItem>

                  {/* Each invoice — paid ones shown but visually dimmed */}
                  {invoiceOptions.map((opt) => (
                    <MenuItem key={opt.id} value={opt.id} sx={{ opacity: opt.isPaid ? 0.6 : 1 }}>
                      <Checkbox size="small" checked={selectedInvoiceIds.includes(opt.id)} />
                      <ListItemText
                        primary={
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                            <Typography sx={{ fontSize: 13, fontWeight: 600, color: opt.isPaid ? "#64748b" : "#0f172a" }}>
                              {opt.invoiceNo}
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: opt.isPaid ? "#94a3b8" : "#dc2626", fontWeight: 700 }}>
                              {opt.isPaid ? "Due: ₹0" : `Due: ₹${formatCurrency(opt.dueAmount)}`}
                            </Typography>
                            <StatusBadge status={opt.status} />
                          </Box>
                        }
                      />
                    </MenuItem>
                  ))}
                </TextField>

                {/* Selected invoice preview box */}
                <Box sx={{ mt: 0.8, p: 1.1, border: "1px solid #e2e8f0", borderRadius: "8px", background: "#f8fbff", maxHeight: 110, overflowY: "auto" }}>
                  {selectedInvoiceIds.length > 0 ? (
                    selectedInvoices.map((inv) => {
                      const m = getInvoicePaymentMetrics(inv);
                      const isPaid = m.dueAmount <= 0;
                      const status = isPaid ? "Paid" : Number(m.paidAmount || 0) > 0 ? "Partial" : "Pending";
                      return (
                        <Box key={inv._id} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.4 }}>
                          <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
                            {inv.invoiceNo || "INV"}
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: isPaid ? "#94a3b8" : "#dc2626", fontWeight: 700 }}>
                            {isPaid ? "Due: ₹0" : `Due: ₹${formatCurrency(m.dueAmount)}`}
                          </Typography>
                          <StatusBadge status={status} />
                        </Box>
                      );
                    })
                  ) : (
                    <Typography sx={{ fontSize: 12, color: "#64748b" }}>
                      All pending invoices will be included.
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Remarks */}
              <Box>
                <Typography sx={fieldLabelSx}>Remarks</Typography>
                <TextField fullWidth size="small" multiline rows={4} value={remarks} onChange={(e) => setRemarks(e.target.value)} sx={inputSx} placeholder="Part payment / full payment" />
              </Box>
            </Box>

            {/* Action buttons */}
            <Box sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={loading || allSelectedArePaid}
                sx={{ textTransform: "none", borderRadius: "9px", px: 2.5, fontWeight: 700, background: "#198754", "&:hover": { background: "#157347" } }}
              >
                {loading ? "Saving…" : "Save"}
              </Button>
              <Button
                variant="contained"
                onClick={handleGenerateInvoice}
                disabled={loading || allSelectedArePaid}
                sx={{ textTransform: "none", borderRadius: "9px", px: 2.5, fontWeight: 700, background: "#1a56a0", "&:hover": { background: "#0f3d7a" } }}
              >
                {loading ? "Processing…" : "Generate Invoice"}
              </Button>
              <Button
                variant="contained"
                onClick={resetPaymentFields}
                disabled={loading}
                sx={{
                  textTransform: "none",
                  borderRadius: "9px",
                  px: 2.5,
                  fontWeight: 700,
                  background: "#64748b",
                  color: "#ffffff",
                  "&:hover": { background: "#475569" },
                }}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        </Card>

        {/* ── Right: pending collections ── */}
        <Card sx={sectionCardSx}>
          <Box sx={headerSx}>
            <Typography sx={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>Pending Collections</Typography>
            <Box sx={{ px: 1.2, py: 0.2, borderRadius: "6px", background: "#fee2e2", border: "1px solid #fecaca" }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#991b1b" }}>{buckets.length}</Typography>
            </Box>
          </Box>

          <Box sx={{ overflowY: "auto", maxHeight: "calc(100vh - 180px)" }}>
            {buckets.map((entry) => {
              const isSelected = selectedKey === entry.key;
              return (
                <Box
                  key={entry.key}
                  onClick={() => setSelectedKey(entry.key)}
                  sx={{
                    px: 2,
                    py: 1.4,
                    borderBottom: "1px solid #f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    cursor: "pointer",
                    background: isSelected ? "#eff6ff" : "#fff",
                    borderLeft: isSelected ? "3px solid #1a56a0" : "3px solid transparent",
                    transition: "all 0.12s ease",
                    "&:hover": { background: isSelected ? "#eff6ff" : "#fafcfe" },
                  }}
                >
                  <Box>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: isSelected ? "#1a56a0" : "#0f172a" }}>
                      {entry.customer.name || "-"}
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: "#64748b", mt: 0.2 }}>
                      {entry.customer.phone || "-"}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 800, color: "#dc2626" }}>
                      ₹{formatCurrency(entry.due)}
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: "#94a3b8", mt: 0.2 }}>outstanding</Typography>
                  </Box>
                </Box>
              );
            })}
            {buckets.length === 0 && (
              <Box sx={{ py: 5, textAlign: "center" }}>
                <Typography sx={{ fontSize: 13, color: "#94a3b8" }}>No pending collections</Typography>
              </Box>
            )}
          </Box>
        </Card>
      </Box>

      {/* ── Preview Dialog ── */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 800 }}>
          Payment Invoice
          <IconButton onClick={() => setPreviewOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Box ref={previewRef} sx={{ p: 1, border: "1px solid #e2e8f0", borderRadius: "8px", mb: 1.4, overflow: "hidden" }}>
            {previewInvoice ? (
              <Box id="customer-payment-invoice-preview" sx={{ width: 620, mx: "auto" }}>
                <Box sx={{ width: 794, transform: "scale(0.78)", transformOrigin: "top left" }}>
                  <InvoicePrint data={previewInvoice} />
                </Box>
              </Box>
            ) : (
              <Box sx={{ p: 1 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 18 }}>Payment Receipt</Typography>
                <Typography sx={{ fontSize: 12, color: "#64748b", mb: 1 }}>No: {previewData?.receiptNo || "-"} | Date: {previewData?.date || "-"}</Typography>
                {[
                  ["Customer", previewData?.customerName],
                  ["Mobile", previewData?.customerPhone],
                  ["Payment Mode", previewData?.mode],
                  ["Amount Received", `₹${formatCurrency(previewData?.received || 0)}`],
                  ["Outstanding Before", `₹${formatCurrency(previewData?.outstandingBefore || 0)}`],
                  ["Outstanding After", `₹${formatCurrency(previewData?.outstandingAfter || 0)}`],
                ].map(([label, value]) => (
                  <Typography key={label} sx={{ fontSize: 13 }}><strong>{label}:</strong> {value || "-"}</Typography>
                ))}
                <Typography sx={{ fontSize: 13, mt: 0.8 }}><strong>Against:</strong></Typography>
                <Typography sx={{ fontSize: 12, whiteSpace: "pre-line" }}>{previewData?.againstInvoices || "-"}</Typography>
                {previewData?.transactionRef && <Typography sx={{ fontSize: 12, mt: 0.8 }}><strong>Ref:</strong> {previewData.transactionRef}</Typography>}
                {previewData?.remarks && <Typography sx={{ fontSize: 12 }}><strong>Remarks:</strong> {previewData.remarks}</Typography>}
              </Box>
            )}
          </Box>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button variant="outlined" onClick={handlePreviewPrint} sx={{ textTransform: "none", borderRadius: "8px" }}>Print</Button>
            <Button variant="outlined" onClick={handlePreviewDownload} sx={{ textTransform: "none", borderRadius: "8px" }}>Download</Button>
            <Button variant="contained" onClick={handlePreviewWhatsapp} sx={{ textTransform: "none", borderRadius: "8px", background: "#22c55e", "&:hover": { background: "#16a34a" } }}>
              Send To WhatsApp
            </Button>
            <Button variant="contained" onClick={handlePreviewDone} sx={{ textTransform: "none", borderRadius: "8px", background: "#1a56a0", "&:hover": { background: "#0f3d7a" } }}>
              Done
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default CustomerPayments;
