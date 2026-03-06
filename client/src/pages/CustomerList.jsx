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
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";

import { useEffect, useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

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

  const getStatus = (inv) => (inv.status === "Paid" ? "Paid" : "Pending");

  // Stats
  const total = invoices.length;
  const paid = invoices.filter((i) => i.status === "Paid").length;
  const pending = invoices.filter((i) => i.status !== "Paid").length;

  // ✅ Helper: get customer name whether object or string
  const getCustomerName = (customer) => {
    if (!customer) return "-";
    if (typeof customer === "object") return customer.name || "-";
    return customer;
  };

  // ✅ Helper: get customer phone
  const getCustomerPhone = (customer) => {
    if (!customer || typeof customer !== "object") return "-";
    return customer.phone || "-";
  };

  // Search filter — works on name and phone too
  const filteredInvoices = invoices.filter((inv) => {
    const name = getCustomerName(inv.customer).toLowerCase();
    const phone =
      typeof inv.customer === "object"
        ? inv.customer?.phone || ""
        : "";
    const invNo = inv.invoiceNo?.toLowerCase() || "";
    const q = search.toLowerCase();

    return name.includes(q) || invNo.includes(q) || phone.includes(q);
  });

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" mb={2}>
        Customers
      </Typography>

      {/* STATS */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2, bgcolor: "#e3f2fd" }}>
            <Typography>Total Invoices</Typography>
            <Typography variant="h5">{total}</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2, bgcolor: "#e8f5e9" }}>
            <Typography>Paid</Typography>
            <Typography variant="h5">{paid}</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2, bgcolor: "#ffebee" }}>
            <Typography>Pending</Typography>
            <Typography variant="h5">{pending}</Typography>
          </Card>
        </Grid>
      </Grid>

      {/* SEARCH + ADD */}
      <Box display="flex" gap={2} mb={3}>
        <TextField
          fullWidth
          placeholder="Search by invoice no, customer name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={{ whiteSpace: "nowrap", fontWeight: "bold" }}
          onClick={() => navigate("/invoice")}
        >
          Add Invoice
        </Button>
      </Box>

      {/* TABLE */}
      <Card>
        <Box p={2}>
          <Typography variant="h6">Invoice List</Typography>
        </Box>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Invoice No</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Address</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredInvoices.map((inv, index) => {
              const status = getStatus(inv);

              return (
                <TableRow key={inv._id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{inv.invoiceNo}</TableCell>
                  <TableCell>{getCustomerName(inv.customer)}</TableCell>
                  <TableCell>{getCustomerPhone(inv.customer)}</TableCell>
                  <TableCell>{typeof inv.customer === "object" ? inv.customer?.address || "-" : "-"}</TableCell>
                  <TableCell>{inv.date}</TableCell>
                  <TableCell>₹{inv.payment?.amount}</TableCell>

                  <TableCell>
                    <Chip
                      label={status}
                      color={status === "Paid" ? "success" : "warning"}
                      size="small"
                    />
                  </TableCell>

                  <TableCell>
                    <Box display="flex" gap={1}>
                      <IconButton
                        color="primary"
                        onClick={() => handleEdit(inv)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => handleDelete(inv._id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}

            {filteredInvoices.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  No invoices found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </Box>
  );
};

export default CustomerList;
