import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  Typography,
  Chip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  TextField,
  IconButton,
  Collapse,
  InputAdornment,
  Tabs,
  Tab,
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

const TYPE_SECTIONS = [
  { key: "Retail Customer", title: "Retail Customers", color: "#2563eb", bg: "#eff6ff" },
  { key: "Dealer", title: "Dealers", color: "#0891b2", bg: "#ecfeff" },
  { key: "Contractor", title: "Contractors", color: "#7c3aed", bg: "#f5f3ff" },
  { key: "Builder / Project", title: "Builder / Projects", color: "#d97706", bg: "#fffbeb" },
];

const normalizeCustomerType = (value) => {
  if (value === "Dealer" || value === "Wholesale") return "Dealer";
  if (value === "Contractor" || value === "B2B") return "Contractor";
  if (value === "Builder / Project") return "Builder / Project";
  return "Retail Customer";
};

const statusConfig = {
  Paid: { color: "#166534", bg: "#dcfce7", border: "#bbf7d0" },
  Partial: { color: "#92400e", bg: "#fef3c7", border: "#fde68a" },
  Pending: { color: "#991b1b", bg: "#fee2e2", border: "#fecaca" },
};

const StatusChip = ({ status }) => {
  const cfg = statusConfig[status] || statusConfig.Pending;
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        px: 1.2,
        py: 0.3,
        borderRadius: "6px",
        fontSize: 11,
        fontWeight: 700,
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        letterSpacing: "0.03em",
      }}
    >
      {status}
    </Box>
  );
};

// ─── Dialogs ────────────────────────────────────────────────────────────────

const dialogSx = {
  "& .MuiDialog-paper": {
    borderRadius: "16px",
    boxShadow: "0 24px 64px rgba(0,0,0,0.14)",
  },
};

const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "10px",
    fontSize: 13,
    "& fieldset": { borderColor: "#dbe5f0" },
    "&:hover fieldset": { borderColor: "#94a3b8" },
    "&.Mui-focused fieldset": { borderColor: "#1a56a0", borderWidth: 2 },
  },
  "& .MuiInputLabel-root": { fontSize: 13 },
  "& .MuiInputLabel-root.Mui-focused": { color: "#1a56a0" },
};

