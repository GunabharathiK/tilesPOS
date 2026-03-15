import { Box, Typography } from "@mui/material";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createSupplier, updateSupplier } from "../../services/supplierService";
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

const INDIA_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
  "Uttarakhand","West Bengal","Delhi","Jammu and Kashmir","Ladakh",
  "Puducherry","Chandigarh","Andaman and Nicobar Islands","Dadra and Nagar Haveli",
  "Daman and Diu","Lakshadweep",
];

/* ── Zero-radius input styles ── */
const inputBase = {
  width: "100%", padding: "8px 10px",
  border: `1px solid ${T.border}`, borderRadius: 0,
  fontFamily: "'Noto Sans', sans-serif", fontSize: 13,
  color: T.text, background: T.surface, outline: "none",
  boxSizing: "border-box", lineHeight: 1.5,
  transition: "border-color .14s, box-shadow .14s",
};

const selBase = {
  ...inputBase, cursor: "pointer", appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", paddingRight: 30,
};

const txtareaBase = { ...inputBase, resize: "vertical", minHeight: 76 };

const onFocus = e => { e.target.style.borderColor = T.primary; e.target.style.boxShadow = "0 0 0 3px rgba(26,86,160,.08)"; };
const onBlur  = e => { e.target.style.borderColor = T.border;  e.target.style.boxShadow = "none"; };

/* ── Field label ── */
const Lbl = ({ children, req }) => (
  <div style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 5 }}>
    {children}{req && <span style={{ color: T.danger }}> *</span>}
  </div>
);

/* ── Field wrapper ── */
const F = ({ label, req, children, span }) => (
  <Box sx={{ gridColumn: span ? `span ${span}` : undefined }}>
    <Lbl req={req}>{label}</Lbl>
    {children}
  </Box>
);

/* ── Section divider with label ── */
const Sec = ({ icon, label }) => (
  <Box sx={{ gridColumn: "span 2", display: "flex", alignItems: "center", gap: 1, pt: 0.5 }}>
    <Box sx={{ height: 1, background: T.border, flex: 1 }} />
    <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".08em", display: "flex", alignItems: "center", gap: 0.6 }}>
      <span style={{ fontSize: 13 }}>{icon}</span>{label}
    </Typography>
    <Box sx={{ height: 1, background: T.border, flex: 1 }} />
  </Box>
);

