import { useState } from "react";
import { Box, Card, Typography, Grid, TextField, Button } from "@mui/material";
import toast from "react-hot-toast";
import { saveCustomer } from "../../services/customerService";

const initialForm = {
  name: "",
  phone: "",
  address: "",
  accountNo: "",
  ifscCode: "",
  upiId: "",
  accountHolder: "",
  bankName: "",
  branch: "",
};

const CustomerCreate = () => {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      toast.error("Name, phone and address are required");
      return;
    }

    setLoading(true);
    try {
      await saveCustomer({
        ...form,
        amount: 0,
        status: "Pending",
        method: "",
      });
      toast.success("Customer saved");
      setForm(initialForm);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to save customer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ p: 3, borderRadius: 3, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
      <Typography variant="h6" fontWeight={700} mb={0.5}>
        Create Customer
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Customer name, phone and address are mandatory
      </Typography>

      <Typography variant="subtitle1" fontWeight={700} mb={2}>
        Customer Details
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            required
            label="Customer Name"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            required
            label="Phone Number"
            value={form.phone}
            inputProps={{ maxLength: 10 }}
            onChange={(e) => handleChange("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            required
            multiline
            rows={2}
            label="Address"
            value={form.address}
            onChange={(e) => handleChange("address", e.target.value)}
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle1" fontWeight={700} mt={4} mb={2}>
        Bank Details
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Bank Name"
            value={form.bankName}
            onChange={(e) => handleChange("bankName", e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Branch"
            value={form.branch}
            onChange={(e) => handleChange("branch", e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Account Holder"
            value={form.accountHolder}
            onChange={(e) => handleChange("accountHolder", e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Account Number"
            value={form.accountNo}
            onChange={(e) => handleChange("accountNo", e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="IFSC Code"
            value={form.ifscCode}
            onChange={(e) => handleChange("ifscCode", e.target.value.toUpperCase())}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="UPI ID"
            value={form.upiId}
            onChange={(e) => handleChange("upiId", e.target.value)}
          />
        </Grid>
      </Grid>

      <Box mt={3}>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? "Saving..." : "Save Customer"}
        </Button>
      </Box>
    </Card>
  );
};

export default CustomerCreate;
