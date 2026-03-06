import {
  Box, Card, Typography, TextField, Button, Grid, Divider,
  IconButton, MenuItem, Autocomplete,
} from "@mui/material";
import DeleteIcon            from "@mui/icons-material/Delete";
import AddCircleOutlineIcon  from "@mui/icons-material/AddCircleOutline";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import ShoppingCartIcon      from "@mui/icons-material/ShoppingCart";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSuppliers, createPurchase } from "../../services/supplierService";
import compressImage from "../../utils/compressImage";
import toast from "react-hot-toast";

const UOM_OPTIONS = ["Pieces", "Box", "Kg", "Meter", "Sqft", "Liter", "Bag", "Ton"];
const GST_OPTIONS = [0, 5, 12, 18, 28];

const emptyProduct = () => ({
  id:           `p_${Date.now() + Math.random()}`,
  name:         "",
  colorDesign:  "",
  size:         "",
  hsnCode:      "",
  qty:          "",
  unit:         "",
  price:        "",
  discount:     "",
  gst:          "",
  image:        "",
  imagePreview: "",
});

const emptyCharge = () => ({
  id:     `c_${Date.now() + Math.random()}`,
  reason: "",
  amount: "",
});

const SupplierProducts = ({ onBack }) => {
  const navigate = useNavigate();

  const [suppliers,         setSuppliers]         = useState([]);
  const [selectedSupplier,  setSelectedSupplier]  = useState(null);
  const [invoiceNo,         setInvoiceNo]         = useState("");
  const [invoiceDate,       setInvoiceDate]       = useState(new Date().toISOString().slice(0, 10));
  const [products,          setProducts]          = useState([emptyProduct()]);
  const [charges,           setCharges]           = useState([]);
  const [loading,           setLoading]           = useState(false);

  useEffect(() => {
    getSuppliers()
      .then((res) => setSuppliers(res.data || []))
      .catch(() => toast.error("Failed to load suppliers"));
  }, []);

  const updateProduct = (id, field, value) =>
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, [field]: value } : p));

  const handleProductImage = async (id, e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 400, 0.6);
      setProducts((prev) =>
        prev.map((p) => p.id === id ? { ...p, image: compressed, imagePreview: compressed } : p)
      );
    } catch { toast.error("Failed to process image"); }
  };

  const updateCharge = (id, field, value) =>
    setCharges((prev) => prev.map((c) => c.id === id ? { ...c, [field]: value } : c));

  // ── Per-item calculations (discount is %) ─────────────────
  const getBase      = (p) => (Number(p.qty) || 0) * (Number(p.price) || 0);
  const getDisc      = (p) => getBase(p) * (Number(p.discount) || 0) / 100;
  const getAfterDisc = (p) => getBase(p) - getDisc(p);
  const getGstAmt    = (p) => getAfterDisc(p) * (Number(p.gst) || 0) / 100;
  const getNet       = (p) => getAfterDisc(p) + getGstAmt(p);

  // ── Totals ────────────────────────────────────────────────
  const subtotal        = products.reduce((s, p) => s + getBase(p), 0);
  const totalDiscount   = products.reduce((s, p) => s + getDisc(p), 0);
  const totalGst        = products.reduce((s, p) => s + getGstAmt(p), 0);
  const additionalTotal = charges.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const grandTotal      = subtotal - totalDiscount + totalGst + additionalTotal;

  const fmt = (n) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

  // ── Submit ────────────────────────────────────────────────
  const handlePurchase = async () => {
    if (!selectedSupplier)    { toast.error("Please select a supplier");          return; }
    if (!invoiceNo.trim())    { toast.error("Invoice number is required");        return; }
    if (!invoiceDate)         { toast.error("Invoice date is required");          return; }
    if (products.length === 0){ toast.error("Add at least one product");          return; }
    for (const p of products) {
      if (!p.name || !p.qty || !p.price || !p.unit)
        { toast.error("Fill all required product fields"); return; }
    }

    const payload = {
      supplierId:        selectedSupplier._id,
      supplierName:      selectedSupplier.companyName || selectedSupplier.name,
      invoiceNo,
      invoiceDate,
      additionalCharges: charges.filter((c) => c.reason && c.amount),
      products:          products.map(({ id, imagePreview, ...rest }) => rest),
      subtotal, totalDiscount, totalGst, additionalTotal, grandTotal,
    };

    setLoading(true);
    try {
      await createPurchase(payload);
      toast.success("Purchase recorded ✅ Redirecting to payment...");
      setTimeout(() => navigate("/suppliers/payment", { state: payload }), 1200);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Purchase failed");
    } finally { setLoading(false); }
  };

  return (
    <Box p={3}>

      {/* ── Page Header ── */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700}>🛒 Supplier Products</Typography>
          <Typography variant="body2" color="text.secondary">Record a new purchase from a supplier</Typography>
        </Box>
        <Button variant="outlined" onClick={onBack}>← Back</Button>
      </Box>

      {/* ── Supplier & Invoice Info ── */}
      <Card sx={{ p: 3, borderRadius: 3, mb: 3, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
        <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={2}>
          🏢 SUPPLIER & INVOICE INFO
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Autocomplete
              options={suppliers}
              getOptionLabel={(s) => s.companyName || s.name || ""}
              value={selectedSupplier}
              onChange={(_, val) => setSelectedSupplier(val)}
              renderInput={(params) => <TextField {...params} label="Select Supplier *" />}
            />
          </Grid>
          {selectedSupplier && (
            <Grid item xs={12} sm={6} md={3}>
              <TextField fullWidth label="Company Name"
                value={selectedSupplier.companyName || selectedSupplier.name || ""} disabled />
            </Grid>
          )}
          <Grid item xs={12} sm={6} md={3}>
            <TextField fullWidth required label="Invoice Number"
              value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField fullWidth required type="date" label="Invoice Date"
              value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)}
              InputLabelProps={{ shrink: true }} />
          </Grid>
        </Grid>
      </Card>

      {/* ── Products ── */}
      <Card sx={{ p: 3, borderRadius: 3, mb: 3, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
            📦 PRODUCTS
          </Typography>
          <Button variant="contained" size="small" startIcon={<AddCircleOutlineIcon />}
            onClick={() => setProducts((prev) => [...prev, emptyProduct()])}>
            Add Product
          </Button>
        </Box>

        <Box display="flex" flexDirection="column" gap={2}>
          {products.map((p, idx) => (
            <Box key={p.id} sx={{ background: "#f8fafc", borderRadius: 2, border: "1px solid #e2e8f0", p: 2.5 }}>

              {/* Row: label + delete */}
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography fontSize={12} fontWeight={700} color="text.secondary">
                  ITEM #{idx + 1}
                </Typography>
                <IconButton size="small" color="error"
                  onClick={() => setProducts((prev) => prev.filter((x) => x.id !== p.id))}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>

              {/* Row: image */}
              <Box mb={2}>
                <Box
                  component="label"
                  htmlFor={`img-${p.id}`}
                  sx={{
                    width: 80, height: 80, borderRadius: 2, cursor: "pointer",
                    border: `2px dashed ${p.imagePreview ? "#6366f1" : "#cbd5e1"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    overflow: "hidden", background: "#fff",
                    "&:hover": { borderColor: "#6366f1" },
                  }}
                >
                  {p.imagePreview
                    ? <img src={p.imagePreview} alt="product"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <Box textAlign="center">
                        <AddPhotoAlternateIcon sx={{ color: "#94a3b8", fontSize: 28 }} />
                        <Typography fontSize={9} color="text.secondary">Image</Typography>
                      </Box>
                  }
                </Box>
                <input id={`img-${p.id}`} type="file" accept="image/*" hidden
                  onChange={(e) => handleProductImage(p.id, e)} />
              </Box>

              {/* Row 1: Name | Color/Design | Size | HSN Code */}
              <Grid container spacing={2} mb={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField fullWidth size="small" required label="Product Name *"
                    value={p.name} onChange={(e) => updateProduct(p.id, "name", e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField fullWidth size="small" label="Color/Design"
                    value={p.colorDesign} onChange={(e) => updateProduct(p.id, "colorDesign", e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField fullWidth size="small" label="Size"
                    value={p.size} onChange={(e) => updateProduct(p.id, "size", e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField fullWidth size="small" label="HSN Code"
                    value={p.hsnCode} onChange={(e) => updateProduct(p.id, "hsnCode", e.target.value)} />
                </Grid>
              </Grid>

              {/* Row 2: Qty | Unit | Price | Discount | GST — all equal width */}
              <Grid container spacing={2} mb={1}>
                <Grid item xs={12} sm={6} md={4} lg={2}>
                  <TextField fullWidth size="small" required label="Quantity *" type="number"
                    inputProps={{ min: 1 }}
                    value={p.qty} onChange={(e) => updateProduct(p.id, "qty", e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={2}>
                  <TextField fullWidth size="small" select required label="Unit *"
                    value={p.unit} onChange={(e) => updateProduct(p.id, "unit", e.target.value)}>
                    <MenuItem value="">— Select —</MenuItem>
                    {UOM_OPTIONS.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={3}>
                  <TextField fullWidth size="small" required label="Purchase Price (₹) *" type="number"
                    inputProps={{ min: 0 }}
                    value={p.price} onChange={(e) => updateProduct(p.id, "price", e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={2}>
                  <TextField fullWidth size="small" label="Discount %" type="number"
                    inputProps={{ min: 0, max: 100 }}
                    value={p.discount}
                    InputProps={{ endAdornment: <Typography fontSize={12} color="text.secondary">%</Typography> }}
                    onChange={(e) => {
                      const v = Math.min(100, Math.max(0, Number(e.target.value)));
                      updateProduct(p.id, "discount", v === 0 ? "" : String(v));
                    }} />
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={3}>
                  <TextField fullWidth size="small" select required label="GST % *"
                    value={p.gst} onChange={(e) => updateProduct(p.id, "gst", e.target.value)}>
                    <MenuItem value="">— Select —</MenuItem>
                    {GST_OPTIONS.map((g) => <MenuItem key={g} value={g}>{g}%</MenuItem>)}
                  </TextField>
                </Grid>
              </Grid>

              {/* Per-item breakdown */}
              {p.qty && p.price && (
                <Box sx={{
                  mt: 1, background: "#eff6ff", borderRadius: 1.5, p: 1.5,
                  display: "flex", gap: 3, flexWrap: "wrap",
                }}>
                  <Box>
                    <Typography fontSize={10} color="text.secondary">Base</Typography>
                    <Typography fontSize={12} fontWeight={600}>₹{fmt(getBase(p))}</Typography>
                  </Box>
                  {Number(p.discount) > 0 && (
                    <Box>
                      <Typography fontSize={10} color="text.secondary">Discount ({p.discount}%)</Typography>
                      <Typography fontSize={12} fontWeight={600} color="#dc2626">- ₹{fmt(getDisc(p))}</Typography>
                    </Box>
                  )}
                  {Number(p.gst) > 0 && (
                    <Box>
                      <Typography fontSize={10} color="text.secondary">GST ({p.gst}%)</Typography>
                      <Typography fontSize={12} fontWeight={600} color="#d97706">+ ₹{fmt(getGstAmt(p))}</Typography>
                    </Box>
                  )}
                  <Box>
                    <Typography fontSize={10} color="text.secondary">Net Total</Typography>
                    <Typography fontSize={13} fontWeight={700} color="#1d4ed8">₹{fmt(getNet(p))}</Typography>
                  </Box>
                </Box>
              )}
            </Box>
          ))}
        </Box>

        {/* ── Additional Charges ── */}
        <Divider sx={{ my: 3 }} />
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
          <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
            💰 ADDITIONAL CHARGES
          </Typography>
          <Button size="small" startIcon={<AddCircleOutlineIcon />}
            onClick={() => setCharges((prev) => [...prev, emptyCharge()])}>
            Add Charge
          </Button>
        </Box>
        {charges.length === 0 && (
          <Typography fontSize={13} color="text.secondary" mb={1}>
            No additional charges. Click <strong>Add Charge</strong> to add freight, handling, etc.
          </Typography>
        )}
        {charges.map((c) => (
          <Grid container spacing={2} key={c.id} alignItems="center" mb={1}>
            <Grid item xs={5}>
              <TextField size="small" fullWidth label="Reason (e.g. Freight)"
                value={c.reason} onChange={(e) => updateCharge(c.id, "reason", e.target.value)} />
            </Grid>
            <Grid item xs={5}>
              <TextField size="small" fullWidth label="Amount (₹)" type="number"
                value={c.amount} onChange={(e) => updateCharge(c.id, "amount", e.target.value)} />
            </Grid>
            <Grid item xs={2}>
              <IconButton color="error" size="small"
                onClick={() => setCharges((prev) => prev.filter((x) => x.id !== c.id))}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Grid>
          </Grid>
        ))}

        {/* ── Totals ── */}
        <Divider sx={{ my: 3 }} />
        <Grid container justifyContent="flex-end">
          <Grid item xs={12} sm={6} md={4}>
            <Box sx={{ background: "#f8fafc", borderRadius: 2, p: 2, border: "1px solid #e2e8f0" }}>
              {[
                { label: "Subtotal",          val: subtotal,        color: "text.primary", sign: ""   },
                { label: "Total Discount",     val: totalDiscount,   color: "#dc2626",      sign: "- " },
                { label: "Total GST",          val: totalGst,        color: "#d97706",      sign: "+ " },
                { label: "Additional Charges", val: additionalTotal, color: "#7c3aed",      sign: "+ " },
              ].map(({ label, val, color, sign }) => (
                <Box key={label} display="flex" justifyContent="space-between" mb={1}>
                  <Typography fontSize={14} color="text.secondary">{label}</Typography>
                  <Typography fontSize={14} fontWeight={500} color={color}>
                    {sign}₹{fmt(val)}
                  </Typography>
                </Box>
              ))}
              <Divider sx={{ my: 1.5 }} />
              <Box display="flex" justifyContent="space-between">
                <Typography fontWeight={700} fontSize={16}>Grand Total</Typography>
                <Typography fontWeight={800} fontSize={18} color="#1d4ed8">
                  ₹{fmt(grandTotal)}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Card>

      {/* ── Purchase Button ── */}
      <Box display="flex" gap={2} justifyContent="flex-end">
        <Button variant="outlined" onClick={onBack}>Cancel</Button>
        <Button variant="contained" size="large" startIcon={<ShoppingCartIcon />}
          onClick={handlePurchase} disabled={loading}
          sx={{ fontWeight: 700, px: 5, py: 1.5, background: "#1d4ed8" }}>
          {loading ? "Processing..." : "💳 Purchase & Pay"}
        </Button>
      </Box>

    </Box>
  );
};

export default SupplierProducts;
