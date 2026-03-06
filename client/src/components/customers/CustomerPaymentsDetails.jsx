import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  Typography,
  Grid,
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
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import DeleteIcon from "@mui/icons-material/Delete";
import toast from "react-hot-toast";
import { getInvoices, updateInvoice, deleteInvoice } from "../../services/invoiceService";
import { saveCustomer } from "../../services/customerService";

const fmt = (n = 0) => Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const paymentInfo = (invoice) => {
  const amount = Number(invoice?.payment?.amount || 0);
  const paidAmount = Number(
    invoice?.payment?.paidAmount ??
      (invoice?.status === "Paid" ? amount : invoice?.status === "Partial" ? Math.max(0, amount - Number(invoice?.payment?.dueAmount || 0)) : 0)
  );
  const dueAmount = Number(invoice?.payment?.dueAmount ?? Math.max(0, amount - paidAmount));
  return { amount, paidAmount, dueAmount };
};

const CustomerRow = ({ invoices, serial, onEdit, onDelete }) => {
  const [open, setOpen] = useState(false);
  const customer = invoices[0]?.customer || {};
  const totals = invoices.reduce(
    (acc, inv) => {
      const p = paymentInfo(inv);
      acc.amount += p.amount;
      acc.paid += p.paidAmount;
      acc.due += p.dueAmount;
      return acc;
    },
    { amount: 0, paid: 0, due: 0 }
  );
  const status = totals.due <= 0 && totals.amount > 0 ? "Paid" : totals.paid > 0 ? "Partial" : "Pending";

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
            {customer?.name || "Unknown"}
          </Typography>
          <Typography fontSize={12} color="text.secondary">
            {customer?.phone || "-"}
          </Typography>
        </TableCell>
        <TableCell>{customer?.address || "-"}</TableCell>
        <TableCell sx={{ fontWeight: 700, color: "#1d4ed8" }}>Rs.{fmt(totals.amount)}</TableCell>
        <TableCell sx={{ fontWeight: 700, color: "#15803d" }}>Rs.{fmt(totals.paid)}</TableCell>
        <TableCell sx={{ fontWeight: 700, color: totals.due > 0 ? "#dc2626" : "#15803d" }}>Rs.{fmt(totals.due)}</TableCell>
        <TableCell>
          <Chip
            label={status}
            size="small"
            color={status === "Paid" ? "success" : status === "Partial" ? "warning" : "error"}
          />
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell colSpan={8} sx={{ py: 0, background: "#fafbfc" }}>
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
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoices.map((inv) => {
                    const p = paymentInfo(inv);
                    return (
                      <TableRow key={inv._id}>
                        <TableCell>{inv.invoiceNo || "-"}</TableCell>
                        <TableCell>{inv.date || "-"}</TableCell>
                        <TableCell>Rs.{fmt(p.amount)}</TableCell>
                        <TableCell>Rs.{fmt(p.paidAmount)}</TableCell>
                        <TableCell>Rs.{fmt(p.dueAmount)}</TableCell>
                        <TableCell>
                          <Chip
                            label={inv.status || "Pending"}
                            size="small"
                            color={inv.status === "Paid" ? "success" : inv.status === "Partial" ? "warning" : "error"}
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            <Button size="small" variant="outlined" onClick={() => onEdit(inv)}>
                              Edit Payment
                            </Button>
                            <IconButton size="small" color="error" onClick={() => onDelete(inv)}>
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

  const amount = Number(invoice?.payment?.amount || 0);
  const existingPaid = Number(invoice?.payment?.paidAmount || 0);
  const remaining = Math.max(0, amount - existingPaid);

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
          Invoice {invoice.invoiceNo || "-"} | Total Rs.{fmt(amount)} | Remaining Rs.{fmt(remaining)}
        </Typography>
        <TextField
          select
          fullWidth
          label="Payment Type"
          value={paymentType}
          onChange={(e) => setPaymentType(e.target.value)}
          sx={{ mb: 2 }}
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

  const fetchAll = async () => {
    try {
      const res = await getInvoices();
      setInvoices(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to fetch invoices");
    }
  };

  useEffect(() => {
    const run = async () => {
      await fetchAll();
    };
    run();
  }, []);

  const handleDelete = async (invoice) => {
    if (!window.confirm(`Delete invoice ${invoice.invoiceNo || ""}?`)) return;
    try {
      await deleteInvoice(invoice._id);
      toast.success("Invoice deleted");
      fetchAll();
    } catch {
      toast.error("Delete failed");
    }
  };

  const grouped = useMemo(() => {
    const map = {};
    invoices.forEach((inv) => {
      const c = inv.customer || {};
      const key = `${c.name || "Unknown"}|${c.phone || ""}`;
      if (!map[key]) map[key] = [];
      map[key].push(inv);
    });
    return map;
  }, [invoices]);

  const allKeys = useMemo(
    () =>
      Object.keys(grouped).filter((key) => {
        const list = grouped[key];
        const q = search.trim().toLowerCase();
        const matchesSearch =
          !q ||
          key.toLowerCase().includes(q) ||
          list.some((inv) => (inv.invoiceNo || "").toLowerCase().includes(q));
        if (!matchesSearch) return false;
        if (tab === 1) return list.some((inv) => inv.status !== "Paid");
        if (tab === 2) return list.some((inv) => inv.status === "Paid");
        if (tab === 3) return list.some((inv) => inv.status === "Partial");
        return true;
      }),
    [grouped, search, tab]
  );

  const totals = useMemo(() => {
    let amount = 0;
    let paid = 0;
    let due = 0;
    invoices.forEach((inv) => {
      const p = paymentInfo(inv);
      amount += p.amount;
      paid += p.paidAmount;
      due += p.dueAmount;
    });
    return { amount, paid, due };
  }, [invoices]);

  const pendingCount = invoices.filter((i) => i.status === "Pending").length;
  const paidCount = invoices.filter((i) => i.status === "Paid").length;
  const partialCount = invoices.filter((i) => i.status === "Partial").length;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={0.5}>
        Customer Payments & Details
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Track customer invoices, paid amount and pending dues
      </Typography>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2.5, borderRadius: 3, background: "#eff6ff" }}>
            <Typography variant="body2" color="text.secondary">Total Bill Value</Typography>
            <Typography variant="h5" fontWeight={800} color="#1d4ed8">Rs.{fmt(totals.amount)}</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2.5, borderRadius: 3, background: "#ecfdf5" }}>
            <Typography variant="body2" color="text.secondary">Total Paid</Typography>
            <Typography variant="h5" fontWeight={800} color="#15803d">Rs.{fmt(totals.paid)}</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2.5, borderRadius: 3, background: "#fef2f2" }}>
            <Typography variant="body2" color="text.secondary">Total Due</Typography>
            <Typography variant="h5" fontWeight={800} color="#dc2626">Rs.{fmt(totals.due)}</Typography>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ p: 3, borderRadius: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label={<Box display="flex" gap={1}>All <Chip size="small" label={invoices.length} /></Box>} />
          <Tab label={<Box display="flex" gap={1}>Pending <Chip size="small" color="error" label={pendingCount} /></Box>} />
          <Tab label={<Box display="flex" gap={1}>Paid <Chip size="small" color="success" label={paidCount} /></Box>} />
          <Tab label={<Box display="flex" gap={1}>Partial <Chip size="small" color="warning" label={partialCount} /></Box>} />
        </Tabs>

        <TextField
          fullWidth
          size="small"
          placeholder="Search customer or invoice..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 2 }}
        />

        <Box sx={{ overflowX: "auto" }}>
          <Table>
            <TableHead sx={{ background: "#f1f5f9" }}>
              <TableRow>
                <TableCell />
                <TableCell>#</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Address</TableCell>
                <TableCell>Total Amount</TableCell>
                <TableCell>Total Paid</TableCell>
                <TableCell>Total Due</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allKeys.map((key, idx) => (
                <CustomerRow
                  key={key}
                  invoices={grouped[key]}
                  serial={idx + 1}
                  onEdit={(inv) => setEditingInvoice(inv)}
                  onDelete={handleDelete}
                />
              ))}
              {allKeys.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
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
    </Box>
  );
};

export default CustomerPaymentsDetails;
