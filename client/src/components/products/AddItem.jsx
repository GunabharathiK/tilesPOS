import {
  Box,
  Button,
  Card,
  Divider,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createProduct, updateProduct } from "../../services/productService";
import compressImage from "../../utils/compressImage";
import toast from "react-hot-toast";
import API from "../../services/api";

const T = {
  primary:     "#6d5bd0",
  primaryDark: "#5546af",
  success:     "#15803d",
  text:        "#1f2937",
  muted:       "#64748b",
  border:      "#d7dee8",
  bg:          "#f2f6fb",
  white:       "#ffffff",
};

// ── Built-in fallbacks ─────────────────────────────────────────────────────
const DEFAULT_CATEGORIES = ["Floor Tile", "Wall Tile", "Vitrified Tile", "Parking Tile", "Granite", "Marble"];
const DEFAULT_BRANDS      = ["Kajaria", "Somany", "Nitco", "Johnson", "Orientbell", "Other"];
const DEFAULT_FINISHES    = ["Matt", "Glossy", "Polished", "Satin", "Rustic"];
const DEFAULT_RACKS       = ["Rack-A1", "Rack-A2", "Rack-B1", "Rack-B2", "Rack-C1"];

// Read from productDefaults (saved by Settings.jsx), fall back to built-ins
const getProductDefaults = () => {
  try {
    const saved = JSON.parse(localStorage.getItem("productDefaults")) || {};
    return {
      categories: saved.categories?.length ? saved.categories : DEFAULT_CATEGORIES,
      brands:     saved.brands?.length     ? saved.brands     : DEFAULT_BRANDS,
      finishes:   saved.finishes?.length   ? saved.finishes   : DEFAULT_FINISHES,
      racks:      saved.racks?.length      ? saved.racks      : DEFAULT_RACKS,
    };
  } catch {
    return { categories: DEFAULT_CATEGORIES, brands: DEFAULT_BRANDS, finishes: DEFAULT_FINISHES, racks: DEFAULT_RACKS };
  }
};

const GST_OPTIONS = [
  { label: "0% (Exempt)",     value: 0  },
  { label: "5%",              value: 5  },
  { label: "12%",             value: 12 },
  { label: "18% (Standard)",  value: 18 },
  { label: "28%",             value: 28 },
];
const CM2_PER_SQFT = 929.0304;

const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "6px",
    background: T.white,
    fontSize: 13,
    "& fieldset": { borderColor: T.border, borderWidth: "1.5px" },
    "&:hover fieldset": { borderColor: "#b6c2d1" },
    "&.Mui-focused fieldset": {
      borderColor: T.primary,
      boxShadow: "0 0 0 3px rgba(109,91,208,.08)",
    },
  },
};

const sectionTitleSx = {
  fontSize: 12,
  fontWeight: 800,
  color: "#7b88a1",
  textTransform: "uppercase",
  letterSpacing: ".08em",
  display: "flex",
  alignItems: "center",
  gap: 0.7,
  mb: 1.5,
};

const fieldLabelSx = {
  fontSize: 12,
  fontWeight: 800,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: ".06em",
  lineHeight: 1.1,
  mb: 0.7,
};

const FormField = ({ label, name, required, value, onChange, ...props }) => (
  <Box>
    <Typography sx={fieldLabelSx}>
      {label.toUpperCase()}
      {required && (
        <Box component="span" sx={{ color: "#dc2626" }}>
          {" "}*
        </Box>
      )}
    </Typography>
    <TextField
      fullWidth
      size="small"
      name={name}
      value={value ?? ""}
      onChange={onChange}
      sx={inputSx}
      {...props}
    />
  </Box>
);

const empty = () => ({
  name: "", code: "", barcode: "",
  category: "", brand: "", finish: "",
  colorDesign: "", lengthCm: "", widthCm: "",
  tilesPerBox: "", coverageArea: "",
  price: "", dealerPrice: "", purchasePrice: "",
  minimumSellPrice: "", contractorPrice: "", mrpPerBox: "",
  gst: "", hsnCode: "",
  stock: "", stockBoxes: "", reorderLevel: "",
  rackLocation: "", notes: "", image: "", uom: "sqrft",
});

