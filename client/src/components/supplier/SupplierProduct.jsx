import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { getSuppliers, createPurchase, updatePurchase } from "../../services/supplierService";
import { getProducts } from "../../services/productService";
import toast from "react-hot-toast";

/* ── Design tokens — unified with CustomerPayments / Reports / Settings ── */
const T = {
  primary:      "#1a56a0",
  primaryDark:  "#0f3d7a",
  primaryLight: "#eef4fd",
  success:      "#15803d",
  successLight: "#f0fdf4",
  danger:       "#b91c1c",
  dangerLight:  "#fef2f2",
  warning:      "#92400e",
  warningLight: "#fef3c7",
  dark:         "#0f172a",
  text:         "#1e293b",
  muted:        "#64748b",
  faint:        "#94a3b8",
  border:       "#dde3ed",
  borderLight:  "#e8eef6",
  bg:           "#f1f5f9",
  surface:      "#ffffff",
  surfaceAlt:   "#f8fafc",
};

/* ── Zero-radius input base ── */
const inputBase = {
  padding: "8px 10px",
  border: `1px solid ${T.border}`,
  borderRadius: 0,
  fontFamily: "'Noto Sans', sans-serif",
  fontSize: 13,
  color: T.text,
  background: T.surface,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  transition: "border-color .14s, box-shadow .14s",
  lineHeight: 1.5,
};

const selBase = { ...inputBase, cursor: "pointer", appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", paddingRight: 30,
};

const onFocus = e => { e.target.style.borderColor = T.primary; e.target.style.boxShadow = "0 0 0 3px rgba(26,86,160,.08)"; };
const onBlur  = e => { e.target.style.borderColor = T.border;  e.target.style.boxShadow = "none"; };

/* ── Field label ── */
const Lbl = ({ children, req }) => (
  <div style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 5, whiteSpace: "nowrap" }}>
    {children}{req && <span style={{ color: T.danger }}> *</span>}
  </div>
);

/* ── Section heading with left accent ── */
const SectionHead = ({ icon, title, badge }) => (
  <Box sx={{ px: 2.5, py: 1.4, borderBottom: `2px solid ${T.primary}`, background: `linear-gradient(to right, ${T.primaryLight}, ${T.surface})`, display: "flex", alignItems: "center", gap: 1 }}>
    {icon && <Box sx={{ fontSize: 15, lineHeight: 1 }}>{icon}</Box>}
    <Typography sx={{ fontSize: 13, fontWeight: 800, color: T.dark, flex: 1 }}>{title}</Typography>
    {badge && (
      <Box sx={{ px: 1.2, py: "2px", background: T.primaryLight, border: `1px solid #c3d9f5`, fontSize: 11, fontWeight: 700, color: T.primary }}>
        {badge}
      </Box>
    )}
  </Box>
);

/* ── Info grid cell ── */
const InfoCell = ({ label, value, accent, last }) => (
  <Box sx={{ px: 2, py: 1.4, borderRight: last ? "none" : `1px solid ${T.border}`, borderLeft: accent ? `3px solid ${T.primary}` : "none" }}>
    <Typography sx={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: ".07em", mb: 0.4, fontWeight: 700 }}>{label}</Typography>
    <Typography sx={{ fontSize: 13.5, fontWeight: accent ? 700 : 500, color: accent ? T.primary : T.text }}>{value}</Typography>
  </Box>
);

/* ── Summary cell ── */
const SumCell = ({ label, value, accent, last }) => (
  <Box sx={{ px: 2, py: 1.4, borderRight: last ? "none" : `1px solid ${T.border}`, background: accent ? T.primaryLight : T.surfaceAlt, borderLeft: accent ? `3px solid ${T.primary}` : "none" }}>
    <Typography sx={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: ".07em", mb: 0.4, fontWeight: 700 }}>{label}</Typography>
    <Typography sx={{ fontSize: accent ? 16 : 14, fontWeight: 800, color: accent ? T.primary : T.dark, fontFamily: "'DM Mono', monospace" }}>{value}</Typography>
  </Box>
);

/* ── Action button ── */
const Btn = ({ children, onClick, disabled, variant = "primary" }) => {
  const variants = {
    primary: { bg: T.success, color: "#fff",    border: "none",                    hover: "#166534" },
    draft:   { bg: T.surface, color: T.text,    border: `1px solid ${T.border}`,   hover: T.warningLight, hoverColor: T.warning, hoverBorder: T.warning },
    cancel:  { bg: T.surface, color: T.muted,   border: `1px solid ${T.border}`,   hover: T.dangerLight,  hoverColor: T.danger,  hoverBorder: T.danger  },
  };
  const v = variants[variant];
  return (
    <Box
      onClick={!disabled ? onClick : undefined}
      sx={{
        display: "inline-flex", alignItems: "center", gap: "6px",
        px: 2.2, py: "9px", fontSize: 13, fontWeight: 700,
        cursor: disabled ? "default" : "pointer", userSelect: "none",
        background: disabled ? "#e2e8f0" : v.bg, color: disabled ? T.faint : v.color,
        border: v.border || "none", opacity: disabled ? 0.7 : 1,
        transition: "all .14s",
        "&:hover": !disabled ? { background: v.hover, color: v.hoverColor || v.color, borderColor: v.hoverBorder } : {},
      }}
    >
      {children}
    </Box>
  );
};

/* ── GRN & date helpers ── */
const genGRN  = () => `GRN-${new Date().getFullYear()}-${String(Date.now()).slice(-4).padStart(4, "0")}`;
const todayStr = () => new Date().toISOString().split("T")[0];

