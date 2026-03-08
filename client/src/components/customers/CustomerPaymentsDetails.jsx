import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  Typography,
  Tabs,
  Tab,
  Chip,
  TextField,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Collapse,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  InputAdornment,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import PaymentsIcon from "@mui/icons-material/Payments";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import PeopleIcon from "@mui/icons-material/People";
import toast from "react-hot-toast";
import { getInvoices, updateInvoice, deleteInvoice } from "../../services/invoiceService";
import { saveCustomer } from "../../services/customerService";
import { formatCurrency, getInvoicePaymentMetrics, groupInvoicesByCustomer } from "../../utils/invoiceMetrics";
import ConfirmDialog from "../common/ConfirmDialog";

const statusColor = (status) => {
  if (status === "Paid") return "success";
  if (status === "Partial") return "warning";
  return "error";
};

const CustomerRow = ({ entry, serial, onEdit, onDelete }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow hover>
        <TableCell sx={{ width: 40 }}>
          <IconButton size="small" onClick={() => setOpen((v) => !v)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>{serial}</TableCell>
        <TableCell>
          <Typography fontWeight={700} fontSize={14}>
            {entry.customer.name || "Unknown"}
          </Typography>
          <Typography fontSize={12} color="text.secondary">
            {entry.customer.phone || "-"}
          </Typography>
        </TableCell>
        <TableCell>{entry.customer.address || "-"}</TableCell>
        <TableCell>{entry.invoiceCount}</TableCell>
        <TableCell sx={{ fontWeight: 700, color: "#0f3d7a" }}>Rs. {formatCurrency(entry.totals.amount)}</TableCell>
        <TableCell sx={{ fontWeight: 700, color: "#1a7a4a" }}>Rs. {formatCurrency(entry.totals.paid)}</TableCell>
        <TableCell sx={{ fontWeight: 700, color: entry.totals.due > 0 ? "#c0392b" : "#1a7a4a" }}>
          Rs. {formatCurrency(entry.totals.due)}
        </TableCell>
        <TableCell>
          <Chip label={entry.status} size="small" color={statusColor(entry.status)} />
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell colSpan={9} sx={{ py: 0, background: "#fafbfc" }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ m: 2 }}>
              <Table size="small">
                <TableHead sx={{ background: "#f1f5f9" }}>
                  <TableRow>
                    <TableCell>Invoice No</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Paid</TableCell>
                    <TableCell>Due</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entry.invoices.map((invoice) => {
                    const metrics = getInvoicePaymentMetrics(invoice);
                    return (
                      <TableRow key={invoice._id}>
                        <TableCell>{invoice.invoiceNo || "-"}</TableCell>
                        <TableCell>{invoice.date || "-"}</TableCell>
                        <TableCell>Rs. {formatCurrency(metrics.amount)}</TableCell>
                        <TableCell>Rs. {formatCurrency(metrics.paidAmount)}</TableCell>
                        <TableCell>Rs. {formatCurrency(metrics.dueAmount)}</TableCell>
                        <TableCell>
                          <Chip label={metrics.status} size="small" color={statusColor(metrics.status)} />
                        </TableCell>
                        <TableCell align="right">
                          <Box display="inline-flex" gap={1}>
                            <Button size="small" variant="outlined" onClick={() => onEdit(invoice)}>
                              Edit Payment
                            </Button>
                            <IconButton size="small" color="error" onClick={() => onDelete(invoice)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const PaymentDialog = ({ invoice, open, onClose, onSaved }) => {
  const [paymentType, setPaymentType] = useState("Full Payment");
  const [method, setMethod] = useState("CASH");
  const [partialAmount, setPartialAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const metrics = useMemo(() => getInvoicePaymentMetrics(invoice || {}), [invoice]);
  const amount = metrics.amount;
  const existingPaid = metrics.paidAmount;
  const remaining = metrics.dueAmount;

  useEffect(() => {
    if (!invoice) return;
    setPaymentType(invoice?.payment?.paymentType || (invoice?.status === "Partial" ? "Partial" : invoice?.status === "Paid" ? "Full Payment" : "Pending"));
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
        toast.error("Partial amount should be greater than 0 and less than remaining due");
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
        payment: {
          ...invoice.payment,
          amount,
          method: paymentType === "Pending" ? "" : method,
          paidAmount: newPaid,
          dueAmount: newDue,
          paymentType,
        },
      });

      await saveCustomer({
        ...invoice.customer,
        amount: 0,
        status,
        method: paymentType === "Pending" ? "" : method,
      });

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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Update Customer Payment</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Invoice {invoice.invoiceNo || "-"} | Total Rs. {formatCurrency(amount)} | Remaining Rs. {formatCurrency(remaining)}
        </Typography>
        <TextField
          select
          fullWidth
          label="Payment Type"
          value={paymentType}
          onChange={(e) => setPaymentType(e.target.value)}
          sx={{ mb: 2, mt: 1 }}
        >
          <MenuItem value="Full Payment">Full Payment</MenuItem>
          <MenuItem value="Partial">Partial</MenuItem>
          <MenuItem value="Pending">Pending</MenuItem>
        </TextField>

        {paymentType === "Partial" && (
          <TextField
            fullWidth
            type="number"
            label="Partial Amount"
            value={partialAmount}
            onChange={(e) => setPartialAmount(e.target.value)}
            sx={{ mb: 2 }}
          />
        )}

        <TextField
          select
          fullWidth
          label="Payment Method"
          value={method}
          disabled={paymentType === "Pending"}
          onChange={(e) => setMethod(e.target.value)}
        >
          <MenuItem value="CASH">Cash</MenuItem>
          <MenuItem value="UPI">UPI</MenuItem>
          <MenuItem value="CARD">Card</MenuItem>
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const CustomerPaymentsDetails = () => {
  const [invoices, setInvoices] = useState([]);
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState("");
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: "", invoiceNo: "" });

  const fetchAll = async () => {
    try {
      const res = await getInvoices();
      setInvoices(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to fetch invoices");
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const askDelete = (invoice) => {
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

  const grouped = useMemo(() => groupInvoicesByCustomer(invoices), [invoices]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return grouped.filter((entry) => {
      const matchesSearch =
        !q ||
        entry.customer.name.toLowerCase().includes(q) ||
        (entry.customer.phone || "").includes(q) ||
        entry.invoices.some((invoice) => (invoice.invoiceNo || "").toLowerCase().includes(q));

      if (!matchesSearch) return false;
      if (tab === 1) return entry.status === "Pending";
      if (tab === 2) return entry.status === "Paid";
      if (tab === 3) return entry.status === "Partial";
      return true;
    });
  }, [grouped, search, tab]);

  const totals = useMemo(() => {
    return invoices.reduce(
      (acc, invoice) => {
        const metrics = getInvoicePaymentMetrics(invoice);
        acc.amount += metrics.amount;
        acc.paid += metrics.paidAmount;
        acc.due += metrics.dueAmount;
        return acc;
      },
      { amount: 0, paid: 0, due: 0 }
    );
  }, [invoices]);

  const counts = useMemo(() => {
    return grouped.reduce(
      (acc, entry) => {
        acc.all += 1;
        if (entry.status === "Pending") acc.pending += 1;
        if (entry.status === "Paid") acc.paid += 1;
        if (entry.status === "Partial") acc.partial += 1;
        return acc;
      },
      { all: 0, pending: 0, paid: 0, partial: 0 }
    );
  }, [grouped]);

  const StatCard = ({ icon, label, value, accent, iconBg }) => (
    <Box
      sx={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        px: 2,
        py: 1.7,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        minHeight: 98,
        borderTop: `3px solid ${accent}`,
        boxShadow: "0 1px 4px rgba(0,0,0,.05)",
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: "10px",
          background: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: accent,
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 11, color: "#718096", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", mb: 0.2 }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: 20, fontWeight: 800, color: "#1c2333", lineHeight: 1.1, fontFamily: "'Rajdhani', sans-serif" }}>
          {value}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, background: "#f0f4f8", minHeight: "100vh" }}>
      <Card
        sx={{
          mb: 3,
          p: { xs: 2.5, md: 3 },
          borderRadius: "18px",
          background: "linear-gradient(135deg, #1a56a0 0%, #0f3d7a 100%)",
          color: "#fff",
          boxShadow: "0 18px 40px rgba(15,61,122,0.24)",
        }}
      >
        <Typography sx={{ fontSize: 28, fontWeight: 800, fontFamily: "Rajdhani, sans-serif", lineHeight: 1 }}>
          Customer Payments
        </Typography>
        <Typography sx={{ mt: 0.8, fontSize: 13, color: "rgba(255,255,255,0.76)" }}>
          Live receivable summary based on actual invoice values and payment history
        </Typography>
      </Card>

      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" }, mb: 3 }}>
        <StatCard
          icon={<PeopleIcon fontSize="small" />}
          label="Total Customers"
          value={counts.all}
          accent="#2563eb"
          iconBg="#eff6ff"
        />
        <StatCard
          icon={<CurrencyRupeeIcon fontSize="small" />}
          label="Total Bill Value"
          value={`Rs. ${formatCurrency(totals.amount)}`}
          accent="#0f3d7a"
          iconBg="#edf4ff"
        />
        <StatCard
          icon={<PaymentsIcon fontSize="small" />}
          label="Total Paid"
          value={`Rs. ${formatCurrency(totals.paid)}`}
          accent="#1a7a4a"
          iconBg="#ebfaf1"
        />
        <StatCard
          icon={<HourglassBottomIcon fontSize="small" />}
          label="Total Due"
          value={`Rs. ${formatCurrency(totals.due)}`}
          accent="#c0392b"
          iconBg="#fff3ea"
        />
      </Box>

      <Card sx={{ borderRadius: "16px", border: "1px solid #dbe5f0", overflow: "hidden", boxShadow: "0 8px 24px rgba(15,35,60,0.06)" }}>
        <Box sx={{ p: 2.5, background: "#fafcfe", borderBottom: "1px solid #e2e8f0" }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label={<Box display="flex" gap={1}>All <Chip size="small" label={counts.all} /></Box>} />
            <Tab label={<Box display="flex" gap={1}>Pending <Chip size="small" color="error" label={counts.pending} /></Box>} />
            <Tab label={<Box display="flex" gap={1}>Paid <Chip size="small" color="success" label={counts.paid} /></Box>} />
            <Tab label={<Box display="flex" gap={1}>Partial <Chip size="small" color="warning" label={counts.partial} /></Box>} />
          </Tabs>

          <TextField
            fullWidth
            size="small"
            placeholder="Search customer, phone, or invoice..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px", background: "#fff" } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#718096", fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Box sx={{ overflowX: "auto" }}>
          <Table>
            <TableHead sx={{ background: "#f8fafc" }}>
              <TableRow>
                <TableCell />
                <TableCell>#</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Address</TableCell>
                <TableCell>Bills</TableCell>
                <TableCell>Total Amount</TableCell>
                <TableCell>Total Paid</TableCell>
                <TableCell>Total Due</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleRows.map((entry, idx) => (
                <CustomerRow
                  key={entry.key}
                  entry={entry}
                  serial={idx + 1}
                  onEdit={(invoice) => setEditingInvoice(invoice)}
                  onDelete={askDelete}
                />
              ))}
              {visibleRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6, color: "#718096" }}>
                    No customer payments found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </Card>

      <PaymentDialog
        invoice={editingInvoice}
        open={!!editingInvoice}
        onClose={() => setEditingInvoice(null)}
        onSaved={fetchAll}
      />
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

export default CustomerPaymentsDetails;
