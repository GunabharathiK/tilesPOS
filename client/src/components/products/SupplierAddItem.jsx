import {
  Box,
  Card,
  Typography,
  TextField,
  Button,
  Divider,
  MenuItem,
  CircularProgress,
  Chip,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { getSuppliers, getPurchases } from "../../services/supplierService";
import { createProduct, getProducts } from "../../services/productService";
import compressImage from "../../utils/compressImage";
import toast from "react-hot-toast";

const T = {
  primary: "#6d5bd0",
  success: "#15803d",
  text: "#1f2937",
  muted: "#64748b",
  border: "#d7dee8",
  bg: "#f2f6fb",
  white: "#ffffff",
};

const CATEGORY_OPTIONS = ["Floor Tile", "Wall Tile", "Vitrified Tile", "Parking Tile", "Granite", "Marble"];
const BRAND_OPTIONS = ["Kajaria", "Somany", "Nitco", "Johnson", "Orientbell", "Other"];
const FINISH_OPTIONS = ["Matt", "Glossy", "Polished", "Satin", "Rustic"];
const GST_OPTIONS = [
  { label: "0% (Exempt)", value: 0 },
  { label: "5%", value: 5 },
  { label: "12%", value: 12 },
  { label: "18% (Standard)", value: 18 },
  { label: "28%", value: 28 },
];
const UOM_OPTIONS_ALL = ["sqrft", "kg", "bag", "box", "piece", "meter", "litre", "ton"];
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

const chipSx = {
  height: 24,
  "& .MuiChip-label": {
    fontSize: 12.5,
    fontWeight: 600,
  },
};

const infoRowSx = {
  display: "flex",
  alignItems: "center",
  gap: 0.8,
  flexWrap: "wrap",
};

const infoKeySx = {
  fontSize: 12,
  fontWeight: 700,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: ".05em",
  minWidth: 110,
};

const SupplierFormField = ({
  label,
  name,
  required,
  value,
  onChange,
  disabled,
  ...props
}) => (
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
      disabled={disabled}
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
  rackLocation: "", notes: "", image: "", uom: "",
});

const numericOrZero = (v) => (v === "" ? 0 : Number(v) || 0);

const parseSizeToLengthWidth = (size = "") => {
  const normalized = String(size).replace(/\s+/g, "").toLowerCase();
  const [l, w] = normalized.split("x");
  const len = Number(l);
  const wid = Number(w);
  return {
    lengthCm: Number.isFinite(len) && len > 0 ? String(len) : "",
    widthCm: Number.isFinite(wid) && wid > 0 ? String(wid) : "",
  };
};

const normalize = (value = "") => String(value).trim().toLowerCase();

