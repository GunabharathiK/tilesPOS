import {
  Box,
  Card,
  Typography,
  TextField,
  Button,
  Grid,
  Divider,
  MenuItem,
} from "@mui/material";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import { useState, useEffect } from "react";
import { createProduct } from "../../services/productService";
import compressImage from "../../utils/compressImage";
import toast from "react-hot-toast";
import API from "../../services/api";

const UOM_OPTIONS = ["sqrft", "kg", "bag", "box", "piece", "meter", "litre", "ton"];
const GST_OPTIONS = [0, 5, 12, 18, 28];
const FINISH_OPTIONS = ["Glossy", "Matte", "Satin", "Polished", "Natural", "Rustic", "Other"];
const DEFAULT_CATEGORIES = ["Floor Tiles", "Wall Tiles", "Granite", "Marble", "Vitrified Tiles", "Parking Tiles", "Other"];

const empty = () => ({
  name: "",
  code: "",
  price: "",
  stock: "",
  size: "",
  uom: "",
  gst: "",
  image: "",
  category: "",
  finish: "",
  color: "",
  tilesPerBox: "",
  coverageArea: "",
  minStockAlert: 10,
});

const AddItem = () => {
  const [form, setForm] = useState(empty());
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    API.get("/categories")
      .then((res) => setCategories(res.data.map((c) => c.name)))
      .catch(() => setCategories(DEFAULT_CATEGORIES));
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 400, 0.6);
      setPreview(compressed);
      setForm((p) => ({ ...p, image: compressed }));
    } catch {
      toast.error("Failed to process image");
    }
  };

  const handleReset = () => {
    setForm(empty());
    setPreview("");
  };

  const validate = (f) => {
    if (!f.image) {
      toast.error("Product image is required");
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

  const gstPreview =
    form.price && form.gst !== ""
      ? {
          tax: (Number(form.price) * Number(form.gst) / 100).toFixed(2),
          total: (Number(form.price) * (1 + Number(form.gst) / 100)).toFixed(2),
        }
      : null;

  const totalPrice = gstPreview?.total || "";

  const handleSubmit = async () => {
    if (!validate(form)) return;
    setLoading(true);
    try {
      await createProduct({
        ...form,
        totalPrice: totalPrice ? Number(totalPrice) : 0,
        isSupplierItem: false,
      });
      toast.success("Product added");
      handleReset();
    } catch (err) {
      const msg = err?.response?.data?.error || "";
      toast.error(msg.includes("duplicate") ? "Product code already exists!" : "Failed to add product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ p: 3, borderRadius: 3, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
      <Typography variant="h6" fontWeight={700} mb={2}>Add New Product</Typography>
      <Divider sx={{ mb: 3 }} />

      <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={1}>PRODUCT IMAGE *</Typography>
      <Box display="flex" alignItems="center" gap={3} mb={3}>
        <Box
          component="label"
          htmlFor="product-image"
          sx={{
            width: 100,
            height: 100,
            borderRadius: 2,
            border: `2px dashed ${preview ? "#6366f1" : "#cbd5e1"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            overflow: "hidden",
            background: "#f8fafc",
            "&:hover": { borderColor: "#6366f1" },
          }}
        >
          {preview ? (
            <img src={preview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <AddPhotoAlternateIcon sx={{ color: "#94a3b8", fontSize: 36 }} />
          )}
        </Box>
        <input id="product-image" type="file" accept="image/*" hidden onChange={handleImage} />
        <Box>
          <Button variant="outlined" size="small" component="label" htmlFor="product-image">Choose Image</Button>
          {preview && (
            <Button
              size="small"
              color="error"
              sx={{ mt: 0.5, display: "block" }}
              onClick={() => {
                setPreview("");
                setForm((p) => ({ ...p, image: "" }));
              }}
            >
              Remove
            </Button>
          )}
        </Box>
      </Box>

      <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={1.5}>PRODUCT DETAILS</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <TextField required fullWidth label="Product Name" name="name" value={form.name} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            required
            fullWidth
            label="Product Code"
            name="code"
            value={form.code}
            onChange={handleChange}
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
            inputProps={{ min: 0 }}
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
            inputProps={{ min: 0 }}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <TextField select fullWidth label="Category" name="category" value={form.category} onChange={handleChange}>
            <MenuItem value="">- Select Category -</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField select fullWidth label="Finish Type" name="finish" value={form.finish} onChange={handleChange}>
            <MenuItem value="">- Select Finish -</MenuItem>
            {FINISH_OPTIONS.map((f) => (
              <MenuItem key={f} value={f}>{f}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            label="Color / Design"
            name="color"
            value={form.color}
            onChange={handleChange}
            placeholder="e.g. Beige, White, Dark Grey"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <TextField required fullWidth label="Size (e.g. 2X2)" name="size" value={form.size} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField required select fullWidth label="UOM" name="uom" value={form.uom} onChange={handleChange}>
            <MenuItem value="">- Select UOM -</MenuItem>
            {UOM_OPTIONS.map((u) => (
              <MenuItem key={u} value={u}>{u}</MenuItem>
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
            helperText="Applied during invoice generation"
          >
            <MenuItem value="">- Select GST -</MenuItem>
            {GST_OPTIONS.map((g) => (
              <MenuItem key={g} value={g}>{g}%</MenuItem>
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
            <Box sx={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 2, p: 2, display: "flex", gap: 5 }}>
              <Box>
                <Typography fontSize={12} color="text.secondary">Base Price</Typography>
                <Typography fontWeight={700}>Rs {Number(form.price).toFixed(2)}</Typography>
              </Box>
              <Box>
                <Typography fontSize={12} color="text.secondary">GST ({form.gst}%)</Typography>
                <Typography fontWeight={700} color="#15803d">Rs {gstPreview.tax}</Typography>
              </Box>
              <Box>
                <Typography fontSize={12} color="text.secondary">Price + GST</Typography>
                <Typography fontWeight={700} color="#1d4ed8">Rs {gstPreview.total}</Typography>
              </Box>
            </Box>
          </Grid>
        )}

        <Grid item xs={12}>
          <Button
            size="small"
            variant="text"
            onClick={() => setShowAdvanced((p) => !p)}
            sx={{ color: "#6366f1", fontWeight: 600 }}
          >
            {showAdvanced ? "Hide Advanced Fields" : "Show Advanced Fields"}
          </Button>
        </Grid>

        {showAdvanced && (
          <>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Tiles Per Box"
                name="tilesPerBox"
                value={form.tilesPerBox}
                onChange={handleChange}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Coverage Area (sqft/box)"
                name="coverageArea"
                type="number"
                value={form.coverageArea}
                onChange={handleChange}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Min Stock Alert Level"
                name="minStockAlert"
                value={form.minStockAlert}
                onChange={handleChange}
                inputProps={{ min: 0 }}
                helperText="Alert when stock drops below this"
              />
            </Grid>
          </>
        )}

        <Grid item xs={12}>
          <Box display="flex" gap={2} mt={1}>
            <Button fullWidth variant="outlined" onClick={handleReset}>Reset</Button>
            <Button fullWidth variant="contained" onClick={handleSubmit} disabled={loading} sx={{ fontWeight: 700 }}>
              {loading ? "Adding..." : "Add Product"}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Card>
  );
};

export default AddItem;