/* ── Card with header ── */
const Card = ({ icon, title, accent, children }) => (
  <Box sx={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: "0 1px 3px rgba(15,23,42,.06)", overflow: "hidden" }}>
    <Box sx={{ px: 2.5, py: 1.5, borderBottom: `2px solid ${accent || T.primary}`, background: `linear-gradient(to right, ${T.primaryLight}, ${T.surface})`, display: "flex", alignItems: "center", gap: 1 }}>
      <Box sx={{ fontSize: 15, lineHeight: 1 }}>{icon}</Box>
      <Typography sx={{ fontSize: 13, fontWeight: 800, color: T.dark }}>{title}</Typography>
    </Box>
    <Box sx={{ p: 2.5, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
      {children}
    </Box>
  </Box>
);

/* ── Action button ── */
const Btn = ({ children, onClick, disabled, variant = "primary" }) => {
  const v = {
    primary: { bg: T.success,  color: "#fff",   border: "none",                   hover: "#166534" },
    outline: { bg: T.surface,  color: T.muted,  border: `1px solid ${T.border}`,  hover: T.surfaceAlt, hoverColor: T.primary, hoverBorder: T.primary },
  }[variant];
  return (
    <Box onClick={!disabled ? onClick : undefined} sx={{
      display: "inline-flex", alignItems: "center", gap: "6px",
      px: 2.2, py: "9px", fontSize: 13, fontWeight: 700,
      cursor: disabled ? "default" : "pointer", userSelect: "none",
      background: disabled ? "#e2e8f0" : v.bg, color: disabled ? T.faint : v.color,
      border: v.border || "none", opacity: disabled ? 0.7 : 1,
      transition: "all .14s",
      "&:hover": !disabled ? { background: v.hover, color: v.hoverColor || v.color, ...(v.hoverBorder ? { borderColor: v.hoverBorder } : {}) } : {},
    }}>
      {children}
    </Box>
  );
};

/* ═══════════════════════════════════════════════════════ */
const SupplierCreate = ({ onBack, editSupplier: editProp }) => {
  const navigate      = useNavigate();
  const location      = useLocation();
  const editSupplier  = editProp || location.state?.editSupplier || null;
  const isEdit        = !!editSupplier;

  const [loading,        setLoading]        = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);

  const normalizeTextList = (list = []) =>
    [...new Set((Array.isArray(list) ? list : String(list || "").split(",")).map(i => String(i || "").trim()).filter(Boolean))];

  /* ── Form state ── */
  const [form, setForm] = useState({
    companyName: "", supplierName: "", designation: "", companyPhone: "", altPhone: "",
    companyEmail: "", companyWebsite: "", companyAddress: "", city: "", state: "", pincode: "",
    categories: [], productNames: [], productsSupplied: [], brands: [],
    gstin: "", panNumber: "", stateCode: "", registrationType: "Regular (GST)",
    paymentTerms: "Advance Payment", creditLimit: "", discountPct: "",
    freight: "Supplier Pays (Free Delivery)",
    bankName: "", accountNo: "", ifscCode: "", accountHolder: "", branch: "",
    accountType: "Current Account", upiId: "",
    rating: "5 Star - Excellent", priority: "Primary Supplier", internalNotes: "",
    licNo: "", supplierPhone: "",
  });

  /* ── Pre-fill on edit ── */
  useEffect(() => {
    if (!editSupplier) return;
    setForm({
      companyName:      editSupplier.companyName    || editSupplier.name  || "",
      supplierName:     editSupplier.supplierName   || editSupplier.name  || "",
      designation:      editSupplier.designation    || "",
      companyPhone:     editSupplier.companyPhone   || editSupplier.phone || "",
      altPhone:         editSupplier.altPhone        || "",
      companyEmail:     editSupplier.companyEmail   || "",
      companyWebsite:   editSupplier.companyWebsite || "",
      companyAddress:   editSupplier.companyAddress || editSupplier.address || "",
      city:             editSupplier.city    || "",
      state:            editSupplier.state   || "",
      pincode:          editSupplier.pincode || "",
      categories:        editSupplier.categories        || editSupplier.productsSupplied || [],
      productNames:      normalizeTextList(editSupplier.productNames || (Array.isArray(editSupplier.items) ? editSupplier.items.map(i => i?.name) : [])),
      productsSupplied:  editSupplier.categories        || editSupplier.productsSupplied || [],
      brands:           normalizeTextList(editSupplier.brands),
      gstin:            editSupplier.gstin            || "",
      panNumber:        editSupplier.panNumber        || "",
      stateCode:        editSupplier.stateCode        || "",
      registrationType: editSupplier.registrationType || "Regular (GST)",
      paymentTerms:     editSupplier.paymentTerms     || "Advance Payment",
      creditLimit:      editSupplier.creditLimit      || "",
      discountPct:      editSupplier.discountPct      || "",
      freight:          editSupplier.freight          || "Supplier Pays (Free Delivery)",
      bankName:         editSupplier.bankName         || "",
      accountNo:        editSupplier.accountNo        || "",
      ifscCode:         editSupplier.ifscCode         || "",
      accountHolder:    editSupplier.accountHolder    || "",
      branch:           editSupplier.branch           || "",
      accountType:      editSupplier.accountType      || "Current Account",
      upiId:            editSupplier.upiId            || "",
      rating:           editSupplier.rating           || "5 Star - Excellent",
      priority:         editSupplier.priority         || "Primary Supplier",
      internalNotes:    editSupplier.internalNotes    || "",
      licNo:            editSupplier.licNo            || "",
      supplierPhone:    (editSupplier.supplierPhone && editSupplier.supplierPhone !== editSupplier.companyPhone) ? editSupplier.supplierPhone : "",
    });
  }, [editSupplier]);

  /* ── Pincode auto-fill ── */
  const handlePincode = async (val) => {
    const v = val.replace(/\D/g, "").slice(0, 6);
    setForm(f => ({ ...f, pincode: v }));
    if (v.length === 6) {
      setPincodeLoading(true);
      try {
        const res  = await fetch(`https://api.postalpincode.in/pincode/${v}`);
        const data = await res.json();
        if (data[0]?.Status === "Success") {
          const post = data[0].PostOffice[0];
          setForm(f => ({ ...f, state: post.State, city: post.District }));
          toast.success("Location auto-filled ✅");
        }
      } catch { /**/ }
      finally { setPincodeLoading(false); }
    }
  };

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }));

  /* ── Validate ── */
  const validate = () => {
    if (!form.companyName.trim())    { toast.error("Company / Supplier Name is required"); return false; }
    if (!form.companyPhone.trim())   { toast.error("Primary Mobile is required");           return false; }
    if (!form.companyAddress.trim()) { toast.error("Full Address is required");             return false; }
    if (!form.city.trim())           { toast.error("City / Town is required");              return false; }
    if (!form.state.trim())          { toast.error("State is required");                    return false; }
    if (!form.pincode.trim())        { toast.error("Pincode is required");                  return false; }
    return true;
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (!validate()) return;
    const nCat     = normalizeTextList(form.categories);
    const nNames   = normalizeTextList(form.productNames);
    const nBrands  = normalizeTextList(form.brands);
    const payload  = {
      name: form.companyName, phone: form.companyPhone, address: form.companyAddress,
      companyName: form.companyName, companyEmail: form.companyEmail, companyWebsite: form.companyWebsite,
      companyPhone: form.companyPhone, companyAddress: form.companyAddress, licNo: form.licNo, gstin: form.gstin,
      supplierName: form.supplierName, supplierPhone: form.supplierPhone || form.companyPhone,
      designation: form.designation, altPhone: form.altPhone,
      city: form.city, state: form.state, pincode: form.pincode,
      categories: nCat, productNames: nNames, productsSupplied: nCat, brands: nBrands.join(", "),
      panNumber: form.panNumber, stateCode: form.stateCode, registrationType: form.registrationType,
      paymentTerms: form.paymentTerms,
      creditLimit: form.creditLimit ? Number(form.creditLimit) : 0,
      discountPct: form.discountPct ? Number(form.discountPct) : 0,
      freight: form.freight,
      bankName: form.bankName, accountNo: form.accountNo, ifscCode: form.ifscCode,
      accountHolder: form.accountHolder, branch: form.branch, accountType: form.accountType, upiId: form.upiId,
      rating: form.rating, priority: form.priority, internalNotes: form.internalNotes,
      items: [], totalPaid: 0, paymentStatus: "Pending",
    };
    setLoading(true);
    try {
      if (isEdit) { await updateSupplier(editSupplier._id, payload); toast.success("Supplier updated ✅"); }
      else        { await createSupplier(payload); toast.success("Supplier added successfully! ✅"); }
      navigate("/suppliers/products");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Operation failed");
    } finally { setLoading(false); }
  };

  const handleCancel = () => onBack ? onBack() : navigate("/suppliers");

  /* ─────────────────────────────────── RENDER ─────────── */
  return (
    <Box sx={{ fontFamily: "'Noto Sans', sans-serif", background: T.bg, minHeight: "100%", p: 0 }}>

      {/* ── Page header ── */}
      <Box sx={{ px: 3, py: 1.8, background: T.surface, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
        <Box>
          <Typography sx={{ fontSize: 20, fontWeight: 800, color: T.dark, lineHeight: 1.2, letterSpacing: "-.01em" }}>
            {isEdit ? "Edit Supplier" : "Add New Supplier"}
          </Typography>
          <Typography sx={{ fontSize: 12, color: T.muted, mt: 0.2 }}>
            {isEdit ? "Update supplier details and financial information" : "Fill in supplier details to add to your network"}
          </Typography>
        </Box>
        {/* Action buttons in header */}
        <Box sx={{ display: "flex", gap: 1 }}>
          <Btn onClick={handleSubmit} disabled={loading} variant="primary">
            {loading ? (isEdit ? "Updating…" : "Saving…") : (isEdit ? "✅ Update Supplier" : "✅ Save Supplier")}
          </Btn>
          <Btn onClick={handleCancel} variant="outline">Cancel</Btn>
        </Box>
      </Box>

      {/* ── Two-column layout ── */}
      <Box sx={{ px: 2.5, pb: 3, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, alignItems: "start" }}>

        {/* ══ LEFT CARD — Basic Details ══ */}
        <Card icon="🏭" title={isEdit ? "Edit Supplier — Basic Details" : "Add New Supplier — Basic Details"}>

          <Sec icon="🏢" label="Company Information" />

          <F label="Company / Supplier Name" req span={2}>
            <input style={inputBase} placeholder="e.g. Kajaria Ceramics Limited" value={form.companyName} onChange={set("companyName")} onFocus={onFocus} onBlur={onBlur} />
          </F>

          <F label="Contact Person Name">
            <input style={inputBase} placeholder="Sales Manager / Owner name" value={form.supplierName} onChange={set("supplierName")} onFocus={onFocus} onBlur={onBlur} />
          </F>
          <F label="Designation">
            <input style={inputBase} placeholder="Sales Manager / Owner" value={form.designation} onChange={set("designation")} onFocus={onFocus} onBlur={onBlur} />
          </F>

          <F label="Primary Mobile" req>
            <input style={inputBase} placeholder="9876543210" maxLength={10}
              value={form.companyPhone}
              onChange={e => setForm(f => ({ ...f, companyPhone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
              onFocus={onFocus} onBlur={onBlur} />
          </F>
          <F label="Alternate Mobile / Landline">
            <input style={inputBase} placeholder="0427-2234567" value={form.altPhone} onChange={set("altPhone")} onFocus={onFocus} onBlur={onBlur} />
          </F>

          <F label="Email Address">
            <input style={inputBase} placeholder="sales@kajaria.com" type="email" value={form.companyEmail} onChange={set("companyEmail")} onFocus={onFocus} onBlur={onBlur} />
          </F>
          <F label="Website">
            <input style={inputBase} placeholder="www.kajaria.com" value={form.companyWebsite} onChange={set("companyWebsite")} onFocus={onFocus} onBlur={onBlur} />
          </F>

          <Sec icon="📍" label="Address Details" />

          <F label="Full Address (Door No, Street, Area)" req span={2}>
            <textarea style={txtareaBase} placeholder="45, Industrial Area, Guindy..."
              value={form.companyAddress} onChange={set("companyAddress")} onFocus={onFocus} onBlur={onBlur} />
          </F>

          <F label="City / Town" req>
            <input style={inputBase} placeholder="Chennai" value={form.city} onChange={set("city")} onFocus={onFocus} onBlur={onBlur} />
          </F>
          <F label="State" req>
            <select style={selBase} value={form.state} onChange={set("state")} onFocus={onFocus} onBlur={onBlur}>
              <option value="">— Select State —</option>
              {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </F>

          <F label="Pincode" req>
            <input style={inputBase} placeholder="600032" maxLength={6}
              value={form.pincode} onChange={e => handlePincode(e.target.value)}
              onFocus={onFocus} onBlur={onBlur} />
            {pincodeLoading && <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>Fetching location…</div>}
          </F>
          <Box /> {/* spacer */}

          <Sec icon="⭐" label="Rating & Notes" />

          <F label="Supplier Rating">
            <select style={selBase} value={form.rating} onChange={set("rating")} onFocus={onFocus} onBlur={onBlur}>
              {["5 Star - Excellent","4 Star - Good","3 Star - Average","2 Star - Below Average"].map(o => <option key={o}>{o}</option>)}
            </select>
          </F>
          <F label="Priority / Status">
            <select style={selBase} value={form.priority} onChange={set("priority")} onFocus={onFocus} onBlur={onBlur}>
              {["Primary Supplier","Secondary Supplier","Backup / Emergency","Inactive"].map(o => <option key={o}>{o}</option>)}
            </select>
          </F>

          <F label="Internal Notes" span={2}>
            <textarea style={txtareaBase}
              placeholder="e.g. Good quality, delays in June. Contact Venkat for urgent orders."
              value={form.internalNotes} onChange={set("internalNotes")} onFocus={onFocus} onBlur={onBlur} />
          </F>

        </Card>

        {/* ══ RIGHT CARD — Financial & Tax ══ */}
        <Card icon="💰" title="Financial & Tax Details" accent={T.success}>

          <Sec icon="🧾" label="GST & Tax" />

          <F label="GSTIN (Supplier)">
            <input style={inputBase} placeholder="33ABCDE1234F1Z5" value={form.gstin} onChange={set("gstin")} onFocus={onFocus} onBlur={onBlur} />
          </F>
          <F label="PAN Number">
            <input style={inputBase} placeholder="ABCDE1234F" value={form.panNumber} onChange={set("panNumber")} onFocus={onFocus} onBlur={onBlur} />
          </F>

          <F label="State Code">
            <input style={inputBase} placeholder="33 (TN), 29 (KA), 24 (GJ)" value={form.stateCode} onChange={set("stateCode")} onFocus={onFocus} onBlur={onBlur} />
          </F>
          <F label="Registration Type">
            <select style={selBase} value={form.registrationType} onChange={set("registrationType")} onFocus={onFocus} onBlur={onBlur}>
              {["Regular (GST)","Composition","Unregistered"].map(o => <option key={o}>{o}</option>)}
            </select>
          </F>

          <Sec icon="💳" label="Payment & Credit Terms" />

          <F label="Payment Terms" req>
            <select style={selBase} value={form.paymentTerms} onChange={set("paymentTerms")} onFocus={onFocus} onBlur={onBlur}>
              {["Advance Payment","On Delivery (COD)","Net 7 Days","Net 15 Days","Net 30 Days","Net 45 Days","Net 60 Days"].map(o => <option key={o}>{o}</option>)}
            </select>
          </F>
          <F label="Credit Limit (₹)">
            <input style={inputBase} placeholder="500000" type="number" min={0} value={form.creditLimit} onChange={set("creditLimit")} onFocus={onFocus} onBlur={onBlur} />
          </F>

          <F label="Discount % (Standard)">
            <input style={inputBase} placeholder="5" type="number" min={0} max={100} step={0.1} value={form.discountPct} onChange={set("discountPct")} onFocus={onFocus} onBlur={onBlur} />
          </F>
          <F label="Freight / Transport">
            <select style={selBase} value={form.freight} onChange={set("freight")} onFocus={onFocus} onBlur={onBlur}>
              {["Supplier Pays (Free Delivery)","We Pay","Shared 50-50"].map(o => <option key={o}>{o}</option>)}
            </select>
          </F>

          <Sec icon="🏦" label="Bank Account Details" />

          <F label="Bank Name">
            <input style={inputBase} placeholder="HDFC Bank / SBI…" value={form.bankName} onChange={set("bankName")} onFocus={onFocus} onBlur={onBlur} />
          </F>
          <F label="Account Number">
            <input style={inputBase} placeholder="123456789012345" value={form.accountNo} onChange={set("accountNo")} onFocus={onFocus} onBlur={onBlur} />
          </F>

          <F label="IFSC Code">
            <input style={inputBase} placeholder="HDFC0001234" value={form.ifscCode} onChange={set("ifscCode")} onFocus={onFocus} onBlur={onBlur} />
          </F>
          <F label="Account Holder Name">
            <input style={inputBase} placeholder="Kajaria Ceramics Ltd." value={form.accountHolder} onChange={set("accountHolder")} onFocus={onFocus} onBlur={onBlur} />
          </F>

          <F label="Branch Name">
            <input style={inputBase} placeholder="Guindy Branch, Chennai" value={form.branch} onChange={set("branch")} onFocus={onFocus} onBlur={onBlur} />
          </F>
          <F label="Account Type">
            <select style={selBase} value={form.accountType} onChange={set("accountType")} onFocus={onFocus} onBlur={onBlur}>
              {["Current Account","Savings Account"].map(o => <option key={o}>{o}</option>)}
            </select>
          </F>

          <F label="UPI ID" span={2}>
            <input style={inputBase} placeholder="company@upi" value={form.upiId} onChange={set("upiId")} onFocus={onFocus} onBlur={onBlur} />
          </F>

        </Card>

      </Box>
    </Box>
  );
};

export default SupplierCreate;