const PaymentDialog = ({ invoice, open, onClose, onSaved }) => {
  const [paymentType, setPaymentType] = useState("Full Payment");
  const [method, setMethod] = useState("CASH");
  const [partialAmount, setPartialAmount] = useState("");
  const [loading, setLoading] = useState(false);

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
    const newPaid = Math.min(amount, existingPaid + payNow);
    const newDue = Math.max(0, amount - newPaid);
    const status = newDue === 0 ? "Paid" : newPaid > 0 ? "Partial" : "Pending";
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
    } finally {
      setLoading(false);
    }
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" sx={dialogSx}>
      <DialogTitle sx={{ pb: 1, fontWeight: 800, fontSize: 17, fontFamily: "Rajdhani, sans-serif" }}>
        Update Payment
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", gap: 2, mb: 2.5, p: 1.5, borderRadius: "10px", background: "#f8fafc", border: "1px solid #e2eaf4" }}>
          {[
            { label: "Invoice", value: invoice.invoiceNo || "-" },
            { label: "Total", value: `₹${formatCurrency(amount)}` },
            { label: "Remaining", value: `₹${formatCurrency(remaining)}` },
          ].map((item) => (
            <Box key={item.label} sx={{ flex: 1, textAlign: "center" }}>
              <Typography sx={{ fontSize: 10, color: "#718096", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 800, color: "#1c2333", mt: 0.2 }}>{item.value}</Typography>
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
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ textTransform: "none", color: "#64748b", borderRadius: "8px" }}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading}
          sx={{ textTransform: "none", borderRadius: "8px", fontWeight: 700, background: "linear-gradient(135deg, #1a56a0, #0f3d7a)", px: 3 }}
        >
          {loading ? "Saving..." : "Save Payment"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const InvoiceViewDialog = ({ invoice, open, onClose }) => {
  if (!invoice) return null;
  const metrics = getInvoicePaymentMetrics(invoice);
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" sx={dialogSx}>
      <DialogTitle sx={{ pb: 1, fontWeight: 800, fontSize: 17, fontFamily: "Rajdhani, sans-serif" }}>
        Invoice — {invoice.invoiceNo || "-"}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1.2, mb: 2.5, p: 1.5, borderRadius: "10px", background: "#f8fafc", border: "1px solid #e2eaf4" }}>
          {[
            { label: "Customer", value: invoice?.customer?.name || "-" },
            { label: "Mobile", value: invoice?.customer?.phone || "-" },
            { label: "Date", value: invoice?.date || "-" },
            { label: "Type", value: invoice?.customerType || invoice?.saleType || "Retail Customer" },
            { label: "Total", value: `₹${formatCurrency(metrics.amount)}` },
            { label: "Paid", value: `₹${formatCurrency(metrics.paidAmount)}` },
            { label: "Due", value: `₹${formatCurrency(metrics.dueAmount)}` },
            { label: "Status", value: <StatusChip status={metrics.status} /> },
          ].map((item) => (
            <Box key={item.label}>
              <Typography sx={{ fontSize: 10, color: "#718096", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", mb: 0.3 }}>{item.label}</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#1c2333" }}>{item.value}</Typography>
            </Box>
          ))}
        </Box>

        <Box sx={{ borderRadius: "10px", overflow: "hidden", border: "1px solid #e2eaf4" }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ background: "#f1f5f9" }}>
                {["#", "Item", "Qty", "Rate", "Total"].map((h) => (
                  <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", py: 1.2 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {(invoice.items || []).map((item, idx) => (
                <TableRow key={`${item.productId || item.name}-${idx}`} sx={{ "&:last-child td": { border: 0 } }}>
                  <TableCell sx={{ fontSize: 13, color: "#64748b" }}>{idx + 1}</TableCell>
                  <TableCell sx={{ fontSize: 13, fontWeight: 600, color: "#1c2333" }}>{item.name || "-"}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{item.quantity || 0}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>₹{formatCurrency(item.price || 0)}</TableCell>
                  <TableCell sx={{ fontSize: 13, fontWeight: 700 }}>₹{formatCurrency(item.total || 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ textTransform: "none", borderRadius: "8px", fontWeight: 700, color: "#64748b" }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Table header cell ──────────────────────────────────────────────────────
const TH = ({ children, align }) => (
  <TableCell align={align} sx={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", py: 1.3, whiteSpace: "nowrap", background: "#f8fafc", borderBottom: "1px solid #e2eaf4" }}>
    {children}
  </TableCell>
);

const TD = ({ children, bold, color, align }) => (
  <TableCell align={align} sx={{ fontSize: 13, fontWeight: bold ? 700 : 400, color: color || "#374151", py: 1.2, borderBottom: "1px solid #f1f5f9" }}>
    {children}
  </TableCell>
);

// ─── Expanded invoice sub-row ───────────────────────────────────────────────
const CustomerRow = ({ row, serial, onView, onEdit, onPay, onDelete }) => {
  const [open, setOpen] = useState(false);
  const targetDeleteInvoice = row.invoices?.[0] || null;

  return (
    <>
      <TableRow
        hover
        sx={{
          cursor: "pointer",
          "&:hover": { background: "#f8fafc" },
          background: open ? "#f0f7ff" : "transparent",
          transition: "background 0.15s",
        }}
      >
        <TableCell sx={{ width: 40, py: 1.2, borderBottom: "1px solid #f1f5f9" }}>
          <IconButton
            size="small"
            onClick={() => setOpen((v) => !v)}
            sx={{
              width: 26,
              height: 26,
              background: open ? "#1a56a0" : "#f1f5f9",
              color: open ? "#fff" : "#64748b",
              "&:hover": { background: open ? "#0f3d7a" : "#e2eaf4" },
              transition: "all 0.15s",
            }}
          >
            {open ? <KeyboardArrowUpIcon sx={{ fontSize: 15 }} /> : <KeyboardArrowDownIcon sx={{ fontSize: 15 }} />}
          </IconButton>
        </TableCell>
        <TD color="#94a3b8">{serial}</TD>
        <TD bold>{row.name}</TD>
        <TD>{row.phone || "—"}</TD>
        <TD>{row.city || "—"}</TD>
        <TD>{row.gstin || "—"}</TD>
        <TD bold>₹{formatCurrency(row.totalAmount)}</TD>
        <TD bold color={Number(row.outstanding || 0) > 0 ? "#c0392b" : "#166534"}>
          ₹{formatCurrency(row.outstanding)}
        </TD>
        <TD>{row.paymentTerms || "—"}</TD>
        <TableCell sx={{ py: 1.2, borderBottom: "1px solid #f1f5f9" }}>
          <Button
            size="small"
            onClick={() => onDelete(targetDeleteInvoice)}
            disabled={!targetDeleteInvoice}
            sx={{
              textTransform: "none",
              fontSize: 12,
              fontWeight: 600,
              color: "#dc2626",
              minWidth: 0,
              px: 1,
              py: 0.4,
              borderRadius: "6px",
              "&:hover": { background: "#fee2e2" },
            }}
          >
            Delete
          </Button>
        </TableCell>
      </TableRow>

      {/* Expanded invoice rows */}
      <TableRow>
        <TableCell colSpan={10} sx={{ py: 0, border: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ mx: 2, my: 1.5, borderRadius: "10px", overflow: "hidden", border: "1px solid #dbe5f0", background: "#fff" }}>
              <Box sx={{ px: 2, py: 1.2, background: "#f0f7ff", borderBottom: "1px solid #dbe5f0" }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#1a56a0", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Invoices ({row.invoices.length})
                </Typography>
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ background: "#fafcfe" }}>
                    {["Invoice No", "Date", "Total", "Paid", "Due", "Status", ""].map((h) => (
                      <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", py: 1, borderBottom: "1px solid #f1f5f9" }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {row.invoices.map((invoice) => {
                    const m = getInvoicePaymentMetrics(invoice);
                    return (
                      <TableRow key={invoice._id} hover sx={{ "&:hover": { background: "#fafcfe" }, "&:last-child td": { border: 0 } }}>
                        <TableCell sx={{ fontSize: 13, fontWeight: 700, color: "#1a56a0", py: 1.1 }}>{invoice.invoiceNo || "-"}</TableCell>
                        <TableCell sx={{ fontSize: 12, color: "#64748b", py: 1.1 }}>{invoice.date || "-"}</TableCell>
                        <TableCell sx={{ fontSize: 13, fontWeight: 600, py: 1.1 }}>₹{formatCurrency(m.amount)}</TableCell>
                        <TableCell sx={{ fontSize: 13, color: "#166534", fontWeight: 600, py: 1.1 }}>₹{formatCurrency(m.paidAmount)}</TableCell>
                        <TableCell sx={{ fontSize: 13, color: m.dueAmount > 0 ? "#c0392b" : "#166534", fontWeight: 600, py: 1.1 }}>₹{formatCurrency(m.dueAmount)}</TableCell>
                        <TableCell sx={{ py: 1.1 }}><StatusChip status={m.status} /></TableCell>
                        <TableCell align="right" sx={{ py: 1.1 }}>
                          <Box sx={{ display: "inline-flex", gap: 0.5 }}>
                            {[
                              { label: "View", color: "#2563eb", hoverBg: "#eff6ff", onClick: () => onView(invoice) },
                              { label: "Edit", color: "#7c3aed", hoverBg: "#f5f3ff", onClick: () => onEdit(invoice) },
                              { label: "Pay", color: "#0891b2", hoverBg: "#ecfeff", onClick: () => onPay(invoice, row) },
                              { label: "Delete", color: "#dc2626", hoverBg: "#fee2e2", onClick: () => onDelete(invoice) },
                            ].map((btn) => (
                              <Button
                                key={btn.label}
                                size="small"
                                onClick={btn.onClick}
                                sx={{
                                  textTransform: "none",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: btn.color,
                                  minWidth: 0,
                                  px: 1,
                                  py: 0.4,
                                  borderRadius: "6px",
                                  "&:hover": { background: btn.hoverBg },
                                }}
                              >
                                {btn.label}
                              </Button>
                            ))}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {row.invoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3, color: "#94a3b8", fontSize: 13 }}>
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

// ─── Main Component ──────────────────────────────────────────────────────────
const CustomerDetails = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: "", invoiceNo: "" });
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("Dealer");
  const [typeFilters, setTypeFilters] = useState({
    "Retail Customer": "all",
    Dealer: "all",
    Contractor: "all",
    "Builder / Project": "all",
  });

  const fetchAll = async () => {
    try {
      const [invoiceRes, customerRes] = await Promise.all([getInvoices(), getCustomers()]);
      setInvoices(Array.isArray(invoiceRes.data) ? invoiceRes.data : []);
      setCustomers(Array.isArray(customerRes.data) ? customerRes.data : []);
    } catch {
      toast.error("Failed to fetch customer details");
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const grouped = useMemo(() => groupInvoicesByCustomer(invoices), [invoices]);

  const rows = useMemo(() => {
    const customerMap = new Map();
    customers.forEach((c) => {
      customerMap.set(`${c.name || "Unknown"}|${c.phone || ""}`, c);
    });

    const fromInvoices = grouped.map((entry) => {
      const key = `${entry.customer.name || "Unknown"}|${entry.customer.phone || ""}`;
      const customer = customerMap.get(key) || {};
      const firstInvoice = entry.invoices[0] || {};
      const type = normalizeCustomerType(customer.customerType || firstInvoice?.customerType || firstInvoice?.saleType || firstInvoice?.customer?.customerType);
      return {
        key, type,
        name: customer.name || entry.customer.name || "Unknown",
        phone: customer.phone || entry.customer.phone || "-",
        city: customer.city || customer?.dealerDetails?.city || "-",
        gstin: customer.gstin || customer?.dealerDetails?.gstin || firstInvoice?.customer?.gstin || "-",
        paymentTerms: customer.paymentTerms || customer?.dealerDetails?.paymentTerms || "-",
        totalAmount: Number(entry.totals.amount || 0),
        outstanding: Number(entry.totals.due || 0),
        invoices: entry.invoices,
      };
    });

    const existingKeys = new Set(fromInvoices.map((r) => r.key));
    const withoutInvoices = customers
      .filter((c) => !existingKeys.has(`${c.name || "Unknown"}|${c.phone || ""}`))
      .map((c) => ({
        key: `${c.name || "Unknown"}|${c.phone || ""}`,
        type: normalizeCustomerType(c.customerType),
        name: c.name || "Unknown",
        phone: c.phone || "-",
        city: c.city || c?.dealerDetails?.city || "-",
        gstin: c.gstin || c?.dealerDetails?.gstin || "-",
        paymentTerms: c.paymentTerms || c?.dealerDetails?.paymentTerms || "-",
        totalAmount: 0, outstanding: 0, invoices: [],
      }));

    return [...fromInvoices, ...withoutInvoices];
  }, [customers, grouped]);

  const totals = useMemo(() => {
    const tabRows = rows.filter((r) => r.type === activeTab);
    return tabRows.reduce(
      (acc, r) => {
        acc.all += 1;
        acc.amount += Number(r.totalAmount || 0);
        acc.due += Number(r.outstanding || 0);
        return acc;
      },
      { all: 0, amount: 0, due: 0 }
    );
  }, [rows, activeTab]);

  const sectionRows = (typeKey) => {
    const filter = typeFilters[typeKey] || "all";
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => r.type === typeKey)
      .filter((r) => {
        if (filter === "pending") return Number(r.outstanding || 0) > 0;
        if (filter === "paid") return Number(r.outstanding || 0) <= 0;
        return true;
      })
      .filter((r) => {
        if (!q) return true;
        return (
          r.name.toLowerCase().includes(q) ||
          (r.phone || "").toLowerCase().includes(q) ||
          (r.city || "").toLowerCase().includes(q) ||
          (r.gstin || "").toLowerCase().includes(q)
        );
      });
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
    } catch {
      toast.error("Delete failed");
    } finally {
      setConfirmDelete({ open: false, id: "", invoiceNo: "" });
    }
  };

  const activeSection = TYPE_SECTIONS.find((s) => s.key === activeTab) || TYPE_SECTIONS[0];
  const activeList = sectionRows(activeTab);

  const STAT_CARDS = [
    { icon: <PeopleIcon sx={{ fontSize: 18 }} />, label: `Total ${activeSection.title}`, value: totals.all, accent: activeSection.color, bg: activeSection.bg },
    { icon: <CurrencyRupeeIcon sx={{ fontSize: 18 }} />, label: "Total Amount", value: `₹${formatCurrency(totals.amount)}`, accent: "#0f3d7a", bg: "#edf4ff" },
    { icon: <HourglassBottomIcon sx={{ fontSize: 18 }} />, label: "Outstanding", value: `₹${formatCurrency(totals.due)}`, accent: "#c0392b", bg: "#fff3ea" },
  ];

  return (
    <Box sx={{ p: 0, background: "#f0f4f8", minHeight: "100%" }}>

      {/* Header */}
      <Card sx={{ mb: 2.5, p: { xs: 2.5, md: 3 }, borderRadius: "18px", background: "linear-gradient(135deg, #1a56a0 0%, #0f3d7a 100%)", color: "#fff", boxShadow: "0 18px 40px rgba(15,61,122,0.24)" }}>
        <Typography sx={{ fontSize: 28, fontWeight: 800, fontFamily: "Rajdhani, sans-serif", lineHeight: 1 }}>
          Customer Details
        </Typography>
        <Typography sx={{ mt: 0.8, fontSize: 13, color: "rgba(255,255,255,0.76)" }}>
          Expand each row to view invoices and actions
        </Typography>
      </Card>

      {/* ── Type Tabs ── */}
      <Card sx={{ mb: 2.5, borderRadius: "14px", border: "1px solid #dbe5f0", boxShadow: "0 2px 8px rgba(15,35,60,0.05)", overflow: "hidden" }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="fullWidth"
          sx={{
            minHeight: 52,
            background: "#fff",
            "& .MuiTabs-indicator": { display: "none" },
            "& .MuiTabs-flexContainer": { height: 52 },
          }}
        >
          {TYPE_SECTIONS.map((section) => {
            const count = rows.filter((r) => r.type === section.key).length;
            const isActive = activeTab === section.key;
            return (
              <Tab
                key={section.key}
                value={section.key}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: isActive ? 700 : 500, lineHeight: 1 }}>
                      {section.title}
                    </Typography>
                    <Box
                      sx={{
                        px: 1,
                        py: 0.15,
                        borderRadius: "20px",
                        fontSize: 11,
                        fontWeight: 700,
                        background: isActive ? section.color : "#f1f5f9",
                        color: isActive ? "#fff" : "#64748b",
                        minWidth: 22,
                        textAlign: "center",
                        lineHeight: "18px",
                      }}
                    >
                      {count}
                    </Box>
                  </Box>
                }
                sx={{
                  minHeight: 52,
                  textTransform: "none",
                  borderRight: "1px solid #e2eaf4",
                  color: isActive ? section.color : "#64748b",
                  background: isActive ? section.bg : "#fff",
                  borderBottom: isActive ? `3px solid ${section.color}` : "3px solid transparent",
                  transition: "all 0.18s ease",
                  "&:last-child": { borderRight: "none" },
                  "&.Mui-selected": { color: section.color },
                }}
              />
            );
          })}
        </Tabs>
      </Card>

      {/* ── Stat Cards (tab-aware) ── */}
      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, mb: 2.5 }}>
        {STAT_CARDS.map((s) => (
          <Box
            key={s.label}
            sx={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "14px",
              px: 2.5,
              py: 2,
              display: "flex",
              alignItems: "center",
              gap: 1.8,
              borderLeft: `4px solid ${s.accent}`,
              boxShadow: "0 2px 8px rgba(0,0,0,.04)",
            }}
          >
            <Box sx={{ width: 42, height: 42, borderRadius: "12px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", color: s.accent, flexShrink: 0 }}>
              {s.icon}
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, color: "#718096", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", mb: 0.3 }}>{s.label}</Typography>
              <Typography sx={{ fontSize: 22, fontWeight: 800, color: "#1c2333", lineHeight: 1, fontFamily: "'Rajdhani', sans-serif" }}>{s.value}</Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {/* ── Search ── */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder={`Search ${activeSection.title} by name, mobile, city or GSTIN…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: "#94a3b8" }} />
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "12px",
              background: "#fff",
              fontSize: 13,
              boxShadow: "0 2px 8px rgba(0,0,0,.04)",
              "& fieldset": { borderColor: "#dbe5f0" },
              "&:hover fieldset": { borderColor: "#94a3b8" },
              "&.Mui-focused fieldset": { borderColor: "#1a56a0", borderWidth: 2 },
            },
          }}
        />
      </Box>

      {/* ── Active Section Table ── */}
      <Card sx={{ borderRadius: "14px", border: "1px solid #dbe5f0", boxShadow: "0 4px 16px rgba(15,35,60,0.06)", overflow: "hidden" }}>
        {/* Table sub-header with filter pills */}
        <Box sx={{ px: 2.5, py: 1.6, background: "#fff", borderBottom: "1px solid #e2eaf4", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", background: activeSection.color, flexShrink: 0 }} />
            <Typography sx={{ fontSize: 15, fontWeight: 800, color: "#1c2333", fontFamily: "Rajdhani, sans-serif" }}>
              {activeSection.title}
            </Typography>
            <Box sx={{ px: 1.2, py: 0.2, borderRadius: "6px", background: activeSection.bg, border: `1px solid ${activeSection.color}22` }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: activeSection.color }}>{activeList.length}</Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 0.8 }}>
            {[{ key: "all", label: "All" }, { key: "pending", label: "Pending" }, { key: "paid", label: "Paid" }].map((flt) => {
              const isActive = typeFilters[activeTab] === flt.key;
              return (
                <Button
                  key={flt.key}
                  size="small"
                  onClick={() => setTypeFilters((prev) => ({ ...prev, [activeTab]: flt.key }))}
                  sx={{
                    textTransform: "none",
                    fontSize: 12,
                    fontWeight: isActive ? 700 : 500,
                    px: 1.8,
                    py: 0.5,
                    minWidth: 0,
                    borderRadius: "8px",
                    color: isActive ? activeSection.color : "#64748b",
                    background: isActive ? activeSection.bg : "transparent",
                    border: isActive ? `1px solid ${activeSection.color}44` : "1px solid transparent",
                    "&:hover": { background: activeSection.bg, color: activeSection.color },
                    transition: "all 0.15s",
                  }}
                >
                  {flt.label}
                </Button>
              );
            })}
          </Box>
        </Box>

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
              {activeList.map((row, idx) => (
                <CustomerRow
                  key={`${activeTab}-${row.key}`}
                  row={row}
                  serial={idx + 1}
                  onView={(inv) => setViewInvoice(inv)}
                  onEdit={(inv) =>
                    navigate("/customers/bill", {
                      state: {
                        editInvoice: inv,
                        editCustomer: {
                          name: row.name, phone: row.phone,
                          address: row.invoices?.[0]?.customer?.address || "",
                          gstin: row.gstin, customerType: row.type,
                          saleType: row.type, paymentTerms: row.paymentTerms,
                        },
                      },
                    })
                  }
                  onPay={(inv, r) =>
                    navigate("/customers/payments", {
                      state: {
                        fromPayAction: true,
                        prefillCustomer: { name: r.name, phone: r.phone },
                        prefillInvoice: { id: inv._id, invoiceNo: inv.invoiceNo, dueAmount: getInvoicePaymentMetrics(inv).dueAmount },
                      },
                    })
                  }
                  onDelete={askDelete}
                />
              ))}
              {activeList.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6, color: "#94a3b8", fontSize: 13 }}>
                    {search ? `No results for "${search}" in ${activeSection.title}` : `No ${activeSection.title} found`}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </Card>

      <InvoiceViewDialog invoice={viewInvoice} open={Boolean(viewInvoice)} onClose={() => setViewInvoice(null)} />
      <PaymentDialog invoice={editingInvoice} open={!!editingInvoice} onClose={() => setEditingInvoice(null)} onSaved={fetchAll} />
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