/* ── Constants ── */
const TILE_PRODUCTS = [
  "Italian Beige Matt 60×60","Kajaria Jazz Series 80×80","Somany Wall Gloss 30×60",
  "Nitco Designer Border 10×60","Johnson Vitrified 60×120","Kajaria Floor Rustic 45×45",
  "Orientbell Outdoor 60×60","Porcelain Polish 80×160","Spanish Ivory 60×60",
  "Carrara White Marble 60×60","Wooden Finish Plank 20×120","Subway Metro White 30×60",
];
const GST_OPTIONS = [
  "0% (Exempt)",
  "5% IGST (Inter-State)","5% CGST+SGST (Intra-State)",
  "12% IGST (Inter-State)","12% CGST+SGST (Intra-State)",
  "18% IGST (Inter-State)","18% CGST+SGST (Intra-State)",
  "28% IGST (Inter-State)","28% CGST+SGST (Intra-State)",
];
const STAFF            = ["Murugan (Owner)","Venkat (Manager)","Arjun (Store)","Priya (Accounts)","Rajan (Warehouse)"];
const QUALITY_OPTIONS  = ["✅ All OK","⚠️ Minor Issues — Accepted","⚠️ Partial Return","❌ Rejected — Full Return"];
const PAYMENT_OPTIONS  = ["Credit (Pay Later)","Cash on Delivery","Advance Paid","Partial Advance","Post-dated Cheque"];
const FINISH_OPTIONS   = ["Matt","Glossy","Polished","Satin","Rustic","Natural"];
const DEFAULT_BRAND_CHOICES = ["Kajaria","Somany","Nitco","Johnson","Orientbell","Asian Granito","Simpolo","RAK","Cera","Other"];

/* ── Row helpers ── */
let _rowId = 1;
const newRow  = () => ({ _id: _rowId++, category: "", productName: "", brand: "", finish: "", lengthCm: "", widthCm: "", piecesPerBox: "", ordered: "", received: "", sqft: "", costRate: "" });

const parseSize = (size = "") => { const [l = "", w = ""] = String(size).replace(/\s+/g, "").split(/[x×]/i); return { lengthCm: l, widthCm: w }; };
const parseList = (v) => { if (Array.isArray(v)) return v.map(x => String(x || "").trim()).filter(Boolean); if (typeof v === "string") return v.split(",").map(x => x.trim()).filter(Boolean); return []; };
const norm = v => String(v || "").trim().toLowerCase();
const num  = v => { const n = Number(v); return Number.isFinite(n) ? n : undefined; };
const pickText = (...vals) => vals.map(v => String(v || "").trim()).find(Boolean) || "";
const pickNumericText = (...vals) => {
  const nums = vals.map(num);
  const pos  = nums.find(n => n !== undefined && n > 0);
  if (pos !== undefined) return String(pos);
  const zero = nums.find(n => n === 0);
  if (zero !== undefined) return "0";
  return "";
};
const getSettingsBrands = () => {
  try { const s = JSON.parse(localStorage.getItem("productDefaults") || "{}"); return Array.isArray(s?.brands) && s.brands.length ? s.brands.map(b => String(b || "").trim()).filter(Boolean) : DEFAULT_BRAND_CHOICES; }
  catch { return DEFAULT_BRAND_CHOICES; }
};
const getSettingsCategories = () => {
  try { const s = JSON.parse(localStorage.getItem("productDefaults") || "{}"); return Array.isArray(s?.categories) ? s.categories.map(c => String(c || "").trim()).filter(Boolean) : []; }
  catch { return []; }
};
const toEditRow = (product, allProducts = []) => {
  const parsed = parseSize(product?.size || "");
  const match  = allProducts.find(p => norm(p?.name) === norm(product?.name));
  return {
    _id: _rowId++,
    category:     pickText(product?.category, match?.category),
    productName:  pickText(product?.name),
    brand:        pickText(product?.brand, match?.brand),
    finish:       pickText(product?.finish, match?.finish),
    lengthCm:     pickNumericText(product?.lengthCm, parsed.lengthCm, match?.lengthCm),
    widthCm:      pickNumericText(product?.widthCm, parsed.widthCm, match?.widthCm),
    piecesPerBox: pickNumericText(product?.piecesPerBox, product?.tilesPerBox, match?.tilesPerBox, match?.piecesPerBox),
    ordered:      pickNumericText(product?.ordered, product?.qty),
    received:     pickNumericText(product?.received, product?.qty, product?.ordered),
    sqft:         pickNumericText(product?.sqft),
    costRate:     pickNumericText(product?.price, match?.purchasePrice, match?.price),
  };
};
const onlyDigits  = v => String(v ?? "").replace(/[^\d]/g, "");
const onlyDecimal = v => { const c = String(v ?? "").replace(/[^0-9.]/g, ""); const [i, ...r] = c.split("."); return r.length ? `${i}.${r.join("")}` : i; };

