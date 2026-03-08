import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { getSuppliers, createPurchase, updatePurchase } from "../../services/supplierService";
import { getProducts } from "../../services/productService";
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
  dark:         "#1c2333",
  text:         "#2d3748",
  muted:        "#718096",
  border:       "#e2e8f0",
  bg:           "#f0f4f8",
  white:        "#fff",
};

/* ── Input base style ───────────────────────────────────────── */
const inp = (extra = {}) => ({
  padding: "8px 10px",
  border: `1.5px solid ${T.border}`,
  borderRadius: "6px",
  fontFamily: "'Noto Sans', sans-serif",
  fontSize: 13,
  color: T.text,
  background: T.white,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  transition: "border-color .15s, box-shadow .15s",
  ...extra,
});

const onFocus = (e) => {
  e.target.style.borderColor = T.primary;
  e.target.style.boxShadow   = "0 0 0 3px rgba(26,86,160,.08)";
};
const onBlur = (e) => {
  e.target.style.borderColor = T.border;
  e.target.style.boxShadow   = "none";
};

/* ── Field label ────────────────────────────────────────────── */
const Lbl = ({ children, req }) => (
  <Box component="label" sx={{
    display: "block", fontSize: 11, fontWeight: 700, color: T.muted,
    textTransform: "uppercase", letterSpacing: ".6px", mb: "5px",
    fontFamily: "'Noto Sans', sans-serif", whiteSpace: "nowrap",
  }}>
    {children}{req && <Box component="span" sx={{ color: T.danger }}> *</Box>}
  </Box>
);

/* ── GRN number generator ───────────────────────────────────── */
const genGRN = () => {
  const y   = new Date().getFullYear();
  const seq = String(Date.now()).slice(-4);
  return `GRN-${y}-${seq.padStart(4,"0")}`;
};
const todayStr = () => new Date().toISOString().split("T")[0];

/* ── Tile product options ───────────────────────────────────── */
const TILE_PRODUCTS = [
  "Italian Beige Matt 60×60","Kajaria Jazz Series 80×80",
  "Somany Wall Gloss 30×60","Nitco Designer Border 10×60",
  "Johnson Vitrified 60×120","Kajaria Floor Rustic 45×45",
  "Orientbell Outdoor 60×60","Porcelain Polish 80×160",
  "Spanish Ivory 60×60","Carrara White Marble 60×60",
  "Wooden Finish Plank 20×120","Subway Metro White 30×60",
];

const SIZES = [
  "30×30","30×45","30×60","40×40","45×45","60×60",
  "60×90","60×120","80×80","80×160","Customised",
];

const GST_OPTIONS = [
  "0% (Exempt)",
  "5% IGST (Inter-State)","5% CGST+SGST (Intra-State)",
  "12% IGST (Inter-State)","12% CGST+SGST (Intra-State)",
  "18% IGST (Inter-State)","18% CGST+SGST (Intra-State)",
  "28% IGST (Inter-State)","28% CGST+SGST (Intra-State)",
];

const STAFF = [
  "Murugan (Owner)","Venkat (Manager)","Arjun (Store)",
  "Priya (Accounts)","Rajan (Warehouse)",
];

const QUALITY_OPTIONS = [
  "✅ All OK",
  "⚠️ Minor Issues — Accepted",
  "⚠️ Partial Return",
  "❌ Rejected — Full Return",
];

const PAYMENT_OPTIONS = [
  "Credit (Pay Later)",
  "Cash on Delivery",
  "Advance Paid",
  "Partial Advance",
  "Post-dated Cheque",
];

const FINISH_OPTIONS = ["Matt", "Glossy", "Polished", "Satin", "Rustic", "Natural"];

/* ── Blank row factory ──────────────────────────────────────── */
let _rowId = 1;
const newRow = () => ({
  _id:         _rowId++,
  productName: "",
  finish:      "",
  lengthCm:    "",
  widthCm:     "",
  piecesPerBox:"",
  ordered:     "",
  received:    "",
  sqft:        "",
  costRate:    "",
});

const parseSize = (size = "") => {
  const [l = "", w = ""] = String(size).replace(/\s+/g, "").split(/[x×]/i);
  return { lengthCm: l, widthCm: w };
};

