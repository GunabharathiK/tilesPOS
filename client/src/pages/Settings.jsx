import { useState, useEffect } from "react";
import {
  Box, Card, Typography, TextField, Button, Grid, Switch,
  FormControlLabel, Divider, Tabs, Tab, MenuItem, Avatar,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import StoreIcon from "@mui/icons-material/Store";
import ReceiptIcon from "@mui/icons-material/Receipt";
import PaletteIcon from "@mui/icons-material/Palette";
import toast from "react-hot-toast";
import compressImage from "../utils/compressImage";

const CURRENCY_OPTIONS = ["INR (₹)", "USD ($)", "EUR (€)", "GBP (£)"];
const GST_RATES = [0, 5, 12, 18, 28];

const defaultSettings = {
  // Shop Info
  shopName: "",
  ownerName: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  gstNumber: "",
  // Invoice
  invoicePrefix: "INV",
  nextInvoiceNumber: 1,
  currency: "INR (₹)",
  defaultTax: 0,
  defaultDiscount: 0,
  footerMessage: "Thank you for your business!",
  termsAndConditions: "",
  showGST: true,
  showLogo: true,
  showFooter: true,
  // Logo
  logo: "",
};

const Settings = () => {
  const [tab, setTab] = useState(0);
  const [settings, setSettings] = useState(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("shopSettings");
    if (saved) {
      const parsed = JSON.parse(saved);
      setSettings({ ...defaultSettings, ...parsed });
      setLogoPreview(parsed.logo || "");
    }
    // Also merge with billFormat for backward compatibility
    const billFormat = localStorage.getItem("billFormat");
    if (billFormat) {
      const bf = JSON.parse(billFormat);
      setSettings(prev => ({
        ...prev,
        shopName: prev.shopName || bf.shopName || "",
        address: prev.address || bf.address || "",
        gstNumber: prev.gstNumber || bf.gst || "",
        footerMessage: prev.footerMessage || bf.footer || "",
        showGST: bf.showGST !== undefined ? bf.showGST : prev.showGST,
        showLogo: bf.showLogo !== undefined ? bf.showLogo : prev.showLogo,
      }));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleLogo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 300, 0.8);
      setLogoPreview(compressed);
      setSettings(prev => ({ ...prev, logo: compressed }));
    } catch { toast.error("Failed to process logo"); }
  };

  const handleSave = () => {
    setSaving(true);
    try {
      localStorage.setItem("shopSettings", JSON.stringify(settings));
      // Keep billFormat in sync for InvoicePrint compatibility
      localStorage.setItem("billFormat", JSON.stringify({
        shopName: settings.shopName,
        address: settings.address,
        gst: settings.gstNumber,
        footer: settings.footerMessage,
        showGST: settings.showGST,
        showLogo: settings.showLogo,
        logo: settings.logo,
      }));
      toast.success("Settings saved ✅");
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  const handleReset = () => {
    if (window.confirm("Reset all settings to defaults?")) {
      localStorage.removeItem("shopSettings");
      localStorage.removeItem("billFormat");
      setSettings(defaultSettings);
      setLogoPreview("");
      toast.success("Settings reset");
    }
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700}>System Settings</Typography>
          <Typography variant="body2" color="text.secondary">Configure your shop and billing preferences</Typography>
        </Box>
        <Box display="flex" gap={1.5}>
          <Button variant="outlined" color="error" onClick={handleReset} size="small">Reset</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}
            startIcon={<SettingsIcon />}
            sx={{ fontWeight: 700, background: "#6366f1", "&:hover": { background: "#4f46e5" } }}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </Box>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
        mb: 3,
        "& .MuiTabs-indicator": { background: "#6366f1" },
        "& .Mui-selected": { color: "#6366f1 !important" },
        "& .MuiTab-root": { fontWeight: 600, textTransform: "none" },
      }}>
        <Tab icon={<StoreIcon fontSize="small" />} label="Shop Info" iconPosition="start" />
        <Tab icon={<ReceiptIcon fontSize="small" />} label="Invoice" iconPosition="start" />
        <Tab icon={<PaletteIcon fontSize="small" />} label="Appearance" iconPosition="start" />
      </Tabs>

      {/* Shop Info Tab */}
      {tab === 0 && (
        <Card sx={{ p: 3, borderRadius: 3, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
          <Typography variant="subtitle1" fontWeight={700} mb={2}>🏪 Shop Information</Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Shop / Business Name *" name="shopName"
                value={settings.shopName} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Owner Name" name="ownerName"
                value={settings.ownerName} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Phone Number" name="phone"
                value={settings.phone} onChange={handleChange} inputProps={{ maxLength: 10 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Email Address" name="email"
                type="email" value={settings.email} onChange={handleChange} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Shop Address" name="address"
                multiline rows={2} value={settings.address} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="City" name="city"
                value={settings.city} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="State" name="state"
                value={settings.state} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Pincode" name="pincode"
                value={settings.pincode} onChange={handleChange} inputProps={{ maxLength: 6 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="GST Number (GSTIN)" name="gstNumber"
                value={settings.gstNumber} onChange={handleChange}
                inputProps={{ style: { textTransform: "uppercase" } }}
                helperText="15-digit GSTIN (e.g. 22AAAAA0000A1Z5)" />
            </Grid>
          </Grid>
        </Card>
      )}

      {/* Invoice Tab */}
      {tab === 1 && (
        <Card sx={{ p: 3, borderRadius: 3, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
          <Typography variant="subtitle1" fontWeight={700} mb={2}>🧾 Invoice Settings</Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Invoice Prefix" name="invoicePrefix"
                value={settings.invoicePrefix} onChange={handleChange}
                helperText="e.g. INV, BILL, TG" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField select fullWidth label="Currency" name="currency"
                value={settings.currency} onChange={handleChange}>
                {CURRENCY_OPTIONS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField select fullWidth label="Default Tax %" name="defaultTax"
                value={settings.defaultTax} onChange={handleChange}>
                {GST_RATES.map(g => <MenuItem key={g} value={g}>{g}%</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth type="number" label="Default Discount %" name="defaultDiscount"
                value={settings.defaultDiscount} onChange={handleChange}
                inputProps={{ min: 0, max: 100 }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Invoice Footer Message" name="footerMessage"
                value={settings.footerMessage} onChange={handleChange}
                placeholder="e.g. Thank you for your business! Returns accepted within 7 days." />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={3} label="Terms & Conditions" name="termsAndConditions"
                value={settings.termsAndConditions} onChange={handleChange}
                placeholder="Enter your terms and conditions for invoices..." />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight={600} color="text.secondary" mb={1}>INVOICE OPTIONS</Typography>
              <Box display="flex" gap={3} flexWrap="wrap">
                <FormControlLabel control={<Switch checked={settings.showGST} onChange={handleChange} name="showGST" />} label="Show GST Number on Invoice" />
                <FormControlLabel control={<Switch checked={settings.showLogo} onChange={handleChange} name="showLogo" />} label="Show Logo on Invoice" />
                <FormControlLabel control={<Switch checked={settings.showFooter} onChange={handleChange} name="showFooter" />} label="Show Footer Message" />
              </Box>
            </Grid>
          </Grid>
        </Card>
      )}

      {/* Appearance Tab */}
      {tab === 2 && (
        <Card sx={{ p: 3, borderRadius: 3, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
          <Typography variant="subtitle1" fontWeight={700} mb={2}>🎨 Logo & Appearance</Typography>
          <Divider sx={{ mb: 3 }} />

          <Box display="flex" gap={4} flexWrap="wrap">
            {/* Logo Upload */}
            <Box>
              <Typography variant="subtitle2" fontWeight={600} color="text.secondary" mb={1.5}>SHOP LOGO</Typography>
              <Box display="flex" alignItems="center" gap={3}>
                <Box component="label" htmlFor="shop-logo"
                  sx={{
                    width: 120, height: 120, borderRadius: 3,
                    border: `2px dashed ${logoPreview ? "#6366f1" : "#cbd5e1"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", overflow: "hidden", background: "#f8fafc",
                    "&:hover": { borderColor: "#6366f1" },
                  }}>
                  {logoPreview
                    ? <img src={logoPreview} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <Box textAlign="center">
                        <Typography fontSize={32}>🏪</Typography>
                        <Typography fontSize={11} color="text.secondary">Click to upload</Typography>
                      </Box>
                  }
                </Box>
                <input id="shop-logo" type="file" accept="image/*" hidden onChange={handleLogo} />
                <Box>
                  <Button variant="outlined" size="small" component="label" htmlFor="shop-logo">
                    Upload Logo
                  </Button>
                  {logoPreview && (
                    <Button size="small" color="error" onClick={() => { setLogoPreview(""); setSettings(p => ({ ...p, logo: "" })); }}
                      sx={{ display: "block", mt: 1 }}>
                      Remove Logo
                    </Button>
                  )}
                  <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                    Recommended: 300×300px, PNG or JPG
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Invoice Preview Card */}
            {settings.shopName && (
              <Box flex={1} minWidth={280}>
                <Typography variant="subtitle2" fontWeight={600} color="text.secondary" mb={1.5}>INVOICE HEADER PREVIEW</Typography>
                <Box sx={{
                  border: "1px solid #e2e8f0", borderRadius: 2, overflow: "hidden",
                  background: "#facc15", p: 2,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <Box>
                    <Typography fontSize={12} fontWeight={600}>Bill To</Typography>
                    <Typography fontWeight={700}>Customer Name</Typography>
                    <Typography fontSize={12}>📞 Customer Phone</Typography>
                  </Box>
                  <Box textAlign="right">
                    {logoPreview && settings.showLogo && (
                      <img src={logoPreview} alt="logo" style={{ height: 40, marginBottom: 4 }} />
                    )}
                    <Typography fontWeight={700}>{settings.shopName}</Typography>
                    {settings.address && <Typography fontSize={12}>{settings.address}</Typography>}
                    {settings.showGST && settings.gstNumber && <Typography fontSize={12}>GST: {settings.gstNumber}</Typography>}
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        </Card>
      )}

      {/* Save Button at bottom */}
      <Box display="flex" justifyContent="flex-end" mt={3}>
        <Button variant="contained" onClick={handleSave} disabled={saving} size="large"
          sx={{ fontWeight: 700, px: 4, background: "#6366f1", "&:hover": { background: "#4f46e5" } }}>
          {saving ? "Saving..." : "💾 Save All Settings"}
        </Button>
      </Box>
    </Box>
  );
};

export default Settings;