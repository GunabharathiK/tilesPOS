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
import ConfirmDialog from "../components/common/ConfirmDialog";
import {
  createSupplier,
  deleteSupplier,
  deletePurchase,
  getPurchases,
  getSuppliers,
} from "../services/supplierService";
import toast from "react-hot-toast";
import { mapRowByFieldAliases, parseCsvRows } from "../utils/importByField";

/* ─── Design Tokens ─────────────────────────────────────────── */
const T = {
  primary:      "#1a7ec4",
  primaryDark:  "#1567a8",
  primaryLight: "#e8f4fd",
  success:      "#15803d",
  successLight: "#f0fdf4",
  danger:       "#b91c1c",
  dangerLight:  "#fef2f2",
  warning:      "#b45309",
  warningLight: "#fffbeb",
  dark:         "#1c2333",
  text:         "#374151",
  muted:        "#6b7280",
  border:       "#e2e8f0",
  bg:           "#f4f6f9",
  white:        "#ffffff",
  tableHead:    "#2980b9",
  stripe:       "#f9fafb",
  rowHover:     "#f0f7fd",
  star:         "#f59e0b",
  starEmpty:    "#e5e7eb",
  toolBtn:      "#17a2b8",
};

/* ─── Helpers ────────────────────────────────────────────────── */
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
  if (Array.isArray(supplier.brands) && supplier.brands.length > 0)
    return supplier.brands.map((b) => String(b || "").trim()).filter(Boolean);
  if (typeof supplier.brands === "string")
    return supplier.brands.split(",").map((b) => b.trim()).filter(Boolean);
  return [];
};

/* ─── Export helpers ─────────────────────────────────────────── */
const EXPORT_COLS = [
  { key: "companyName",   label: "Supplier Name"       },
  { key: "companyPhone",  label: "Mobile"              },
  { key: "companyEmail",  label: "Email"               },
  { key: "city",          label: "City"                },
  { key: "gstin",         label: "GSTIN"               },
  { key: "totalValue",    label: "Total Purchase"      },
  { key: "totalDue",      label: "Outstanding"         },
  { key: "paymentTerms",  label: "Payment Terms"       },
  { key: "paymentStatus", label: "Status"              },
];

const rowsForExport = (suppliers) =>
  suppliers.map((s) => ({
    companyName:   s.companyName || s.name || "",
    companyPhone:  s.companyPhone || s.phone || "",
    companyEmail:  s.companyEmail || "",
    city:          s.city || "",
    gstin:         s.gstin || "",
    totalValue:    Number(s.totalValue || 0).toFixed(2),
    totalDue:      Number(s.totalDue   || 0).toFixed(2),
    paymentTerms:  s.paymentTerms || "",
    paymentStatus: s.paymentStatus || "Pending",
  }));

const exportCSV = (suppliers) => {
  const data   = rowsForExport(suppliers);
  const header = EXPORT_COLS.map((c) => c.label).join(",");
  const rows   = data.map((r) => EXPORT_COLS.map((c) => `"${r[c.key] ?? ""}"`).join(","));
  const blob   = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement("a");
  a.href = url; a.download = "suppliers.csv"; a.click();
  URL.revokeObjectURL(url);
};

const exportExcel = (suppliers) => {
  const data   = rowsForExport(suppliers);
  const header = EXPORT_COLS.map((c) => c.label).join("\t");
  const rows   = data.map((r) => EXPORT_COLS.map((c) => r[c.key] ?? "").join("\t"));
  const blob   = new Blob([[header, ...rows].join("\n")], { type: "application/vnd.ms-excel" });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement("a");
  a.href = url; a.download = "suppliers.xls"; a.click();
  URL.revokeObjectURL(url);
};

const buildHTMLTable = (suppliers, title) => {
  const data = rowsForExport(suppliers);
  const ths  = EXPORT_COLS.map((c) => `<th style="padding:8px 12px;background:#2980b9;color:#fff;font-size:12px;">${c.label}</th>`).join("");
  const trs  = data.map((r, i) =>
    `<tr style="background:${i % 2 === 0 ? "#fff" : "#f9fafb"};">${
      EXPORT_COLS.map((c) => `<td style="padding:7px 12px;font-size:12px;border-bottom:1px solid #e2e8f0;">${r[c.key] ?? ""}</td>`).join("")
    }</tr>`
  ).join("");
  return `<!DOCTYPE html><html><head><title>${title}</title><style>body{font-family:sans-serif;padding:20px;}h2{margin-bottom:14px;font-size:16px;}table{border-collapse:collapse;width:100%;}th,td{text-align:left;}</style></head><body><h2>${title}</h2><table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></body></html>`;
};

