import {
  Box,
  Card,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Grid,
  TextField,
  Chip,
  InputAdornment,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PaymentsIcon from "@mui/icons-material/Payments";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

import { useEffect, useMemo, useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { formatCurrency, getInvoicePaymentMetrics } from "../utils/invoiceMetrics";

const statCardSx = (bg, color) => ({
  p: 2.5,
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.55)",
  background: bg,
  boxShadow: "0 10px 30px rgba(15, 35, 60, 0.06)",
  height: "100%",
  "& .value": { fontSize: 26, fontWeight: 800, color, lineHeight: 1.1, mt: 1 },
  "& .label": { fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" },
});

const statusColor = (status) => {
  if (status === "Paid") return "success";
  if (status === "Partial") return "warning";
  return "error";
};

const CustomerList = () => {
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await API.get("/invoices");
      setInvoices(res.data);
    } catch {
      toast.error("Failed to fetch invoices");
    }
  };

  const handleEdit = (invoice) => {
    navigate("/invoice", { state: invoice });
  };

  const handleDelete = async (id) => {
    try {
      await API.delete(`/invoices/${id}`);
      toast.success("Invoice deleted");
      fetchInvoices();
    } catch {
      toast.error("Delete failed");
    }
  };

  const filteredInvoices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const customerName = invoice?.customer?.name?.toLowerCase() || "";
      const customerPhone = invoice?.customer?.phone || "";
      const invoiceNo = invoice?.invoiceNo?.toLowerCase() || "";
      return !q || customerName.includes(q) || customerPhone.includes(q) || invoiceNo.includes(q);
    });
  }, [invoices, search]);

  const summary = useMemo(() => {
    return invoices.reduce(
      (acc, invoice) => {
        const metrics = getInvoicePaymentMetrics(invoice);
        acc.count += 1;
        acc.total += metrics.amount;
        acc.paid += metrics.paidAmount;
        acc.due += metrics.dueAmount;
        if (metrics.status === "Paid") acc.paidCount += 1;
        if (metrics.status === "Pending") acc.pendingCount += 1;
        if (metrics.status === "Partial") acc.partialCount += 1;
        return acc;
      },
      { count: 0, total: 0, paid: 0, due: 0, paidCount: 0, pendingCount: 0, partialCount: 0 }
    );
  }, [invoices]);

  return (
    <Box sx={{ p: 0, background: "#f0f4f8", minHeight: "100%" }}>
      <Box
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
          Invoice Register
        </Typography>
        <Typography sx={{ mt: 0.8, fontSize: 13, color: "rgba(255,255,255,0.76)" }}>
          Customer billing history, payment status, and receivable tracking
        </Typography>
      </Box>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={statCardSx("linear-gradient(135deg, #ffffff, #edf4ff)", "#0f3d7a")}>
            <ReceiptLongIcon sx={{ color: "#1a56a0", fontSize: 28 }} />
            <Typography className="label">Total Invoices</Typography>
            <Typography className="value">{summary.count}</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={statCardSx("linear-gradient(135deg, #ffffff, #ebfaf1)", "#1a7a4a")}>
            <PaymentsIcon sx={{ color: "#1a7a4a", fontSize: 28 }} />
            <Typography className="label">Collected</Typography>
            <Typography className="value">Rs. {formatCurrency(summary.paid)}</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={statCardSx("linear-gradient(135deg, #ffffff, #fff3ea)", "#d4820a")}>
            <HourglassBottomIcon sx={{ color: "#d4820a", fontSize: 28 }} />
            <Typography className="label">Outstanding</Typography>
            <Typography className="value">Rs. {formatCurrency(summary.due)}</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={statCardSx("linear-gradient(135deg, #ffffff, #eef7ff)", "#1a56a0")}>
            <CheckCircleIcon sx={{ color: "#1a56a0", fontSize: 28 }} />
            <Typography className="label">Paid Bills</Typography>
            <Typography className="value">{summary.paidCount}</Typography>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ borderRadius: "16px", border: "1px solid #dbe5f0", overflow: "hidden", boxShadow: "0 8px 24px rgba(15,35,60,0.06)" }}>
        <Box
          sx={{
            p: 2.5,
            display: "flex",
            flexWrap: "wrap",
            gap: 1.5,
            alignItems: "center",
            justifyContent: "space-between",
            background: "#fafcfe",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 16, fontWeight: 800, color: "#1c2333" }}>Invoice List</Typography>
            <Typography sx={{ fontSize: 12, color: "#718096", mt: 0.4 }}>
              Search by invoice number, customer name, or phone
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 1.2, flexWrap: "wrap", width: { xs: "100%", md: "auto" } }}>
            <TextField
              size="small"
              placeholder="Search invoices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{
                minWidth: { xs: "100%", sm: 320 },
                "& .MuiOutlinedInput-root": {
                  borderRadius: "10px",
                  background: "#fff",
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#718096", fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
            />

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate("/invoice")}
              sx={{
                borderRadius: "10px",
                px: 2,
                fontWeight: 700,
                textTransform: "none",
                background: "linear-gradient(135deg, #1a56a0, #0f3d7a)",
              }}
            >
              Add Invoice
            </Button>
          </Box>
        </Box>

        <Box sx={{ overflowX: "auto" }}>
          <Table>
            <TableHead sx={{ background: "#f8fafc" }}>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Invoice No</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Paid</TableCell>
                <TableCell>Due</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredInvoices.map((invoice, index) => {
                const metrics = getInvoicePaymentMetrics(invoice);
                return (
                  <TableRow key={invoice._id} hover>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#1a56a0" }}>{invoice.invoiceNo || "-"}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{invoice?.customer?.name || "-"}</TableCell>
                    <TableCell>{invoice?.customer?.phone || "-"}</TableCell>
                    <TableCell>{invoice.date || "-"}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Rs. {formatCurrency(metrics.amount)}</TableCell>
                    <TableCell sx={{ color: "#1a7a4a", fontWeight: 700 }}>Rs. {formatCurrency(metrics.paidAmount)}</TableCell>
                    <TableCell sx={{ color: metrics.dueAmount > 0 ? "#c0392b" : "#1a7a4a", fontWeight: 700 }}>
                      Rs. {formatCurrency(metrics.dueAmount)}
                    </TableCell>
                    <TableCell>
                      <Chip label={metrics.status} color={statusColor(metrics.status)} size="small" />
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: "inline-flex", gap: 0.5 }}>
                        <IconButton color="primary" onClick={() => handleEdit(invoice)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton color="error" onClick={() => handleDelete(invoice._id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}

              {filteredInvoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6, color: "#718096" }}>
                    No invoices found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </Card>
    </Box>
  );
};

export default CustomerList;
