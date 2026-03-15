import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  TextField,
  IconButton,
  Collapse,
  InputAdornment,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import PeopleIcon from "@mui/icons-material/People";
import SearchIcon from "@mui/icons-material/Search";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { getInvoices, updateInvoice, deleteInvoice } from "../../services/invoiceService";
import { saveCustomer, getCustomers } from "../../services/customerService";
import { formatCurrency, getInvoicePaymentMetrics, groupInvoicesByCustomer } from "../../utils/invoiceMetrics";
import ConfirmDialog from "../common/ConfirmDialog";

/* ── Constants ── */
const TYPE_SECTIONS = [
  { key: "Retail Customer",   title: "Retail Customers", color: "#2563eb", bg: "#eff6ff" },
  { key: "Dealer",            title: "Dealers",          color: "#0891b2", bg: "#ecfeff" },
  { key: "Contractor",        title: "Contractors",      color: "#7c3aed", bg: "#f5f3ff" },
  { key: "Builder / Project", title: "Builder / Projects", color: "#d97706", bg: "#fffbeb" },
];

const normalizeCustomerType = (value) => {
  if (value === "Dealer"   || value === "Wholesale") return "Dealer";
  if (value === "Contractor" || value === "B2B")     return "Contractor";
  if (value === "Builder / Project")                 return "Builder / Project";
  return "Retail Customer";
};

/* ── Design tokens ── */
const T = {
  primary:      "#1a56a0",
  primaryDark:  "#0f3d7a",
  primaryLight: "#eef4fd",
  dark:         "#0f172a",
  text:         "#1e293b",
  muted:        "#64748b",
  faint:        "#94a3b8",
  border:       "#dde3ed",
  borderLight:  "#e8eef6",
  bg:           "#f1f5f9",
  surface:      "#ffffff",
  surfaceAlt:   "#f8fafc",
  success:      "#15803d",
  successLight: "#f0fdf4",
  danger:       "#b91c1c",
  dangerLight:  "#fef2f2",
  warning:      "#92400e",
  warningLight: "#fef3c7",
};

/* ── Status badge ── */
const statusCfg = {
  Paid:    { color: T.success, bg: T.successLight, border: "#bbf7d0" },
  Partial: { color: T.warning, bg: T.warningLight, border: "#fde68a" },
  Pending: { color: T.danger,  bg: T.dangerLight,  border: "#fecaca" },
};

const StatusChip = ({ status }) => {
  const cfg = statusCfg[status] || statusCfg.Pending;
  return (
    <Box sx={{
      display: "inline-flex", alignItems: "center",
      px: 1.2, py: "3px",
      fontSize: 11, fontWeight: 700,
      color: cfg.color, background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      letterSpacing: ".03em",
      borderRadius: 0,
    }}>
      {status}
    </Box>
  );
};

/* ── Shared input style — zero radius ── */
const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 0,
    fontSize: 13,
    background: T.surface,
    "& fieldset": { borderColor: T.border },
    "&:hover fieldset": { borderColor: T.primary },
    "&.Mui-focused fieldset": { borderColor: T.primary, borderWidth: 1.5 },
    "&.Mui-focused": { boxShadow: `0 0 0 3px rgba(26,86,160,.08)` },
  },
  "& .MuiInputLabel-root":             { fontSize: 13, color: T.muted },
  "& .MuiInputLabel-root.Mui-focused": { color: T.primary },
};

/* ── Action text button ── */
const ActBtn = ({ label, color, hoverBg, onClick, disabled }) => (
  <Box
    onClick={!disabled ? onClick : undefined}
    sx={{
      px: "9px", py: "4px",
      fontSize: 12, fontWeight: 700,
      color: disabled ? T.faint : color,
      cursor: disabled ? "default" : "pointer",
      userSelect: "none",
      "&:hover": !disabled ? { background: hoverBg } : {},
      transition: "background .12s",
    }}>
    {label}
  </Box>
);