const printTable = (suppliers) => {
  const w = window.open("", "_blank");
  w.document.write(buildHTMLTable(suppliers, "Suppliers List"));
  w.document.close();
  w.focus(); w.print();
};

const exportPDF = (suppliers) => {
  const html = buildHTMLTable(suppliers, "Suppliers List");
  const blob = new Blob([html], { type: "text/html" });
  const url  = URL.createObjectURL(blob);
  const w    = window.open(url, "_blank");
  setTimeout(() => { w.print(); URL.revokeObjectURL(url); }, 800);
};

const copyTable = (suppliers) => {
  const data   = rowsForExport(suppliers);
  const header = EXPORT_COLS.map((c) => c.label).join("\t");
  const rows   = data.map((r) => EXPORT_COLS.map((c) => r[c.key] ?? "").join("\t"));
  navigator.clipboard.writeText([header, ...rows].join("\n"))
    .then(() => toast.success("Copied to clipboard"));
};

/* ─── Star Rating ────────────────────────────────────────────── */
const StarRating = ({ rating = 4 }) => {
  const num = getNumericRating(rating);
  return (
    <Box sx={{ display: "flex", gap: "1px" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Box key={i} component="span" sx={{ fontSize: 13, color: i <= num ? T.star : T.starEmpty }}>★</Box>
      ))}
    </Box>
  );
};

/* ─── Detail Row (ViewDialog) ────────────────────────────────── */
const DetailRow = ({ label, value }) => (
  <Box sx={{ display: "flex", gap: 1.5, py: 0.8, borderBottom: `1px solid ${T.border}` }}>
    <Typography sx={{ fontSize: 12, color: T.muted, minWidth: 130, flexShrink: 0 }}>{label}</Typography>
    <Typography sx={{ fontSize: 12, fontWeight: 500, color: T.dark, wordBreak: "break-word" }}>{value || "-"}</Typography>
  </Box>
);