/* ══════════════════════════════════════════════════════════════
   Main Component
══════════════════════════════════════════════════════════════ */
const SupplierProduct = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedSupplier = location.state?.supplier || null;
  const editPurchase = location.state?.editPurchase || null;
  const isEditMode = Boolean(editPurchase?._id);

  /* ── Header fields ── */
  const [suppliers,     setSuppliers]     = useState([]);
  const [allProducts,   setAllProducts]   = useState([]);
  const [supplierId,    setSupplierId]    = useState(location.state?.supplierId || editPurchase?.supplierId?._id || editPurchase?.supplierId || "");
  const [grnNo]                           = useState(editPurchase?.grnNo || genGRN);
  const [invoiceNo,     setInvoiceNo]     = useState(editPurchase?.invoiceNo || "");
  const [grnDate,       setGrnDate]       = useState(editPurchase?.invoiceDate || todayStr());
  const [poRef,         setPoRef]         = useState(editPurchase?.poRef || "");
  const [vehicleNo,     setVehicleNo]     = useState(editPurchase?.vehicleNo || "");
  const [ewayBill,      setEwayBill]      = useState(editPurchase?.ewayBill || "");
  const [lotNo,         setLotNo]         = useState(editPurchase?.lotNo || "");
  const [receivedBy,    setReceivedBy]    = useState(editPurchase?.receivedBy || "Murugan (Owner)");

  /* ── Items rows ── */
  const [rows, setRows] = useState(() => (
    Array.isArray(editPurchase?.products) && editPurchase.products.length > 0
      ? editPurchase.products.map((product) => ({
          _id: _rowId++,
          productName: product.name || "",
          finish: product.finish || "",
          lengthCm: String(product.lengthCm ?? parseSize(product.size).lengthCm ?? ""),
          widthCm: String(product.widthCm ?? parseSize(product.size).widthCm ?? ""),
          piecesPerBox: String(product.piecesPerBox ?? product.tilesPerBox ?? ""),
          ordered: product.ordered ?? product.qty ?? "",
          received: product.received ?? product.qty ?? "",
          sqft: product.sqft ?? "",
          costRate: product.price ?? "",
        }))
      : [newRow()]
  ));

  /* ── Bottom fields ── */
  const [freight,       setFreight]       = useState(
    editPurchase?.freight !== undefined && editPurchase?.freight !== null
      ? String(editPurchase.freight)
      : ""
  );
  const [gstOption,     setGstOption]     = useState(editPurchase?.gstOption || "18% CGST+SGST (Intra-State)");
  const [qualityStatus, setQualityStatus] = useState("✅ All OK");
  const [paymentStatus, setPaymentStatus] = useState(editPurchase?.paymentStatus || "Credit (Pay Later)");
  const [remarks,       setRemarks]       = useState(editPurchase?.remarks || "");

  const [saving, setSaving] = useState(false);

  /* ── Load suppliers ── */
  useEffect(() => {
    Promise.all([getSuppliers(), getProducts()])
      .then(([supplierRes, productRes]) => {
        setSuppliers(Array.isArray(supplierRes.data) ? supplierRes.data : []);
        setAllProducts(Array.isArray(productRes.data) ? productRes.data : []);
      })
      .catch(() => toast.error("Failed to load suppliers"));
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
    setRows(
      Array.isArray(editPurchase.products) && editPurchase.products.length > 0
        ? editPurchase.products.map((product) => ({
            _id: _rowId++,
            productName: product.name || "",
            finish: product.finish || "",
            lengthCm: String(product.lengthCm ?? parseSize(product.size).lengthCm ?? ""),
            widthCm: String(product.widthCm ?? parseSize(product.size).widthCm ?? ""),
            piecesPerBox: String(product.piecesPerBox ?? product.tilesPerBox ?? ""),
            ordered: product.ordered ?? product.qty ?? "",
            received: product.received ?? product.qty ?? "",
            sqft: product.sqft ?? "",
            costRate: product.price ?? "",
          }))
        : [newRow()]
    );
    setFreight(
      editPurchase.freight !== undefined && editPurchase.freight !== null
        ? String(editPurchase.freight)
        : ""
    );
    setGstOption(editPurchase.gstOption || "18% CGST+SGST (Intra-State)");
    setQualityStatus(editPurchase.qualityStatus || "All OK");
    setPaymentStatus(editPurchase.paymentStatus || "Credit (Pay Later)");
    setRemarks(editPurchase.remarks || "");
  }, [editPurchase, location.state?.supplierId]);

  const selectedSupplier =
    suppliers.find((supplier) => supplier._id === supplierId) || preselectedSupplier;

  /* ── Row update helper ── */
  const updRow = (id, field, val) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r._id !== id) return r;
        const next = { ...r, [field]: val };

        if (field === "productName") {
          const match = allProducts.find(
            (product) => String(product?.name || "").trim().toLowerCase() === String(val || "").trim().toLowerCase()
          );
          if (match) {
            next.finish = match.finish || next.finish;
            if (!next.lengthCm && match.lengthCm) next.lengthCm = String(match.lengthCm);
            if (!next.widthCm && match.widthCm) next.widthCm = String(match.widthCm);
            if (!next.piecesPerBox) next.piecesPerBox = String(match.tilesPerBox ?? match.piecesPerBox ?? "");
            if (!next.costRate && (match.purchasePrice || match.price)) {
              next.costRate = String(match.purchasePrice || match.price);
            }
          }
        }

        // Auto-calculate sqft when length, breadth, pieces and received are filled
        if (field === "received" || field === "lengthCm" || field === "widthCm" || field === "piecesPerBox") {
          const rcv = Number(field === "received" ? val : r.received) || 0;
          const len = Number(field === "lengthCm" ? val : r.lengthCm) || 0;
          const wid = Number(field === "widthCm" ? val : r.widthCm) || 0;
          const pcs = Number(field === "piecesPerBox" ? val : r.piecesPerBox) || 0;
          if (len > 0 && wid > 0 && pcs > 0 && rcv > 0) {
            const cm2 = len * wid;
            const sqftPer = cm2 / 929.03;
            const totalSqft = (sqftPer * pcs * rcv).toFixed(1);
            if (!isNaN(totalSqft)) next.sqft = totalSqft;
          }
        }
        return next;
      })
    );
  };

  const addRow    = () => setRows((p) => [...p, newRow()]);
  const removeRow = (id) => setRows((p) => p.filter((r) => r._id !== id));

  /* ── Totals ── */
  const subtotal   = rows.reduce((s, r) => s + (Number(r.sqft) || 0) * (Number(r.costRate) || 0), 0);
  const gstPct     = parseFloat(gstOption) || 0;
  const gstAmt     = (subtotal * gstPct) / 100;
  const freightAmt = Number(freight) || 0;
  const grandTotal = subtotal + gstAmt + freightAmt;

  /* ── Submit ── */
  const handleSave = async (isDraft = false) => {
    if (!supplierId) { toast.error("Please select a supplier");               return; }
    if (!invoiceNo)  { toast.error("Supplier Invoice No. is required");        return; }
    const valid = rows.filter((r) => r.productName && r.received);
    if (!valid.length) { toast.error("Add at least one item with product and received qty"); return; }

    const payload = {
      supplierId,
      supplierName:       selectedSupplier?.companyName || selectedSupplier?.name || "",
      grnNo,
      invoiceNo,
      invoiceDate:        grnDate,
      poRef,
      vehicleNo,
      ewayBill,
      lotNo,
      receivedBy,
      qualityStatus,
      paymentStatus:      isDraft ? "Draft" : paymentStatus,
      remarks,
      isDraft,
      products: valid.map((r) => ({
        name:     r.productName,
        finish: r.finish || "",
        lengthCm: Number(r.lengthCm) || 0,
        widthCm:  Number(r.widthCm) || 0,
        size:     `${r.lengthCm || 0}x${r.widthCm || 0}`,
        piecesPerBox: Number(r.piecesPerBox) || 0,
        tilesPerBox: Number(r.piecesPerBox) || 0,
        ordered:  Number(r.ordered)  || 0,
        received: Number(r.received) || 0,
        diff:     (Number(r.ordered) || 0) - (Number(r.received) || 0),
        sqft:     Number(r.sqft)     || 0,
        price:    Number(r.costRate) || 0,
        qty:      Number(r.received) || 0,
        unit:     "Box",
      })),
      subtotal,
      freight:            freightAmt,
      gstOption,
      gstPct,
      gstAmt,
      grandTotal,
      totalInvoiceAmount: grandTotal,
    };

    setSaving(true);
    try {
      if (isEditMode) {
        await updatePurchase(editPurchase._id, payload);
      } else {
        await createPurchase(payload);
      }
      toast.success(isDraft ? "Draft saved ✅" : "Purchase saved & stock updated ✅");
      navigate("/suppliers/payment", {
        state: {
          supplierId,
          supplier: selectedSupplier,
        },
      });
    } catch (err) {
      toast.error(err?.response?.data?.error || "Save failed");
    } finally { setSaving(false); }
  };

  /* ── Supplier display label ── */
  const supplierLabel = (s) => {
    const loc = [s.city, s.state].filter(Boolean).join(", ");
    return `${s.companyName || s.name}${loc ? ` — ${loc}` : ""}`;
  };

  const supplierItemNames = (selectedSupplier?.items || [])
    .map((item) => item?.name?.trim())
    .filter(Boolean);
  const supplierCatalogNames = (selectedSupplier?.productsSupplied || [])
    .map((name) => String(name || "").trim())
    .filter(Boolean);
  const supplierLinkedProductNames = allProducts
    .filter((product) => {
      const pid = product?.supplierId?._id || product?.supplierId;
      return product?.isSupplierItem && pid && String(pid) === String(supplierId);
    })
    .map((product) => String(product?.name || "").trim())
    .filter(Boolean);

  const productChoices = supplierId
    ? [...new Set([
        ...supplierLinkedProductNames,
        ...supplierItemNames,
        ...supplierCatalogNames,
      ])]
    : TILE_PRODUCTS;

  const sel = (extra = {}) => ({ ...inp(extra), cursor: "pointer", appearance: "auto" });

  /* ════════════════════════════════════════════════════════════ */
  return (
    <Box sx={{ fontFamily: "'Noto Sans', sans-serif", background: T.bg, minHeight: "100%", p: 0 }}>
      <Box sx={{
        background: T.white, borderRadius: "10px",
        border: `1px solid ${T.border}`, boxShadow: "0 1px 4px rgba(0,0,0,.06)",
        overflow: "hidden",
      }}>

        {/* ── Card Header ── */}
        <Box sx={{
          px: 2.5, py: 1.8, borderBottom: `1px solid ${T.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: T.dark, display: "flex", alignItems: "center", gap: 1 }}>
            <Box component="span" sx={{ fontSize: 16 }}>🚛</Box>
            Purchase Entry / Goods Receipt Note (GRN)
          </Typography>
          {/* GRN badge — top right, blue, monospace */}
          <Box sx={{
            fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700,
            color: T.primary, background: T.primaryLight,
            px: 1.5, py: 0.5, borderRadius: "6px", letterSpacing: "1.5px",
          }}>
            {grnNo}
          </Box>
        </Box>

        <Box sx={{ p: 2.5 }}>
          {selectedSupplier && (
            <Box sx={{ mb: 2, p: 2, border: `1px solid ${T.border}`, borderRadius: "8px", background: "#fafbfc", display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 2 }}>
              <Box>
                <Typography sx={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: ".5px", mb: 0.4 }}>
                  Supplier
                </Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: T.dark }}>
                  {selectedSupplier.companyName || selectedSupplier.name}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: ".5px", mb: 0.4 }}>
                  Contact
                </Typography>
                <Typography sx={{ fontSize: 13, color: T.text }}>
                  {selectedSupplier.supplierName || selectedSupplier.companyPhone || selectedSupplier.phone || "-"}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: ".5px", mb: 0.4 }}>
                  Terms
                </Typography>
                <Typography sx={{ fontSize: 13, color: T.text }}>
                  {selectedSupplier.paymentTerms || "Net 30 Days"}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: ".5px", mb: 0.4 }}>
                  Suggested Products
                </Typography>
                <Typography sx={{ fontSize: 13, color: T.text }}>
                  {(selectedSupplier.productsSupplied || []).slice(0, 2).join(", ") || "-"}
                </Typography>
              </Box>
            </Box>
          )}

          {/* ════ ROW 1 — Supplier · Invoice No · Date · PO Ref ════ */}
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "14px", mb: "14px" }}>

            {/* Supplier */}
            <Box>
              <Lbl req>Supplier</Lbl>
              <select style={sel()} value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                onFocus={onFocus} onBlur={onBlur}>
                <option value="">— Select Supplier —</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>{supplierLabel(s)}</option>
                ))}
              </select>
            </Box>

            {/* Supplier Invoice No. */}
            <Box>
              <Lbl req>Supplier Invoice No.</Lbl>
              <input style={inp()} placeholder="KAJ/2026/1234"
                value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)}
                onFocus={onFocus} onBlur={onBlur} />
            </Box>

            {/* Receipt / GRN Date */}
            <Box>
              <Lbl req>Receipt / GRN Date</Lbl>
              <input type="date" style={inp()}
                value={grnDate} onChange={(e) => setGrnDate(e.target.value)}
                onFocus={onFocus} onBlur={onBlur} />
            </Box>

            {/* PO Reference No. */}
            <Box>
              <Lbl>PO Reference No.</Lbl>
              <input style={inp()} placeholder="PO-2026-042"
                value={poRef} onChange={(e) => setPoRef(e.target.value)}
                onFocus={onFocus} onBlur={onBlur} />
            </Box>
          </Box>

          {/* ════ ROW 2 — Vehicle · E-Way · Lot / Batch · Received By ════ */}
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "14px", mb: "22px" }}>

            <Box>
              <Lbl>Vehicle / Lorry No.</Lbl>
              <input style={inp()} placeholder="TN 33 CD 5678"
                value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)}
                onFocus={onFocus} onBlur={onBlur} />
            </Box>

            <Box>
              <Lbl>E-Way Bill No.</Lbl>
              <input style={inp()} placeholder="341234567891"
                value={ewayBill} onChange={(e) => setEwayBill(e.target.value)}
                onFocus={onFocus} onBlur={onBlur} />
            </Box>

            <Box>
              <Lbl>Lot / Batch No.</Lbl>
              <input style={inp()} placeholder="LOT-2026-018"
                value={lotNo} onChange={(e) => setLotNo(e.target.value)}
                onFocus={onFocus} onBlur={onBlur} />
            </Box>

            <Box>
              <Lbl>Received By</Lbl>
              <select style={sel()} value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                onFocus={onFocus} onBlur={onBlur}>
                {STAFF.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Box>
          </Box>

          {/* ════ ITEMS RECEIVED ════ */}
          <Box sx={{ mb: "18px" }}>
            {/* Section title */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.2 }}>
              <Box sx={{ fontSize: 14 }}>📦</Box>
              <Typography sx={{
                fontSize: 11, fontWeight: 700, color: T.muted,
                textTransform: "uppercase", letterSpacing: ".8px",
              }}>Items Received</Typography>
            </Box>

            {/* Table */}
            <Box sx={{ border: `1px solid ${T.border}`, borderRadius: "8px", overflow: "hidden" }}>
              <Box sx={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>

                  {/* ── Table header — dark blue ── */}
                  <thead>
                    <tr style={{ background: T.primary }}>
                      {[
                        { h: "Tile / Product",      w: "18%" },
                        { h: "Finish",              w: "10%" },
                        { h: "Size (LxB)",          w: "13%" },
                        { h: "Pieces / Box",        w: "8%"  },
                        { h: "Ordered (Boxes)",     w: "8%"  },
                        { h: "Received (Boxes)",    w: "8%"  },
                        { h: "Diff",                w: "6%"  },
                        { h: "Sqft",                w: "8%"  },
                        { h: "Cost Rate (₹/sqft)",  w: "12%" },
                        { h: "Amount (₹)",          w: "11%" },
                        { h: "",                    w: "3%"  },
                      ].map(({ h, w }) => (
                        <th key={h} style={{
                          width: w, padding: "11px 10px", textAlign: "left",
                          fontSize: 12, fontWeight: 600, color: "#fff",
                          fontFamily: "'Noto Sans', sans-serif",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>

                  {/* ── Table body ── */}
                  <tbody>
                    {rows.map((row, idx) => {
                      const diff   = row.ordered !== "" && row.received !== ""
                        ? (Number(row.ordered) || 0) - (Number(row.received) || 0)
                        : null;
                      const amount = (Number(row.sqft) || 0) * (Number(row.costRate) || 0);

                      const rowBg = idx % 2 === 0 ? T.white : "#fafbfc";

                      return (
                        <tr key={row._id}
                          style={{ borderBottom: `1px solid ${T.border}`, background: rowBg }}
                          onMouseEnter={(e) => e.currentTarget.style.background = T.primaryLight}
                          onMouseLeave={(e) => e.currentTarget.style.background = rowBg}>

                          {/* Tile / Product — autocomplete datalist */}
                          <td style={{ padding: "7px 8px" }}>
                            <input
                              list={`prod-${row._id}`}
                              style={inp({ fontSize: 12 })}
                              placeholder="Select or type product..."
                              value={row.productName}
                              onChange={(e) => updRow(row._id, "productName", e.target.value)}
                              onFocus={onFocus} onBlur={onBlur}
                            />
                            <datalist id={`prod-${row._id}`}>
                              {productChoices.map((p) => <option key={p} value={p} />)}
                            </datalist>
                          </td>

                          {/* Finish */}
                          <td style={{ padding: "7px 6px" }}>
                            <select
                              style={sel({ fontSize: 12, padding: "8px 8px" })}
                              value={row.finish || ""}
                              onChange={(e) => updRow(row._id, "finish", e.target.value)}
                              onFocus={onFocus} onBlur={onBlur}
                            >
                              <option value="">Select</option>
                              {FINISH_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                            </select>
                          </td>

                          {/* Size (LxB) */}
                          <td style={{ padding: "7px 6px" }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                              <input
                                type="number" min={0} step={0.01}
                                style={inp({ fontSize: 12, padding: "7px 4px", textAlign: "center", width: 54, minWidth: 54, flex: "0 0 54px" })}
                                placeholder="L"
                                value={row.lengthCm}
                                onChange={(e) => updRow(row._id, "lengthCm", e.target.value)}
                                onFocus={onFocus} onBlur={onBlur}
                              />
                              <Box sx={{ fontSize: 12, color: T.muted, fontWeight: 700 }}>x</Box>
                              <input
                                type="number" min={0} step={0.01}
                                style={inp({ fontSize: 12, padding: "7px 4px", textAlign: "center", width: 54, minWidth: 54, flex: "0 0 54px" })}
                                placeholder="B"
                                value={row.widthCm}
                                onChange={(e) => updRow(row._id, "widthCm", e.target.value)}
                                onFocus={onFocus} onBlur={onBlur}
                              />
                            </Box>
                          </td>

                          {/* Pieces / Box */}
                          <td style={{ padding: "7px 6px" }}>
                            <input
                              type="number" min={0}
                              style={inp({ fontSize: 12 })}
                              placeholder="4"
                              value={row.piecesPerBox}
                              onChange={(e) => updRow(row._id, "piecesPerBox", e.target.value)}
                              onFocus={onFocus} onBlur={onBlur}
                            />
                          </td>

                          {/* Ordered (Boxes) */}
                          <td style={{ padding: "7px 6px" }}>
                            <input
                              type="number" min={0} style={inp({ fontSize: 12 })}
                              placeholder="50"
                              value={row.ordered}
                              onChange={(e) => updRow(row._id, "ordered", e.target.value)}
                              onFocus={onFocus} onBlur={onBlur}
                            />
                          </td>

                          {/* Received (Boxes) */}
                          <td style={{ padding: "7px 6px" }}>
                            <input
                              type="number" min={0} style={inp({ fontSize: 12 })}
                              placeholder="50"
                              value={row.received}
                              onChange={(e) => updRow(row._id, "received", e.target.value)}
                              onFocus={onFocus} onBlur={onBlur}
                            />
                          </td>

                          {/* Diff — read-only, colour-coded badge */}
                          <td style={{ padding: "7px 6px" }}>
                            {diff !== null ? (
                              <Box sx={{
                                px: 1, py: "7px", borderRadius: "5px", textAlign: "center",
                                fontWeight: 700, fontSize: 13,
                                fontFamily: "'Rajdhani', sans-serif",
                                background: diff === 0 ? T.successLight : diff > 0 ? T.warningLight : T.dangerLight,
                                color:      diff === 0 ? T.success       : diff > 0 ? T.warning      : T.danger,
                              }}>
                                {diff}
                              </Box>
                            ) : (
                              <Box sx={{ px: 1, py: "7px", textAlign: "center", color: T.border, fontSize: 13 }}>—</Box>
                            )}
                          </td>

                          {/* Sqft — auto-filled but editable */}
                          <td style={{ padding: "7px 6px" }}>
                            <input
                              type="number" min={0} step={0.1}
                              style={inp({ fontSize: 12 })}
                              placeholder="108"
                              value={row.sqft}
                              onChange={(e) => updRow(row._id, "sqft", e.target.value)}
                              onFocus={onFocus} onBlur={onBlur}
                            />
                          </td>

                          {/* Cost Rate (₹/sqft) */}
                          <td style={{ padding: "7px 6px" }}>
                            <input
                              type="number" min={0} step={0.01}
                              style={inp({ fontSize: 12 })}
                              placeholder="62.00"
                              value={row.costRate}
                              onChange={(e) => updRow(row._id, "costRate", e.target.value)}
                              onFocus={onFocus} onBlur={onBlur}
                            />
                          </td>

                          {/* Amount (₹) — read-only */}
                          <td style={{ padding: "7px 6px" }}>
                            <Box sx={{
                              padding: "8px 10px", borderRadius: "6px",
                              background: "#f0f4f8", border: `1.5px solid ${T.border}`,
                              fontSize: 13, fontWeight: 700, color: T.primary,
                              fontFamily: "'Rajdhani', sans-serif", textAlign: "right",
                              minHeight: 36, display: "flex", alignItems: "center", justifyContent: "flex-end",
                            }}>
                              {amount > 0 ? amount.toLocaleString("en-IN") : "—"}
                            </Box>
                          </td>

                          {/* Delete row ✕ */}
                          <td style={{ padding: "7px 4px", textAlign: "center" }}>
                            {rows.length > 1 && (
                              <Box onClick={() => removeRow(row._id)} sx={{
                                cursor: "pointer", fontSize: 15, color: "#ccc",
                                lineHeight: 1, userSelect: "none",
                                "&:hover": { color: T.danger },
                                transition: "color .15s",
                              }}>✕</Box>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Box>

              {/* + Add Item */}
              <Box sx={{ px: 1.5, py: 1, borderTop: `1px solid ${T.border}`, background: "#fafbfc" }}>
                <Box onClick={addRow} sx={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  px: 1.8, py: 0.7, borderRadius: "6px", cursor: "pointer",
                  border: `1.5px solid ${T.border}`, background: T.white,
                  fontSize: 13, fontWeight: 600, color: T.text,
                  fontFamily: "'Noto Sans', sans-serif",
                  "&:hover": { borderColor: T.primary, color: T.primary, background: T.primaryLight },
                  transition: "all .15s",
                }}>
                  + Add Item
                </Box>
              </Box>
            </Box>
          </Box>

          {/* ════ ROW 3 — Freight · Total Invoice Amount · GST on Purchase ════ */}
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", mb: "14px" }}>

            {/* Freight / Transport (₹) */}
            <Box>
              <Lbl>Freight / Transport (₹)</Lbl>
              <input type="number" min={0} style={inp()} placeholder="0"
                value={freight} onChange={(e) => setFreight(e.target.value)}
                onFocus={onFocus} onBlur={onBlur} />
            </Box>

            {/* Total Invoice Amount — auto-calc read-only */}
            <Box>
              <Lbl>Total Invoice Amount (₹)</Lbl>
              <Box sx={{
                ...inp(), background: "#f0f4f8", display: "flex",
                alignItems: "center", cursor: "default",
                fontFamily: "'Rajdhani', sans-serif", fontWeight: 700,
                fontSize: 14, color: grandTotal > 0 ? T.primary : T.muted,
              }}>
                {grandTotal > 0
                  ? `₹${grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : "Auto-calc"}
              </Box>
            </Box>

            {/* GST on Purchase */}
            <Box>
              <Lbl>GST on Purchase</Lbl>
              <select style={sel()} value={gstOption}
                onChange={(e) => setGstOption(e.target.value)}
                onFocus={onFocus} onBlur={onBlur}>
                {GST_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </Box>
          </Box>

          {/* ════ ROW 4 — Quality · Payment Status · Remarks ════ */}
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", mb: "18px" }}>

            {/* Quality Check Status */}
            <Box>
              <Lbl>Quality Check Status</Lbl>
              <select style={sel()} value={qualityStatus}
                onChange={(e) => setQualityStatus(e.target.value)}
                onFocus={onFocus} onBlur={onBlur}>
                {QUALITY_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </Box>

            {/* Payment Status */}
            <Box>
              <Lbl>Payment Status</Lbl>
              <select style={sel()} value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                onFocus={onFocus} onBlur={onBlur}>
                {PAYMENT_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </Box>

            {/* Remarks */}
            <Box>
              <Lbl>Remarks</Lbl>
              <input style={inp()} placeholder="Any special notes..."
                value={remarks} onChange={(e) => setRemarks(e.target.value)}
                onFocus={onFocus} onBlur={onBlur} />
            </Box>
          </Box>

          {/* ── GST breakdown summary strip (visible only when total > 0) ── */}
          {grandTotal > 0 && (
            <Box sx={{
              mb: "18px", px: 2, py: 1.2,
              background: "#f8fafc", borderRadius: "8px",
              border: `1px solid ${T.border}`,
              display: "flex", gap: 3, flexWrap: "wrap", alignItems: "center",
            }}>
              {[
                { label: "Subtotal",         val: subtotal   },
                { label: `GST (${gstPct}%)`, val: gstAmt     },
                { label: "Freight",          val: freightAmt },
                { label: "Grand Total",      val: grandTotal, bold: true },
              ].map(({ label, val, bold }) => (
                <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                  <Typography sx={{ fontSize: 12, color: T.muted }}>{label}:</Typography>
                  <Typography sx={{
                    fontSize: bold ? 15 : 13,
                    fontWeight: bold ? 800 : 600,
                    color: bold ? T.primary : T.dark,
                    fontFamily: "'Rajdhani', sans-serif",
                  }}>
                    ₹{val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {/* ════ ACTION BUTTONS ════ */}
          <Box sx={{ display: "flex", gap: 1.2, alignItems: "center" }}>

            {/* ✅ Save & Update Stock */}
            <Box onClick={() => !saving && handleSave(false)} sx={{
              display: "inline-flex", alignItems: "center", gap: "7px",
              px: 2.5, py: 1.1, borderRadius: "7px",
              cursor: saving ? "default" : "pointer",
              background: T.success, color: "#fff",
              fontSize: 13, fontWeight: 600,
              fontFamily: "'Noto Sans', sans-serif",
              opacity: saving ? 0.75 : 1,
              "&:hover": !saving ? { background: "#146038", boxShadow: "0 4px 12px rgba(26,122,74,.3)" } : {},
              transition: "all .17s",
            }}>
              ✅ {saving ? "Saving..." : "Save & Update Stock"}
            </Box>

            {/* 📋 Save Draft */}
            <Box onClick={() => !saving && handleSave(true)} sx={{
              display: "inline-flex", alignItems: "center", gap: "7px",
              px: 2, py: 1.1, borderRadius: "7px",
              cursor: saving ? "default" : "pointer",
              background: T.white, color: T.text,
              fontSize: 13, fontWeight: 600,
              border: `1.5px solid ${T.border}`,
              fontFamily: "'Noto Sans', sans-serif",
              "&:hover": !saving ? { borderColor: T.warning, color: T.warning, background: T.warningLight } : {},
              transition: "all .17s",
            }}>
              📋 Save Draft
            </Box>

            {/* Cancel */}
            <Box onClick={() => navigate("/suppliers")} sx={{
              display: "inline-flex", alignItems: "center",
              px: 2, py: 1.1, borderRadius: "7px", cursor: "pointer",
              background: T.white, color: T.text,
              fontSize: 13, fontWeight: 600,
              border: `1.5px solid ${T.border}`,
              fontFamily: "'Noto Sans', sans-serif",
              "&:hover": { borderColor: T.danger, color: T.danger, background: T.dangerLight },
              transition: "all .17s",
            }}>
              Cancel
            </Box>
          </Box>

        </Box>
      </Box>
    </Box>
  );
};

export default SupplierProduct;



