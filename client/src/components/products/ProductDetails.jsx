import {
  Box, Typography, IconButton, Dialog, DialogContent,
} from "@mui/material";
import EditIcon              from "@mui/icons-material/Edit";
import DeleteIcon            from "@mui/icons-material/Delete";
import SaveIcon              from "@mui/icons-material/Save";
import CloseIcon             from "@mui/icons-material/Close";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import SearchIcon            from "@mui/icons-material/Search";
import InventoryIcon         from "@mui/icons-material/Inventory";
import FileDownloadIcon      from "@mui/icons-material/FileDownload";
import AddIcon               from "@mui/icons-material/Add";
import TuneIcon              from "@mui/icons-material/Tune";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getProducts, updateProduct, deleteProduct } from "../../services/productService";
import ConfirmDialog from "../common/ConfirmDialog";
import toast from "react-hot-toast";

/* ── Design tokens ──────────────────────────────────────────── */
const T = {
  primary:      "#1a56a0",
  primaryDark:  "#0f3d7a",
  primaryLight: "#e8f0fb",
  success:      "#1a7a4a",
  successLight: "#e8f5ee",
  danger:       "#c0392b",
  dangerLight:  "#fdf0ee",
  warning:      "#d4820a",
  warningLight: "#fef8ec",
  purple:       "#6d28d9",
  purpleLight:  "#f5f3ff",
  dark:         "#1c2333",
  text:         "#2d3748",
  muted:        "#718096",
  border:       "#e2e8f0",
  bg:           "#f0f4f8",
  white:        "#fff",
};

const UOM_OPTIONS = ["sqrft", "kg", "bag", "box", "piece", "meter", "litre", "ton"];
const GST_OPTIONS = [0, 5, 12, 18, 28];

const calcTotalPrice = (price, gst) =>
  Number((Number(price || 0) * (1 + Number(gst || 0) / 100)).toFixed(2));

const getImageSrc = (p = {}) => {
  const raw = p.image || p.productImage || p.img || p.photo || "";
  if (!raw || typeof raw !== "string") return "";
  if (raw.startsWith("data:image") || raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (/^[A-Za-z0-9+/=\r\n]+$/.test(raw) && raw.length > 64) return `data:image/jpeg;base64,${raw}`;
  return raw;
};

const fmt      = (n = 0) => Number(n).toLocaleString("en-IN");
const fmtPrice = (n = 0) => `₹${fmt(Number(n).toFixed(2))}`;

/* ── Inline text input style ────────────────────────────────── */
const inpSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "6px", fontSize: 12,
    "& fieldset": { borderColor: T.border },
    "&:hover fieldset": { borderColor: T.primary },
    "&.Mui-focused fieldset": { borderColor: T.primary, borderWidth: "1.5px" },
  },
  "& .MuiInputBase-input": { padding: "6px 10px" },
};

/* ── Category pill colors ── */
const CATEGORY_COLORS = {
  "Floor Tile":  { bg: "#dbeafe", color: "#1d4ed8" },
  "Wall Tile":   { bg: "#f3e8ff", color: "#7c3aed" },
  "Outdoor":     { bg: "#dcfce7", color: "#16a34a" },
  "Vitrified":   { bg: "#fef9c3", color: "#ca8a04" },
  "default":     { bg: "#f0f4f8", color: "#64748b" },
};

const getCategoryStyle = (cat) =>
  CATEGORY_COLORS[cat] || CATEGORY_COLORS["default"];

