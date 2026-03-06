import {
  Box,
  Card,
  Typography,
  TextField,
  Button,
  Grid,
  Divider,
  MenuItem,
  Autocomplete,
  CircularProgress,
  Chip,
} from "@mui/material";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import { useState, useEffect } from "react";
import { getSuppliers } from "../../services/supplierService";
import { createProduct } from "../../services/productService";
import compressImage from "../../utils/compressImage";
import toast from "react-hot-toast";

const GST_OPTIONS = [0, 5, 12, 18, 28];
const UOM_OPTIONS_ALL = ["sqrft", "kg", "bag", "box", "piece", "meter", "litre", "ton"];

const empty = () => ({
  name: "",
  colorDesign: "",
  image: "",
  code: "",
  price: "",
  stock: "",
  size: "",
  uom: "",
  gst: "",
});

const SupplierAddItem = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [supLoading, setSupLoading] = useState(true);
  const [selectedSup, setSelectedSup] = useState(null);
  const [form, setForm] = useState(empty());
  const [loading, setLoading] = useState(false);

  const supplierItems = selectedSup?.items || [];
  const selectedNameItems = form.name ? supplierItems.filter((i) => i.name === form.name) : [];

  const supNames = [...new Set(supplierItems.map((i) => i.name).filter(Boolean))];
  const supSizes = [...new Set(supplierItems.map((i) => i.size).filter(Boolean))];
  const supUnits = [...new Set(supplierItems.map((i) => i.unit).filter(Boolean))];
  const supColorDesigns = [...new Set(selectedNameItems.map((i) => i.colorDesign).filter(Boolean))];

  const suggestedPrices = [...new Set(selectedNameItems.map((i) => String(i.price)).filter(Boolean))];
  const suggestedQty = [...new Set(selectedNameItems.map((i) => String(i.qty)).filter(Boolean))];

  const autoImageFor = (name, colorDesign = "") => {
    const base = supplierItems.filter((i) => i.name === name);
    const exact = base.find((i) => i.colorDesign === colorDesign && i.image);
    const anyForName = base.find((i) => i.image);
    return exact?.image || anyForName?.image || "";
  };

  useEffect(() => {
    getSuppliers()
      .then((res) => setSuppliers(res.data))
      .catch(() => toast.error("Failed to load suppliers"))
      .finally(() => setSupLoading(false));
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 400, 0.6);
      setForm((prev) => ({ ...prev, image: compressed }));
    } catch {
      toast.error("Failed to process image");
    }
  };
  const handleReset = () => {
    setForm(empty());
    setSelectedSup(null);
  };

  const validate = (f, sup) => {
    if (!sup) {
      toast.error("Please select a supplier");
      return false;
    }
    if (!f.name) {
      toast.error("Product name is required");
      return false;
    }
    if (!f.code) {
      toast.error("Product code is required");
      return false;
    }
    if (!f.price) {
      toast.error("Price is required");
      return false;
    }
    if (!f.stock) {
      toast.error("Stock is required");
      return false;
    }
    if (!f.size) {
      toast.error("Size is required");
      return false;
    }
    if (!f.uom) {
      toast.error("UOM is required");
      return false;
    }
    if (f.gst === "") {
      toast.error("GST is required");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate(form, selectedSup)) return;
    setLoading(true);
    try {
      await createProduct({
        ...form,
        totalPrice: gstPreview ? Number(gstPreview.total) : 0,
        supplierId: selectedSup._id,
        supplierName: selectedSup.name,
        isSupplierItem: true,
      });
      toast.success("Supplier product added");
      handleReset();
    } catch (err) {
      const msg = err?.response?.data?.error || "";
      toast.error(msg.includes("duplicate") ? "Product code already exists!" : "Failed to add product");
    } finally {
      setLoading(false);
    }
  };

  const gstPreview =
    form.price && form.gst !== ""
      ? {
          tax: (Number(form.price) * Number(form.gst) / 100).toFixed(2),
          total: (Number(form.price) * (1 + Number(form.gst) / 100)).toFixed(2),
        }
      : null;
  const totalPrice = gstPreview?.total || "";

  const uomOptions = supUnits.length > 0 ? supUnits : UOM_OPTIONS_ALL;

  return (
    <Card sx={{ p: 3, borderRadius: 3, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
      <Typography variant="h6" fontWeight={700} mb={2}>
        Add Supplier Item
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={1}>
        SELECT SUPPLIER *
      </Typography>
      {supLoading ? (
        <CircularProgress size={24} />
      ) : (
        <Autocomplete
          options={suppliers}
          getOptionLabel={(s) => s.name}
          value={selectedSup}
          onChange={(_, val) => {
            setSelectedSup(val);
            setForm(empty());
          }}
          renderOption={(props, s) => (
            <Box component="li" {...props} key={s._id}>
              <Box>
                <Typography fontWeight={600}>{s.name}</Typography>
                <Typography fontSize={12} color="text.secondary">
                  {s.phone} | {s.address}
                </Typography>
              </Box>
            </Box>
          )}
          renderInput={(params) => (
            <TextField {...params} label="Search and select supplier *" placeholder="Type supplier name..." />
          )}
          sx={{ mb: 2 }}
        />
      )}

      {selectedSup && (
        <Box
          sx={{
            background: "#f5f3ff",
            border: "1px solid #ddd6fe",
            borderRadius: 2,
            p: 2,
            mb: 3,
          }}
        >
          <Typography fontSize={13} fontWeight={600} color="#6d28d9" mb={1}>
            Selected Supplier
          </Typography>
          <Box display="flex" gap={1} flexWrap="wrap">
            <Chip label={selectedSup.name} size="small" color="secondary" />
            <Chip label={selectedSup.phone} size="small" variant="outlined" />
            <Chip label={selectedSup.address} size="small" variant="outlined" />
            <Chip
              label={selectedSup.paymentStatus}
              size="small"
              color={
                selectedSup.paymentStatus === "Paid"
                  ? "success"
                  : selectedSup.paymentStatus === "Partial"
                    ? "warning"
                    : "error"
              }
            />
            <Chip
              label={`${selectedSup.items.length} items`}
              size="small"
              sx={{ background: "#eff6ff", color: "#1d4ed8" }}
            />
          </Box>
        </Box>
      )}

      <Divider sx={{ mb: 2 }} />
      <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={1.5}>
        PRODUCT DETAILS
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          {supNames.length > 0 ? (
            <TextField
              required
              select
              fullWidth
              label="Product Name"
              name="name"
              value={form.name}
              onChange={(e) => {
                const nextName = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  name: nextName,
                  colorDesign: "",
                  image: autoImageFor(nextName, ""),
                }));
              }}
            >
              <MenuItem value="">- Select Name -</MenuItem>
              {supNames.map((n) => (
                <MenuItem key={n} value={n}>
                  {n}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField
              required
              fullWidth
              label="Product Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              disabled={!selectedSup}
              placeholder={!selectedSup ? "Select supplier first" : ""}
            />
          )}
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <TextField
            required
            fullWidth
            label="Product Code"
            name="code"
            value={form.code}
            onChange={handleChange}
            disabled={!selectedSup}
            inputProps={{ style: { textTransform: "uppercase" } }}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <TextField
            required
            fullWidth
            label="Price (Rs)"
            name="price"
            type="number"
            value={form.price}
            onChange={handleChange}
            disabled={!selectedSup}
            inputProps={{ min: 0 }}
            helperText={
              suggestedPrices.length > 0 ? `Suggested: ${suggestedPrices.map((p) => `Rs ${p}`).join(", ")}` : ""
            }
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <TextField
            required
            fullWidth
            label="Stock"
            name="stock"
            type="number"
            value={form.stock}
            onChange={handleChange}
            disabled={!selectedSup}
            inputProps={{ min: 0 }}
            helperText={suggestedQty.length > 0 ? `Suggested: ${suggestedQty.join(", ")}` : ""}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          {supColorDesigns.length > 0 ? (
            <TextField
              select
              fullWidth
              label="Color/Design"
              name="colorDesign"
              value={form.colorDesign}
              onChange={(e) => {
                const nextColorDesign = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  colorDesign: nextColorDesign,
                  image: autoImageFor(prev.name, nextColorDesign) || prev.image,
                }));
              }}
              disabled={!selectedSup || !form.name}
              helperText={form.name ? "Options from selected product" : "Select product name first"}
            >
              <MenuItem value="">- Select Color/Design -</MenuItem>
              {supColorDesigns.map((cd) => (
                <MenuItem key={cd} value={cd}>
                  {cd}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField
              fullWidth
              label="Color/Design"
              name="colorDesign"
              value={form.colorDesign}
              onChange={handleChange}
              disabled={!selectedSup || !form.name}
              placeholder={!form.name ? "Select product name first" : "No options found, enter manually"}
            />
          )}
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          {supSizes.length > 0 ? (
            <TextField required select fullWidth label="Size" name="size" value={form.size} onChange={handleChange}>
              <MenuItem value="">- Select Size -</MenuItem>
              {supSizes.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField
              required
              fullWidth
              label="Size (e.g. 2X2)"
              name="size"
              value={form.size}
              onChange={handleChange}
              disabled={!selectedSup}
            />
          )}
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Typography variant="caption" color="text.secondary" display="block" mb={0.7}>
            Product Image
          </Typography>
          <Box display="flex" alignItems="center" gap={1.2}>
            <Box
              component="label"
              htmlFor="supplier-product-image"
              sx={{
                width: 54,
                height: 54,
                borderRadius: 1.5,
                border: "1.5px dashed #cbd5e1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                overflow: "hidden",
                background: "#f8fafc",
              }}
            >
              {form.image ? (
                <img src={form.image} alt="product" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <AddPhotoAlternateIcon sx={{ color: "#94a3b8", fontSize: 22 }} />
              )}
            </Box>
            <input
              id="supplier-product-image"
              type="file"
              accept="image/*"
              hidden
              onChange={handleImage}
              disabled={!selectedSup}
            />
            <Box>
              <Button size="small" variant="outlined" component="label" htmlFor="supplier-product-image" disabled={!selectedSup}>
                Choose
              </Button>
              {form.image && (
                <Button
                  size="small"
                  color="error"
                  onClick={() => setForm((prev) => ({ ...prev, image: "" }))}
                  sx={{ ml: 0.8 }}
                >
                  Clear
                </Button>
              )}
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <TextField
            required
            select
            fullWidth
            label="UOM"
            name="uom"
            value={form.uom}
            onChange={handleChange}
            disabled={!selectedSup}
          >
            <MenuItem value="">- Select UOM -</MenuItem>
            {uomOptions.map((u) => (
              <MenuItem key={u} value={u}>
                {u}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <TextField
            required
            select
            fullWidth
            label="GST %"
            name="gst"
            value={form.gst}
            onChange={handleChange}
            disabled={!selectedSup}
            helperText="Applied during invoice generation"
          >
            <MenuItem value="">- Select GST -</MenuItem>
            {GST_OPTIONS.map((g) => (
              <MenuItem key={g} value={g}>
                {g}%
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            label="Total Price (Rs)"
            value={totalPrice}
            disabled
            helperText="Auto-calculated from Price + GST"
          />
        </Grid>

        {gstPreview && (
          <Grid item xs={12}>
            <Box
              sx={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 2,
                p: 2,
                display: "flex",
                gap: 5,
              }}
            >
              <Box>
                <Typography fontSize={12} color="text.secondary">
                  Base Price
                </Typography>
                <Typography fontWeight={700}>Rs {Number(form.price).toFixed(2)}</Typography>
              </Box>
              <Box>
                <Typography fontSize={12} color="text.secondary">
                  GST ({form.gst}%)
                </Typography>
                <Typography fontWeight={700} color="#15803d">
                  Rs {gstPreview.tax}
                </Typography>
              </Box>
              <Box>
                <Typography fontSize={12} color="text.secondary">
                  Price + GST
                </Typography>
                <Typography fontWeight={700} color="#1d4ed8">
                  Rs {gstPreview.total}
                </Typography>
              </Box>
            </Box>
          </Grid>
        )}

        <Grid item xs={12}>
          <Box display="flex" gap={2} mt={1}>
            <Button fullWidth variant="outlined" onClick={handleReset}>
              Reset
            </Button>
            <Button
              fullWidth
              variant="contained"
              onClick={handleSubmit}
              disabled={loading || !selectedSup}
              sx={{ fontWeight: 700 }}
            >
              {loading ? "Adding..." : "Add Supplier Product"}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Card>
  );
};

export default SupplierAddItem;