/* ─── View Dialog ────────────────────────────────────────────── */
const ViewDialog = ({ supplier, purchases, open, onClose, onEdit, onEditPurchase }) => {
  if (!supplier) return null;

  const statusBadge =
    supplier.paymentStatus === "Paid"
      ? { bg: T.successLight, color: T.success }
      : supplier.paymentStatus === "Partial"
        ? { bg: T.warningLight, color: T.warning }
        : { bg: T.dangerLight, color: T.danger };

  const supplierPurchases = purchases.filter((purchase) => {
    const pid = purchase.supplierId?._id || purchase.supplierId;
    return pid === supplier._id;
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: "10px", overflow: "hidden" } }}>
      <Box sx={{
        background: `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`,
        px: 2.5, py: 2,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Box>
          <Typography sx={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>
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
            <Typography sx={{ fontSize: 16, fontWeight: 800, color: item.color }}>
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
            <Typography sx={{ fontSize: 13, color: T.muted }}>No purchase entries available for this supplier.</Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2, maxHeight: 260, overflowY: "auto", pr: 0.5 }}>
              {supplierPurchases.map((purchase) => (
                <Box key={purchase._id} sx={{ border: `1px solid ${T.border}`, borderRadius: "8px", p: 1.5, background: "#fafbfc" }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, alignItems: "flex-start", mb: 1.2 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.dark }}>
                      {purchase.grnNo || purchase.invoiceNo}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 1.5, mb: 1.2 }}>
                    {[
                      { label: "Invoice", value: purchase.invoiceNo || "-" },
                      { label: "Date",    value: fmtDate(purchase.invoiceDate) },
                      { label: "Total",   value: fmt(purchase.grandTotal || purchase.totalInvoiceAmount || 0), color: T.dark, weight: 700 },
                      { label: "Due",     value: fmt(purchase.totalDue || 0), color: Number(purchase.totalDue || 0) > 0 ? T.danger : T.success, weight: 700 },
                    ].map((field) => (
                      <Box key={field.label}>
                        <Typography sx={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: ".5px", mb: 0.3 }}>{field.label}</Typography>
                        <Typography sx={{ fontSize: 12, color: field.color || T.text, fontWeight: field.weight || 500 }}>{field.value}</Typography>
                      </Box>
                    ))}
                  </Box>
                  <Box sx={{ border: `1px solid ${T.border}`, borderRadius: "6px", overflow: "hidden", background: T.white }}>
                    <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0,1.8fr) minmax(0,1fr) minmax(0,0.9fr) minmax(0,1fr) 80px 64px 92px 108px", px: 1.5, py: 1, background: "#f3f6fb", borderBottom: `1px solid ${T.border}` }}>
                      {["Product","Category","Finish","Brand","Size","Qty","Sqft Rate","Amount"].map((col) => (
                        <Typography key={col} sx={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".4px" }}>{col}</Typography>
                      ))}
                    </Box>
                    {(purchase.products || []).length === 0 ? (
                      <Box sx={{ px: 1.5, py: 1.2 }}>
                        <Typography sx={{ fontSize: 12, color: T.muted }}>No purchased items</Typography>
                      </Box>
                    ) : (
                      (purchase.products || []).map((item, index) => (
                        <Box key={`${purchase._id}-${index}`} sx={{ display: "grid", gridTemplateColumns: "minmax(0,1.8fr) minmax(0,1fr) minmax(0,0.9fr) minmax(0,1fr) 80px 64px 92px 108px", px: 1.5, py: 1, borderBottom: index < purchase.products.length - 1 ? `1px solid ${T.border}` : "none", alignItems: "center" }}>
                          <Typography sx={{ fontSize: 12, color: T.dark, fontWeight: 600, pr: 1 }}>{item.name || "-"}</Typography>
                          <Typography sx={{ fontSize: 12, color: T.text, pr: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.category || "-"}</Typography>
                          <Typography sx={{ fontSize: 12, color: T.text, pr: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.finish || "-"}</Typography>
                          <Typography sx={{ fontSize: 12, color: T.text, pr: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.brand || item.brands || getSupplierBrands(supplier)[0] || "-"}</Typography>
                          <Typography sx={{ fontSize: 12, color: T.text, textAlign: "center" }}>{item.size || "-"}</Typography>
                          <Typography sx={{ fontSize: 12, color: T.text, textAlign: "center" }}>{item.received || item.qty || 0}</Typography>
                          <Typography sx={{ fontSize: 12, color: T.text, fontWeight: 600, textAlign: "right" }}>₹{Number(item.price || 0).toLocaleString("en-IN")}</Typography>
                          <Typography sx={{ fontSize: 12, color: T.dark, fontWeight: 700, textAlign: "right" }}>₹{Number((Number(item.sqft) || 0) * (Number(item.price) || 0)).toLocaleString("en-IN")}</Typography>
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
          <Button onClick={onClose} sx={{ border: `1px solid ${T.border}`, color: T.text }}>Close</Button>
          <Button onClick={() => { onClose(); onEdit(supplier); }}
            sx={{ background: T.primary, color: "#fff", "&:hover": { background: T.primaryDark } }}>
            Edit Supplier
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

/* ─── Main Component ─────────────────────────────────────────── */
const PurchaseDetails = ({ onEdit, onStatsChange, embedded = false }) => {
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
  const [sortCol,       setSortCol]       = useState("");
  const [sortDir,       setSortDir]       = useState("asc");
  const [activeCols,    setActiveCols]    = useState(["name","mobile","email","city","gstin","totalValue","totalDue","paymentTerms","status"]);
  const [showColPicker, setShowColPicker] = useState(false);
  const [openAction,    setOpenAction]    = useState(null);

  const ALL_COLS = [
    { key: "name",         label: "Supplier Name"        },
    { key: "mobile",       label: "Mobile"               },
    { key: "email",        label: "Email"                },
    { key: "city",         label: "City"                 },
    { key: "gstin",        label: "GSTIN"                },
    { key: "totalValue",   label: "Purchase Due"         },
    { key: "totalDue",     label: "Purchase Return Due"  },
    { key: "paymentTerms", label: "Payment Terms"        },
    { key: "status",       label: "Status"               },
  ];

  const displayCols = ALL_COLS.filter((c) => activeCols.includes(c.key));

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

  /* ── Filter ── */
  const filtered = useMemo(() => {
    let list = suppliers.filter((supplier) => {
      const q          = search.trim().toLowerCase();
      const categories = getSupplierCategories(supplier);
      const matchSearch =
        !q ||
        (supplier.companyName || supplier.name || "").toLowerCase().includes(q) ||
        (supplier.city         || "").toLowerCase().includes(q) ||
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

    if (sortCol) {
      list.sort((a, b) => {
        const av = a[sortCol] ?? "", bv = b[sortCol] ?? "";
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return list;
  }, [suppliers, search, stateFilter, balFilter, productFilter, paymentTab, sortCol, sortDir]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  /* ── Import ── */
  const importAliases = {
    companyName:   ["name","suppliername","dealername","company"],
    supplierName:  ["contactperson","ownername","owner"],
    companyPhone:  ["phone","mobile","primarymobile","contactnumber"],
    altPhone:      ["alternatemobile","altmobile","landline"],
    companyEmail:  ["email","mail"],
    companyAddress:["address","fulladdress"],
    city:          ["town"],
    state:         ["province"],
    pincode:       ["pin","zipcode","postalcode"],
    gstin:         ["gst","gstno"],
    paymentTerms:  ["terms","paymentterm"],
    creditLimit:   ["credit","creditlimitrs"],
    discountPct:   ["discount","discountpct"],
    bankName:      ["bank"],
    accountNo:     ["accountnumber","bankaccountno"],
    ifscCode:      ["ifsc"],
    upiId:         ["upi"],
    categories:    ["category","categories","products","productssupplied"],
    productNames:  ["productname","productnames","item","items","productsname"],
    brands:        ["brand","brandssupplied"],
    internalNotes: ["notes","remark","remarks"],
  };

  const normalizePhone = (value = "") => String(value).replace(/\D/g, "").slice(0, 15);

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setImporting(true);
      const text = await file.text();
      const rows = parseCsvRows(text);
      if (!rows.length) { toast.error("No import rows found"); return; }

      const payloads = rows
        .map((row) => mapRowByFieldAliases(row, importAliases))
        .map((mapped) => {
          const companyName  = String(mapped.companyName  || "").trim();
          const companyPhone = normalizePhone(mapped.companyPhone || "");
          if (!companyName || !companyPhone) return null;
          return {
            name: companyName, phone: companyPhone, address: String(mapped.companyAddress || "").trim(),
            companyName, supplierName: String(mapped.supplierName || "").trim(),
            companyPhone, altPhone: normalizePhone(mapped.altPhone || ""),
            companyEmail: String(mapped.companyEmail || "").trim(),
            companyAddress: String(mapped.companyAddress || "").trim(),
            city: String(mapped.city || "").trim(), state: String(mapped.state || "").trim(),
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
            categories: String(mapped.categories || "").split(/[|,;/]/).map((p) => p.trim()).filter(Boolean),
            productNames: String(mapped.productNames || "").split(/[|,;/]/).map((p) => p.trim()).filter(Boolean),
          };
        })
        .filter(Boolean);

      if (!payloads.length) { toast.error("Required fields missing. Ensure file has Company Name and Mobile columns."); return; }
      const results = await Promise.allSettled(payloads.map((payload) => createSupplier(payload)));
      const success = results.filter((r) => r.status === "fulfilled").length;
      const failed  = results.length - success;
      await fetchSuppliers();
      if (failed > 0) toast.success(`Imported ${success}, skipped ${failed}`);
      else toast.success(`Imported ${success} supplier(s)`);
    } catch { toast.error("Import failed. Use CSV with header row."); }
    finally { setImporting(false); }
  };

  const handleEdit = (supplier) => {
    setViewSupplier(null);
    if (onEdit) { onEdit(supplier); return; }
    navigate("/suppliers/create", { state: { editSupplier: supplier } });
  };

  const handleEditPurchase = (purchase) => {
    setViewSupplier(null);
    const purchaseSupplier = suppliers.find((s) => s._id === (purchase.supplierId?._id || purchase.supplierId));
    navigate("/suppliers/products", {
      state: { supplierId: purchase.supplierId?._id || purchase.supplierId, supplier: purchaseSupplier || purchase.supplierId || null, editPurchase: purchase },
    });
  };

  const toggleExpand = (supplierId) =>
    setExpandedRows((prev) => ({ ...prev, [supplierId]: !prev[supplierId] }));

  const handleDeletePurchase = async (purchase) => {
    if (!purchase?._id) return;
    const ok = window.confirm(`Delete invoice ${purchase.invoiceNo || purchase.grnNo || ""}?`);
    if (!ok) return;
    try {
      await deletePurchase(purchase._id);
      toast.success("Invoice deleted");
      fetchSuppliers();
    } catch { toast.error("Failed to delete invoice"); }
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
    } catch { toast.error("Delete failed"); }
  };

  const handleAddSupplier = () =>
    onEdit ? onEdit(null) : navigate("/suppliers/create");

  /* ── Sort icon ── */
  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <span style={{ opacity: 0.4, fontSize: 10, marginLeft: 3 }}>⇅</span>;
    return <span style={{ fontSize: 10, marginLeft: 3 }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  /* ── Select base style ── */
  const selStyle = {
    padding: "5px 26px 5px 9px", border: `1px solid ${T.border}`, borderRadius: "4px",
    fontSize: 13, color: T.text, background: T.white, cursor: "pointer",
    outline: "none", appearance: "auto", fontFamily: "inherit",
  };

  /* ── Row height constant for 10-row max ── */
  const ROW_H = 43; // px — approximate height of each data row
  const MAX_VISIBLE_ROWS = 10;

  /* ════════════════════════ RENDER ════════════════ */
  return (
    <Box sx={{ background: embedded ? "transparent" : T.bg, minHeight: embedded ? "auto" : "100%", fontFamily: "'Noto Sans', sans-serif" }}>
      <Box sx={{ p: embedded ? 0 : 2.5 }}>
        <Box sx={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: "6px", boxShadow: "0 1px 4px rgba(0,0,0,.06)", overflow: "visible" }}>

          {/* ── Card title + New Supplier ── */}
          <Box sx={{ px: 2.5, py: 1.6, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: T.dark }}>Suppliers List</Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Box onClick={() => importInputRef.current?.click()}
                sx={{ display: "inline-flex", alignItems: "center", gap: "5px", px: 1.6, py: "7px", borderRadius: "4px", cursor: "pointer", border: `1px solid ${T.border}`, background: T.white, fontSize: 12, fontWeight: 600, color: T.text, "&:hover": { background: T.bg }, transition: "background .12s", userSelect: "none" }}>
                <UploadFileIcon sx={{ fontSize: 15, color: "#16a34a" }} />
                {importing ? "Importing..." : "Import CSV"}
              </Box>
              <input ref={importInputRef} type="file" accept=".csv,text/csv" hidden onChange={handleImportFile} />
              <Box onClick={handleAddSupplier}
                sx={{ display: "inline-flex", alignItems: "center", gap: "5px", px: 1.8, py: "7px", borderRadius: "4px", cursor: "pointer", background: T.primary, color: "#fff", fontSize: 13, fontWeight: 700, "&:hover": { background: T.primaryDark }, transition: "background .12s", userSelect: "none" }}>
                + New Supplier
              </Box>
            </Box>
          </Box>

          <Box sx={{ p: 2 }}>

            {/* ── Toolbar ── */}
            <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5, mb: 1.8 }}>

              {/* Left: entry count */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: 13, color: T.text }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.dark }}>All Suppliers</Typography>
                <Box sx={{ px: 1.2, py: "2px", background: T.primaryLight, border: `1px solid #bfd6f6`, fontSize: 11, fontWeight: 700, color: T.primary, borderRadius: "3px" }}>
                  {filtered.length}
                </Box>
              </Box>

              {/* Right: export + filters + search */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, flexWrap: "wrap", position: "relative" }}>

                {/* Export toolbar buttons */}
                {[
                  { label: "Copy",    fn: () => copyTable(filtered)    },
                  { label: "Excel",   fn: () => exportExcel(filtered)  },
                  { label: "PDF",     fn: () => exportPDF(filtered)    },
                  { label: "Print",   fn: () => printTable(filtered)   },
                  { label: "CSV",     fn: () => exportCSV(filtered)    },
                  { label: "Columns", fn: () => setShowColPicker((p) => !p) },
                ].map(({ label, fn }) => (
                  <Box key={label} onClick={fn} sx={{ px: 1.3, py: "5px", borderRadius: "3px", background: T.toolBtn, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", userSelect: "none", "&:hover": { filter: "brightness(.9)" }, transition: "filter .12s" }}>
                    {label}
                  </Box>
                ))}

                {/* Columns picker */}
                {showColPicker && (
                  <Box sx={{ position: "absolute", top: "110%", right: 0, zIndex: 9999, background: T.white, border: `1px solid ${T.border}`, borderRadius: "5px", p: 1.5, minWidth: 200, boxShadow: "0 4px 20px rgba(0,0,0,.12)" }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", mb: 1 }}>Toggle Columns</Typography>
                    {ALL_COLS.map((col) => (
                      <Box key={col.key} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.7, cursor: "pointer" }}
                        onClick={() => setActiveCols((prev) => prev.includes(col.key) ? (prev.length > 1 ? prev.filter((k) => k !== col.key) : prev) : [...prev, col.key])}>
                        <input type="checkbox" readOnly checked={activeCols.includes(col.key)} style={{ cursor: "pointer", accentColor: T.primary }} />
                        <Typography sx={{ fontSize: 13, color: T.text }}>{col.label}</Typography>
                      </Box>
                    ))}
                    <Box onClick={() => setShowColPicker(false)} sx={{ mt: 1, fontSize: 12, color: T.primary, cursor: "pointer", textAlign: "right" }}>Close ✕</Box>
                  </Box>
                )}

                {/* Filter selects */}
                <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} style={{ ...selStyle, marginLeft: 6 }}>
                  {["All States","Tamil Nadu","Karnataka","Gujarat","Andhra Pradesh","Kerala","Maharashtra"].map((o) => <option key={o}>{o}</option>)}
                </select>
                <select value={balFilter} onChange={(e) => setBalFilter(e.target.value)} style={selStyle}>
                  {["All Balance","Has Payable","Cleared"].map((o) => <option key={o}>{o}</option>)}
                </select>
                <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)} style={selStyle}>
                  {productOptions.map((o) => <option key={o}>{o}</option>)}
                </select>

                {/* Search */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, ml: 0.5, fontSize: 13, color: T.text }}>
                  <span style={{ fontWeight: 500 }}>Search:</span>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ padding: "5px 9px", border: `1px solid ${T.border}`, borderRadius: "4px", fontSize: 13, color: T.text, background: T.white, outline: "none", width: 180, fontFamily: "inherit" }}
                    onFocus={(e) => e.target.style.borderColor = T.primary}
                    onBlur={(e) => e.target.style.borderColor = T.border}
                  />
                </Box>
              </Box>
            </Box>

            {/* ── Payment tabs ── */}
            <Box sx={{ display: "flex", gap: 0.6, mb: 1.5 }}>
              {["All","Pending","Paid"].map((tab) => (
                <Box key={tab} onClick={() => setPaymentTab(tab)}
                  sx={{ px: 1.6, py: "5px", borderRadius: "3px", cursor: "pointer", fontSize: 12, fontWeight: 700, userSelect: "none",
                    background: paymentTab === tab ? T.tableHead : T.bg,
                    color:      paymentTab === tab ? "#fff"       : T.muted,
                    "&:hover":  paymentTab !== tab ? { background: "#e8f4fd" } : {},
                    transition: "all .12s",
                  }}>
                  {tab}
                </Box>
              ))}
            </Box>

            {/* ── Table ── */}
            <Box sx={{ border: `1px solid ${T.border}`, borderRadius: "4px", overflow: "hidden" }}>

              {/* Sticky header — outside scroll container */}
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700, fontSize: 13 }}>
                <thead>
                  <tr style={{ background: T.tableHead }}>
                    <th style={{ width: 40, padding: "10px 10px", textAlign: "center", borderRight: "1px solid rgba(255,255,255,.15)", color: "#fff" }}>#</th>
                    <th style={{ width: 36, padding: "10px 8px", textAlign: "center", borderRight: "1px solid rgba(255,255,255,.15)" }}>
                      <input type="checkbox" style={{ cursor: "pointer", accentColor: "#fff" }} onChange={() => {}} />
                    </th>
                    {displayCols.map((col) => (
                      <th key={col.key} onClick={() => handleSort(col.key)}
                        style={{ padding: "10px 12px", textAlign: "left", color: "#fff", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", fontSize: 13, fontFamily: "inherit", borderRight: "1px solid rgba(255,255,255,.15)", userSelect: "none" }}>
                        {col.label}<SortIcon col={col.key} />
                      </th>
                    ))}
                  </tr>
                </thead>
              </table>

              {/* Scrollable body — ~10 rows before scroll */}
              <Box
                sx={{
                  overflowY: "auto",
                  maxHeight: `${ROW_H * MAX_VISIBLE_ROWS}px`,
                  "&::-webkit-scrollbar": { width: 6 },
                  "&::-webkit-scrollbar-track": { background: T.stripe },
                  "&::-webkit-scrollbar-thumb": { background: T.border, borderRadius: 3 },
                  "&::-webkit-scrollbar-thumb:hover": { background: T.muted },
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700, fontSize: 13 }}>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={displayCols.length + 2} style={{ padding: "28px", textAlign: "center", color: T.muted, fontSize: 13 }}>
                          {search ? "No matching records found" : "No suppliers yet. Click + New Supplier to begin."}
                        </td>
                      </tr>
                    ) : filtered.map((supplier, idx) => {
                      const rowBg      = idx % 2 === 0 ? T.white : T.stripe;
                      const isExpanded = Boolean(expandedRows[supplier._id]);
                      const invoices   = purchases
                        .filter((p) => String(p.supplierId?._id || p.supplierId || "") === String(supplier._id))
                        .filter((p) => !p.isDraft)
                        .sort((a, b) => new Date(b.createdAt || b.invoiceDate || 0) - new Date(a.createdAt || a.invoiceDate || 0));

                      const getCellValue = (col) => {
                        switch (col.key) {
                          case "name":         return supplier.companyName || supplier.name || "—";
                          case "mobile":       return supplier.companyPhone || supplier.phone || "—";
                          case "email":        return supplier.companyEmail || "—";
                          case "city":         return supplier.city || "—";
                          case "gstin":        return supplier.gstin || "—";
                          case "totalValue":   return Number(supplier.totalValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
                          case "totalDue":     return Number(supplier.totalDue   || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
                          case "paymentTerms": return supplier.paymentTerms || "—";
                          case "status":       return supplier.paymentStatus || "Pending";
                          default:             return "—";
                        }
                      };

                      return (
                        <>
                          {/* ── Main supplier row — click anywhere to expand ── */}
                          <tr
                            key={supplier._id}
                            onClick={() => toggleExpand(supplier._id)}
                            style={{
                              borderBottom: `1px solid ${T.border}`,
                              background: isExpanded ? T.primaryLight : rowBg,
                              cursor: "pointer",
                              transition: "background .1s",
                            }}
                            onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = T.rowHover; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = isExpanded ? T.primaryLight : rowBg; }}
                          >
                            {/* Expand indicator (decorative, pointer-events: none) */}
                            <td style={{ width: 40, padding: "10px 10px", textAlign: "center", borderRight: `1px solid ${T.border}` }}>
                              <Box sx={{ width: 22, height: 22, borderRadius: "3px", background: isExpanded ? T.primary : "#e0eaf4", color: isExpanded ? "#fff" : T.primary, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, userSelect: "none", pointerEvents: "none" }}>
                                {isExpanded ? "−" : "+"}
                              </Box>
                            </td>

                            {/* Checkbox — stop propagation so it doesn't toggle expand */}
                            <td style={{ padding: "10px 8px", textAlign: "center", borderRight: `1px solid ${T.border}` }} onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox" style={{ cursor: "pointer", accentColor: T.primary }} />
                            </td>

                            {/* Data cells */}
                            {displayCols.map((col) => {
                              const raw = getCellValue(col);
                              let content;

                              if (col.key === "status") {
                                const isActive = String(raw).toLowerCase() !== "pending" && String(raw).toLowerCase() !== "inactive";
                                content = (
                                  <Box sx={{ display: "inline-block", px: 1.1, py: "3px", borderRadius: "3px", fontSize: 11.5, fontWeight: 700, background: isActive ? T.success : T.muted, color: "#fff" }}>
                                    {isActive ? "Active" : raw}
                                  </Box>
                                );
                              } else if (col.key === "totalValue") {
                                content = <span style={{ fontWeight: 600, color: T.dark }}>{raw}</span>;
                              } else if (col.key === "totalDue") {
                                const val = Number(supplier.totalDue || 0);
                                content = <span style={{ fontWeight: 700, color: val > 0 ? T.danger : T.muted }}>{raw}</span>;
                              } else {
                                content = <span style={{ color: T.text }}>{raw}</span>;
                              }

                              return (
                                <td key={col.key} style={{ padding: "10px 12px", borderRight: `1px solid ${T.border}`, verticalAlign: "middle" }}>
                                  {content}
                                </td>
                              );
                            })}
                          </tr>

                          {/* ── Expanded invoice rows ── */}
                          {isExpanded && (
                            <tr key={`${supplier._id}-expand`}>
                              <td colSpan={displayCols.length + 2} style={{ padding: "0 16px 16px 40px", background: "#f0f7fd", borderBottom: `1px solid ${T.border}` }}>
                                <Box sx={{ border: `1px solid ${T.border}`, borderRadius: "5px", overflow: "hidden", mt: 1 }}>
                                  <Box sx={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1.1fr 1fr 1fr 0.9fr 1.4fr", px: 2, py: 1.2, background: "#eef4fb", borderBottom: `1px solid ${T.border}` }}>
                                    {["Invoice No","Date","Total","Paid","Due","Status","Actions"].map((h) => (
                                      <Typography key={h} sx={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".05em" }}>{h}</Typography>
                                    ))}
                                  </Box>
                                  {invoices.length === 0 ? (
                                    <Box sx={{ px: 2, py: 2, background: T.white }}>
                                      <Typography sx={{ fontSize: 13, color: T.muted }}>No invoices for this supplier.</Typography>
                                    </Box>
                                  ) : invoices.map((p) => {
                                    const statusLabel = Number(p.totalDue || 0) <= 0 ? "Paid" : Number(p.totalPaid || 0) > 0 ? "Partial" : "Pending";
                                    const badge = statusLabel === "Paid"
                                      ? { bg: T.successLight, color: T.success }
                                      : statusLabel === "Partial"
                                        ? { bg: T.warningLight, color: T.warning }
                                        : { bg: T.dangerLight, color: T.danger };
                                    return (
                                      <Box key={p._id} sx={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1.1fr 1fr 1fr 0.9fr 1.4fr", px: 2, py: 1.2, borderBottom: `1px solid ${T.border}`, background: T.white, "&:last-child": { borderBottom: "none" }, alignItems: "center" }}>
                                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.primary }}>{p.invoiceNo || p.grnNo || "—"}</Typography>
                                        <Typography sx={{ fontSize: 13, color: T.text }}>{fmtDate(p.createdAt || p.invoiceDate)}</Typography>
                                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.dark }}>{fmt(p.grandTotal || p.totalInvoiceAmount || 0)}</Typography>
                                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.success }}>{fmt(p.totalPaid || 0)}</Typography>
                                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.danger }}>{fmt(p.totalDue || 0)}</Typography>
                                        <Box sx={{ display: "inline-flex", alignItems: "center", px: 1, py: "3px", borderRadius: "3px", background: badge.bg, color: badge.color, fontSize: 11, fontWeight: 700 }}>
                                          {statusLabel}
                                        </Box>
                                        <Box sx={{ display: "flex", gap: 1.2, alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                                          <Typography onClick={() => setViewSupplier(supplier)} sx={{ fontSize: 12, fontWeight: 700, color: T.primary, cursor: "pointer", "&:hover": { textDecoration: "underline" } }}>View</Typography>
                                          <Typography onClick={() => handleEditPurchase(p)} sx={{ fontSize: 12, fontWeight: 700, color: "#7c3aed", cursor: "pointer", "&:hover": { textDecoration: "underline" } }}>Edit</Typography>
                                          <Typography onClick={() => handlePay(supplier)} sx={{ fontSize: 12, fontWeight: 700, color: "#0284c7", cursor: "pointer", "&:hover": { textDecoration: "underline" } }}>Pay</Typography>
                                          <Typography onClick={() => handleDeletePurchase(p)} sx={{ fontSize: 12, fontWeight: 700, color: T.danger, cursor: "pointer", "&:hover": { textDecoration: "underline" } }}>Delete</Typography>
                                        </Box>
                                      </Box>
                                    );
                                  })}
                                </Box>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </Box>

              {/* Footer: entry count */}
              <Box sx={{ px: 2, py: 1.2, borderTop: `1px solid ${T.border}`, background: T.stripe }}>
                <Typography sx={{ fontSize: 13, color: T.muted }}>
                  Showing all{" "}
                  <Box component="span" sx={{ fontWeight: 700, color: T.dark }}>{filtered.length}</Box>{" "}
                  {filtered.length === 1 ? "entry" : "entries"}
                  {(search || stateFilter !== "All States" || balFilter !== "All Balance" || productFilter !== "All Categories") &&
                    ` (filtered from ${suppliers.length} total)`}
                </Typography>
              </Box>
            </Box>

          </Box>
        </Box>
      </Box>

      {/* Overlay to close dropdowns */}
      {(openAction || showColPicker) && (
        <Box sx={{ position: "fixed", inset: 0, zIndex: 9998 }} onClick={() => { setOpenAction(null); setShowColPicker(false); }} />
      )}

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

export default PurchaseDetails;