const SupplierAddItem = ({ embedded = false, onSaved }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [supplierPurchases, setSupplierPurchases] = useState([]);
  const [supLoading, setSupLoading] = useState(true);
  const [selectedSup, setSelectedSup] = useState(null);
  const [form, setForm] = useState(empty());
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);

  const supplierItems = selectedSup?.items || [];
  const rawProductsSupplied = selectedSup?.productsSupplied;
  const supplierCatalogNames = Array.isArray(rawProductsSupplied)
    ? rawProductsSupplied.map((name) => String(name || "").trim()).filter(Boolean)
    : typeof rawProductsSupplied === "string"
      ? rawProductsSupplied.split(",").map((name) => name.trim()).filter(Boolean)
      : [];
  const supplierLinkedProducts = allProducts.filter((product) => {
    const pid = product?.supplierId?._id || product?.supplierId;
    return product?.isSupplierItem && pid && selectedSup?._id && String(pid) === String(selectedSup._id);
  });
  const supplierLinkedProductNames = supplierLinkedProducts
    .map((product) => String(product?.name || "").trim())
    .filter(Boolean);
  const supNames = [...new Set([
    ...supplierItems.map((i) => i.name).filter(Boolean),
    ...supplierCatalogNames,
    ...supplierLinkedProductNames,
  ])];
  const supUnits = [...new Set(supplierItems.map((i) => i.unit).filter(Boolean))];

  const selectedNameItems = form.name ? supplierItems.filter((i) => i.name === form.name) : [];
  const selectedPurchaseItems = form.name
    ? supplierPurchases
        .flatMap((purchase) => purchase?.products || [])
        .filter((item) => normalize(item?.name) === normalize(form.name))
    : [];
  const suggestedPrices = [...new Set([
    ...selectedNameItems.map((i) => String(i.price)).filter(Boolean),
    ...selectedPurchaseItems.map((i) => String(i.price)).filter(Boolean),
  ])];
  const suggestedQty = [...new Set([
    ...selectedNameItems.map((i) => String(i.qty)).filter(Boolean),
    ...selectedPurchaseItems.map((i) => String(i.received ?? i.qty)).filter(Boolean),
  ])];
  const supColorDesigns = [...new Set(selectedNameItems.map((i) => i.colorDesign).filter(Boolean))];
  const uomOptions = supUnits.length > 0 ? supUnits : UOM_OPTIONS_ALL;
  const supplierItemLabel = supNames.length ? supNames.join(", ") : "No items";

  useEffect(() => {
    Promise.all([getSuppliers(), getProducts()])
      .then(([supplierRes, productRes]) => {
        setSuppliers(Array.isArray(supplierRes.data) ? supplierRes.data : []);
        setAllProducts(Array.isArray(productRes.data) ? productRes.data : []);
      })
      .catch(() => toast.error("Failed to load suppliers"))
      .finally(() => setSupLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedSup?._id) {
      setSupplierPurchases([]);
      return;
    }
    getPurchases(selectedSup._id)
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setSupplierPurchases(list.filter((purchase) => !purchase?.isDraft));
      })
      .catch(() => setSupplierPurchases([]));
  }, [selectedSup?._id]);

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

  const autoImageFor = (name, colorDesign = "") => {
    const n = normalize(name);
    const itemBase = supplierItems.filter((i) => normalize(i.name) === n);
    const productBase = supplierLinkedProducts.filter((p) => normalize(p.name) === n);
    const exactItem = itemBase.find((i) => normalize(i.colorDesign) === normalize(colorDesign) && i.image);
    const exactProduct = productBase.find((p) => normalize(p.colorDesign) === normalize(colorDesign) && p.image);
    const anyItem = itemBase.find((i) => i.image);
    const anyProduct = productBase.find((p) => p.image);
    return exactItem?.image || exactProduct?.image || anyItem?.image || anyProduct?.image || "";
  };

  const handleSupplierChange = (supplier) => {
    setSelectedSup(supplier);
    setForm(empty());
    setPreview("");
  };

  const handleNamePick = (nextName) => {
    const n = normalize(nextName);
    const itemMatch = supplierItems.find((i) => normalize(i.name) === n);
    const productMatch = supplierLinkedProducts.find((p) => normalize(p.name) === n);
    const purchaseMatch = [...supplierPurchases]
      .sort((a, b) => new Date(b?.invoiceDate || b?.createdAt || 0) - new Date(a?.invoiceDate || a?.createdAt || 0))
      .flatMap((purchase) => purchase?.products || [])
      .find((item) => normalize(item?.name) === n);
    const source = purchaseMatch || itemMatch || productMatch || null;
    const parsed = parseSizeToLengthWidth(
      source?.size || (source?.lengthCm && source?.widthCm ? `${source.lengthCm}x${source.widthCm}` : "")
    );
    const nextImage = autoImageFor(nextName, source?.colorDesign || "");
    const receivedBoxes = source?.received !== undefined ? Number(source.received) : undefined;
    const receivedSqft = source?.sqft !== undefined ? Number(source.sqft) : undefined;
    const derivedCoverage = receivedBoxes > 0 && receivedSqft > 0 ? (receivedSqft / receivedBoxes).toFixed(2) : "";

    setForm((prev) => ({
      ...prev,
      name: nextName,
      category: source?.category || prev.category,
      brand: source?.brand || prev.brand,
      finish: source?.finish || prev.finish,
      colorDesign: source?.colorDesign || prev.colorDesign,
      code: source?.code || prev.code,
      barcode: source?.barcode || prev.barcode,
      hsnCode: source?.hsnCode || prev.hsnCode,
      gst: source?.gst !== undefined && source?.gst !== null ? String(source.gst) : prev.gst,
      price: source?.price !== undefined ? String(source.price) : prev.price,
      dealerPrice: source?.dealerPrice !== undefined ? String(source.dealerPrice) : prev.dealerPrice,
      purchasePrice: source?.purchasePrice !== undefined
        ? String(source.purchasePrice)
        : (source?.price !== undefined ? String(source.price) : prev.purchasePrice),
      minimumSellPrice: source?.minimumSellPrice !== undefined ? String(source.minimumSellPrice) : prev.minimumSellPrice,
      contractorPrice: source?.contractorPrice !== undefined ? String(source.contractorPrice) : prev.contractorPrice,
      mrpPerBox: source?.mrpPerBox !== undefined ? String(source.mrpPerBox) : prev.mrpPerBox,
      stock: source?.sqft !== undefined
        ? String(source.sqft)
        : (source?.qty !== undefined ? String(source.qty) : (source?.stock !== undefined ? String(source.stock) : prev.stock)),
      stockBoxes: source?.received !== undefined
        ? String(source.received)
        : (source?.stockBoxes !== undefined ? String(source.stockBoxes) : prev.stockBoxes),
      reorderLevel: source?.reorderLevel !== undefined ? String(source.reorderLevel) : prev.reorderLevel,
      tilesPerBox: source?.tilesPerBox !== undefined ? String(source.tilesPerBox) : prev.tilesPerBox,
      coverageArea: source?.coverageArea !== undefined
        ? String(source.coverageArea)
        : (derivedCoverage || prev.coverageArea),
      uom: source?.unit || source?.uom || prev.uom,
      lengthCm: parsed.lengthCm || prev.lengthCm,
      widthCm: parsed.widthCm || prev.widthCm,
      image: nextImage || prev.image,
    }));
    if (nextImage) setPreview(nextImage);
  };

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
    } catch {
      toast.error("Failed to process image");
    }
  };

  const handleReset = () => {
    setForm(empty());
    setSelectedSup(null);
    setPreview("");
  };

  const validate = () => {
    if (!selectedSup) return toast.error("Please select a supplier"), false;
    if (!form.name.trim()) return toast.error("Tile name is required"), false;
    if (!form.code.trim()) return toast.error("SKU / Product code is required"), false;
    if (!form.category) return toast.error("Category is required"), false;
    if (!form.brand) return toast.error("Brand is required"), false;
    if (!form.finish) return toast.error("Finish is required"), false;
    if (!form.lengthCm || !form.widthCm) return toast.error("Dimensions required"), false;
    if (!form.price) return toast.error("Price is required"), false;
    if (!form.stock) return toast.error("Stock is required"), false;
    if (form.gst === "") return toast.error("GST rate is required"), false;
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);

    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      barcode: form.barcode.trim(),
      category: form.category,
      brand: form.brand,
      finish: form.finish,
      colorDesign: form.colorDesign.trim(),
      lengthCm: numericOrZero(form.lengthCm),
      widthCm: numericOrZero(form.widthCm),
      tilesPerBox: numericOrZero(form.tilesPerBox),
      coverageArea: numericOrZero(form.coverageArea),
      price: numericOrZero(form.price),
      dealerPrice: numericOrZero(form.dealerPrice),
      purchasePrice: numericOrZero(form.purchasePrice),
      minimumSellPrice: numericOrZero(form.minimumSellPrice),
      contractorPrice: numericOrZero(form.contractorPrice),
      mrpPerBox: numericOrZero(form.mrpPerBox),
      gst: numericOrZero(form.gst),
      hsnCode: form.hsnCode.trim(),
      stock: numericOrZero(form.stock),
      stockBoxes: numericOrZero(form.stockBoxes),
      reorderLevel: numericOrZero(form.reorderLevel),
      rackLocation: form.rackLocation.trim(),
      notes: form.notes.trim(),
      image: form.image,
      uom: form.uom,
      size: calcSizeLabel,
      totalPrice: numericOrZero(form.price) * (1 + numericOrZero(form.gst) / 100),
      minStockAlert: numericOrZero(form.reorderLevel),
      supplierId: selectedSup._id,
      supplierName: selectedSup.name,
      isSupplierItem: true,
    };

    try {
      await createProduct(payload);
      toast.success("Supplier product added");
      if (typeof onSaved === "function") await onSaved();
      handleReset();
    } catch (err) {
      const msg = err?.response?.data?.error || "";
      toast.error(msg.includes("duplicate") ? "Product code already exists" : "Failed to add product");
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
      <Box sx={{ p: embedded ? 0 : 2, background: embedded ? "transparent" : T.bg }}>
        <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={1}>
          SELECT SUPPLIER *
        </Typography>
        {supLoading ? (
          <CircularProgress size={24} />
        ) : (
          <TextField
            select
            size="small"
            label="Search and select supplier *"
            value={selectedSup?._id || ""}
            onChange={(e) => {
              const supplier = suppliers.find((s) => s._id === e.target.value) || null;
              handleSupplierChange(supplier);
            }}
            sx={{ ...inputSx, mb: 2 ,width:"400px"}}
          >
            <MenuItem value="">- Select Supplier -</MenuItem>
            {suppliers.map((supplier) => (
              <MenuItem key={supplier._id} value={supplier._id}>
                {supplier.name} {supplier.phone ? `| ${supplier.phone}` : ""}
              </MenuItem>
            ))}
          </TextField>
        )}

        {selectedSup && (
          <Box
            sx={{
              background: "#f5f3ff",
              border: "1px solid #ddd6fe",
              borderRadius: 2,
              p: 2,
              mb: 2.2,
            }}
          >
            <Typography fontSize={13} fontWeight={600} color="#6d28d9" mb={1}>
              Selected Supplier
            </Typography>
            <Box sx={{ display: "grid", gap: 0.8 }}>
              <Box sx={infoRowSx}>
                <Typography sx={infoKeySx}>Supplier Name</Typography>
                <Chip label={selectedSup.name} size="small" color="secondary" sx={chipSx} />
              </Box>
              <Box sx={infoRowSx}>
                <Typography sx={infoKeySx}>Mobile</Typography>
                <Chip label={selectedSup.phone || "-"} size="small" variant="outlined" sx={chipSx} />
              </Box>
              <Box sx={infoRowSx}>
                <Typography sx={infoKeySx}>Address</Typography>
                <Chip label={selectedSup.address || "-"} size="small" variant="outlined" sx={chipSx} />
              </Box>
              <Box sx={infoRowSx}>
                <Typography sx={infoKeySx}>Items</Typography>
                <Chip label={supplierItemLabel} size="small" sx={{ ...chipSx, background: "#eff6ff", color: "#1d4ed8" }} />
              </Box>
            </Box>
          </Box>
        )}

        <Box sx={{ ...sectionTitleSx, mt: 0.5 }}>Basic Details</Box>
        <Divider sx={{ mb: 1.6 }} />
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 1.6 }}>
          <Box sx={{ gridColumn: "span 4" }}>
            <Typography sx={fieldLabelSx}>
              TILE NAME
              <Box component="span" sx={{ color: "#dc2626" }}> *</Box>
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={form.name}
              onChange={(e) => {
                const next = e.target.value;
                setForm((prev) => ({ ...prev, name: next }));
                if (supNames.some((name) => normalize(name) === normalize(next))) {
                  handleNamePick(next);
                }
              }}
              onBlur={() => {
                if (form.name && supNames.some((name) => normalize(name) === normalize(form.name))) {
                  handleNamePick(form.name);
                }
              }}
              disabled={!selectedSup}
              placeholder={!selectedSup ? "Select supplier first" : "Search product name"}
              sx={inputSx}
              inputProps={{ list: "supplier-name-options" }}
            />
            <datalist id="supplier-name-options">
              {supNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </Box>
          <Box sx={{ gridColumn: "span 4" }}>
            <SupplierFormField
              label="SKU / Product Code"
              name="code"
              value={form.code}
              onChange={handleChange}
              required
              disabled={!selectedSup}
              placeholder="TIL-0042"
              inputProps={{ style: { textTransform: "uppercase" } }}
            />
          </Box>
          <Box sx={{ gridColumn: "span 4" }}>
            <SupplierFormField
              label="Barcode / EAN"
              name="barcode"
              value={form.barcode}
              onChange={handleChange}
              disabled={!selectedSup}
              placeholder="Scan barcode"
            />
          </Box>

          <Box sx={{ gridColumn: "span 3" }}>
            <SupplierFormField label="Category" name="category" value={form.category} onChange={handleChange} disabled={!selectedSup} required select>
              <MenuItem value="">Select category</MenuItem>
              {CATEGORY_OPTIONS.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
            </SupplierFormField>
          </Box>
          <Box sx={{ gridColumn: "span 3" }}>
            <SupplierFormField label="Brand" name="brand" value={form.brand} onChange={handleChange} disabled={!selectedSup} required select>
              <MenuItem value="">Select brand</MenuItem>
              {BRAND_OPTIONS.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
            </SupplierFormField>
          </Box>
          <Box sx={{ gridColumn: "span 3" }}>
            <SupplierFormField label="Finish" name="finish" value={form.finish} onChange={handleChange} disabled={!selectedSup} required select>
              <MenuItem value="">Select finish</MenuItem>
              {FINISH_OPTIONS.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
            </SupplierFormField>
          </Box>
          <Box sx={{ gridColumn: "span 3" }}>
            {supColorDesigns.length > 0 ? (
              <SupplierFormField
                label="Color / Shade"
                name="colorDesign"
                value={form.colorDesign}
                select
                disabled={!selectedSup}
                onChange={(e) => {
                  const nextColor = e.target.value;
                  const nextImage = autoImageFor(form.name, nextColor);
                  setForm((prev) => ({ ...prev, colorDesign: nextColor, image: nextImage || prev.image }));
                  if (nextImage) setPreview(nextImage);
                }}
              >
                <MenuItem value="">- Select Color/Design -</MenuItem>
                {supColorDesigns.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
              </SupplierFormField>
            ) : (
              <SupplierFormField
                label="Color / Shade"
                name="colorDesign"
                value={form.colorDesign}
                onChange={handleChange}
                disabled={!selectedSup}
                placeholder="Beige, Grey, White..."
              />
            )}
          </Box>

          <Box sx={{ gridColumn: "span 3" }}><SupplierFormField label="Length (cm)" name="lengthCm" value={form.lengthCm} onChange={handleChange} disabled={!selectedSup} required type="number" placeholder="60" /></Box>
          <Box sx={{ gridColumn: "span 3" }}><SupplierFormField label="Width (cm)" name="widthCm" value={form.widthCm} onChange={handleChange} disabled={!selectedSup} required type="number" placeholder="60" /></Box>
          <Box sx={{ gridColumn: "span 3" }}><SupplierFormField label="Pieces / Box" name="tilesPerBox" value={form.tilesPerBox} onChange={handleChange} disabled={!selectedSup} type="number" placeholder="4" /></Box>
          <Box sx={{ gridColumn: "span 3" }}><SupplierFormField label="Coverage / Box (sqft)" name="coverageArea" value={form.coverageArea} onChange={handleChange} disabled={!selectedSup} type="number" placeholder="2.16" /></Box>
        </Box>

        <Box sx={{ ...sectionTitleSx, mt: 3 }}>Pricing (All Channels)</Box>
        <Divider sx={{ mb: 1.6 }} />
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 1.6 }}>
          <Box sx={{ gridColumn: "span 3" }}><SupplierFormField label="Retail Price (Rs/sqft)" name="price" value={form.price} onChange={handleChange} disabled={!selectedSup} required type="number" placeholder="85.00" helperText={suggestedPrices.length > 0 ? `Suggested: ${suggestedPrices.join(", ")}` : ""} /></Box>
          <Box sx={{ gridColumn: "span 3" }}><SupplierFormField label="Dealer / Bulk Price" name="dealerPrice" value={form.dealerPrice} onChange={handleChange} disabled={!selectedSup} type="number" placeholder="72.00" /></Box>
          <Box sx={{ gridColumn: "span 3" }}><SupplierFormField label="Cost / Purchase Price" name="purchasePrice" value={form.purchasePrice} onChange={handleChange} disabled={!selectedSup} type="number" placeholder="62.00" /></Box>
          <Box sx={{ gridColumn: "span 3" }}><SupplierFormField label="Minimum Sell Price" name="minimumSellPrice" value={form.minimumSellPrice} onChange={handleChange} disabled={!selectedSup} type="number" placeholder="78.00" /></Box>

          <Box sx={{ gridColumn: "span 3" }}><SupplierFormField label="Contractor Price" name="contractorPrice" value={form.contractorPrice} onChange={handleChange} disabled={!selectedSup} type="number" placeholder="78.00" /></Box>
          <Box sx={{ gridColumn: "span 3" }}><SupplierFormField label="MRP / Box (Rs)" name="mrpPerBox" value={form.mrpPerBox} onChange={handleChange} disabled={!selectedSup} type="number" placeholder="560" /></Box>
          <Box sx={{ gridColumn: "span 3" }}>
            <SupplierFormField label="GST Rate" name="gst" value={form.gst} onChange={handleChange} disabled={!selectedSup} required select>
              <MenuItem value="">Select GST</MenuItem>
              {GST_OPTIONS.map((item) => <MenuItem key={item.value} value={String(item.value)}>{item.label}</MenuItem>)}
            </SupplierFormField>
          </Box>
          <Box sx={{ gridColumn: "span 3" }}><SupplierFormField label="HSN Code" name="hsnCode" value={form.hsnCode} onChange={handleChange} disabled={!selectedSup} placeholder="6907" /></Box>
        </Box>

        <Box sx={{ ...sectionTitleSx, mt: 3 }}>Stock Details</Box>
        <Divider sx={{ mb: 1.6 }} />
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 1.6 }}>
          <Box sx={{ gridColumn: "span 3" }}><SupplierFormField label="Opening Stock (sqft)" name="stock" value={form.stock} onChange={handleChange} disabled={!selectedSup} required type="number" placeholder="0" InputProps={{ readOnly: true }} helperText={suggestedQty.length > 0 ? `Suggested: ${suggestedQty.join(", ")}` : ""} /></Box>
          <Box sx={{ gridColumn: "span 3" }}><SupplierFormField label="Opening Stock (boxes)" name="stockBoxes" value={form.stockBoxes} onChange={handleChange} disabled={!selectedSup} required type="number" placeholder="0" /></Box>
          <Box sx={{ gridColumn: "span 3" }}><SupplierFormField label="Minimum Stock" name="reorderLevel" value={form.reorderLevel} onChange={handleChange} disabled={!selectedSup} required type="number" placeholder="100" /></Box>
          <Box sx={{ gridColumn: "span 3" }}><SupplierFormField label="Rack Location" name="rackLocation" value={form.rackLocation} onChange={handleChange} disabled={!selectedSup} placeholder="Rack-A3" /></Box>

          <Box sx={{ gridColumn: "span 3" }}>
            <SupplierFormField label="UOM" name="uom" value={form.uom} onChange={handleChange} disabled={!selectedSup} required select>
              <MenuItem value="">Select UOM</MenuItem>
              {uomOptions.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
            </SupplierFormField>
          </Box>
        </Box>

        <Box sx={{ ...sectionTitleSx, mt: 3 }}>Images & Notes</Box>
        <Divider sx={{ mb: 1.6 }} />
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 1.6 }}>
          <Box sx={{ gridColumn: "span 6" }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#7b88a1", mb: 0.8 }}>Product Image</Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
              <Button variant="outlined" component="label" size="small" disabled={!selectedSup} sx={{ textTransform: "none", borderColor: T.border, color: T.text }}>
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
            <SupplierFormField
              label="Description / Notes"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              disabled={!selectedSup}
              multiline
              minRows={3}
              placeholder="Any notes about this tile..."
            />
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 1.2, mt: 2.2 }}>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading || !selectedSup}
            sx={{ textTransform: "none", fontWeight: 700, background: T.success, "&:hover": { background: "#166534" } }}
          >
            {loading ? "Saving..." : "Save Supplier Product"}
          </Button>
          <Button
            variant="outlined"
            onClick={handleReset}
            sx={{ textTransform: "none", borderColor: T.border, color: T.text }}
          >
            Reset
          </Button>
        </Box>
      </Box>
    </Card>
  );
};

export default SupplierAddItem;
