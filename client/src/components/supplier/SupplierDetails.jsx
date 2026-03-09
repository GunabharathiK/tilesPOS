import {
  Box,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ConfirmDialog from "../common/ConfirmDialog";
import {
  createSupplier,
  deleteSupplier,
  deletePurchase,
  getPurchases,
  getSuppliers,
} from "../../services/supplierService";
import toast from "react-hot-toast";
import { mapRowByFieldAliases, parseCsvRows } from "../../utils/importByField";

/* ─── Design Tokens ─────────────────────────────────────────────────────────── */
const T = {
  primary:      "#2563eb",
  primaryDark:  "#1d4ed8",
  primaryLight: "#eff6ff",
  success:      "#15803d",
  successLight: "#f0fdf4",
  danger:       "#b91c1c",
  dangerLight:  "#fef2f2",
  warning:      "#b45309",
  warningLight: "#fffbeb",
  dark:         "#1c2333",
  text:         "#374151",
  muted:        "#6b7280",
  border:       "#e5e7eb",
  bg:           "#f0f4f8",
  white:        "#ffffff",
  headerBg:     "#f8fafc",
  rowHover:     "#fafbff",
  star:         "#f59e0b",
  starEmpty:    "#e5e7eb",
};

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
const fmt = (n = 0) => "₹" + Number(n).toLocaleString("en-IN");

const fmtDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-IN");
};

const getNumericRating = (rating) => {
  if (typeof rating === "number") return rating;
  if (typeof rating === "string") {
    const starCount = (rating.match(/⭐/g) || []).length;
    if (starCount) return starCount;
  }
  return 4;
};

const getSupplierCategories = (supplier) => {
  if (Array.isArray(supplier.categories) && supplier.categories.length > 0)
    return supplier.categories;
  if (Array.isArray(supplier.productsSupplied) && supplier.productsSupplied.length > 0)
    return supplier.productsSupplied;
  return [];
};
const getSupplierBrands = (supplier) => {
  if (Array.isArray(supplier.brands) && supplier.brands.length > 0) {
    return supplier.brands.map((b) => String(b || "").trim()).filter(Boolean);
  }
  if (typeof supplier.brands === "string") {
    return supplier.brands.split(",").map((b) => b.trim()).filter(Boolean);
  }
  return [];
};

/* ─── Star Rating ────────────────────────────────────────────────────────────── */
const StarRating = ({ rating = 4 }) => {
  const num = getNumericRating(rating);
  return (
    <Box sx={{ display: "flex", gap: "1px", alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Box
          key={i}
          component="span"
          sx={{ fontSize: 14, lineHeight: 1, color: i <= num ? T.star : T.starEmpty }}
        >
          ★
        </Box>
      ))}
    </Box>
  );
};

/* ─── Detail Row (ViewDialog) ───────────────────────────────────────────────── */
const DetailRow = ({ label, value }) => (
  <Box sx={{ display: "flex", gap: 1.5, py: 0.8, borderBottom: `1px solid ${T.border}` }}>
    <Typography sx={{ fontSize: 12, color: T.muted, minWidth: 130, flexShrink: 0 }}>
      {label}
    </Typography>
    <Typography sx={{ fontSize: 12, fontWeight: 500, color: T.dark, wordBreak: "break-word" }}>
      {value || "-"}
    </Typography>
  </Box>
);