/* ══════════════════════════════════════════════════════ */
const SupplierProduct = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const preselectedSupplier = location.state?.supplier    || null;
  const editPurchase        = location.state?.editPurchase || null;
  const editPurchaseId      = editPurchase?._id || editPurchase?.id || "";
  const isEditMode          = Boolean(editPurchaseId);

  const [suppliers,     setSuppliers]     = useState([]);
  const [allProducts,   setAllProducts]   = useState([]);
  const [supplierId,    setSupplierId]    = useState(location.state?.supplierId || editPurchase?.supplierId?._id || editPurchase?.supplierId || "");
  const [supplierQuery, setSupplierQuery] = useState("");
  const [grnNo]                           = useState(editPurchase?.grnNo || genGRN);
  const [invoiceNo,     setInvoiceNo]     = useState(editPurchase?.invoiceNo || "");
  const [grnDate,       setGrnDate]       = useState(editPurchase?.invoiceDate || todayStr());
  const [poRef,         setPoRef]         = useState(editPurchase?.poRef || "");
  const [vehicleNo,     setVehicleNo]     = useState(editPurchase?.vehicleNo || "");
  const [ewayBill,      setEwayBill]      = useState(editPurchase?.ewayBill || "");
  const [lotNo,         setLotNo]         = useState(editPurchase?.lotNo || "");
  const [receivedBy,    setReceivedBy]    = useState(editPurchase?.receivedBy || "Murugan (Owner)");
  const [rows,          setRows]          = useState(() =>
    Array.isArray(editPurchase?.products) && editPurchase.products.length > 0
      ? editPurchase.products.map(p => toEditRow(p, []))
      : [newRow()]
  );
  const [freight,       setFreight]       = useState(editPurchase?.freight != null ? String(editPurchase.freight) : "");
  const [gstOption,     setGstOption]     = useState(editPurchase?.gstOption || "18% CGST+SGST (Intra-State)");
  const [qualityStatus, setQualityStatus] = useState("✅ All OK");
  const [paymentStatus, setPaymentStatus] = useState(editPurchase?.paymentStatus || "Credit (Pay Later)");
  const [remarks,       setRemarks]       = useState(editPurchase?.remarks || "");
  const [saving,        setSaving]        = useState(false);

  /* ── Load data ── */
  useEffect(() => {
    Promise.all([getSuppliers(), getProducts()])
      .then(([sRes, pRes]) => {
        setSuppliers(Array.isArray(sRes.data) ? sRes.data : []);
        setAllProducts(Array.isArray(pRes.data) ? pRes.data : []);
      })
      .catch(() => toast.error("Failed to load data"));
  }, []);

  useEffect(() => {
    if (!editPurchase) return;
    setSupplierId(location.state?.supplierId || editPurchase?.supplierId?._id || editPurchase?.supplierId || "");
    setInvoiceNo(editPurchase.invoiceNo || "");
    setGrnDate(editPurchase.invoiceDate || todayStr());
    setPoRef(editPurchase.poRef || "");
    setVehicleNo(editPurchase.vehicleNo || "");
    setEwayBill(editPurchase.ewayBill || "");
    setLotNo(editPurchase.lotNo || "");
    setReceivedBy(editPurchase.receivedBy || "Murugan (Owner)");
    setRows(Array.isArray(editPurchase.products) && editPurchase.products.length > 0
      ? editPurchase.products.map(p => toEditRow(p, allProducts))
      : [newRow()]
    );
    setFreight(editPurchase.freight != null ? String(editPurchase.freight) : "");
    setGstOption(editPurchase.gstOption || "18% CGST+SGST (Intra-State)");
    setQualityStatus(editPurchase.qualityStatus || "All OK");
    setPaymentStatus(editPurchase.paymentStatus || "Credit (Pay Later)");
    setRemarks(editPurchase.remarks || "");
  }, [editPurchase, location.state?.supplierId, allProducts]);

  /* ── Supplier helpers ── */
  const selectedSupplier = suppliers.find(s => s._id === supplierId) || preselectedSupplier;
  const supplierPhone    = s => s.companyPhone || s.phone || s.supplierPhone || "";
  const supplierLabel    = s => { const loc = [s.city, s.state].filter(Boolean).join(", "); return `${s.companyName || s.name}${loc ? ` — ${loc}` : ""}`; };

  const matchSupplierByInput = val => {
    const needle = String(val || "").trim().toLowerCase();
    if (!needle) return null;
    const exact = suppliers.find(s => {
      const ph = supplierPhone(s), lb = supplierLabel(s), full = `${lb}${ph ? ` — ${ph}` : ""}`;
      return [lb, full, s.companyName, s.name, ph].filter(Boolean).some(v => String(v).toLowerCase() === needle);
    });
    if (exact) return exact;
    const partial = suppliers.filter(s => {
      const ph = supplierPhone(s), lb = supplierLabel(s);
      return [lb, s.companyName, s.name, ph].filter(Boolean).some(v => String(v).toLowerCase().includes(needle));
    });
    return partial.length === 1 ? partial[0] : null;
  };

  useEffect(() => {
    if (supplierId && selectedSupplier) {
      const ph = supplierPhone(selectedSupplier);
      setSupplierQuery(`${supplierLabel(selectedSupplier)}${ph ? ` — ${ph}` : ""}`);
    }
    if (!supplierId) setSupplierQuery("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId, selectedSupplier?._id]);

  /* ── Product option lists ── */
  const supplierItemNames       = (selectedSupplier?.items || []).map(i => i?.name?.trim()).filter(Boolean);
  const supplierCatalogSource   = Array.isArray(selectedSupplier?.productNames) ? selectedSupplier.productNames : typeof selectedSupplier?.productNames === "string" ? selectedSupplier.productNames.split(",") : Array.isArray(selectedSupplier?.productsSupplied) ? selectedSupplier.productsSupplied : typeof selectedSupplier?.productsSupplied === "string" ? selectedSupplier.productsSupplied.split(",") : [];
  const supplierBrandChoices    = [...new Set(parseList(selectedSupplier?.brands))];
  const supplierCategoryChoices = [...new Set(parseList(selectedSupplier?.categories).concat(parseList(selectedSupplier?.productsSupplied)))];
  const supplierCatalogNames    = supplierCatalogSource.map(n => String(n || "").trim()).filter(Boolean);
  const supplierLinkedProducts  = allProducts.filter(p => { const pid = p?.supplierId?._id || p?.supplierId; return p?.isSupplierItem && pid && String(pid) === String(supplierId); });
  const linkedProductNames      = supplierLinkedProducts.map(p => String(p?.name || "").trim()).filter(Boolean);
  const linkedBrands            = supplierLinkedProducts.map(p => String(p?.brand || "").trim()).filter(Boolean);
  const linkedCategories        = supplierLinkedProducts.map(p => String(p?.category || "").trim()).filter(Boolean);
  const globalProducts          = allProducts.map(p => String(p?.name || "").trim()).filter(Boolean);
  const globalBrands            = allProducts.map(p => String(p?.brand || "").trim()).filter(Boolean);
  const globalCategories        = allProducts.map(p => String(p?.category || "").trim()).filter(Boolean);

  const categoryChoices = [...new Set([...getSettingsCategories(), ...supplierCategoryChoices, ...linkedCategories, ...globalCategories])];
  const brandChoices    = [...new Set([...supplierBrandChoices, ...linkedBrands, ...globalBrands, ...getSettingsBrands()])];
  const productChoices  = supplierId
    ? [...new Set([...linkedProductNames, ...supplierItemNames, ...supplierCatalogNames, ...globalProducts])]
    : [...new Set([...globalProducts, ...TILE_PRODUCTS])];

  /* ── Row updater ── */
  const updRow = (id, field, val) => {
    setRows(prev => prev.map(r => {
      if (r._id !== id) return r;
      const next = { ...r, [field]: val };
      if (field === "productName") {
        const selName = String(val || "").trim().toLowerCase();
        const siMatch = (selectedSupplier?.items || []).find(item => String(item?.name || "").trim().toLowerCase() === selName);
        const slMatch = allProducts.find(p => { const pid = p?.supplierId?._id || p?.supplierId; return String(p?.name || "").trim().toLowerCase() === selName && p?.isSupplierItem && pid && String(pid) === String(supplierId); });
        const match   = slMatch || allProducts.find(p => String(p?.name || "").trim().toLowerCase() === selName);
        if (match) {
          next.category    = pickText(match?.category, siMatch?.category, next.category);
          next.brand       = match.brand || next.brand;
          next.finish      = match.finish || next.finish;
          if (!next.lengthCm && match.lengthCm)   next.lengthCm    = String(match.lengthCm);
          if (!next.widthCm  && match.widthCm)    next.widthCm     = String(match.widthCm);
          if (!next.piecesPerBox)                  next.piecesPerBox = String(match.tilesPerBox ?? match.piecesPerBox ?? "");
          if (!next.costRate && (match.purchasePrice || match.price)) next.costRate = String(match.purchasePrice || match.price);
        } else if (!next.brand && supplierBrandChoices.length === 1) next.brand = supplierBrandChoices[0];
        if (!next.category && supplierCategoryChoices.length === 1) next.category = supplierCategoryChoices[0];
      }
      if (["received","lengthCm","widthCm","piecesPerBox"].includes(field)) {
        const rcv = Number(field === "received"     ? val : r.received)     || 0;
        const len = Number(field === "lengthCm"     ? val : r.lengthCm)     || 0;
        const wid = Number(field === "widthCm"      ? val : r.widthCm)      || 0;
        const pcs = Number(field === "piecesPerBox" ? val : r.piecesPerBox) || 0;
        if (len > 0 && wid > 0 && pcs > 0 && rcv > 0) {
          const sqftPer = (len * wid) / 929.03;
          const total   = (sqftPer * pcs * rcv).toFixed(1);
          if (!isNaN(total)) next.sqft = total;
        }
      }
      return next;
    }));
  };

  const addRow    = () => setRows(p => [...p, newRow()]);
  const removeRow = id => setRows(p => p.filter(r => r._id !== id));

  /* ── Inline edit highlight state ── */
  const [editingRowId, setEditingRowId] = useState(null);

  /* ── Totals ── */
  const subtotal   = rows.reduce((s, r) => s + (Number(r.sqft) || 0) * (Number(r.costRate) || 0), 0);
  const gstPct     = parseFloat(gstOption) || 0;
  const gstAmt     = (subtotal * gstPct) / 100;
  const freightAmt = Number(freight) || 0;
  const grandTotal = subtotal + gstAmt + freightAmt;
  const fmt        = v => v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /* ── Save ── */
  const handleSave = async (isDraft = false) => {
    if (!supplierId) { toast.error("Please select a supplier"); return; }
    if (!invoiceNo)  { toast.error("Supplier Invoice No. is required"); return; }
    const valid = rows.filter(r => r.productName && r.received);
    if (!valid.length) { toast.error("Add at least one item with product and received qty"); return; }
    const payload = {
      supplierId, supplierName: selectedSupplier?.companyName || selectedSupplier?.name || "",
      grnNo, invoiceNo, invoiceDate: grnDate, poRef, vehicleNo, ewayBill, lotNo, receivedBy,
      qualityStatus, paymentStatus: isDraft ? "Draft" : paymentStatus, remarks, isDraft,
      products: valid.map(r => ({
        name: r.productName, category: r.category || "", brand: r.brand || "", finish: r.finish || "",
        lengthCm: Number(r.lengthCm) || 0, widthCm: Number(r.widthCm) || 0,
        size: `${r.lengthCm || 0}x${r.widthCm || 0}`,
        piecesPerBox: Number(r.piecesPerBox) || 0, tilesPerBox: Number(r.piecesPerBox) || 0,
        ordered: Number(r.ordered) || 0, received: Number(r.received) || 0,
        diff: (Number(r.ordered) || 0) - (Number(r.received) || 0),
        sqft: Number(r.sqft) || 0, price: Number(r.costRate) || 0,
        qty: Number(r.received) || 0, unit: "Box",
      })),
      subtotal, freight: freightAmt, gstOption, gstPct, gstAmt, grandTotal, totalInvoiceAmount: grandTotal,
    };
    setSaving(true);
    try {
      if (isEditMode) await updatePurchase(editPurchaseId, payload);
      else await createPurchase(payload);
      toast.success(isDraft ? "Draft saved ✅" : "Purchase saved & stock updated ✅");
      if (isEditMode) navigate("/suppliers");
      else navigate("/suppliers/payment", { state: { supplierId, supplier: selectedSupplier } });
    } catch (err) {
      toast.error(err?.response?.data?.error || "Save failed");
    } finally { setSaving(false); }
  };

  /* ── Table column config ── */
  const cols = [
    { h: "#",            w: "2%"  },
    { h: "Product Name", w: "16%" },
    { h: "Category",     w: "9%"  },
    { h: "Brand",        w: "8%"  },
    { h: "Finish",       w: "6%"  },
    { h: "L × B (cm)",   w: "10%" },
    { h: "Pcs/Box",      w: "5%"  },
    { h: "Ordered",      w: "5%"  },
    { h: "Received",     w: "6%"  },
    { h: "Diff",         w: "4%"  },
    { h: "Sqft",         w: "6%"  },
    { h: "Rate ₹/sqft",  w: "8%"  },
    { h: "Amount ₹",     w: "8%"  },
    { h: "Actions",      w: "7%"  },
  ];

  /* ── Filtered rows for table ── */
  const filteredRows = rows;

  /* ════════════════════════════════════════════ RENDER ════ */
  return (
    <Box sx={{ background: T.bg, minHeight: "100%", p: 0, fontFamily: "'Noto Sans', sans-serif" }}>

      {/* ── Page header ── */}
      <Box sx={{ px: 3, py: 1.8, background: T.surface, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
        <Box>
          <Typography sx={{ fontSize: 20, fontWeight: 800, color: T.dark, lineHeight: 1.2, letterSpacing: "-.01em" }}>
            {isEditMode ? "Edit Purchase Entry" : "Purchase Entry"}
          </Typography>
          <Typography sx={{ fontSize: 12, color: T.muted, mt: 0.2 }}>Goods Receipt Note (GRN)</Typography>
        </Box>
        <Box sx={{ fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700, color: T.primary, background: T.primaryLight, border: `1px solid #c3d9f5`, px: 1.5, py: 0.6, letterSpacing: "1.5px" }}>
          {grnNo}
        </Box>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pb: 3 }}>

        {/* ── Supplier banner ── */}
        {selectedSupplier && (
          <Box sx={{ border: `1px solid ${T.border}`, display: "grid", gridTemplateColumns: "repeat(3,1fr)", overflow: "hidden", background: T.surfaceAlt }}>
            <InfoCell label="Supplier" value={selectedSupplier.companyName || selectedSupplier.name} accent />
            <InfoCell label="Contact"  value={selectedSupplier.supplierName || selectedSupplier.companyPhone || selectedSupplier.phone || "—"} />
            <InfoCell label="Terms"    value={selectedSupplier.paymentTerms || "Net 30 Days"} last />
          </Box>
        )}

        {/* ── GRN Details card ── */}
        <Box sx={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: "0 1px 3px rgba(15,23,42,.06)", overflow: "hidden" }}>
          {/* Header with Add Supplier button */}
          <Box sx={{ px: 2.5, py: 1.4, borderBottom: `2px solid ${T.primary}`, background: `linear-gradient(to right, ${T.primaryLight}, ${T.surface})`, display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ fontSize: 15, lineHeight: 1 }}>📋</Box>
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: T.dark, flex: 1 }}>GRN Details</Typography>
            <Box
              onClick={() => navigate("/suppliers/create")}
              sx={{
                display: "inline-flex", alignItems: "center", gap: "5px",
                px: 1.6, py: "6px", fontSize: 12, fontWeight: 700,
                cursor: "pointer", userSelect: "none",
                border: `1px solid ${T.primary}`,
                background: T.primary, color: "#fff",
                "&:hover": { background: T.primaryDark, borderColor: T.primaryDark },
                transition: "all .13s",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 2v12M2 8h12" strokeLinecap="round"/>
              </svg>
              Add Supplier
            </Box>
          </Box>
          <Box sx={{ p: 2.5 }}>

            {/* Row 1 */}
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px", mb: "14px" }}>
              <Box>
                <Lbl req>Supplier</Lbl>
                <input
                  style={inputBase} list="supplier-list"
                  placeholder="Type supplier name or phone…"
                  value={supplierQuery}
                  onChange={e => {
                    const v = e.target.value;
                    setSupplierQuery(v);
                    const m = matchSupplierByInput(v);
                    if (m) setSupplierId(m._id);
                    if (!v) setSupplierId("");
                  }}
                  onFocus={onFocus} onBlur={onBlur}
                />
                <datalist id="supplier-list">
                  {suppliers.map(s => { const ph = supplierPhone(s); return <option key={s._id} value={`${supplierLabel(s)}${ph ? ` — ${ph}` : ""}`} />; })}
                </datalist>
              </Box>
              <Box>
                <Lbl req>Supplier Invoice No.</Lbl>
                <input style={inputBase} placeholder="KAJ/2026/1234" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} onFocus={onFocus} onBlur={onBlur} />
              </Box>
              <Box>
                <Lbl req>GRN Date</Lbl>
                <input type="date" style={inputBase} value={grnDate} onChange={e => setGrnDate(e.target.value)} onFocus={onFocus} onBlur={onBlur} />
              </Box>
              <Box>
                <Lbl>PO Reference No.</Lbl>
                <input style={inputBase} placeholder="PO-2026-042" value={poRef} onChange={e => setPoRef(e.target.value)} onFocus={onFocus} onBlur={onBlur} />
              </Box>
            </Box>

            {/* Row 2 */}
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px" }}>
              <Box>
                <Lbl>Vehicle / Lorry No.</Lbl>
                <input style={inputBase} placeholder="TN 33 CD 5678" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} onFocus={onFocus} onBlur={onBlur} />
              </Box>
              <Box>
                <Lbl>E-Way Bill No.</Lbl>
                <input style={inputBase} placeholder="341234567891" value={ewayBill} onChange={e => setEwayBill(e.target.value)} onFocus={onFocus} onBlur={onBlur} />
              </Box>
              <Box>
                <Lbl>Lot / Batch No.</Lbl>
                <input style={inputBase} placeholder="LOT-2026-018" value={lotNo} onChange={e => setLotNo(e.target.value)} onFocus={onFocus} onBlur={onBlur} />
              </Box>
              <Box>
                <Lbl>Received By</Lbl>
                <select style={selBase} value={receivedBy} onChange={e => setReceivedBy(e.target.value)} onFocus={onFocus} onBlur={onBlur}>
                  {STAFF.map(s => <option key={s}>{s}</option>)}
                </select>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* ── Items table card ── */}
        <Box sx={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: "0 1px 3px rgba(15,23,42,.06)", overflow: "hidden" }}>
          <SectionHead icon="📦" title="Items Received" badge={`${rows.length} ${rows.length === 1 ? "row" : "rows"}`} />

          <Box sx={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1160 }}>
              <thead>
                <tr style={{ background: T.primary }}>
                  {cols.map(({ h, w }) => (
                    <th key={h || "del"} style={{ width: w, padding: "10px 9px", textAlign: "left", fontSize: 10.5, fontWeight: 700, color: "#fff", fontFamily: "'Noto Sans', sans-serif", borderRight: "1px solid rgba(255,255,255,.12)", whiteSpace: "nowrap", letterSpacing: ".05em", textTransform: "uppercase" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={cols.length} style={{ padding: "32px 16px", textAlign: "center", color: T.faint, fontSize: 13, fontFamily: "'Noto Sans', sans-serif" }}>
                      No items added yet.
                    </td>
                  </tr>
                ) : filteredRows.map((row, idx) => {
                  const diff      = row.ordered !== "" && row.received !== "" ? (Number(row.ordered) || 0) - (Number(row.received) || 0) : null;
                  const amount    = (Number(row.sqft) || 0) * (Number(row.costRate) || 0);
                  const isEditing = editingRowId === row._id;
                  const rowBg     = isEditing ? T.primaryLight : idx % 2 === 0 ? T.surface : T.surfaceAlt;

                  return (
                    <tr key={row._id}
                      style={{ borderBottom: `1px solid ${T.borderLight}`, background: rowBg, borderLeft: isEditing ? `3px solid ${T.primary}` : "3px solid transparent", transition: "background .1s" }}
                      onMouseEnter={e => { if (!isEditing) e.currentTarget.style.background = T.primaryLight; }}
                      onMouseLeave={e => { if (!isEditing) e.currentTarget.style.background = rowBg; }}
                    >
                      {/* # */}
                      <td style={{ padding: "7px 9px", textAlign: "center" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: T.faint }}>{idx + 1}</span>
                      </td>

                      {/* Product Name */}
                      <td style={{ padding: "6px 7px" }}>
                        <input list={`prod-${row._id}`} style={{ ...inputBase, fontSize: 12, padding: "6px 8px" }}
                          placeholder="Select or type…" value={row.productName}
                          onChange={e => updRow(row._id, "productName", e.target.value)}
                          onFocus={onFocus} onBlur={onBlur} />
                        <datalist id={`prod-${row._id}`}>{productChoices.map(p => <option key={p} value={p} />)}</datalist>
                      </td>

                      {/* Category */}
                      <td style={{ padding: "6px 7px" }}>
                        <select style={{ ...selBase, fontSize: 12, padding: "6px 8px" }} value={row.category || ""} onChange={e => updRow(row._id, "category", e.target.value)} onFocus={onFocus} onBlur={onBlur}>
                          <option value="">Select</option>
                          {categoryChoices.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>

                      {/* Brand */}
                      <td style={{ padding: "6px 7px" }}>
                        <select style={{ ...selBase, fontSize: 12, padding: "6px 8px" }} value={row.brand || ""} onChange={e => updRow(row._id, "brand", e.target.value)} onFocus={onFocus} onBlur={onBlur}>
                          <option value="">Select</option>
                          {brandChoices.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </td>

                      {/* Finish */}
                      <td style={{ padding: "6px 7px" }}>
                        <select style={{ ...selBase, fontSize: 12, padding: "6px 8px" }} value={row.finish || ""} onChange={e => updRow(row._id, "finish", e.target.value)} onFocus={onFocus} onBlur={onBlur}>
                          <option value="">Select</option>
                          {FINISH_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </td>

                      {/* Size L × B */}
                      <td style={{ padding: "6px 7px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <input type="text" inputMode="decimal" pattern="[0-9.]*"
                            style={{ ...inputBase, fontSize: 12, padding: "6px 4px", textAlign: "center", width: 52, minWidth: 52 }}
                            placeholder="L" value={row.lengthCm}
                            onChange={e => updRow(row._id, "lengthCm", onlyDecimal(e.target.value))}
                            onFocus={onFocus} onBlur={onBlur} />
                          <span style={{ fontSize: 11, color: T.faint, fontWeight: 700, flexShrink: 0 }}>×</span>
                          <input type="text" inputMode="decimal" pattern="[0-9.]*"
                            style={{ ...inputBase, fontSize: 12, padding: "6px 4px", textAlign: "center", width: 52, minWidth: 52 }}
                            placeholder="B" value={row.widthCm}
                            onChange={e => updRow(row._id, "widthCm", onlyDecimal(e.target.value))}
                            onFocus={onFocus} onBlur={onBlur} />
                        </div>
                      </td>

                      {/* Pcs/Box */}
                      <td style={{ padding: "6px 7px" }}>
                        <input type="text" inputMode="numeric" pattern="[0-9]*"
                          style={{ ...inputBase, fontSize: 12, padding: "6px 5px", textAlign: "center" }}
                          placeholder="4" value={row.piecesPerBox}
                          onChange={e => updRow(row._id, "piecesPerBox", onlyDigits(e.target.value))}
                          onFocus={onFocus} onBlur={onBlur} />
                      </td>

                      {/* Ordered */}
                      <td style={{ padding: "6px 7px" }}>
                        <input type="text" inputMode="numeric" pattern="[0-9]*"
                          style={{ ...inputBase, fontSize: 12, padding: "6px 5px", textAlign: "center" }}
                          placeholder="50" value={row.ordered}
                          onChange={e => updRow(row._id, "ordered", onlyDigits(e.target.value))}
                          onFocus={onFocus} onBlur={onBlur} />
                      </td>

                      {/* Received */}
                      <td style={{ padding: "6px 7px" }}>
                        <input type="text" inputMode="numeric" pattern="[0-9]*"
                          style={{ ...inputBase, fontSize: 12, padding: "6px 5px", textAlign: "center" }}
                          placeholder="50" value={row.received}
                          onChange={e => updRow(row._id, "received", onlyDigits(e.target.value))}
                          onFocus={onFocus} onBlur={onBlur} />
                      </td>

                      {/* Diff */}
                      <td style={{ padding: "6px 7px" }}>
                        {diff !== null ? (
                          <div style={{ padding: "6px 6px", textAlign: "center", fontWeight: 700, fontSize: 12, fontFamily: "'DM Mono', monospace", background: diff === 0 ? T.successLight : diff > 0 ? T.warningLight : T.dangerLight, color: diff === 0 ? T.success : diff > 0 ? T.warning : T.danger, border: `1px solid ${diff === 0 ? "#bbf7d0" : diff > 0 ? "#fde68a" : "#fecaca"}` }}>
                            {diff > 0 ? `+${diff}` : diff}
                          </div>
                        ) : <div style={{ textAlign: "center", color: T.border, fontSize: 14 }}>—</div>}
                      </td>

                      {/* Sqft */}
                      <td style={{ padding: "6px 7px" }}>
                        <input type="text" inputMode="decimal" pattern="[0-9.]*"
                          style={{ ...inputBase, fontSize: 12, padding: "6px 5px" }}
                          placeholder="108" value={row.sqft}
                          onChange={e => updRow(row._id, "sqft", onlyDecimal(e.target.value))}
                          onFocus={onFocus} onBlur={onBlur} />
                      </td>

                      {/* Cost Rate */}
                      <td style={{ padding: "6px 7px" }}>
                        <input type="text" inputMode="decimal" pattern="[0-9.]*"
                          style={{ ...inputBase, fontSize: 12, padding: "6px 5px" }}
                          placeholder="62.00" value={row.costRate}
                          onChange={e => updRow(row._id, "costRate", onlyDecimal(e.target.value))}
                          onFocus={onFocus} onBlur={onBlur} />
                      </td>

                      {/* Amount */}
                      <td style={{ padding: "6px 7px" }}>
                        <div style={{ padding: "7px 8px", textAlign: "right", fontWeight: 700, fontSize: 13, fontFamily: "'DM Mono', monospace", background: amount > 0 ? T.primaryLight : T.surfaceAlt, color: amount > 0 ? T.primary : T.faint, border: `1px solid ${amount > 0 ? "#c3d9f5" : T.border}`, minHeight: 33, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                          {amount > 0 ? `₹${amount.toLocaleString("en-IN")}` : "—"}
                        </div>
                      </td>

                      {/* Actions: Edit / Delete icons */}
                      <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          {/* Edit icon button */}
                          <Box
                            onClick={() => setEditingRowId(isEditing ? null : row._id)}
                            title={isEditing ? "Done editing" : "Edit row"}
                            sx={{
                              width: 28, height: 28,
                              display: "inline-flex", alignItems: "center", justifyContent: "center",
                              cursor: "pointer",
                              border: `1px solid ${isEditing ? T.primary : T.border}`,
                              background: isEditing ? T.primaryLight : T.surface,
                              color: isEditing ? T.primary : T.muted,
                              "&:hover": { borderColor: T.primary, color: T.primary, background: T.primaryLight },
                              transition: "all .12s",
                            }}
                          >
                            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                              <path d="M11 2l3 3L5 14H2v-3L11 2z" strokeLinejoin="round"/>
                            </svg>
                          </Box>
                          {/* Delete icon button */}
                          {rows.length > 1 && (
                            <Box
                              onClick={() => { removeRow(row._id); if (editingRowId === row._id) setEditingRowId(null); }}
                              title="Delete row"
                              sx={{
                                width: 28, height: 28,
                                display: "inline-flex", alignItems: "center", justifyContent: "center",
                                cursor: "pointer",
                                border: `1px solid ${T.border}`,
                                background: T.surface, color: T.faint,
                                "&:hover": { borderColor: T.danger, color: T.danger, background: T.dangerLight },
                                transition: "all .12s",
                              }}
                            >
                              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                                <path d="M2 4h12M6 4V2h4v2M5 4l1 10h4l1-10" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </Box>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Box>

          {/* + Add Item footer */}
          <Box sx={{ px: 2, py: 1.2, borderTop: `1px solid ${T.border}`, background: T.surfaceAlt }}>
            <Box onClick={addRow} sx={{ display: "inline-flex", alignItems: "center", gap: "6px", px: 1.8, py: "7px", cursor: "pointer", border: `1px solid ${T.border}`, background: T.surface, fontSize: 13, fontWeight: 600, color: T.text, "&:hover": { borderColor: T.primary, color: T.primary, background: T.primaryLight }, transition: "all .14s" }}>
              + Add Item
            </Box>
          </Box>
        </Box>

        {/* ── Charges & Settings card ── */}
        <Box sx={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: "0 1px 3px rgba(15,23,42,.06)", overflow: "hidden" }}>
          <SectionHead icon="🧾" title="Charges & Settings" />
          <Box sx={{ p: 2.5 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px", mb: "14px" }}>
              <Box>
                <Lbl>Freight / Transport (₹)</Lbl>
                <input type="text" inputMode="decimal" pattern="[0-9.]*"
                  style={inputBase} placeholder="0"
                  value={freight} onChange={e => setFreight(onlyDecimal(e.target.value))}
                  onFocus={onFocus} onBlur={onBlur} />
              </Box>
              <Box>
                <Lbl>GST on Purchase</Lbl>
                <select style={selBase} value={gstOption} onChange={e => setGstOption(e.target.value)} onFocus={onFocus} onBlur={onBlur}>
                  {GST_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </Box>
              <Box>
                <Lbl>Quality Check Status</Lbl>
                <select style={selBase} value={qualityStatus} onChange={e => setQualityStatus(e.target.value)} onFocus={onFocus} onBlur={onBlur}>
                  {QUALITY_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </Box>
              <Box>
                <Lbl>Payment Status</Lbl>
                <select style={selBase} value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} onFocus={onFocus} onBlur={onBlur}>
                  {PAYMENT_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </Box>
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "14px" }}>
              <Box>
                <Lbl>Remarks</Lbl>
                <input style={inputBase} placeholder="Any special notes…" value={remarks} onChange={e => setRemarks(e.target.value)} onFocus={onFocus} onBlur={onBlur} />
              </Box>
              <Box>
                <Lbl>Total Invoice Amount (₹)</Lbl>
                <div style={{ ...inputBase, background: grandTotal > 0 ? T.primaryLight : T.surfaceAlt, fontFamily: "'DM Mono', monospace", fontWeight: 800, fontSize: 15, color: grandTotal > 0 ? T.primary : T.faint, border: `1px solid ${grandTotal > 0 ? "#c3d9f5" : T.border}`, display: "flex", alignItems: "center", cursor: "default" }}>
                  {grandTotal > 0 ? `₹${fmt(grandTotal)}` : "Auto-calculated"}
                </div>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* ── GST summary strip ── */}
        {grandTotal > 0 && (
          <Box sx={{ border: `1px solid ${T.border}`, display: "grid", gridTemplateColumns: "repeat(4,1fr)", overflow: "hidden" }}>
            <SumCell label="Subtotal"           value={`₹${fmt(subtotal)}`}   />
            <SumCell label={`GST (${gstPct}%)`} value={`₹${fmt(gstAmt)}`}    />
            <SumCell label="Freight"             value={`₹${fmt(freightAmt)}`} />
            <SumCell label="Grand Total"         value={`₹${fmt(grandTotal)}`} accent last />
          </Box>
        )}

        {/* ── Action buttons ── */}
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", pt: 0.5 }}>
          <Btn onClick={() => handleSave(false)} disabled={saving} variant="primary">
            {saving ? "Saving…" : "✅ Save & Update Stock"}
          </Btn>
          <Btn onClick={() => handleSave(true)} disabled={saving} variant="draft">
            📋 Save Draft
          </Btn>
          <Btn onClick={() => navigate("/suppliers")} variant="cancel">
            Cancel
          </Btn>
        </Box>

      </Box>
    </Box>
  );
};

export default SupplierProduct;