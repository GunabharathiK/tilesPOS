import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  Grid,
  Switch,
  FormControlLabel,
} from "@mui/material";
import { useState } from "react";
import toast from "react-hot-toast";
import InvoicePrint from "./InvoicePrint";

const BillFormat = () => {
  const [form, setForm] = useState({
    shopName: "",
    address: "",
    gst: "",
    footer: "",
    showGST: true,
    showLogo: true,
  });

  const [showPreview, setShowPreview] = useState(false);

  // 🔹 Sample invoice for preview
  const sampleData = {
    customer: "Sample Customer",
    invoiceNo: "INV123456",
    date: new Date().toLocaleString(),
    tax: 5,
    discount: 2,
    items: [
      { name: "Tiles", quantity: 2, price: 500, discount: 5 },
      { name: "Granite", quantity: 1, price: 1200, discount: 10 },
    ],
  };

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSave = () => {
    localStorage.setItem("billFormat", JSON.stringify(form));
    toast.success("Format Saved ✅");

    // 🔥 CLEAR FORM
    setForm({
      shopName: "",
      address: "",
      gst: "",
      footer: "",
      showGST: true,
      showLogo: true,
    });

    // 🔥 SHOW PREVIEW
    setShowPreview(true);
  };

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" mb={2}>
        Edit Bill Format
      </Typography>

      <Card sx={{ p: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Shop Name"
              name="shopName"
              value={form.shopName}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Address"
              name="address"
              value={form.address}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="GST Number"
              name="gst"
              value={form.gst}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Footer Message"
              name="footer"
              value={form.footer}
              onChange={handleChange}
            />
          </Grid>

          {/* Toggles */}
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.showGST}
                  onChange={handleChange}
                  name="showGST"
                />
              }
              label="Show GST"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={form.showLogo}
                  onChange={handleChange}
                  name="showLogo"
                />
              }
              label="Show Logo"
            />
          </Grid>

          {/* Save */}
          <Grid item xs={12}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleSave}
            >
              Save Format
            </Button>
          </Grid>
        </Grid>
      </Card>

      {/* 🔥 SAMPLE PREVIEW */}
      {showPreview && (
        <Box mt={5}>
          <Typography variant="h5" mb={2}>
            Sample Bill Preview
          </Typography>

          <InvoicePrint data={sampleData} />
        </Box>
      )}
    </Box>
  );
};

export default BillFormat;