/* ─── Payment Dialog ────────────────────────────────────── */
const PaymentDialog = ({ invoice, open, onClose, onSaved }) => {
  const [paymentType,    setPaymentType]    = useState("Full Payment");
  const [method,         setMethod]         = useState("CASH");
  const [partialAmount,  setPartialAmount]  = useState("");
  const [loading,        setLoading]        = useState(false);

  const metrics = useMemo(() => getInvoicePaymentMetrics(invoice || {}), [invoice]);
  const { amount, paidAmount: existingPaid, dueAmount: remaining } = metrics;

  useEffect(() => {
    if (!invoice) return;
    setPaymentType(
      invoice?.payment?.paymentType ||
      (invoice?.status === "Partial" ? "Partial" : invoice?.status === "Paid" ? "Full Payment" : "Pending")
    );
    setMethod(invoice?.payment?.method || "CASH");
    setPartialAmount("");
  }, [invoice]);

  const handleSave = async () => {
    if (!invoice) return;
    let payNow = remaining;
    if (paymentType === "Pending") payNow = 0;
    if (paymentType === "Partial") {
      payNow = Number(partialAmount) || 0;
      if (payNow <= 0 || payNow >= remaining) {
        toast.error("Partial amount should be > 0 and < remaining due");
        return;
      }
    }
    const newPaid   = Math.min(amount, existingPaid + payNow);
    const newDue    = Math.max(0, amount - newPaid);
    const status    = newDue === 0 ? "Paid" : newPaid > 0 ? "Partial" : "Pending";
    setLoading(true);
    try {
      await updateInvoice(invoice._id, {
        status,
        payment: { ...invoice.payment, amount, method: paymentType === "Pending" ? "" : method, paidAmount: newPaid, dueAmount: newDue, paymentType },
      });
      await saveCustomer({ ...invoice.customer, amount: 0, status, method: paymentType === "Pending" ? "" : method });
      toast.success("Payment updated");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to update payment");
    } finally { setLoading(false); }
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"
      PaperProps={{ sx: { borderRadius: 0, boxShadow: "0 24px 64px rgba(0,0,0,.14)" } }}>

      {/* Dialog header */}
      <Box sx={{ px: 3, py: 2, borderBottom: `2px solid ${T.primary}`, background: `linear-gradient(to right, ${T.primaryLight}, ${T.surface})`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box>
          <Typography sx={{ fontSize: 15, fontWeight: 800, color: T.dark, lineHeight: 1.15 }}>Update Payment</Typography>
          <Typography sx={{ fontSize: 11, color: T.muted }}>Invoice: {invoice.invoiceNo || "—"}</Typography>
        </Box>
        <Box onClick={onClose} sx={{ cursor: "pointer", color: T.faint, fontSize: 18, lineHeight: 1, "&:hover": { color: T.danger } }}>✕</Box>
      </Box>

      <DialogContent sx={{ p: 2.5 }}>
        {/* Summary strip */}
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", mb: 2.5, border: `1px solid ${T.border}`, overflow: "hidden" }}>
          {[
            { label: "Invoice",   value: invoice.invoiceNo || "—" },
            { label: "Total",     value: `₹${formatCurrency(amount)}` },
            { label: "Remaining", value: `₹${formatCurrency(remaining)}` },
          ].map((item, i) => (
            <Box key={item.label} sx={{ px: 2, py: 1.4, textAlign: "center", borderRight: i < 2 ? `1px solid ${T.border}` : "none", background: T.surfaceAlt }}>
              <Typography sx={{ fontSize: 10, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", mb: 0.4 }}>{item.label}</Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 800, color: T.dark }}>{item.value}</Typography>
            </Box>
          ))}
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <TextField select fullWidth size="small" label="Payment Type" value={paymentType} onChange={(e) => setPaymentType(e.target.value)} sx={inputSx}>
            <MenuItem value="Full Payment">Full Payment</MenuItem>
            <MenuItem value="Partial">Partial</MenuItem>
            <MenuItem value="Pending">Pending</MenuItem>
          </TextField>
          {paymentType === "Partial" && (
            <TextField fullWidth size="small" type="number" label="Partial Amount" value={partialAmount} onChange={(e) => setPartialAmount(e.target.value)} sx={inputSx} />
          )}
          <TextField select fullWidth size="small" label="Payment Method" value={method} disabled={paymentType === "Pending"} onChange={(e) => setMethod(e.target.value)} sx={inputSx}>
            <MenuItem value="CASH">Cash</MenuItem>
            <MenuItem value="UPI">UPI</MenuItem>
            <MenuItem value="CARD">Card</MenuItem>
            <MenuItem value="Cheque">Cheque</MenuItem>
          </TextField>
        </Box>
      </DialogContent>

      <Box sx={{ px: 2.5, py: 2, borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 1, background: T.surfaceAlt }}>
        <Box onClick={onClose} sx={{ px: 2.2, py: "8px", fontSize: 13, fontWeight: 600, color: T.muted, cursor: "pointer", border: `1px solid ${T.border}`, "&:hover": { borderColor: T.danger, color: T.danger }, transition: "all .12s", userSelect: "none" }}>
          Cancel
        </Box>
        <Box onClick={!loading ? handleSave : undefined} sx={{ px: 2.8, py: "8px", fontSize: 13, fontWeight: 700, color: "#fff", cursor: loading ? "default" : "pointer", background: loading ? T.faint : `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`, boxShadow: loading ? "none" : "0 4px 14px rgba(26,86,160,.28)", "&:hover": !loading ? { filter: "brightness(1.08)" } : {}, transition: "all .12s", userSelect: "none" }}>
          {loading ? "Saving..." : "Save Payment"}
        </Box>
      </Box>
    </Dialog>
  );
};

/* ─── Invoice View Dialog ───────────────────────────────── */
const InvoiceViewDialog = ({ invoice, open, onClose }) => {
  if (!invoice) return null;
  const metrics = getInvoicePaymentMetrics(invoice);
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md"
      PaperProps={{ sx: { borderRadius: 0, boxShadow: "0 24px 64px rgba(0,0,0,.14)" } }}>

      <Box sx={{ px: 3, py: 2, borderBottom: `2px solid ${T.primary}`, background: `linear-gradient(to right, ${T.primaryLight}, ${T.surface})`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box>
          <Typography sx={{ fontSize: 15, fontWeight: 800, color: T.dark, lineHeight: 1.15 }}>Invoice Details</Typography>
          <Typography sx={{ fontSize: 11, color: T.muted }}>{invoice.invoiceNo || "—"}</Typography>
        </Box>
        <Box onClick={onClose} sx={{ cursor: "pointer", color: T.faint, fontSize: 18, lineHeight: 1, "&:hover": { color: T.danger } }}>✕</Box>
      </Box>

      <DialogContent sx={{ p: 2.5 }}>
        {/* Meta grid */}
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", mb: 2.5, border: `1px solid ${T.border}`, overflow: "hidden" }}>
          {[
            { label: "Customer", value: invoice?.customer?.name || "—" },
            { label: "Mobile",   value: invoice?.customer?.phone || "—" },
            { label: "Date",     value: invoice?.date || "—" },
            { label: "Type",     value: invoice?.customerType || invoice?.saleType || "Retail Customer" },
            { label: "Total",    value: `₹${formatCurrency(metrics.amount)}` },
            { label: "Paid",     value: `₹${formatCurrency(metrics.paidAmount)}` },
            { label: "Due",      value: `₹${formatCurrency(metrics.dueAmount)}` },
            { label: "Status",   value: <StatusChip status={metrics.status} /> },
          ].map((item, i) => (
            <Box key={item.label} sx={{ px: 1.8, py: 1.2, borderRight: (i + 1) % 4 !== 0 ? `1px solid ${T.border}` : "none", borderBottom: i < 4 ? `1px solid ${T.border}` : "none", background: i < 4 ? T.surfaceAlt : T.surface }}>
              <Typography sx={{ fontSize: 10, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", mb: 0.4 }}>{item.label}</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.dark }}>{item.value}</Typography>
            </Box>
          ))}
        </Box>

        {/* Items table */}
        <Box sx={{ border: `1px solid ${T.border}`, overflow: "hidden" }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ background: T.primary }}>
                {["#","Item","Qty","Rate","Total"].map((h) => (
                  <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: ".05em", py: 1.2, borderRight: "1px solid rgba(255,255,255,.15)", "&:last-child": { borderRight: "none" } }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {(invoice.items || []).map((item, idx) => (
                <TableRow key={`${item.productId || item.name}-${idx}`}
                  sx={{ background: idx % 2 === 0 ? T.surface : T.surfaceAlt, "&:last-child td": { border: 0 } }}>
                  <TableCell sx={{ fontSize: 13, color: T.muted, py: 1, borderBottom: `1px solid ${T.borderLight}` }}>{idx + 1}</TableCell>
                  <TableCell sx={{ fontSize: 13, fontWeight: 600, color: T.dark, py: 1, borderBottom: `1px solid ${T.borderLight}` }}>{item.name || "—"}</TableCell>
                  <TableCell sx={{ fontSize: 13, py: 1, borderBottom: `1px solid ${T.borderLight}` }}>{item.quantity || 0}</TableCell>
                  <TableCell sx={{ fontSize: 13, py: 1, borderBottom: `1px solid ${T.borderLight}` }}>₹{formatCurrency(item.price || 0)}</TableCell>
                  <TableCell sx={{ fontSize: 13, fontWeight: 700, py: 1, borderBottom: `1px solid ${T.borderLight}` }}>₹{formatCurrency(item.total || 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </DialogContent>

      <Box sx={{ px: 2.5, py: 2, borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", background: T.surfaceAlt }}>
        <Box onClick={onClose} sx={{ px: 2.2, py: "8px", fontSize: 13, fontWeight: 600, color: T.muted, cursor: "pointer", border: `1px solid ${T.border}`, "&:hover": { borderColor: T.primary, color: T.primary }, transition: "all .12s", userSelect: "none" }}>
          Close
        </Box>
      </Box>
    </Dialog>
  );
};

/* ── Table header cell ── */
const TH = ({ children, align }) => (
  <TableCell align={align} sx={{
    fontSize: 11, fontWeight: 700, color: "#fff",
    textTransform: "uppercase", letterSpacing: ".05em",
    py: 1.3, whiteSpace: "nowrap",
    background: T.primary,
    borderRight: "1px solid rgba(255,255,255,.15)",
    "&:last-child": { borderRight: "none" },
  }}>
    {children}
  </TableCell>
);

const TD = ({ children, bold, color, align }) => (
  <TableCell align={align} sx={{
    fontSize: 13, fontWeight: bold ? 700 : 400,
    color: color || T.text,
    py: 1.1, borderBottom: `1px solid ${T.borderLight}`,
  }}>
    {children}
  </TableCell>
);

/* ── Customer row with collapse ── */
const CustomerRow = ({ row, serial, onView, onEdit, onPay, onDelete }) => {
  const [open, setOpen] = useState(false);
  const targetDeleteInvoice = row.invoices?.[0] || null;

  const rowBg = open ? T.primaryLight : T.surface;

  return (
    <>
      <TableRow
        sx={{ background: rowBg, transition: "background .12s",
          "&:hover": { background: open ? T.primaryLight : T.surfaceAlt } }}
      >
        {/* Expand toggle */}
        <TableCell sx={{ width: 40, py: 1, borderBottom: `1px solid ${T.borderLight}` }}>
          <Box
            onClick={() => setOpen((v) => !v)}
            sx={{
              width: 24, height: 24, cursor: "pointer",
              background: open ? T.primary : T.surfaceAlt,
              color: open ? "#fff" : T.muted,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700, userSelect: "none",
              border: `1px solid ${open ? T.primary : T.border}`,
              "&:hover": { background: open ? T.primaryDark : T.primaryLight, borderColor: T.primary, color: open ? "#fff" : T.primary },
              transition: "all .12s",
            }}>
            {open ? "−" : "+"}
          </Box>
        </TableCell>
        <TD color={T.muted}>{serial}</TD>
        <TD bold>{row.name}</TD>
        <TD>{row.phone || "—"}</TD>
        <TD>{row.city || "—"}</TD>
        <TD>{row.gstin || "—"}</TD>
        <TD bold>₹{formatCurrency(row.totalAmount)}</TD>
        <TD bold color={Number(row.outstanding || 0) > 0 ? T.danger : T.success}>
          ₹{formatCurrency(row.outstanding)}
        </TD>
        <TD>{row.paymentTerms || "—"}</TD>
        <TableCell sx={{ py: 1, borderBottom: `1px solid ${T.borderLight}` }}>
          <ActBtn label="Delete" color={T.danger} hoverBg={T.dangerLight}
            onClick={() => onDelete(targetDeleteInvoice)} disabled={!targetDeleteInvoice} />
        </TableCell>
      </TableRow>

      {/* Expanded sub-table */}
      <TableRow>
        <TableCell colSpan={10} sx={{ py: 0, border: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ mx: 2, my: 1.5, border: `1px solid ${T.border}`, overflow: "hidden" }}>
              {/* Sub-header */}
              <Box sx={{ px: 2, py: 1.1, background: T.primaryLight, borderBottom: `1px solid ${T.border}` }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.primary, textTransform: "uppercase", letterSpacing: ".07em" }}>
                  Invoices ({row.invoices.length})
                </Typography>
              </Box>

              <Table size="small">
                <TableHead>
                  <TableRow sx={{ background: T.surfaceAlt }}>
                    {["Invoice No","Date","Total","Paid","Due","Status",""].map((h) => (
                      <TableCell key={h} sx={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".05em", py: 1, borderBottom: `1px solid ${T.border}` }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {row.invoices.map((invoice, iIdx) => {
                    const m  = getInvoicePaymentMetrics(invoice);
                    const bg = iIdx % 2 === 0 ? T.surface : T.surfaceAlt;
                    return (
                      <TableRow key={invoice._id}
                        sx={{ background: bg, "&:hover": { background: T.primaryLight }, "&:last-child td": { border: 0 }, transition: "background .12s" }}>
                        <TableCell sx={{ fontSize: 13, fontWeight: 700, color: T.primary, py: 1, borderBottom: `1px solid ${T.borderLight}` }}>
                          {invoice.invoiceNo || "—"}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, color: T.muted, py: 1, borderBottom: `1px solid ${T.borderLight}` }}>
                          {invoice.date || "—"}
                        </TableCell>
                        <TableCell sx={{ fontSize: 13, fontWeight: 600, py: 1, borderBottom: `1px solid ${T.borderLight}` }}>
                          ₹{formatCurrency(m.amount)}
                        </TableCell>
                        <TableCell sx={{ fontSize: 13, fontWeight: 600, color: T.success, py: 1, borderBottom: `1px solid ${T.borderLight}` }}>
                          ₹{formatCurrency(m.paidAmount)}
                        </TableCell>
                        <TableCell sx={{ fontSize: 13, fontWeight: 600, color: m.dueAmount > 0 ? T.danger : T.success, py: 1, borderBottom: `1px solid ${T.borderLight}` }}>
                          ₹{formatCurrency(m.dueAmount)}
                        </TableCell>
                        <TableCell sx={{ py: 1, borderBottom: `1px solid ${T.borderLight}` }}>
                          <StatusChip status={m.status} />
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1, borderBottom: `1px solid ${T.borderLight}` }}>
                          <Box sx={{ display: "inline-flex", gap: 0 }}>
                            <ActBtn label="View"   color="#2563eb" hoverBg="#eff6ff" onClick={() => onView(invoice)} />
                            <ActBtn label="Edit"   color="#7c3aed" hoverBg="#f5f3ff" onClick={() => onEdit(invoice)} />
                            <ActBtn label="Pay"    color="#0891b2" hoverBg="#ecfeff" onClick={() => onPay(invoice, row)} />
                            <ActBtn label="Delete" color={T.danger} hoverBg={T.dangerLight} onClick={() => onDelete(invoice)} />
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {row.invoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3, color: T.faint, fontSize: 13 }}>
                        No invoices for this customer
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

/* ─── Main Component ─────────────────────────────────────── */
const CustomerDetails = () => {
  const navigate = useNavigate();
  const [invoices,       setInvoices]       = useState([]);
  const [customers,      setCustomers]      = useState([]);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [viewInvoice,    setViewInvoice]    = useState(null);
  const [confirmDelete,  setConfirmDelete]  = useState({ open: false, id: "", invoiceNo: "" });
  const [search,         setSearch]         = useState("");
  const [activeTab,      setActiveTab]      = useState("Dealer");
  const [typeFilters,    setTypeFilters]    = useState({
    "Retail Customer": "all", Dealer: "all", Contractor: "all", "Builder / Project": "all",
  });
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchAll = async () => {
    try {
      const [invoiceRes, customerRes] = await Promise.all([getInvoices(), getCustomers()]);
      setInvoices(Array.isArray(invoiceRes.data) ? invoiceRes.data : []);
      setCustomers(Array.isArray(customerRes.data) ? customerRes.data : []);
    } catch { toast.error("Failed to fetch customer details"); }
  };

  useEffect(() => { fetchAll(); }, []);

  const grouped = useMemo(() => groupInvoicesByCustomer(invoices), [invoices]);

  const rows = useMemo(() => {
    const customerMap = new Map();
    customers.forEach((c) => customerMap.set(`${c.name || "Unknown"}|${c.phone || ""}`, c));

    const fromInvoices = grouped.map((entry) => {
      const key = `${entry.customer.name || "Unknown"}|${entry.customer.phone || ""}`;
      const customer = customerMap.get(key) || {};
      const firstInvoice = entry.invoices[0] || {};
      const type = normalizeCustomerType(customer.customerType || firstInvoice?.customerType || firstInvoice?.saleType || firstInvoice?.customer?.customerType);
      return {
        key, type,
        name:         customer.name         || entry.customer.name || "Unknown",
        phone:        customer.phone        || entry.customer.phone || "—",
        city:         customer.city         || customer?.dealerDetails?.city || "—",
        gstin:        customer.gstin        || customer?.dealerDetails?.gstin || firstInvoice?.customer?.gstin || "—",
        paymentTerms: customer.paymentTerms || customer?.dealerDetails?.paymentTerms || "—",
        totalAmount:  Number(entry.totals.amount || 0),
        outstanding:  Number(entry.totals.due    || 0),
        invoices:     entry.invoices,
      };
    });

    const existingKeys = new Set(fromInvoices.map((r) => r.key));
    const withoutInvoices = customers
      .filter((c) => !existingKeys.has(`${c.name || "Unknown"}|${c.phone || ""}`))
      .map((c) => ({
        key: `${c.name || "Unknown"}|${c.phone || ""}`,
        type: normalizeCustomerType(c.customerType),
        name:         c.name         || "Unknown",
        phone:        c.phone        || "—",
        city:         c.city         || c?.dealerDetails?.city || "—",
        gstin:        c.gstin        || c?.dealerDetails?.gstin || "—",
        paymentTerms: c.paymentTerms || c?.dealerDetails?.paymentTerms || "—",
        totalAmount: 0, outstanding: 0, invoices: [],
      }));

    return [...fromInvoices, ...withoutInvoices];
  }, [customers, grouped]);

  const totals = useMemo(() => {
    return rows
      .filter((r) => r.type === activeTab)
      .reduce((acc, r) => {
        acc.all    += 1;
        acc.amount += Number(r.totalAmount || 0);
        acc.due    += Number(r.outstanding || 0);
        return acc;
      }, { all: 0, amount: 0, due: 0 });
  }, [rows, activeTab]);

  const sectionRows = (typeKey) => {
    const filter = typeFilters[typeKey] || "all";
    const q      = search.trim().toLowerCase();
    return rows
      .filter((r) => r.type === typeKey)
      .filter((r) => {
        if (filter === "pending") return Number(r.outstanding || 0) > 0;
        if (filter === "paid")    return Number(r.outstanding || 0) <= 0;
        return true;
      })
      .filter((r) => !q || r.name.toLowerCase().includes(q) || (r.phone || "").includes(q) || (r.city || "").toLowerCase().includes(q) || (r.gstin || "").toLowerCase().includes(q));
  };

  const askDelete = (invoice) => {
    if (!invoice?._id) { toast.error("No invoice available to delete"); return; }
    setConfirmDelete({ open: true, id: invoice._id, invoiceNo: invoice.invoiceNo || "" });
  };

  const handleDelete = async () => {
    try {
      await deleteInvoice(confirmDelete.id);
      toast.success("Invoice deleted");
      fetchAll();
    } catch { toast.error("Delete failed"); }
    finally { setConfirmDelete({ open: false, id: "", invoiceNo: "" }); }
  };

  const activeSection = TYPE_SECTIONS.find((s) => s.key === activeTab) || TYPE_SECTIONS[0];
  const activeList    = sectionRows(activeTab);
  const totalPages    = Math.max(1, Math.ceil(activeList.length / pageSize));
  const pagedList     = activeList.slice((page - 1) * pageSize, page * pageSize);

  /* ════════════════════════ RENDER ════════════════ */
  return (
    <Box sx={{ p: 0, background: T.bg, minHeight: "100%", fontFamily: "'Noto Sans', sans-serif" }}>

      {/* ── Page header ── */}
      <Box sx={{ px: 3, py: 1.8, background: T.surface, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box>
          <Typography sx={{ fontSize: 20, fontWeight: 800, color: T.dark, lineHeight: 1.2, letterSpacing: "-.01em" }}>Customer Details</Typography>
          <Typography sx={{ fontSize: 12, color: T.muted }}>Expand each row to view invoices and actions</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, fontSize: 12, color: T.muted }}>
          <span>🏠 Home</span>
          <span style={{ margin: "0 4px" }}>›</span>
          <span>Customers</span>
          <span style={{ margin: "0 4px" }}>›</span>
          <span style={{ color: T.primary, fontWeight: 600 }}>Details</span>
        </Box>
      </Box>

      <Box sx={{ p: 2.5 }}>

        {/* ── Stat cards ── */}
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(3,1fr)" }, mb: 2 }}>
          {[
            { icon: <PeopleIcon sx={{ fontSize: 18 }} />,          label: `Total ${activeSection.title}`, value: totals.all,                          accent: activeSection.color, bg: activeSection.bg },
            { icon: <CurrencyRupeeIcon sx={{ fontSize: 18 }} />,   label: "Total Amount",                 value: `₹${formatCurrency(totals.amount)}`, accent: T.primaryDark,       bg: T.primaryLight },
            { icon: <HourglassBottomIcon sx={{ fontSize: 18 }} />, label: "Outstanding",                  value: `₹${formatCurrency(totals.due)}`,    accent: T.danger,            bg: T.dangerLight },
          ].map((s) => (
            <Box key={s.label} sx={{
              background: T.surface, border: `1px solid ${T.border}`,
              borderLeft: `4px solid ${s.accent}`,
              px: 2.2, py: 1.8,
              display: "flex", alignItems: "center", gap: 1.8,
              boxShadow: "0 1px 3px rgba(15,23,42,.05)",
            }}>
              <Box sx={{ width: 40, height: 40, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", color: s.accent, flexShrink: 0 }}>
                {s.icon}
              </Box>
              <Box>
                <Typography sx={{ fontSize: 10.5, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", mb: 0.3 }}>{s.label}</Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 800, color: T.dark, lineHeight: 1 }}>{s.value}</Typography>
              </Box>
            </Box>
          ))}
        </Box>

        {/* ── Main card ── */}
        <Box sx={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: "0 1px 3px rgba(15,23,42,.06), 0 4px 16px rgba(15,23,42,.04)", overflow: "hidden" }}>

          {/* Type tab bar */}
          <Box sx={{ display: "flex", borderBottom: `1px solid ${T.border}`, background: T.surface, overflowX: "auto" }}>
            {TYPE_SECTIONS.map((section) => {
              const count    = rows.filter((r) => r.type === section.key).length;
              const isActive = activeTab === section.key;
              return (
                <Box
                  key={section.key}
                  onClick={() => { setActiveTab(section.key); setPage(1); }}
                  sx={{
                    flex: 1, minWidth: 120,
                    px: 2, py: 1.5,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 1,
                    cursor: "pointer", userSelect: "none",
                    background: isActive ? section.bg : T.surface,
                    borderBottom: isActive ? `3px solid ${section.color}` : "3px solid transparent",
                    borderRight: `1px solid ${T.border}`,
                    "&:last-child": { borderRight: "none" },
                    transition: "all .15s",
                    "&:hover": { background: section.bg },
                  }}>
                  <Typography sx={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? section.color : T.muted, whiteSpace: "nowrap" }}>
                    {section.title}
                  </Typography>
                  <Box sx={{ px: 0.9, py: "2px", fontSize: 11, fontWeight: 700, background: isActive ? section.color : "#f1f5f9", color: isActive ? "#fff" : T.muted, minWidth: 22, textAlign: "center" }}>
                    {count}
                  </Box>
                </Box>
              );
            })}
          </Box>

          {/* Toolbar: filter pills + search */}
          <Box sx={{ px: 2.5, py: 1.4, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.2, background: T.surfaceAlt }}>
            {/* Filter pills */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ width: 8, height: 8, background: activeSection.color, flexShrink: 0 }} />
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.dark }}>{activeSection.title}</Typography>
              <Box sx={{ px: 1, py: "2px", fontSize: 11, fontWeight: 700, color: activeSection.color, background: activeSection.bg, border: `1px solid ${activeSection.color}22` }}>
                {activeList.length}
              </Box>
              <Box sx={{ width: 1, height: 16, background: T.border, mx: 0.5 }} />
              {[{ key: "all", label: "All" }, { key: "pending", label: "Pending" }, { key: "paid", label: "Paid" }].map((flt) => {
                const isActive = typeFilters[activeTab] === flt.key;
                return (
                  <Box key={flt.key} onClick={() => { setTypeFilters((prev) => ({ ...prev, [activeTab]: flt.key })); setPage(1); }}
                    sx={{ px: 1.4, py: "4px", fontSize: 12, fontWeight: isActive ? 700 : 500, cursor: "pointer", userSelect: "none",
                      color: isActive ? activeSection.color : T.muted,
                      background: isActive ? activeSection.bg : "transparent",
                      border: isActive ? `1px solid ${activeSection.color}44` : "1px solid transparent",
                      "&:hover": { background: activeSection.bg, color: activeSection.color },
                      transition: "all .12s",
                    }}>
                    {flt.label}
                  </Box>
                );
              })}
            </Box>

            {/* Search */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, background: T.surface, border: `1px solid ${T.border}`, px: 1.2, py: 0.5, "&:focus-within": { borderColor: T.primary, boxShadow: "0 0 0 2px rgba(26,86,160,.08)" }, transition: "all .12s", minWidth: 260 }}>
              <SearchIcon sx={{ fontSize: 16, color: T.faint, flexShrink: 0 }} />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder={`Search ${activeSection.title}…`}
                style={{ border: "none", outline: "none", fontSize: 13, color: T.text, background: "transparent", width: "100%", fontFamily: "inherit" }}
              />
            </Box>
          </Box>

          {/* Table */}
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: 860 }}>
              <TableHead>
                <TableRow>
                  <TH />
                  <TH>SNo</TH>
                  <TH>Name</TH>
                  <TH>Mobile</TH>
                  <TH>City</TH>
                  <TH>GSTIN</TH>
                  <TH>Total Amount</TH>
                  <TH>Outstanding</TH>
                  <TH>Payment Terms</TH>
                  <TH>Actions</TH>
                </TableRow>
              </TableHead>
              <TableBody>
                {pagedList.map((row, idx) => (
                  <CustomerRow
                    key={`${activeTab}-${row.key}`}
                    row={row}
                    serial={(page - 1) * pageSize + idx + 1}
                    onView={(inv) => setViewInvoice(inv)}
                    onEdit={(inv) => navigate("/customers/bill", {
                      state: {
                        editInvoice: inv,
                        editCustomer: { name: row.name, phone: row.phone, address: row.invoices?.[0]?.customer?.address || "", gstin: row.gstin, customerType: row.type, saleType: row.type, paymentTerms: row.paymentTerms },
                      },
                    })}
                    onPay={(inv, r) => navigate("/customers/payments", {
                      state: { fromPayAction: true, prefillCustomer: { name: r.name, phone: r.phone }, prefillInvoice: { id: inv._id, invoiceNo: inv.invoiceNo, dueAmount: getInvoicePaymentMetrics(inv).dueAmount } },
                    })}
                    onDelete={askDelete}
                  />
                ))}
                {activeList.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 7, color: T.faint, fontSize: 13 }}>
                      {search ? `No results for "${search}" in ${activeSection.title}` : `No ${activeSection.title} found`}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>

          {/* ── Pagination footer ── */}
          <Box sx={{ px: 2.5, py: 1.4, borderTop: `1px solid ${T.border}`, background: T.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: 13, color: T.muted }}>
              <span>Show</span>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                style={{ padding: "4px 8px", border: `1px solid ${T.border}`, fontSize: 13, color: T.text, background: T.surface, cursor: "pointer", outline: "none", fontFamily: "inherit" }}>
                {[5, 10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>entries</span>
              <Box sx={{ mx: 0.5, width: 1, height: 14, background: T.border }} />
              <span>
                {activeList.length === 0 ? "No entries" : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, activeList.length)} of ${activeList.length}`}
              </span>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box onClick={() => setPage((p) => Math.max(1, p - 1))}
                sx={{ px: 1.3, py: "5px", border: `1px solid ${T.border}`, fontSize: 12, fontWeight: 600, cursor: page === 1 ? "default" : "pointer", color: page === 1 ? T.faint : T.text, background: page === 1 ? T.surfaceAlt : T.surface, userSelect: "none", "&:hover": page > 1 ? { borderColor: T.primary, color: T.primary, background: T.primaryLight } : {}, transition: "all .12s" }}>
                Previous
              </Box>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                .reduce((acc, n, i, arr) => { if (i > 0 && n - arr[i - 1] > 1) acc.push("..."); acc.push(n); return acc; }, [])
                .map((item, i) =>
                  item === "..." ? (
                    <Box key={`e${i}`} sx={{ px: 1, fontSize: 12, color: T.faint }}>...</Box>
                  ) : (
                    <Box key={item} onClick={() => setPage(item)}
                      sx={{ px: 1.4, py: "5px", border: `1px solid ${item === page ? T.primary : T.border}`, fontSize: 12, fontWeight: item === page ? 700 : 400, cursor: "pointer", background: item === page ? T.primary : T.surface, color: item === page ? "#fff" : T.text, userSelect: "none", "&:hover": item !== page ? { borderColor: T.primary, color: T.primary, background: T.primaryLight } : {}, transition: "all .12s" }}>
                      {item}
                    </Box>
                  )
                )}
              <Box onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                sx={{ px: 1.3, py: "5px", border: `1px solid ${T.border}`, fontSize: 12, fontWeight: 600, cursor: page === totalPages ? "default" : "pointer", color: page === totalPages ? T.faint : T.text, background: page === totalPages ? T.surfaceAlt : T.surface, userSelect: "none", "&:hover": page < totalPages ? { borderColor: T.primary, color: T.primary, background: T.primaryLight } : {}, transition: "all .12s" }}>
                Next
              </Box>
            </Box>
          </Box>

        </Box>
      </Box>

      {/* ── Dialogs ── */}
      <InvoiceViewDialog invoice={viewInvoice}    open={Boolean(viewInvoice)}    onClose={() => setViewInvoice(null)} />
      <PaymentDialog     invoice={editingInvoice} open={Boolean(editingInvoice)} onClose={() => setEditingInvoice(null)} onSaved={fetchAll} />
      <ConfirmDialog
        open={confirmDelete.open}
        title="Delete Invoice"
        message={`Are you sure you want to delete invoice "${confirmDelete.invoiceNo}"?`}
        confirmText="Delete"
        danger
        onClose={() => setConfirmDelete({ open: false, id: "", invoiceNo: "" })}
        onConfirm={handleDelete}
      />
    </Box>
  );
};

export default CustomerDetails;