const numericOrZero = (v) => (v === "" ? 0 : Number(v) || 0);

/* ── Map an existing product back into form fields ── */
const productToForm = (p) => ({
  name:             p.name             || "",
  code:             p.code             || "",
  barcode:          p.barcode          || "",
  category:         p.category         || "Floor Tile",
  brand:            p.brand            || "Kajaria",
  finish:           p.finish           || "Matt",
  colorDesign:      p.colorDesign      || "",
  lengthCm:         String(p.lengthCm  ?? (p.size ? p.size.split("x")[0] : "60")),
  widthCm:          String(p.widthCm   ?? (p.size ? p.size.split("x")[1] : "60")),
  tilesPerBox:      String(p.tilesPerBox    ?? "4"),
  coverageArea:     String(p.coverageArea   ?? ""),
  price:            String(p.price          ?? ""),
  dealerPrice:      String(p.dealerPrice    ?? ""),
  purchasePrice:    String(p.purchasePrice  ?? ""),
  minimumSellPrice: String(p.minimumSellPrice ?? ""),
  contractorPrice:  String(p.contractorPrice  ?? ""),
  mrpPerBox:        String(p.mrpPerBox        ?? ""),
  gst:              String(p.gst             ?? "18"),
  hsnCode:          p.hsnCode          || "6907",
  stock:            String(p.stock     ?? "0"),
  stockBoxes:       String(p.stockBoxes ?? "0"),
  reorderLevel:     String(p.reorderLevel ?? "100"),
  rackLocation:     p.rackLocation     || "",
  notes:            p.notes            || "",
  image:            p.image || p.productImage || p.img || p.photo || "",
  uom:              p.uom              || "sqrft",
});