/* ─── View Dialog ────────────────────────────────────────────────────────────── */
const ViewDialog = ({ supplier, purchases, open, onClose, onEdit, onEditPurchase }) => {
  if (!supplier) return null;

  const statusBadge =
    supplier.paymentStatus === "Paid"
      ? { bg: T.successLight, color: T.success }
      : supplier.paymentStatus === "Partial"
        ? { bg: T.warningLight, color: T.warning }
        : { bg: T.dangerLight, color: T.danger };

  const supplierPurchases = purchases.filter((purchase) => {
    const purchaseSupplierId = purchase.supplierId?._id || purchase.supplierId;
    return purchaseSupplierId === supplier._id;
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: "12px", overflow: "hidden" } }}
    >
      <Box
        sx={{
          background: `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`,
          px: 2.5, py: 2,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#fff", fontFamily: "'Rajdhani', sans-serif" }}>
            {supplier.companyName || supplier.name}
          </Typography>
          <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,.75)", mt: 0.3 }}>
            {[supplier.city, supplier.state].filter(Boolean).join(", ")}
            {supplier.gstin ? ` | GSTIN: ${supplier.gstin}` : ""}
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: "rgba(255,255,255,.85)" }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ display: "flex", borderBottom: `1px solid ${T.border}`, background: T.white }}>
        {[
          { label: "Total Purchase", value: fmt(supplier.totalValue || 0), color: T.primary },
          { label: "Total Paid",     value: fmt(supplier.totalPaid  || 0), color: T.success },
          { label: "Payable",        value: fmt(supplier.totalDue   || 0), color: (supplier.totalDue || 0) > 0 ? T.danger : T.success },
        ].map((item) => (
          <Box key={item.label} sx={{ flex: 1, px: 2, py: 1.5, textAlign: "center", borderRight: `1px solid ${T.border}` }}>
            <Typography sx={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 700 }}>
              {item.label}
            </Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 800, color: item.color, fontFamily: "'Rajdhani', sans-serif" }}>
              {item.value}
            </Typography>
          </Box>
        ))}
        <Box sx={{ flex: 1, px: 2, py: 1.5, textAlign: "center" }}>
          <Typography sx={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 700, mb: 0.5 }}>
            Status
          </Typography>
          <Box sx={{ background: statusBadge.bg, color: statusBadge.color, fontSize: 11, fontWeight: 600, px: "10px", py: "3px", borderRadius: "12px", display: "inline-block" }}>
            {supplier.paymentStatus || "Pending"}
          </Box>
        </Box>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <Box sx={{ p: 2.5, borderRight: `1px solid ${T.border}` }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".8px", mb: 1.5 }}>
              Company Details
            </Typography>
            <DetailRow label="Company Name"   value={supplier.companyName || supplier.name} />
            <DetailRow label="Contact Person" value={supplier.supplierName} />
            <DetailRow label="Mobile"         value={supplier.companyPhone || supplier.phone} />
            <DetailRow label="Alt Mobile"     value={supplier.altPhone} />
            <DetailRow label="Email"          value={supplier.companyEmail} />
            <DetailRow label="Website"        value={supplier.companyWebsite} />
            <DetailRow label="GSTIN"          value={supplier.gstin} />
            <DetailRow label="Payment Terms"  value={supplier.paymentTerms} />
            <DetailRow label="Address"        value={supplier.companyAddress || supplier.address} />
            <DetailRow label="City / State"   value={[supplier.city, supplier.state].filter(Boolean).join(", ")} />
            <DetailRow label="Pincode"        value={supplier.pincode} />
          </Box>
          <Box sx={{ p: 2.5 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".8px", mb: 1.5 }}>
              Bank And Business Details
            </Typography>
            <DetailRow label="Credit Limit"   value={supplier.creditLimit ? fmt(supplier.creditLimit) : ""} />
            <DetailRow label="Discount %"     value={supplier.discountPct} />
            <DetailRow label="Bank Name"      value={supplier.bankName} />
            <DetailRow label="Account No"     value={supplier.accountNo} />
            <DetailRow label="IFSC"           value={supplier.ifscCode} />
            <DetailRow label="Account Holder" value={supplier.accountHolder} />
            <DetailRow label="Branch"         value={supplier.branch} />
            <DetailRow label="UPI ID"         value={supplier.upiId} />
            <DetailRow label="Priority"       value={supplier.priority} />
            <DetailRow label="Notes"          value={supplier.internalNotes} />
          </Box>
        </Box>

        <Box sx={{ p: 2.5, borderTop: `1px solid ${T.border}` }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".8px", mb: 1.5 }}>
            Purchased Items
          </Typography>
          {supplierPurchases.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: T.muted }}>
              No purchase entries available for this supplier.
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2, maxHeight: 260, overflowY: "auto", pr: 0.5 }}>
              {supplierPurchases.map((purchase) => (
                <Box key={purchase._id} sx={{ border: `1px solid ${T.border}`, borderRadius: "8px", p: 1.5, background: "#fafbfc" }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, alignItems: "flex-start", mb: 1.2 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.dark }}>
                      {purchase.grnNo || purchase.invoiceNo}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 1.5, mb: 1.2 }}>
                    {[
                      { label: "Invoice", value: purchase.invoiceNo || "-" },
                      { label: "Date",    value: fmtDate(purchase.invoiceDate) },
                      { label: "Total",   value: fmt(purchase.grandTotal || purchase.totalInvoiceAmount || 0), color: T.dark,   weight: 700 },
                      { label: "Due",     value: fmt(purchase.totalDue   || 0), color: Number(purchase.totalDue || 0) > 0 ? T.danger : T.success, weight: 700 },
                    ].map((field) => (
                      <Box key={field.label} sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: ".5px", mb: 0.3 }}>
                          {field.label}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: field.color || T.text, fontWeight: field.weight || 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {field.value}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                  <Box sx={{ border: `1px solid ${T.border}`, borderRadius: "6px", overflow: "hidden", background: T.white }}>
                    <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0,1.8fr) minmax(0,1fr) minmax(0,0.9fr) minmax(0,1fr) 80px 64px 92px 108px", px: 1.5, py: 1, background: "#f3f6fb", borderBottom: `1px solid ${T.border}` }}>
                      {[
                        { label: "Product", align: "left" },
                        { label: "Category", align: "left" },
                        { label: "Finish", align: "left" },
                        { label: "Brand", align: "left" },
                        { label: "Size", align: "center" },
                        { label: "Qty", align: "center" },
                        { label: "Sqft Rate", align: "right" },
                        { label: "Amount", align: "right" },
                      ].map((col) => (
                        <Typography
                          key={col.label}
                          sx={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: T.muted,
                            textTransform: "uppercase",
                            letterSpacing: ".4px",
                            textAlign: col.align,
                          }}
                        >
                          {col.label}
                        </Typography>
                      ))}
                    </Box>
                    {(purchase.products || []).length === 0 ? (
                      <Box sx={{ px: 1.5, py: 1.2 }}>
                        <Typography sx={{ fontSize: 12, color: T.muted }}>No purchased items</Typography>
                      </Box>
                    ) : (
                      (purchase.products || []).map((item, index) => (
                        <Box
                          key={`${purchase._id}-${index}`}
                          sx={{
                            display: "grid", gridTemplateColumns: "minmax(0,1.8fr) minmax(0,1fr) minmax(0,0.9fr) minmax(0,1fr) 80px 64px 92px 108px",
                            px: 1.5, py: 1,
                            borderBottom: index < purchase.products.length - 1 ? `1px solid ${T.border}` : "none",
                            alignItems: "center",
                          }}
                        >
                          <Typography sx={{ fontSize: 12, color: T.dark, fontWeight: 600, pr: 1 }}>{item.name || "-"}</Typography>
                          <Typography sx={{ fontSize: 12, color: T.text, pr: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {item.category || "-"}
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: T.text, pr: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {item.finish || "-"}
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: T.text, pr: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {item.brand || item.brands || getSupplierBrands(supplier)[0] || "-"}
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: T.text, textAlign: "center" }}>{item.size || "-"}</Typography>
                          <Typography sx={{ fontSize: 12, color: T.text, textAlign: "center" }}>{item.received || item.qty || 0}</Typography>
                          <Typography sx={{ fontSize: 12, color: T.text, fontWeight: 600, textAlign: "right" }}>
                            ₹{Number(item.price || 0).toLocaleString("en-IN")}
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: T.dark, fontWeight: 700, textAlign: "right" }}>
                            ₹{Number((Number(item.sqft) || 0) * (Number(item.price) || 0)).toLocaleString("en-IN")}
                          </Typography>
                        </Box>
                      ))
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        <Box sx={{ px: 2.5, py: 1.8, borderTop: `1px solid ${T.border}`, background: "#fafbfc", display: "flex", gap: 1, justifyContent: "flex-end" }}>
          <Button onClick={onClose} sx={{ border: `1px solid ${T.border}`, color: T.text }}>
            Close
          </Button>
          <Button
            onClick={() => { onClose(); onEdit(supplier); }}
            sx={{ background: T.primary, color: "#fff", "&:hover": { background: T.primaryDark } }}
          >
            Edit Supplier
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

