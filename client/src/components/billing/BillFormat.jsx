import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  Grid,
  Switch,
  FormControlLabel,
  Avatar,
} from "@mui/material";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import InvoicePrint from "./InvoicePrint";

const EMPTY_FORM = {
  shopName: "",
  address: "",
  gst: "",
  footer: "",
  showGST: true,
  showLogo: true,
  logo: "",
};

const BillFormat = () => {
  const [form, setForm] = useState(() => {
    // 🔹 Load saved format on mount so fields are pre-filled
    try {
      return JSON.parse(localStorage.getItem("billFormat")) || EMPTY_FORM;
    } catch {
      return EMPTY_FORM;
    }
  });

  const [savedFormat, setSavedFormat] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // 🔹 Sample invoice for preview
  const sampleData = {
    customer: {
      name: "Sample Customer",
      phone: "9876543210",
      address: "123 Main Street",
    },
    invoiceNo: "INV123456",
    date: new Date().toLocaleString(),
    tax: 5,
    discount: 2,
    status: "Paid",
    payment: { paidAmount: 2397, dueAmount: 0 },
    items: [
      {
        code: "T001",
        name: "Tiles",
        colorDesign: "White",
        quantity: 2,
        size: "12x12",
        uom: "piece",
        price: 500,
        gst: 5,
        discount: 5,
        gstAmount: 50,
        discountAmount: 50,
        total: 1000,
      },
      {
        code: "G002",
        name: "Granite",
        colorDesign: "Black",
        quantity: 1,
        size: "24x24",
        uom: "piece",
        price: 1200,
        gst: 5,
        discount: 10,
        gstAmount: 60,
        discountAmount: 120,
        total: 1140,
      },
    ],
  };

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // 🔹 Logo upload handler — converts file to base64
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, logo: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    localStorage.setItem("billFormat", JSON.stringify(form));
    toast.success("Format Saved ✅");

    // 🔥 Save a snapshot for preview BEFORE clearing the form
    setSavedFormat({ ...form });
    setShowPreview(true);

    // 🔥 Reset only text fields, keep toggles
    setForm({
      ...EMPTY_FORM,
      showGST: form.showGST,
      showLogo: form.showLogo,
      logo: form.logo,
    });
  };

  const handleRemoveLogo = () => {
    setForm((prev) => ({ ...prev, logo: "" }));
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

          {/* 🔹 Logo Upload */}
          {form.showLogo && (
            <Grid item xs={12}>
              <Typography fontWeight={600} fontSize={14} mb={1}>
                Shop Logo
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                {form.logo ? (
                  <>
                    <Avatar
                      src={form.logo}
                      variant="rounded"
                      sx={{ width: 72, height: 72, border: "1px solid #e5e7eb" }}
                    />
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={handleRemoveLogo}
                    >
                      Remove Logo
                    </Button>
                  </>
                ) : (
                  <Button variant="outlined" component="label" size="small">
                    Upload Logo
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handleLogoUpload}
                    />
                  </Button>
                )}
              </Box>
            </Grid>
          )}

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

      {/* 🔥 SAMPLE PREVIEW — uses savedFormat snapshot, not cleared form */}
      {showPreview && savedFormat && (
        <Box mt={5}>
          <Box
            sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}
          >
            <Typography variant="h5">Sample Bill Preview</Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setShowPreview(false)}
            >
              Hide Preview
            </Button>
          </Box>

          {/*
            InvoicePrint reads format from localStorage.
            Since we just saved, localStorage is up-to-date.
          */}
          <InvoicePrint data={sampleData} />
        </Box>
      )}
    </Box>
  );
};

export default BillFormat;
