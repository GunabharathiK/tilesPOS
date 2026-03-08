import { useState } from "react";
import { Box, Card, Typography, Grid, TextField, Button } from "@mui/material";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import toast from "react-hot-toast";
import { saveCustomer } from "../../services/customerService";

const initialForm = {
  name: "",
  phone: "",
  address: "",
};

const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "10px",
    background: "#fff",
    "& fieldset": { borderColor: "#dbe5f0" },
    "&:hover fieldset": { borderColor: "#94a3b8" },
    "&.Mui-focused fieldset": { borderColor: "#1a56a0", borderWidth: 2 },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#1a56a0" },
};

const SectionHeader = ({ icon, title, subtitle }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1.3, mb: 2.2 }}>
    <Box
      sx={{
        width: 38,
        height: 38,
        borderRadius: "12px",
        background: "linear-gradient(135deg, #1a56a0, #0f3d7a)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        boxShadow: "0 8px 20px rgba(15,61,122,0.2)",
      }}
    >
      {icon}
    </Box>
    <Box>
      <Typography sx={{ fontSize: 16, fontWeight: 800, color: "#1c2333" }}>{title}</Typography>
      <Typography sx={{ fontSize: 12, color: "#718096" }}>{subtitle}</Typography>
    </Box>
  </Box>
);

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
          Create Customer
        </Typography>
        <Typography sx={{ mt: 0.8, fontSize: 13, color: "rgba(255,255,255,0.76)" }}>
          Add customer contact details
        </Typography>
      </Card>

      <Card sx={{ p: 3, borderRadius: "16px", border: "1px solid #dbe5f0", boxShadow: "0 8px 24px rgba(15,35,60,0.06)" }}>
        <SectionHeader
          icon={<PersonAddAlt1Icon sx={{ fontSize: 18 }} />}
          title="Customer Details"
          subtitle="Name, phone number, and address are mandatory"
        />

        <Grid container spacing={2.2} mb={1}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              label="Customer Name"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              sx={inputSx}
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
              sx={inputSx}
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
              sx={inputSx}
            />
          </Grid>
        </Grid>

        <Box mt={3.5} display="flex" justifyContent="flex-end">
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
            sx={{
              borderRadius: "10px",
              px: 3,
              py: 1.2,
              textTransform: "none",
              fontWeight: 700,
              background: "linear-gradient(135deg, #1a56a0, #0f3d7a)",
            }}
          >
            {loading ? "Saving..." : "Save Customer"}
          </Button>
        </Box>
      </Card>
    </Box>
  );
};

export default CustomerCreate;