/* ─── Supplier Table Row ─────────────────────────────────────────────────────── */
const SupplierRow = ({ supplier, serial, onView, onEditProduct, onPay, onDelete }) => {
  const totalPurchase = supplier.totalValue || 0;
  const payable       = supplier.totalDue   || 0;
  const categories    = getSupplierCategories(supplier);

  const td = (extraStyle = {}) => ({
    padding: "0 10px",
    height: 52,
    verticalAlign: "middle",
    borderBottom: `1px solid ${T.border}`,
    ...extraStyle,
  });

  return (
    <tr
      onMouseEnter={(e) => (e.currentTarget.style.background = T.rowHover)}
      onMouseLeave={(e) => (e.currentTarget.style.background = T.white)}
      style={{ transition: "background .12s" }}
    >
      {/* S.No */}
      <td style={td({ width: 52 })}>
        <Typography sx={{ fontSize: 11, color: T.muted, fontFamily: "'DM Mono', monospace", lineHeight: 1.3 }}>
          {serial}
        </Typography>
      </td>

      {/* Supplier Name */}
      <td style={td({ width: 160 })}>
        <Typography sx={{ fontWeight: 700, fontSize: 12, color: T.dark, lineHeight: 1.3 }}>
          {supplier.companyName || supplier.name}
        </Typography>
      </td>

      {/* Contact Person */}
      <td style={td({ width: 130 })}>
        <Typography sx={{ fontSize: 12, color: T.text }}>
          {supplier.supplierName || "-"}
        </Typography>
      </td>

      {/* Mobile */}
      <td style={td({ width: 120 })}>
        <Typography sx={{ fontSize: 12, color: T.text, fontFamily: "'DM Mono', monospace" }}>
          {supplier.companyPhone || supplier.phone || "-"}
        </Typography>
      </td>

      {/* Category */}
      <td style={td({ width: 110 })}>
        <Typography sx={{ fontSize: 12, color: T.text }}>
          {categories.length > 0
            ? categories.slice(0, 2).join(", ") + (categories.length > 2 ? "..." : "")
            : "-"}
        </Typography>
      </td>

      {/* Terms */}
      <td style={td({ width: 80, textAlign: "right" })}>
        <Typography sx={{ fontSize: 12, color: T.text, whiteSpace: "nowrap" }}>
          {supplier.paymentTerms || "30 days"}
        </Typography>
      </td>

      {/* Total Purchase */}
      <td style={td({ width: 125, textAlign: "right" })}>
        <Typography sx={{ fontWeight: 700, fontSize: 12, color: T.dark }}>
          {fmt(totalPurchase)}
        </Typography>
      </td>

      {/* Payable */}
      <td style={td({ width: 100, textAlign: "right" })}>
        <Typography sx={{ fontWeight: 700, fontSize: 12, color: payable > 0 ? T.danger : T.success }}>
          {fmt(payable)}
        </Typography>
      </td>

      {/* Rating */}
      <td style={td({ width: 100, textAlign: "right" })}>
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <StarRating rating={supplier.rating} />
        </Box>
      </td>

      {/* Actions */}
      <td style={td({ width: 100 })}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: "3px", alignItems: "flex-end" }}>
          {/* View */}
          <Box
            onClick={() => onView(supplier)}
            sx={{
              display: "inline-flex", alignItems: "center", gap: "4px",
              px: "10px", py: "4px", borderRadius: "8px", cursor: "pointer",
              border: `1px solid #cfd8e6`, background: "#f8fafc",
              fontSize: 13, fontWeight: 700, color: "#1e3a8a",
              minWidth: 90, justifyContent: "flex-start",
              transition: "all .13s",
              "&:hover": { background: "#eef2ff", borderColor: "#c7d2fe" },
            }}
          >
            <Box component="span" sx={{ fontSize: 17, lineHeight: 1, flexShrink: 0 }}>👁️</Box>
            View
          </Box>

          {/* Edit */}
          <Box
            onClick={() => onEditProduct(supplier)}
            sx={{
              display: "inline-flex", alignItems: "center", gap: "4px",
              px: "10px", py: "4px", borderRadius: "8px", cursor: "pointer",
              border: "1px solid #cfd8e6", background: "#f8fafc",
              fontSize: 13, fontWeight: 700, color: "#1e3a8a",
              minWidth: 90, justifyContent: "flex-start",
              transition: "all .13s",
              "&:hover": { background: "#eef2ff", borderColor: "#c7d2fe" },
            }}
          >
            <Box component="span" sx={{ fontSize: 17, lineHeight: 1, flexShrink: 0 }}>✏️</Box>
            Edit
          </Box>

          {/* Pay */}
          <Box
            onClick={() => onPay(supplier)}
            sx={{
              display: "inline-flex", alignItems: "center", gap: "4px",
              px: "10px", py: "4px", borderRadius: "8px", cursor: "pointer",
              border: "1px solid #cfd8e6", background: "#f8fafc",
              fontSize: 13, fontWeight: 700, color: "#1e3a8a",
              minWidth: 90, justifyContent: "flex-start",
              transition: "all .13s",
              "&:hover": { background: "#eef2ff", borderColor: "#c7d2fe" },
            }}
          >
            <Box component="span" sx={{ fontSize: 17, lineHeight: 1, flexShrink: 0 }}>💸</Box>
            Pay
          </Box>

          {/* Delete */}
          <Box
            onClick={() => onDelete(supplier._id, supplier.companyName || supplier.name)}
            sx={{
              display: "inline-flex", alignItems: "center", gap: "4px",
              px: "10px", py: "4px", borderRadius: "8px", cursor: "pointer",
              border: "1px solid #cfd8e6", background: "#f8fafc",
              fontSize: 13, fontWeight: 700, color: "#1e3a8a",
              minWidth: 90, justifyContent: "flex-start",
              transition: "all .13s",
              "&:hover": { background: "#eef2ff", borderColor: "#c7d2fe" },
            }}
          >
            <Box component="span" sx={{ fontSize: 17, lineHeight: 1, flexShrink: 0 }}>🗑️</Box>
            Delete
          </Box>
        </Box>
      </td>
    </tr>
  );
};