const AddItem = ({ embedded = false, onSaved }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const editProduct = location.state?.editProduct || null;
  const isEdit      = Boolean(editProduct);

  const [form,    setForm]    = useState(isEdit ? productToForm(editProduct) : empty());
  const [preview, setPreview] = useState(isEdit ? (editProduct.image || editProduct.productImage || "") : "");
  const [loading, setLoading] = useState(false);

  // Dropdown options — loaded from productDefaults (Settings) + API for categories
  const [categories, setCategories] = useState(() => getProductDefaults().categories);
  const [brands,     setBrands]     = useState(() => getProductDefaults().brands);
  const [finishes,   setFinishes]   = useState(() => getProductDefaults().finishes);
  const [racks,      setRacks]      = useState(() => getProductDefaults().racks);

  /* Re-hydrate if navigated to edit a different product */
  useEffect(() => {
    if (isEdit) {
      setForm(productToForm(editProduct));
      setPreview(editProduct.image || editProduct.productImage || "");
    } else {
      setForm(empty());
      setPreview("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editProduct?._id]);

  // Sync productDefaults from localStorage whenever component mounts
  useEffect(() => {
    const d = getProductDefaults();
    setBrands(d.brands);
    setFinishes(d.finishes);
    setRacks(d.racks);
  }, []);

  // Load categories from API (overwrites local if API has data)
  useEffect(() => {
    API.get("/categories")
      .then((res) => {
        const dynamic = (res.data || []).map((c) => c.name).filter(Boolean);
        if (dynamic.length) setCategories(dynamic);
      })
      .catch(() => {/* use localStorage defaults */});
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 600, 0.7);
      setPreview(compressed);
      setForm((prev) => ({ ...prev, image: compressed }));
    } catch { toast.error("Failed to process image"); }
  };

  const calcSizeLabel = useMemo(
    () => `${form.lengthCm || 0}x${form.widthCm || 0}`,
    [form.lengthCm, form.widthCm]
  );

  useEffect(() => {
    const length = Number(form.lengthCm);
    const width = Number(form.widthCm);
    const pieces = Number(form.tilesPerBox || 1);
    if (!length || !width) return;
    const tileSqft = (length * width) / CM2_PER_SQFT;
    const coverageSqft = tileSqft * (pieces > 0 ? pieces : 1);
    const nextCoverage = coverageSqft.toFixed(2);
    if (form.coverageArea !== nextCoverage) {
      setForm((prev) => ({ ...prev, coverageArea: nextCoverage }));
    }
  }, [form.lengthCm, form.widthCm, form.tilesPerBox, form.coverageArea]);

  useEffect(() => {
    const boxes = Number(form.stockBoxes);
    const coverage = Number(form.coverageArea);
    if (!Number.isFinite(boxes) || !Number.isFinite(coverage) || boxes < 0 || coverage <= 0) return;
    const nextStock = (boxes * coverage).toFixed(2);
    if (form.stock !== nextStock) {
      setForm((prev) => ({ ...prev, stock: nextStock }));
    }
  }, [form.stockBoxes, form.coverageArea, form.stock]);

  const validate = () => {
    if (!form.name.trim())     return toast.error("Tile name is required"),            false;
    if (!form.code.trim())     return toast.error("SKU / Product code is required"),   false;
    if (!form.category)        return toast.error("Category is required"),              false;
    if (!form.brand)           return toast.error("Brand is required"),                 false;
    if (!form.finish)          return toast.error("Finish is required"),                false;
    if (!form.lengthCm || !form.widthCm) return toast.error("Dimensions required"),    false;
    if (form.gst === "")       return toast.error("GST rate is required"),              false;
    return true;
  };

  const handleReset = () => {
    setForm(empty());
    setPreview("");
    if (isEdit) navigate(-1);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);

    const payload = {
      name:             form.name.trim(),
      code:             form.code.trim().toUpperCase(),
      barcode:          form.barcode.trim(),
      category:         form.category,
      brand:            form.brand,
      finish:           form.finish,
      colorDesign:      form.colorDesign.trim(),
      lengthCm:         numericOrZero(form.lengthCm),
      widthCm:          numericOrZero(form.widthCm),
      tilesPerBox:      numericOrZero(form.tilesPerBox),
      coverageArea:     numericOrZero(form.coverageArea),
      price:            numericOrZero(form.price),
      dealerPrice:      numericOrZero(form.dealerPrice),
      purchasePrice:    numericOrZero(form.purchasePrice),
      minimumSellPrice: numericOrZero(form.minimumSellPrice),
      contractorPrice:  numericOrZero(form.contractorPrice),
      mrpPerBox:        numericOrZero(form.mrpPerBox),
      gst:              numericOrZero(form.gst),
      hsnCode:          form.hsnCode.trim(),
      stock:            numericOrZero(form.stock),
      stockBoxes:       numericOrZero(form.stockBoxes),
      reorderLevel:     numericOrZero(form.reorderLevel),
      rackLocation:     form.rackLocation.trim(),
      notes:            form.notes.trim(),
      image:            form.image,
      uom:              form.uom,
      size:             calcSizeLabel,
      totalPrice:       numericOrZero(form.price) * (1 + numericOrZero(form.gst) / 100),
      minStockAlert:    numericOrZero(form.reorderLevel),
      isSupplierItem:   false,
    };

    try {
      if (isEdit) {
        await updateProduct(editProduct._id, payload);
        toast.success("Product updated ✅");
        if (typeof onSaved === "function") await onSaved();
        navigate(-1);
      } else {
        await createProduct(payload);
        toast.success("Product saved ✅");
        if (typeof onSaved === "function") await onSaved();
        handleReset();
      }
    } catch (err) {
      const msg = err?.response?.data?.error || "";
      toast.error(msg.includes("duplicate") ? "Product code already exists" : "Failed to save product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      sx={{
        p: 0,
        borderRadius: embedded ? 0 : "10px",
        border: embedded ? "none" : `1px solid ${T.border}`,
        background: T.white,
        boxShadow: embedded ? "none" : "0 1px 4px rgba(15,23,42,.05)",
      }}
    >

      {/* ── Header ── */}
      {!embedded && (
        <Box sx={{ px: 2.5, py: 1.7, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography sx={{ fontSize: 25, color: T.primary, lineHeight: 1 }}>
            {isEdit ? "✏️" : "+"}
          </Typography>
          <Typography sx={{ fontSize: 20, fontWeight: 800, color: T.text }}>
            {isEdit ? `Edit — ${editProduct.name}` : "Add / Edit Tile Product"}
          </Typography>
        </Box>
        {isEdit && (
          <Box
            onClick={() => navigate(-1)}
            sx={{
              display: "flex", alignItems: "center", gap: 0.5,
              px: 1.6, py: 0.7, borderRadius: "7px", cursor: "pointer",
              border: `1.5px solid ${T.border}`, color: T.muted, fontSize: 13, fontWeight: 600,
              "&:hover": { borderColor: T.primary, color: T.primary, background: "#f5f3ff" },
            }}
          >
            ← Back to Products
          </Box>
        )}
        </Box>
      )}

      <Box sx={{ p: embedded ? 0 : 2, background: embedded ? "transparent" : T.bg }}>

        {/* ── Basic Details ── */}
        <Box sx={{ ...sectionTitleSx, mt: 0.5 }}>Basic Details</Box>
        <Divider sx={{ mb: 1.6 }} />
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 1.6 }}>
          <Box sx={{ gridColumn: "span 4" }}><FormField label="Tile Name" name="name" value={form.name} onChange={handleChange} required placeholder="e.g. Italian Beige Matt 60x60" /></Box>
          <Box sx={{ gridColumn: "span 4" }}><FormField label="SKU / Product Code" name="code" value={form.code} onChange={handleChange} placeholder="TIL-0042" /></Box>
          <Box sx={{ gridColumn: "span 4" }}><FormField label="Barcode / EAN" name="barcode" value={form.barcode} onChange={handleChange} placeholder="Scan barcode" /></Box>

          <Box sx={{ gridColumn: "span 3" }}>
            <FormField label="Category" name="category" value={form.category} onChange={handleChange} required select>
              <MenuItem value="">Select category</MenuItem>
              {categories.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
            </FormField>
          </Box>
          <Box sx={{ gridColumn: "span 3" }}>
            <FormField label="Brand" name="brand" value={form.brand} onChange={handleChange} required select>
              <MenuItem value="">Select brand</MenuItem>
              {brands.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
            </FormField>
          </Box>
          <Box sx={{ gridColumn: "span 3" }}>
            <FormField label="Finish" name="finish" value={form.finish} onChange={handleChange} required select>
              <MenuItem value="">Select finish</MenuItem>
              {finishes.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
            </FormField>
          </Box>
          <Box sx={{ gridColumn: "span 3" }}><FormField label="Color / Shade" name="colorDesign" value={form.colorDesign} onChange={handleChange} placeholder="Beige, Grey, White..." /></Box>

          <Box sx={{ gridColumn: "span 3" }}><FormField label="Length (cm)" name="lengthCm" value={form.lengthCm} onChange={handleChange} required type="number" placeholder="60" /></Box>
          <Box sx={{ gridColumn: "span 3" }}><FormField label="Width (cm)" name="widthCm" value={form.widthCm} onChange={handleChange} required type="number" placeholder="60" /></Box>
          <Box sx={{ gridColumn: "span 3" }}><FormField label="Pieces / Box" name="tilesPerBox" value={form.tilesPerBox} onChange={handleChange} type="number" placeholder="4" /></Box>
          <Box sx={{ gridColumn: "span 3" }}><FormField label="Coverage / Box (sqft)" name="coverageArea" value={form.coverageArea} onChange={handleChange} type="number" placeholder="2.16" /></Box>
        </Box>

        {/* ── Pricing ── */}
        <Box sx={{ ...sectionTitleSx, mt: 3 }}>Pricing (All Channels)</Box>
        <Divider sx={{ mb: 1.6 }} />
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 1.6 }}>
          <Box sx={{ gridColumn: "span 3" }}><FormField label="Retail Price (Rs/sqft)" name="price" value={form.price} onChange={handleChange} required type="number" placeholder="85.00" /></Box>
          <Box sx={{ gridColumn: "span 3" }}><FormField label="Dealer / Bulk Price" name="dealerPrice" value={form.dealerPrice} onChange={handleChange} required type="number" placeholder="72.00" /></Box>
          <Box sx={{ gridColumn: "span 3" }}><FormField label="Minimum Sell Price" name="minimumSellPrice" value={form.minimumSellPrice} onChange={handleChange} type="number" placeholder="78.00" /></Box>
          <Box sx={{ gridColumn: "span 3" }}><FormField label="Contractor Price" name="contractorPrice" value={form.contractorPrice} onChange={handleChange} type="number" placeholder="78.00" /></Box>
          <Box sx={{ gridColumn: "span 3" }}>
            <FormField label="GST Rate" name="gst" value={form.gst} onChange={handleChange} required select>
              <MenuItem value="">Select GST</MenuItem>
              {GST_OPTIONS.map((item) => <MenuItem key={item.value} value={String(item.value)}>{item.label}</MenuItem>)}
            </FormField>
          </Box>
          <Box sx={{ gridColumn: "span 3" }}><FormField label="HSN Code" name="hsnCode" value={form.hsnCode} onChange={handleChange} placeholder="6907" /></Box>
        </Box>

        {/* ── Stock ── */}
        <Box sx={{ ...sectionTitleSx, mt: 3 }}>Stock Details</Box>
        <Divider sx={{ mb: 1.6 }} />
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 1.6 }}>
          <Box sx={{ gridColumn: "span 3" }}><FormField label="Opening Stock (sqft)" name="stock" value={form.stock} onChange={handleChange} required type="number" placeholder="0" InputProps={{ readOnly: true }} /></Box>
          <Box sx={{ gridColumn: "span 3" }}><FormField label="Opening Stock (boxes)" name="stockBoxes" value={form.stockBoxes} onChange={handleChange} required type="number" placeholder="0" /></Box>
          <Box sx={{ gridColumn: "span 3" }}><FormField label="Minimum Stock" name="reorderLevel" value={form.reorderLevel} onChange={handleChange} required type="number" placeholder="100" /></Box>
          <Box sx={{ gridColumn: "span 3" }}>
            {/* Rack location as select if racks defined, else free text */}
            <FormField label="Rack Location" name="rackLocation" value={form.rackLocation} onChange={handleChange} select={racks.length > 0}>
              {racks.length > 0 && [
                <MenuItem key="" value="">Select rack</MenuItem>,
                ...racks.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>),
              ]}
            </FormField>
          </Box>
        </Box>

        {/* ── Image & Notes ── */}
        <Box sx={{ ...sectionTitleSx, mt: 3 }}>Images & Notes</Box>
        <Divider sx={{ mb: 1.6 }} />
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 1.6 }}>
          <Box sx={{ gridColumn: "span 6" }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#7b88a1", mb: 0.8 }}>Product Image</Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
              <Button variant="outlined" component="label" size="small" sx={{ textTransform: "none", borderColor: T.border, color: T.text }}>
                {preview ? "Change Image" : "Choose File"}
                <input hidden type="file" accept="image/*" onChange={handleImage} />
              </Button>
              <Typography sx={{ fontSize: 12, color: T.muted }}>
                {preview ? "Image selected" : "No file chosen"}
              </Typography>
            </Box>
            {preview && (
              <Box sx={{ mt: 1.2, width: 110, height: 90, borderRadius: "8px", overflow: "hidden", border: `1px solid ${T.border}` }}>
                <img src={preview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </Box>
            )}
          </Box>

          <Box sx={{ gridColumn: "span 6" }}>
            <FormField label="Description / Notes" name="notes" value={form.notes} onChange={handleChange} multiline minRows={3} placeholder="Any notes about this tile..." />
          </Box>
        </Box>

        {/* ── Actions ── */}
        <Box sx={{ display: "flex", gap: 1.2, mt: 2.2 }}>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
            sx={{ textTransform: "none", fontWeight: 700, background: T.success, "&:hover": { background: "#166534" } }}
          >
            {loading ? "Saving..." : isEdit ? "Update Product" : "Save Tile"}
          </Button>
          <Button
            variant="outlined"
            onClick={handleReset}
            sx={{ textTransform: "none", borderColor: T.border, color: T.text }}
          >
            {isEdit ? "Cancel" : "Reset"}
          </Button>
        </Box>
      </Box>
    </Card>
  );
};

export default AddItem;