/* ══════════════════════════════════════════════════════════════
   EDIT DIALOG  (unchanged logic)
══════════════════════════════════════════════════════════════ */
const EditDialog = ({ product, open, onClose, onSaved }) => {
  const [row, setRow] = useState({});
  const [imgPreview, setImgPreview] = useState("");

  useEffect(() => {
    if (!product) return;
    setRow({
      name:  product.name  || "",
      code:  product.code  || "",
      price: product.price || "",
      gst:   product.gst   ?? 0,
      stock: product.stock || "",
      size:  product.size  || "",
      uom:   product.uom   || "",
      category:         product.category         || "",
      brand:            product.brand            || "",
      hsnCode:          product.hsnCode          || "",
      dealerPrice:      product.dealerPrice      || "",
      contractorPrice:  product.contractorPrice  || "",
      purchasePrice:    product.purchasePrice    || "",
      minimumSellPrice: product.minimumSellPrice || "",
      mrpPerBox:        product.mrpPerBox        || "",
      stockBoxes:       product.stockBoxes       || "",
      coverageArea:     product.coverageArea     || "",
      reorderLevel:     product.reorderLevel     || "",
      minStockAlert:    product.minStockAlert    || "",
      rackLocation:     product.rackLocation     || "",
      notes:            product.notes            || "",
      image:            getImageSrc(product),
    });
    setImgPreview(getImageSrc(product));
  }, [product]);

  const set = (field) => (e) => {
    const val = e.target.value;
    setRow((r) => ({ ...r, [field]: val }));
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setRow((r) => ({ ...r, image: reader.result }));
      setImgPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!row.name || !row.code || !row.price || !row.stock || !row.uom) {
      toast.error("Name, Code, Price, Stock and UOM are required"); return;
    }
    try {
      await updateProduct(product._id, {
        ...row, totalPrice: calcTotalPrice(row.price, row.gst),
      });
      toast.success("Product updated ✅");
      onSaved();
      onClose();
    } catch { toast.error("Update failed"); }
  };

  if (!product) return null;

  const Fld = ({ label, field, type = "text", children, span }) => (
    <Box sx={{ gridColumn: span ? `span ${span}` : undefined }}>
      <Typography sx={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".5px", mb: "4px" }}>
        {label}
      </Typography>
      {children || (
        <TextField fullWidth size="small" type={type} sx={inpSx}
          value={row[field] ?? ""} onChange={set(field)} />
      )}
    </Box>
  );

  const Sec = ({ label }) => (
    <Box sx={{ gridColumn: "span 3", borderTop: `1px solid ${T.border}`, pt: 1.5, mt: 0.5 }}>
      <Typography sx={{ fontSize: 10, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: "1px" }}>{label}</Typography>
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: "12px", fontFamily: "'Noto Sans', sans-serif" } }}>
      <Box sx={{ background: `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`, px: 2.5, py: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography sx={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
          ✏️ Edit Product — {product.name}
        </Typography>
        <IconButton onClick={onClose} sx={{ color: "rgba(255,255,255,.8)" }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 2.5 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
          <Box sx={{ gridRow: "span 3", display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".5px", alignSelf: "flex-start" }}>Product Image</Typography>
            <Box component="label" htmlFor="edit-img" sx={{
              width: "100%", aspectRatio: "1", borderRadius: "10px",
              border: `2px dashed ${T.border}`, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden", background: "#f8fafc",
              "&:hover": { borderColor: T.primary, background: T.primaryLight },
              transition: "all .15s",
            }}>
              {imgPreview
                ? <Box component="img" src={imgPreview} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <Box sx={{ textAlign: "center", color: T.muted }}>
                    <AddPhotoAlternateIcon sx={{ fontSize: 32, mb: 0.5, opacity: 0.4 }} />
                    <Typography sx={{ fontSize: 11 }}>Click to upload</Typography>
                  </Box>
              }
            </Box>
            <input id="edit-img" type="file" accept="image/*" hidden onChange={handleImage} />
          </Box>

          <Fld label="Product Name *" field="name" />
          <Fld label="Product Code *" field="code" />
          <Fld label="Category" field="category" />
          <Fld label="Brand" field="brand" />
          <Fld label="HSN Code" field="hsnCode" />
          <Fld label="Size" field="size" />

          <Sec label="Pricing" />
          <Fld label="Base Price (₹) *" field="price" type="number" />
          <Fld label="GST %" field="gst">
            <TextField select fullWidth size="small" sx={inpSx} value={row.gst ?? 0} onChange={set("gst")}>
              {GST_OPTIONS.map((g) => <MenuItem key={g} value={g}>{g}%</MenuItem>)}
            </TextField>
          </Fld>
          <Fld label="Total Price (incl. GST)">
            <Box sx={{ px: 1.2, py: 0.8, borderRadius: "6px", background: "#f0f4f8", border: `1.5px solid ${T.border}`, fontSize: 13, fontWeight: 700, color: T.primary, fontFamily: "'Rajdhani', sans-serif" }}>
              ₹{calcTotalPrice(row.price, row.gst).toFixed(2)}
            </Box>
          </Fld>
          <Fld label="Dealer Price (₹)" field="dealerPrice" type="number" />
          <Fld label="Contractor Price (₹)" field="contractorPrice" type="number" />
          <Fld label="Purchase Price (₹)" field="purchasePrice" type="number" />
          <Fld label="Minimum Sell Price (₹)" field="minimumSellPrice" type="number" />
          <Fld label="MRP per Box (₹)" field="mrpPerBox" type="number" />

          <Sec label="Stock & Inventory" />
          <Fld label="Stock (sqft/unit) *" field="stock" type="number" />
          <Fld label="Stock (Boxes)" field="stockBoxes" type="number" />
          <Fld label="UOM *" field="uom">
            <TextField select fullWidth size="small" sx={inpSx} value={row.uom || ""} onChange={set("uom")}>
              {UOM_OPTIONS.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
            </TextField>
          </Fld>
          <Fld label="Coverage Area (sqft/box)" field="coverageArea" type="number" />
          <Fld label="Tiles per Box" field="tilesPerBox" type="number" />
          <Fld label="Rack Location" field="rackLocation" />
          <Fld label="Reorder Level" field="reorderLevel" type="number" />
          <Fld label="Min Stock Alert" field="minStockAlert" type="number" />

          <Sec label="Notes" />
          <Fld label="Internal Notes" field="notes" span={3}>
            <TextField fullWidth multiline rows={2} size="small" sx={inpSx} value={row.notes || ""} onChange={set("notes")} />
          </Fld>
        </Box>

        <Box sx={{ display: "flex", gap: 1, mt: 2.5, justifyContent: "flex-end" }}>
          <Box onClick={onClose} sx={{ px: 2, py: 1, borderRadius: "7px", cursor: "pointer", border: `1.5px solid ${T.border}`, color: T.text, fontSize: 13, fontWeight: 600, "&:hover": { borderColor: T.primary, color: T.primary, background: T.primaryLight } }}>
            Cancel
          </Box>
          <Box onClick={handleSave} sx={{ px: 2.5, py: 1, borderRadius: "7px", cursor: "pointer", background: T.success, color: "#fff", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: "6px", "&:hover": { background: "#146038" } }}>
            <SaveIcon sx={{ fontSize: 16 }} /> Save Changes
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

/* ══════════════════════════════════════════════════════════════
   VIEW DIALOG
══════════════════════════════════════════════════════════════ */
const ViewDialog = ({ product: p, open, onClose, onEdit }) => {
  if (!p) return null;
  const img        = getImageSrc(p);
  const totalPrice = Number(p.totalPrice ?? calcTotalPrice(p.price, p.gst));
  const gstAmt     = Number(((p.price || 0) * (p.gst || 0) / 100).toFixed(2));

  const Row = ({ label, value, color }) => value !== undefined && value !== "" && (
    <Box sx={{ display: "flex", gap: 1, py: 0.7, borderBottom: `1px solid ${T.border}` }}>
      <Typography sx={{ fontSize: 11, color: T.muted, minWidth: 140, flexShrink: 0, textTransform: "uppercase", letterSpacing: ".4px", fontWeight: 600 }}>{label}</Typography>
      <Typography sx={{ fontSize: 13, fontWeight: 500, color: color || T.dark }}>{value}</Typography>
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: "12px", overflow: "hidden" } }}>
      <Box sx={{ background: `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`, px: 2.5, py: 2, display: "flex", gap: 2, alignItems: "center" }}>
        <Box sx={{ width: 52, height: 52, borderRadius: "10px", overflow: "hidden", background: "rgba(255,255,255,.15)", border: "2px solid rgba(255,255,255,.25)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {img ? <Box component="img" src={img} sx={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <InventoryIcon sx={{ color: "rgba(255,255,255,.5)" }} />}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{p.name}</Typography>
          <Box sx={{ display: "flex", gap: 0.8, mt: 0.5, flexWrap: "wrap" }}>
            {p.code && <Box sx={{ fontSize: 10, px: 0.8, py: "1px", borderRadius: "4px", background: "rgba(255,255,255,.2)", color: "#fff", fontWeight: 700 }}>{p.code.toUpperCase()}</Box>}
            {p.category && <Box sx={{ fontSize: 10, px: 0.8, py: "1px", borderRadius: "4px", background: "rgba(255,255,255,.15)", color: "rgba(255,255,255,.85)", fontWeight: 600 }}>{p.category}</Box>}
          </Box>
        </Box>
        <IconButton onClick={onClose} sx={{ color: "rgba(255,255,255,.8)" }}><CloseIcon /></IconButton>
      </Box>

      <Box sx={{ display: "flex", borderBottom: `1px solid ${T.border}`, background: "#fafbfc" }}>
        {[
          { label: "Base Price",  val: fmtPrice(p.price),    color: T.text    },
          { label: "GST Amount",  val: fmtPrice(gstAmt),     color: T.warning },
          { label: "Total Price", val: fmtPrice(totalPrice), color: T.primary },
          { label: "Stock",       val: `${p.stock || 0} ${p.uom || ""}`, color: Number(p.stock) < 10 ? T.danger : T.success },
        ].map((s, i) => (
          <Box key={i} sx={{ flex: 1, px: 1.5, py: 1.2, textAlign: "center", borderRight: i < 3 ? `1px solid ${T.border}` : "none" }}>
            <Typography sx={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: ".4px", fontWeight: 600, mb: 0.3 }}>{s.label}</Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 800, color: s.color, fontFamily: "'Rajdhani', sans-serif" }}>{s.val}</Typography>
          </Box>
        ))}
      </Box>

      <DialogContent sx={{ p: 2 }}>
        <Row label="Brand"            value={p.brand} />
        <Row label="HSN Code"         value={p.hsnCode} />
        <Row label="Size"             value={p.size} />
        <Row label="GST %"            value={p.gst !== undefined ? `${p.gst}%` : undefined} />
        <Row label="Dealer Price"     value={p.dealerPrice     > 0 ? fmtPrice(p.dealerPrice)      : undefined} />
        <Row label="Contractor Price" value={p.contractorPrice > 0 ? fmtPrice(p.contractorPrice)  : undefined} />
        <Row label="Purchase Price"   value={p.purchasePrice   > 0 ? fmtPrice(p.purchasePrice)    : undefined} />
        <Row label="Min Sell Price"   value={p.minimumSellPrice > 0 ? fmtPrice(p.minimumSellPrice) : undefined} />
        <Row label="MRP per Box"      value={p.mrpPerBox       > 0 ? fmtPrice(p.mrpPerBox)        : undefined} />
        <Row label="Stock (Boxes)"    value={p.stockBoxes > 0  ? `${p.stockBoxes} boxes`          : undefined} />
        <Row label="Coverage Area"    value={p.coverageArea > 0 ? `${p.coverageArea} sqft/box`    : undefined} />
        <Row label="Tiles per Box"    value={p.tilesPerBox > 0  ? p.tilesPerBox                   : undefined} />
        <Row label="Reorder Level"    value={p.reorderLevel > 0 ? p.reorderLevel                  : undefined} />
        <Row label="Min Stock Alert"  value={p.minStockAlert !== undefined ? p.minStockAlert       : undefined} />
        <Row label="Rack Location"    value={p.rackLocation} />
        {p.isSupplierItem && <Row label="Supplier" value={p.supplierName} color={T.purple} />}
        {p.notes && <Row label="Notes" value={p.notes} />}

        <Box sx={{ display: "flex", gap: 1, mt: 2, justifyContent: "flex-end" }}>
          <Box onClick={onClose} sx={{ px: 2, py: 0.8, borderRadius: "7px", cursor: "pointer", border: `1.5px solid ${T.border}`, color: T.text, fontSize: 13, fontWeight: 600, "&:hover": { borderColor: T.primary, color: T.primary } }}>Close</Box>
          <Box onClick={() => { onClose(); onEdit(p); }} sx={{ px: 2, py: 0.8, borderRadius: "7px", cursor: "pointer", background: T.primary, color: "#fff", fontSize: 13, fontWeight: 600, "&:hover": { background: T.primaryDark } }}>✏️ Edit</Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
const ProductDetails = () => {
  const navigate = useNavigate();
  const [products,    setProducts]    = useState([]);
  const [search,      setSearch]      = useState("");
  const [tab,         setTab]         = useState("all");
  const [stockF,      setStockF]      = useState("all");
  const [categoryF,   setCategoryF]   = useState("all");
  const [brandF,      setBrandF]      = useState("all");
  const [sortBy,      setSortBy]      = useState("name");
  const [viewProduct, setViewProduct] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: "", name: "" });

  const fetchProducts = async () => {
    try {
      const res = await getProducts();
      setProducts(res.data);
    } catch { toast.error("Failed to load products"); }
    finally  { setLoading(false); }
  };

  useEffect(() => { fetchProducts(); }, []);

  const askDelete = (id, name) => setConfirmDelete({ open: true, id, name });

  const handleDelete = async () => {
    try { await deleteProduct(confirmDelete.id); toast.success("Deleted"); fetchProducts(); }
    catch { toast.error("Delete failed"); }
    finally { setConfirmDelete({ open: false, id: "", name: "" }); }
  };

  const categories = useMemo(() => {
    const cats = [...new Set(products.map((p) => p.category).filter(Boolean))];
    return cats.sort();
  }, [products]);

  const brands = useMemo(() => {
    const bs = [...new Set(products.map((p) => p.brand).filter(Boolean))];
    return bs.sort();
  }, [products]);

  const filtered = useMemo(() => {
    let list = [...products];
    const q  = search.toLowerCase().trim();
    if (q) list = list.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.code || "").toLowerCase().includes(q) ||
      (p.supplierName || "").toLowerCase().includes(q) ||
      (p.category || "").toLowerCase().includes(q) ||
      (p.brand || "").toLowerCase().includes(q)
    );
    if (tab === "own")       list = list.filter((p) => !p.isSupplierItem);
    if (tab === "supplier")  list = list.filter((p) =>  p.isSupplierItem);
    if (stockF === "low")    list = list.filter((p) => Number(p.stock || 0) < 10);
    if (stockF === "ok")     list = list.filter((p) => Number(p.stock || 0) >= 10);
    if (categoryF !== "all") list = list.filter((p) => p.category === categoryF);
    if (brandF !== "all")    list = list.filter((p) => p.brand === brandF);

    list.sort((a, b) => {
      if (sortBy === "price_asc")  return (a.price || 0) - (b.price || 0);
      if (sortBy === "price_desc") return (b.price || 0) - (a.price || 0);
      if (sortBy === "stock")      return (a.stock || 0) - (b.stock || 0);
      if (sortBy === "newest")     return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      return (a.name || "").localeCompare(b.name || "");
    });
    return list;
  }, [products, search, tab, stockF, categoryF, brandF, sortBy]);

  const lowStock = products.filter((p) => Number(p.stock || 0) < 10).length;

  const selStyle = {
    padding: "5px 10px",
    border: `1.5px solid ${T.border}`,
    borderRadius: "7px",
    fontFamily: "'Noto Sans', sans-serif",
    fontSize: 12,
    color: T.text,
    background: T.white,
    outline: "none",
    cursor: "pointer",
    height: 32,
  };

  /* ── Table column definitions ── */
  const COL_WIDTHS = "50px 1.4fr 100px 80px 65px 80px 95px 95px 80px 90px 55px 90px";

  const TH = ({ children, align = "left" }) => (
    <Typography sx={{
      fontSize: 11, fontWeight: 700, color: T.muted,
      textTransform: "uppercase", letterSpacing: ".6px",
      textAlign: align,
    }}>
      {children}
    </Typography>
  );

  /* ── Stock status badge ── */
  const StockBadge = ({ stock, reorder }) => {
    const isLow = Number(stock || 0) < Math.max(Number(reorder || 0), 10);
    return (
      <Box sx={{
        display: "inline-flex", alignItems: "center", gap: "5px",
        px: "10px", py: "4px", borderRadius: "20px",
        background: isLow ? "#fff1f0" : "#f0faf4",
        border: `1px solid ${isLow ? "#fca5a5" : "#6ee7b7"}`,
        fontSize: 11, fontWeight: 700,
        color: isLow ? T.danger : T.success,
        whiteSpace: "nowrap",
      }}>
        {isLow ? "⚠" : "✓"} {isLow ? "Low" : "OK"}
      </Box>
    );
  };

  /* ── Table row ── */
  const TableRow = ({ p, idx }) => {
    const totalPrice = Number(p.totalPrice ?? calcTotalPrice(p.price, p.gst));
    const catStyle   = getCategoryStyle(p.category);
    const stock      = Number(p.stock || 0);
    const isLow      = stock < Math.max(Number(p.reorderLevel || 0), 10);

    return (
      <Box
        onClick={() => setViewProduct(p)}
        sx={{
          display: "grid",
          gridTemplateColumns: COL_WIDTHS,
          gap: "6px",
          alignItems: "center",
          px: 2,
          py: "9px",
          borderBottom: `1px solid ${T.border}`,
          background: idx % 2 === 0 ? T.white : "#fafbfd",
          cursor: "pointer",
          transition: "background .12s",
          "&:hover": { background: "#f0f6ff" },
        }}
      >
        {/* SKU */}
        <Typography sx={{ fontSize: 10, fontWeight: 700, color: T.muted, fontFamily: "'DM Mono', monospace" }}>
          {p.code || "—"}
        </Typography>

        {/* Tile Name */}
        <Box>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: T.dark, lineHeight: 1.3 }}>
            {p.name}
          </Typography>
          {p.brand && (
            <Typography sx={{ fontSize: 10, color: T.muted, mt: 0.1 }}>
              {p.brand}
            </Typography>
          )}
        </Box>

        {/* Category */}
        <Box>
          {p.category ? (
            <Box sx={{
              display: "inline-block", px: "6px", py: "2px", borderRadius: "4px",
              background: catStyle.bg, color: catStyle.color,
              fontSize: 10, fontWeight: 700,
            }}>
              {p.category}
            </Box>
          ) : <Typography sx={{ fontSize: 11, color: T.muted }}>—</Typography>}
        </Box>

        {/* Brand */}
        <Typography sx={{ fontSize: 11, color: T.dark, fontWeight: 500 }}>
          {p.brand || "—"}
        </Typography>

        {/* Size */}
        <Typography sx={{ fontSize: 11, color: T.dark, fontWeight: 600 }}>
          {p.size || "—"}
        </Typography>

        {/* Finish */}
        <Typography sx={{ fontSize: 11, color: T.muted }}>
          {p.finish || p.rackLocation || "—"}
        </Typography>

        {/* Retail Price */}
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: T.dark, fontFamily: "'Rajdhani', sans-serif" }}>
          {fmtPrice(totalPrice)}/{p.uom || "sqft"}
        </Typography>

        {/* Dealer Price */}
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: "'Rajdhani', sans-serif" }}>
          {p.dealerPrice > 0 ? `${fmtPrice(p.dealerPrice)}/${p.uom || "sqft"}` : "—"}
        </Typography>

        {/* Cost Price */}
        <Typography sx={{ fontSize: 11, color: T.muted, fontFamily: "'Rajdhani', sans-serif" }}>
          {p.purchasePrice > 0 ? fmtPrice(p.purchasePrice) : "—"}
        </Typography>

        {/* Stock (sqft) */}
        <Typography sx={{
          fontSize: 12, fontWeight: 700,
          color: isLow ? T.danger : T.dark,
          fontFamily: "'Rajdhani', sans-serif",
        }}>
          {fmt(stock)} sqft
        </Typography>

        {/* Boxes */}
        <Typography sx={{ fontSize: 11, color: T.text, fontWeight: 500, textAlign: "center" }}>
          {p.stockBoxes || "—"}
        </Typography>

        {/* Actions */}
        <Box onClick={(e) => e.stopPropagation()} sx={{ display: "flex", flexDirection: "column", gap: "3px", alignItems: "flex-start" }}>
          <Box
            onClick={(e) => { e.stopPropagation(); navigate('/products/add', { state: { editProduct: p } }); }}
            sx={{
              display: "inline-flex", alignItems: "center", gap: "3px",
              px: "7px", py: "2px", borderRadius: "4px",
              border: `1px solid ${T.border}`, cursor: "pointer",
              fontSize: 10, fontWeight: 600, color: T.primary,
              background: T.white,
              "&:hover": { background: T.primaryLight, borderColor: T.primary },
              transition: "all .12s",
            }}
          >
            <EditIcon sx={{ fontSize: 10 }} /> Edit
          </Box>
          <Box
            onClick={(e) => { e.stopPropagation(); askDelete(p._id, p.name); }}
            sx={{
              display: "inline-flex", alignItems: "center", gap: "3px",
              px: "7px", py: "2px", borderRadius: "4px",
              border: `1px solid ${T.border}`, cursor: "pointer",
              fontSize: 10, fontWeight: 600, color: T.danger,
              background: T.white,
              "&:hover": { background: T.dangerLight, borderColor: T.danger },
              transition: "all .12s",
            }}
          >
            <DeleteIcon sx={{ fontSize: 10 }} /> Delete
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ fontFamily: "'Noto Sans', sans-serif", background: T.bg, minHeight: "100vh", p: 2 }}>

      {/* ── Page header ── */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
          <Box sx={{ fontSize: 22 }}>🧱</Box>
          <Typography sx={{ fontSize: 20, fontWeight: 800, color: T.dark }}>
            Tile Stock Register
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Box
            sx={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              px: 2, py: 1, borderRadius: "8px",
              border: `1.5px solid ${T.border}`, cursor: "pointer",
              fontSize: 13, fontWeight: 600, color: T.text, background: T.white,
              "&:hover": { borderColor: T.primary, color: T.primary, background: T.primaryLight },
              transition: "all .13s",
            }}
          >
            <FileDownloadIcon sx={{ fontSize: 16 }} /> Export
          </Box>
          <Box
            onClick={() => navigate('/products/add')}
            sx={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              px: 2.5, py: 1, borderRadius: "8px",
              background: T.primary, cursor: "pointer",
              fontSize: 13, fontWeight: 700, color: "#fff",
              "&:hover": { background: T.primaryDark },
              transition: "background .13s",
            }}
          >
            <AddIcon sx={{ fontSize: 16 }} /> Add Tile
          </Box>
        </Box>
      </Box>

      {/* ── Filters bar ── */}
      <Box sx={{
        display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap",
        mb: 1.5,
      }}>
        {/* Search */}
        <Box sx={{ position: "relative" }}>
          <Box sx={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.muted, pointerEvents: "none", display: "flex" }}>
            <SearchIcon sx={{ fontSize: 16 }} />
          </Box>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tile, SKU, brand..."
            style={{ ...selStyle, paddingLeft: 32, minWidth: 220 }}
            onFocus={(e) => { e.target.style.borderColor = T.primary; }}
            onBlur={(e)  => { e.target.style.borderColor = T.border; }}
          />
        </Box>

        {/* Category filter */}
        <select style={selStyle} value={categoryF} onChange={(e) => setCategoryF(e.target.value)}>
          <option value="all">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Brand filter */}
        <select style={selStyle} value={brandF} onChange={(e) => setBrandF(e.target.value)}>
          <option value="all">All Brands</option>
          {brands.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>

        {/* Stock filter */}
        <select style={selStyle} value={stockF} onChange={(e) => setStockF(e.target.value)}>
          <option value="all">All Stock</option>
          <option value="low">Low Stock</option>
          <option value="ok">In Stock</option>
        </select>

        {/* Sort */}
        <select style={selStyle} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="name">Sort: Name</option>
          <option value="price_asc">Price ↑</option>
          <option value="price_desc">Price ↓</option>
          <option value="stock">Low Stock</option>
          <option value="newest">Newest</option>
        </select>

        <Typography sx={{ fontSize: 12, color: T.muted, ml: "auto" }}>
          {filtered.length} of {products.length} product{products.length !== 1 ? "s" : ""}
        </Typography>
      </Box>

      {/* ── Table ── */}
      <Box sx={{
        background: T.white,
        borderRadius: "12px",
        border: `1px solid ${T.border}`,
        boxShadow: "0 1px 4px rgba(0,0,0,.05)",
        overflow: "hidden",
      }}>
        {/* Table header */}
        <Box sx={{
          display: "grid",
          gridTemplateColumns: COL_WIDTHS,
          gap: "6px",
          px: 2,
          py: "9px",
          background: "#f8fafc",
          borderBottom: `2px solid ${T.border}`,
        }}>
          <TH>SKU</TH>
          <TH>Tile Name</TH>
          <TH>Category</TH>
          <TH>Brand</TH>
          <TH>Size</TH>
          <TH>Finish</TH>
          <TH>Retail Price</TH>
          <TH>Dealer Price</TH>
          <TH>Cost Price</TH>
          <TH>Stock(sqft)</TH>
          <TH align="center">Boxes</TH>
          <TH>Actions</TH>
        </Box>

        {/* Table body */}
        {loading ? (
          <Box sx={{ p: 6, textAlign: "center", color: T.muted, fontSize: 13 }}>
            Loading products...
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ p: 8, textAlign: "center" }}>
            <Box sx={{ fontSize: 44, mb: 2, opacity: 0.15 }}>🧱</Box>
            <Typography sx={{ color: T.muted, fontSize: 13 }}>No products match your filters</Typography>
          </Box>
        ) : (
          filtered.map((p, idx) => (
            <TableRow key={p._id} p={p} idx={idx} />
          ))
        )}

        {/* Footer summary */}
        {!loading && filtered.length > 0 && (
          <Box sx={{
            px: 2, py: 1.2,
            borderTop: `2px solid ${T.border}`,
            background: "#f8fafc",
            display: "flex", gap: 3, alignItems: "center",
          }}>
            <Typography sx={{ fontSize: 12, color: T.muted }}>
              <Box component="span" sx={{ fontWeight: 700, color: T.dark }}>{filtered.length}</Box> products shown
            </Typography>
            {lowStock > 0 && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box sx={{ width: 7, height: 7, borderRadius: "50%", background: T.danger }} />
                <Typography sx={{ fontSize: 12, color: T.danger, fontWeight: 600 }}>
                  {lowStock} low stock
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>

      <ViewDialog
        product={viewProduct}
        open={!!viewProduct}
        onClose={() => setViewProduct(null)}
        onEdit={(p) => { setViewProduct(null); navigate('/products/add', { state: { editProduct: p } }); }}
      />

      <ConfirmDialog
        open={confirmDelete.open}
        title="Delete Product"
        message={`Are you sure you want to delete "${confirmDelete.name}"?`}
        confirmText="Delete"
        danger
        onClose={() => setConfirmDelete({ open: false, id: "", name: "" })}
        onConfirm={handleDelete}
      />
    </Box>
  );
};

export default ProductDetails;