/* ─── Main Component ─────────────────────────────────────────────────────────── */
const SupplierDetails = ({ onEdit, onStatsChange }) => {
  const navigate = useNavigate();
  const importInputRef = useRef(null);
  const [suppliers,     setSuppliers]     = useState([]);
  const [purchases,     setPurchases]     = useState([]);
  const [search,        setSearch]        = useState("");
  const [stateFilter,   setStateFilter]   = useState("All States");
  const [balFilter,     setBalFilter]     = useState("All Balance");
  const [productFilter, setProductFilter] = useState("All Categories");
  const [paymentTab,    setPaymentTab]    = useState("All");
  const [viewSupplier,  setViewSupplier]  = useState(null);
  const [importing,     setImporting]     = useState(false);
  const [expandedRows,  setExpandedRows]  = useState({});
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: "", name: "" });

  const fetchSuppliers = async () => {
    try {
      const [supplierRes, purchaseRes] = await Promise.all([getSuppliers(), getPurchases()]);
      const supplierData = Array.isArray(supplierRes.data) ? supplierRes.data : [];
      setSuppliers(supplierData);
      setPurchases(Array.isArray(purchaseRes.data) ? purchaseRes.data : []);
      if (onStatsChange) onStatsChange(supplierData);
    } catch {
      toast.error("Failed to fetch suppliers");
    }
  };

  useEffect(() => { fetchSuppliers(); }, []);

  const productOptions = useMemo(() => {
    const items = suppliers.flatMap((s) => getSupplierCategories(s));
    return ["All Categories", ...new Set(items)];
  }, [suppliers]);

  const filtered = useMemo(() => {
    return suppliers.filter((supplier) => {
      const q        = search.trim().toLowerCase();
      const categories = getSupplierCategories(supplier);

      const matchSearch =
        !q ||
        (supplier.companyName || supplier.name || "").toLowerCase().includes(q) ||
        (supplier.city         || "").toLowerCase().includes(q)  ||
        (supplier.companyPhone || supplier.phone || "").includes(q) ||
        (supplier.supplierName || "").toLowerCase().includes(q);

      const matchState =
        stateFilter === "All States" ||
        (supplier.state || "").toLowerCase().includes(stateFilter.toLowerCase());

      const matchBalance =
        balFilter === "All Balance" ||
        (balFilter === "Has Payable"
          ? Number(supplier.totalDue || 0) > 0
          : Number(supplier.totalDue || 0) <= 0);

      const matchProduct =
        productFilter === "All Categories" ||
        categories.some((p) => p.toLowerCase().includes(productFilter.toLowerCase()));

      const matchPaymentTab =
        paymentTab === "All" ||
        (paymentTab === "Paid"
          ? Number(supplier.totalDue || 0) <= 0 && Number(supplier.totalValue || 0) > 0
          : Number(supplier.totalDue || 0) > 0);

      return matchSearch && matchState && matchBalance && matchProduct && matchPaymentTab;
    });
  }, [balFilter, paymentTab, productFilter, search, stateFilter, suppliers]);

  const handleAddSupplier = () =>
    onEdit ? onEdit(null) : navigate("/suppliers/create");

  const importAliases = {
    companyName: ["name", "suppliername", "dealername", "company"],
    supplierName: ["contactperson", "ownername", "owner"],
    companyPhone: ["phone", "mobile", "primarymobile", "contactnumber"],
    altPhone: ["alternatemobile", "altmobile", "landline"],
    companyEmail: ["email", "mail"],
    companyAddress: ["address", "fulladdress"],
    city: ["town"],
    state: ["province"],
    pincode: ["pin", "zipcode", "postalcode"],
    gstin: ["gst", "gstno"],
    paymentTerms: ["terms", "paymentterm"],
    creditLimit: ["credit", "creditlimitrs"],
    discountPct: ["discount", "discountpct"],
    bankName: ["bank"],
    accountNo: ["accountnumber", "bankaccountno"],
    ifscCode: ["ifsc"],
    upiId: ["upi"],
    categories: ["category", "categories", "products", "productssupplied"],
    productNames: ["productname", "productnames", "item", "items", "productsname"],
    brands: ["brand", "brandssupplied"],
    internalNotes: ["notes", "remark", "remarks"],
  };

  const normalizePhone = (value = "") => String(value).replace(/\D/g, "").slice(0, 15);

  const handleImportClick = () => importInputRef.current?.click();

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      setImporting(true);
      const text = await file.text();
      const rows = parseCsvRows(text);
      if (!rows.length) {
        toast.error("No import rows found");
        return;
      }

      const payloads = rows
        .map((row) => mapRowByFieldAliases(row, importAliases))
        .map((mapped) => {
          const companyName = String(mapped.companyName || "").trim();
          const companyPhone = normalizePhone(mapped.companyPhone || "");
          if (!companyName || !companyPhone) return null;

          return {
            name: companyName,
            phone: companyPhone,
            address: String(mapped.companyAddress || "").trim(),
            companyName,
            supplierName: String(mapped.supplierName || "").trim(),
            companyPhone,
            altPhone: normalizePhone(mapped.altPhone || ""),
            companyEmail: String(mapped.companyEmail || "").trim(),
            companyAddress: String(mapped.companyAddress || "").trim(),
            city: String(mapped.city || "").trim(),
            state: String(mapped.state || "").trim(),
            pincode: String(mapped.pincode || "").replace(/\D/g, "").slice(0, 6),
            gstin: String(mapped.gstin || "").trim().toUpperCase(),
            paymentTerms: String(mapped.paymentTerms || "Advance Payment").trim(),
            creditLimit: Number(mapped.creditLimit || 0) || 0,
            discountPct: Number(mapped.discountPct || 0) || 0,
            bankName: String(mapped.bankName || "").trim(),
            accountNo: String(mapped.accountNo || "").trim(),
            ifscCode: String(mapped.ifscCode || "").trim().toUpperCase(),
            upiId: String(mapped.upiId || "").trim(),
            brands: String(mapped.brands || "").trim(),
            internalNotes: String(mapped.internalNotes || "").trim(),
            categories: String(mapped.categories || "")
              .split(/[|,;/]/)
              .map((p) => p.trim())
              .filter(Boolean),
            productNames: String(mapped.productNames || "")
              .split(/[|,;/]/)
              .map((p) => p.trim())
              .filter(Boolean),
          };
        })
        .filter(Boolean);

      if (!payloads.length) {
        toast.error("Required fields missing. Ensure file has Company Name and Mobile columns.");
        return;
      }

      const results = await Promise.allSettled(payloads.map((payload) => createSupplier(payload)));
      const success = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - success;
      await fetchSuppliers();
      if (failed > 0) toast.success(`Imported ${success}, skipped ${failed}`);
      else toast.success(`Imported ${success} supplier(s)`);
    } catch {
      toast.error("Import failed. Use CSV with header row.");
    } finally {
      setImporting(false);
    }
  };

  const handleEdit = (supplier) => {
    setViewSupplier(null);
    if (onEdit) { onEdit(supplier); return; }
    navigate("/suppliers/create", { state: { editSupplier: supplier } });
  };

  const handleEditSupplierProduct = (supplier) => {
    const supplierId = supplier?._id;
    const latestPurchase = purchases
      .filter((purchase) => String(purchase?.supplierId?._id || purchase?.supplierId || "") === String(supplierId || ""))
      .sort((a, b) => new Date(b?.createdAt || b?.invoiceDate || 0) - new Date(a?.createdAt || a?.invoiceDate || 0))[0];
    if (!latestPurchase?._id && !latestPurchase?.id) {
      toast.error("No existing purchase found for this supplier to edit.");
      return;
    }

    navigate("/suppliers/products", {
      state: {
        supplierId,
        supplier,
        editPurchase: latestPurchase,
      },
    });
  };

  const handleEditPurchase = (purchase) => {
    setViewSupplier(null);
    const purchaseSupplier = suppliers.find(
      (s) => s._id === (purchase.supplierId?._id || purchase.supplierId)
    );
    navigate("/suppliers/products", {
      state: {
        supplierId:   purchase.supplierId?._id || purchase.supplierId,
        supplier:     purchaseSupplier || purchase.supplierId || null,
        editPurchase: purchase,
      },
    });
  };

  const toggleExpand = (supplierId) => {
    setExpandedRows((prev) => ({ ...prev, [supplierId]: !prev[supplierId] }));
  };

  const handleDeletePurchase = async (purchase) => {
    if (!purchase?._id) return;
    const ok = window.confirm(`Delete invoice ${purchase.invoiceNo || purchase.grnNo || ""}?`);
    if (!ok) return;
    try {
      await deletePurchase(purchase._id);
      toast.success("Invoice deleted");
      fetchSuppliers();
    } catch {
      toast.error("Failed to delete invoice");
    }
  };

  const handlePay = (supplier) =>
    navigate("/suppliers/payment", { state: { supplierId: supplier._id, supplier } });

  const askDelete = (id, name) => setConfirmDelete({ open: true, id, name });

  const handleDelete = async () => {
    try {
      await deleteSupplier(confirmDelete.id);
      toast.success("Supplier deleted");
      setConfirmDelete({ open: false, id: "", name: "" });
      fetchSuppliers();
    } catch {
      toast.error("Delete failed");
    }
  };

  const selectStyle = {
    background: T.white,
    border: `1px solid ${T.border}`,
    borderRadius: "7px",
    padding: "7px 28px 7px 10px",
    fontSize: 13,
    color: T.text,
    cursor: "pointer",
    outline: "none",
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 8px center",
    fontFamily: "inherit",
    WebkitAppearance: "none",
    MozAppearance: "none",
    colorScheme: "normal",
  };

  const optionStyle = {
    color: T.text,
    background: T.white,
  };

  return (
    <Box sx={{ fontFamily: "'Noto Sans', sans-serif" }}>

      {/* ── Top bar ── */}
      <Box sx={{
        background: T.white,
        borderRadius: "10px 10px 0 0",
        border: `1px solid ${T.border}`,
        borderBottom: `1px solid ${T.border}`,
        px: 2.5, py: 1.5,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography sx={{ fontSize: 17 }}>📊</Typography>
          <Typography sx={{ fontSize: 17, fontWeight: 700, color: T.dark }}>All Suppliers</Typography>
        </Box>
        <Box sx={{ display: "flex", gap: "10px" }}>
          <Box
            onClick={handleAddSupplier}
            sx={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              px: 2, py: "8px", borderRadius: "8px", cursor: "pointer",
              background: T.primary, color: "#fff",
              fontSize: 13, fontWeight: 600,
              transition: "background .15s",
              "&:hover": { background: T.primaryDark },
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add Supplier
          </Box>
          <Box
            onClick={handleImportClick}
            sx={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            px: "14px", py: "8px", borderRadius: "8px", cursor: "pointer",
            background: T.white, color: T.text,
            fontSize: 13, fontWeight: 500,
            border: `1px solid ${T.border}`,
            "&:hover": { background: "#f9fafb" },
          }}>
            <UploadFileIcon sx={{ color: "#16a34a", fontSize: 16 }} /> {importing ? "Importing..." : "Import"}
          </Box>
          <input ref={importInputRef} type="file" accept=".csv,text/csv" hidden onChange={handleImportFile} />
        </Box>
      </Box>

      {/* ── Filter bar ── */}
      <Box sx={{
        background: T.white,
        border: `1px solid ${T.border}`,
        borderTop: "none",
        borderBottom: `1px solid ${T.border}`,
        px: 2.5, py: "10px",
        display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap",
      }}>
        <Box sx={{ position: "relative" }}>
          <Box component="span" sx={{
            position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)",
            fontSize: 14, color: "#3b82f6", pointerEvents: "none",
          }}>🔍</Box>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search supplier name, city, m..."
            style={{
              paddingLeft: 30, paddingRight: 10, paddingTop: 7, paddingBottom: 7,
              fontSize: 13, border: `1px solid ${T.border}`, borderRadius: "7px",
              outline: "none", color: T.text, fontFamily: "inherit", width: 240,
            }}
          />
        </Box>

        <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} style={selectStyle}>
          {["All States", "Tamil Nadu", "Karnataka", "Gujarat", "Andhra Pradesh", "Kerala", "Maharashtra"].map((o) => (
            <option key={o} style={optionStyle}>{o}</option>
          ))}
        </select>

        <select value={balFilter} onChange={(e) => setBalFilter(e.target.value)} style={selectStyle}>
          {["All Balance", "Has Payable", "Cleared"].map((o) => (
            <option key={o} style={optionStyle}>{o}</option>
          ))}
        </select>

        <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)} style={selectStyle}>
          {productOptions.map((o) => <option key={o} style={optionStyle}>{o}</option>)}
        </select>
      </Box>

      {/* ── Table ── */}
      <Box sx={{
        background: T.white,
        border: `1px solid ${T.border}`,
        borderTop: "none",
        borderRadius: "0 0 10px 10px",
        boxShadow: "0 1px 4px rgba(0,0,0,.05)",
        overflow: "hidden",
      }}>
        <Box sx={{ px: 2.5, py: 1.8, borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: "999px", background: "#0891b2" }} />
            <Typography sx={{ fontSize: 15, lineHeight: 1.2, fontWeight: 700, color: T.dark }}>
              Dealers
            </Typography>
            <Box sx={{ px: 1.1, height: 28, borderRadius: "8px", border: `1px solid #99d7ea`, color: "#0e7490", fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center" }}>
              {filtered.length}
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1.2 }}>
            {["All", "Pending", "Paid"].map((tab) => (
              <Box
                key={tab}
                onClick={() => setPaymentTab(tab)}
                sx={{
                  px: 2, py: 0.7, borderRadius: "10px", cursor: "pointer",
                  fontSize: 13, fontWeight: 700,
                  color: paymentTab === tab ? "#0891b2" : T.muted,
                  border: paymentTab === tab ? "1px solid #99d7ea" : "1px solid transparent",
                  background: paymentTab === tab ? "#e6f7fb" : "transparent",
                }}
              >
                {tab}
              </Box>
            ))}
          </Box>
        </Box>

        <Box sx={{ overflow: "hidden" }}>
          <Box sx={{ width: "100%" }}>
            {/* ── FIXED: header grid matches data row grid ── */}
            <Box sx={{ display: "grid", gridTemplateColumns: "52px 60px 1.4fr 1fr 1fr 1.1fr 1.2fr 1.2fr 1.1fr 120px", px: 2.5, py: 1.3, background: T.headerBg, borderBottom: `1px solid ${T.border}` }}>
              {["", "SNO", "NAME", "MOBILE", "CITY", "GSTIN", "TOTAL AMOUNT", "OUTSTANDING", "PAYMENT TERMS", "ACTIONS"].map((h, i) => (
                <Typography key={h + i} sx={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".06em" }}>
                  {h}
                </Typography>
              ))}
            </Box>

            {[...filtered].reverse().map((supplier, index) => {
              const supplierId = supplier._id;
              const isOpen = Boolean(expandedRows[supplierId]);
              const invoices = purchases
                .filter((p) => String(p.supplierId?._id || p.supplierId || "") === String(supplierId))
                .filter((p) => !p.isDraft)
                .sort((a, b) => new Date(b.createdAt || b.invoiceDate || 0) - new Date(a.createdAt || a.invoiceDate || 0));
              return (
                <Box key={supplierId} sx={{ borderBottom: `1px solid ${T.border}` }}>
                  {/* ── FIXED: data row grid matches header grid ── */}
                  <Box sx={{ display: "grid", gridTemplateColumns: "52px 60px 1.4fr 1fr 1fr 1.1fr 1.2fr 1.2fr 1.1fr 120px", px: 2.5, py: 1.8, alignItems: "center" }}>
                    <Box onClick={() => toggleExpand(supplierId)} sx={{ width: 30, height: 30, borderRadius: "999px", background: T.primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14, lineHeight: 1, fontWeight: 700 }}>
                      {isOpen ? "˄" : "˅"}
                    </Box>
                    <Typography sx={{ fontSize: 14, color: T.muted }}>{filtered.length - index}</Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: T.dark }}>{supplier.companyName || supplier.name}</Typography>
                    <Typography sx={{ fontSize: 13, color: T.text }}>{supplier.companyPhone || supplier.phone || "-"}</Typography>
                    <Typography sx={{ fontSize: 13, color: T.text }}>{supplier.city || "-"}</Typography>
                    <Typography sx={{ fontSize: 13, color: T.text }}>{supplier.gstin || "-"}</Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: T.dark }}>{fmt(supplier.totalValue || 0)}</Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: Number(supplier.totalDue || 0) > 0 ? T.danger : T.success }}>
                      {fmt(supplier.totalDue || 0)}
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: T.text }}>{supplier.paymentTerms || "-"}</Typography>
                    <Box sx={{ display: "flex", gap: 1.2 }}>
                      <Typography onClick={() => askDelete(supplier._id, supplier.companyName || supplier.name)} sx={{ fontSize: 13, fontWeight: 700, color: T.danger, cursor: "pointer" }}>
                        Delete
                      </Typography>
                    </Box>
                  </Box>

                  {isOpen && (
                    <Box sx={{ mx: 2.5, mb: 1.8, border: `1px solid ${T.border}`, borderRadius: "10px", overflow: "hidden", background: "#f8fafc" }}>
                      <Box sx={{ px: 2, py: 1, background: "#eef4fb", borderBottom: `1px solid ${T.border}` }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.dark }}>
                          Invoices ({invoices.length})
                        </Typography>
                      </Box>
                      {/* ── FIXED: invoice header grid matches invoice data row grid ── */}
                      <Box sx={{ display: "grid", gridTemplateColumns: "1.2fr 1.1fr 1.2fr 1.1fr 1.1fr 1fr 1.5fr", px: 2, py: 1.1, borderBottom: `1px solid ${T.border}`, background: T.white }}>
                        {["Invoice No", "Date", "Total", "Paid", "Due", "Status", "Actions"].map((h) => (
                          <Typography key={h} sx={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".05em" }}>
                            {h}
                          </Typography>
                        ))}
                      </Box>
                      {invoices.map((p) => {
                        const statusLabel = Number(p.totalDue || 0) <= 0 ? "Paid" : Number(p.totalPaid || 0) > 0 ? "Partial" : "Pending";
                        const badge = statusLabel === "Paid"
                          ? { bg: T.successLight, color: T.success }
                          : statusLabel === "Partial"
                            ? { bg: T.warningLight, color: T.warning }
                            : { bg: T.dangerLight, color: T.danger };
                        return (
                          <Box key={p._id} sx={{ display: "grid", gridTemplateColumns: "1.2fr 1.1fr 1.2fr 1.1fr 1.1fr 1fr 1.5fr", px: 2, py: 1.2, borderBottom: `1px solid ${T.border}`, background: T.white, "&:last-child": { borderBottom: "none" } }}>
                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.primary }}>{p.invoiceNo || p.grnNo || "-"}</Typography>
                            <Typography sx={{ fontSize: 13, color: T.text }}>{fmtDate(p.createdAt || p.invoiceDate)}</Typography>
                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.dark }}>{fmt(p.grandTotal || p.totalInvoiceAmount || 0)}</Typography>
                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.success }}>{fmt(p.totalPaid || 0)}</Typography>
                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.danger }}>{fmt(p.totalDue || 0)}</Typography>
                            <Box sx={{ display: "inline-flex", alignItems: "center", justifyContent: "center", px: 1.1, borderRadius: "10px", background: badge.bg, color: badge.color, fontSize: 12, fontWeight: 700, width: "fit-content", height: 28 }}>
                              {statusLabel}
                            </Box>
                            <Box sx={{ display: "flex", gap: 1.4, alignItems: "center" }}>
                              <Typography onClick={() => setViewSupplier(supplier)} sx={{ fontSize: 13, fontWeight: 700, color: T.primary, cursor: "pointer" }}>View</Typography>
                              <Typography onClick={() => handleEditPurchase(p)} sx={{ fontSize: 13, fontWeight: 700, color: "#7c3aed", cursor: "pointer" }}>Edit</Typography>
                              <Typography onClick={() => handlePay(supplier)} sx={{ fontSize: 13, fontWeight: 700, color: "#0284c7", cursor: "pointer" }}>Pay</Typography>
                              <Typography onClick={() => handleDeletePurchase(p)} sx={{ fontSize: 13, fontWeight: 700, color: T.danger, cursor: "pointer" }}>Delete</Typography>
                            </Box>
                          </Box>
                        );
                      })}
                      {invoices.length === 0 && (
                        <Box sx={{ px: 2, py: 2, background: T.white }}>
                          <Typography sx={{ fontSize: 13, color: T.muted }}>No invoices available for this supplier.</Typography>
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
              );
            })}

            {filtered.length === 0 && (
              <Box sx={{ px: 2.5, py: 7, textAlign: "center" }}>
                <Typography sx={{ color: T.muted, fontSize: 13 }}>
                  {search ? "No suppliers match your search." : "No suppliers yet. Click Add Supplier to begin."}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {filtered.length > 0 && (
          <Box sx={{
            px: 2.5, py: "10px",
            borderTop: `1px solid ${T.border}`,
            background: T.headerBg,
          }}>
            <Typography sx={{ fontSize: 12, color: T.muted }}>
              Showing {filtered.length} of {suppliers.length} suppliers
            </Typography>
          </Box>
        )}
      </Box>

      {/* ── View Dialog ── */}
      <ViewDialog
        supplier={viewSupplier}
        purchases={purchases}
        open={Boolean(viewSupplier)}
        onClose={() => setViewSupplier(null)}
        onEdit={handleEdit}
        onEditPurchase={handleEditPurchase}
      />

      <ConfirmDialog
        open={confirmDelete.open}
        title="Delete Supplier"
        message={`Are you sure you want to delete "${confirmDelete.name}"?`}
        confirmText="Delete"
        danger
        onClose={() => setConfirmDelete({ open: false, id: "", name: "" })}
        onConfirm={handleDelete}
      />
    </Box>
  );
};

export default SupplierDetails;
