import {
  Box, Typography,
} from "@mui/material";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createSupplier, updateSupplier } from "../../services/supplierService";
import toast from "react-hot-toast";

/* ── Design tokens ──────────────────────────────────────────── */
const T = {
  primary:      "#1a56a0",
  primaryDark:  "#0f3d7a",
  primaryLight: "#e8f0fb",
  success:      "#1a7a4a",
  successLight: "#e8f5ee",
  danger:       "#c0392b",
  dark:         "#1c2333",
  text:         "#2d3748",
  muted:        "#718096",
  border:       "#e2e8f0",
  bg:           "#f0f4f8",
  white:        "#fff",
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

/* ── Shared input style ─────────────────────────────────────── */
const inp = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "6px",
    fontFamily: "'Noto Sans', sans-serif",
    fontSize: 13,
    background: T.white,
    "& fieldset": { borderColor: T.border, borderWidth: "1.5px" },
    "&:hover fieldset": { borderColor: "#aab8c9" },
    "&.Mui-focused fieldset": {
      borderColor: T.primary,
      borderWidth: "1.5px",
      boxShadow: "0 0 0 3px rgba(26,86,160,.08)",
    },
  },
  "& .MuiInputLabel-root": { display: "none" },
  "& .MuiInputBase-input::placeholder": { color: "#b0bec5", opacity: 1, fontSize: 13 },
  "& textarea::placeholder": { color: "#b0bec5", opacity: 1, fontSize: 13 },
};

/* ── Field wrapper — label above ────────────────────────────── */
const F = ({ label, req, children, span }) => (
  <Box sx={{ gridColumn: span ? `span ${span}` : undefined }}>
    <Box component="label" sx={{
      display: "block", fontSize: 11, fontWeight: 700, color: T.muted,
      textTransform: "uppercase", letterSpacing: ".6px", mb: "6px",
      fontFamily: "'Noto Sans', sans-serif",
    }}>
      {label}{req && <Box component="span" sx={{ color: T.danger }}> *</Box>}
    </Box>
    {children}
  </Box>
);

/* ── Section title ──────────────────────────────────────────── */
const Sec = ({ icon, label }) => (
  <Box sx={{ gridColumn: "span 2", display: "flex", alignItems: "center", gap: 1, mb: -0.5, mt: 0.5 }}>
    <Box sx={{ fontSize: 14 }}>{icon}</Box>
    <Typography sx={{
      fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase",
      letterSpacing: ".8px", fontFamily: "'Noto Sans', sans-serif",
    }}>
      {label}
    </Typography>
  </Box>
);

/* ── Divider ────────────────────────────────────────────────── */
const Hr = () => (
  <Box sx={{ gridColumn: "span 2", borderTop: `1px solid ${T.border}`, my: 0.5 }} />
);

/* ── Main Component ─────────────────────────────────────────── */
const SupplierCreate = ({ onBack, editSupplier: editProp }) => {
  const navigate  = useNavigate();
  const location  = useLocation();
  // Support passing editSupplier via route state or prop
  const editSupplier = editProp || location.state?.editSupplier || null;
  const isEdit = !!editSupplier;

  const [loading, setLoading] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const normalizeTextList = (list = []) =>
    [...new Set(
      (Array.isArray(list) ? list : String(list || "").split(","))
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    )];

  /* ── Form state ── */
  const [form, setForm] = useState({
    // Company
    companyName:    "",
    supplierName:   "",   // contact person name
    designation:    "",
    companyPhone:   "",   // primary mobile
    altPhone:       "",   // alternate mobile / landline
    companyEmail:   "",
    companyWebsite: "",
    // Address
    companyAddress: "",
    city:           "",
    state:          "",
    pincode:        "",
    // Products
    categories:        [],
    productNames:      [],
    productsSupplied:  [],
    brands:           [],
    // GST & Tax
    gstin:            "",
    panNumber:        "",
    stateCode:        "",
    registrationType: "Regular (GST)",
    // Payment & Credit
    paymentTerms:   "Advance Payment",
    creditLimit:    "",
    discountPct:    "",
    freight:        "Supplier Pays (Free Delivery)",
    // Bank
    bankName:       "",
    accountNo:      "",
    ifscCode:       "",
    accountHolder:  "",
    branch:         "",
    accountType:    "Current Account",
    upiId:          "",
    // Rating
    rating:         "5 Star - Excellent",
    priority:       "Primary Supplier",
    internalNotes:  "",
    // legacy compat
    licNo:          "",
    supplierPhone:  "",
  });

    /* �� Pre-fill on edit �� */
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
      categories:        editSupplier.categories || editSupplier.productsSupplied || [],
      productNames:      normalizeTextList(
        editSupplier.productNames || (Array.isArray(editSupplier.items) ? editSupplier.items.map((item) => item?.name) : [])
      ),
      productsSupplied:  editSupplier.categories || editSupplier.productsSupplied || [],
      brands:           normalizeTextList(editSupplier.brands),
      gstin:            editSupplier.gstin   || "",
      panNumber:        editSupplier.panNumber || "",
      stateCode:        editSupplier.stateCode || "",
      registrationType: editSupplier.registrationType || "Regular (GST)",
      paymentTerms:     editSupplier.paymentTerms || "Advance Payment",
      creditLimit:      editSupplier.creditLimit  || "",
      discountPct:      editSupplier.discountPct  || "",
      freight:          editSupplier.freight      || "Supplier Pays (Free Delivery)",
      bankName:         editSupplier.bankName      || "",
      accountNo:        editSupplier.accountNo     || "",
      ifscCode:         editSupplier.ifscCode      || "",
      accountHolder:    editSupplier.accountHolder || "",
      branch:           editSupplier.branch        || "",
      accountType:      editSupplier.accountType   || "Current Account",
      upiId:            editSupplier.upiId         || "",
      rating:           editSupplier.rating        || "5 Star - Excellent",
      priority:         editSupplier.priority      || "Primary Supplier",
      internalNotes:    editSupplier.internalNotes || "",
      licNo:            editSupplier.licNo         || "",
      supplierPhone:    editSupplier.supplierPhone && editSupplier.supplierPhone !== editSupplier.companyPhone
                          ? editSupplier.supplierPhone : "",
    });
  }, [editSupplier]);
  /* �� Pincode auto-fill �� */
  const handlePincode = async (val) => {
    const v = val.replace(/\D/g, "").slice(0, 6);
    setForm((f) => ({ ...f, pincode: v }));
    if (v.length === 6) {
      setPincodeLoading(true);
      try {
        const res  = await fetch(`https://api.postalpincode.in/pincode/${v}`);
        const data = await res.json();
        if (data[0]?.Status === "Success") {
          const post = data[0].PostOffice[0];
          setForm((f) => ({ ...f, state: post.State, city: post.District }));
          toast.success("Location auto-filled ✅");
        }
      } catch { /* silent */ }
      finally { setPincodeLoading(false); }
    }
  };

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  /* ── Validate ── */
  const validate = () => {
    if (!form.companyName.trim())    { toast.error("Company / Supplier Name is required");  return false; }
    if (!form.companyPhone.trim())   { toast.error("Primary Mobile is required");            return false; }
    if (!form.companyAddress.trim()) { toast.error("Full Address is required");              return false; }
    if (!form.city.trim())           { toast.error("City / Town is required");               return false; }
    if (!form.state.trim())          { toast.error("State is required");                     return false; }
    if (!form.pincode.trim())        { toast.error("Pincode is required");                   return false; }
    return true;
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    const normalizedCategories = normalizeTextList(form.categories);
    const normalizedProductNames = normalizeTextList(form.productNames);
    const normalizedBrands = normalizeTextList(form.brands);
    if (!validate()) return;

    const payload = {
      // legacy compat fields
      name:            form.companyName,
      phone:           form.companyPhone,
      address:         form.companyAddress,
      // company
      companyName:     form.companyName,
      companyEmail:    form.companyEmail,
      companyWebsite:  form.companyWebsite,
      companyPhone:    form.companyPhone,
      companyAddress:  form.companyAddress,
      licNo:           form.licNo,
      gstin:           form.gstin,
      // contact
      supplierName:    form.supplierName,
      supplierPhone:   form.supplierPhone || form.companyPhone,
      designation:     form.designation,
      altPhone:        form.altPhone,
      // address
      city:            form.city,
      state:           form.state,
      pincode:         form.pincode,
      // products
      categories:       normalizedCategories,
      productNames:     normalizedProductNames,
      productsSupplied: normalizedCategories,
      brands:           normalizedBrands.join(", "),
      // tax
      panNumber:        form.panNumber,
      stateCode:        form.stateCode,
      registrationType: form.registrationType,
      // payment terms
      paymentTerms:    form.paymentTerms,
      creditLimit:     form.creditLimit ? Number(form.creditLimit) : 0,
      discountPct:     form.discountPct ? Number(form.discountPct) : 0,
      freight:         form.freight,
      // bank
      bankName:        form.bankName,
      accountNo:       form.accountNo,
      ifscCode:        form.ifscCode,
      accountHolder:   form.accountHolder,
      branch:          form.branch,
      accountType:     form.accountType,
      upiId:           form.upiId,
      // rating
      rating:          form.rating,
      priority:        form.priority,
      internalNotes:   form.internalNotes,
      // payment defaults
      items:           [],
      totalPaid:       0,
      paymentStatus:   "Pending",
    };

    setLoading(true);
    try {
      if (isEdit) {
        await updateSupplier(editSupplier._id, payload);
        toast.success("Supplier updated ✅");
      } else {
        await createSupplier(payload);
        toast.success("Supplier added successfully! ✅");
      }
      navigate("/suppliers/products");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Operation failed");
    } finally { setLoading(false); }
  };

  const handleCancel = () => onBack ? onBack() : navigate("/suppliers");

  /* ── Common select style ── */
  const selStyle = {
    width: "100%", padding: "10px 11px", border: `1.5px solid ${T.border}`,
    borderRadius: "6px", fontFamily: "'Noto Sans', sans-serif", fontSize: 13,
    color: T.text, background: T.white, outline: "none", cursor: "pointer",
    appearance: "auto",
  };

  const txtStyle = {
    width: "100%", padding: "10px 11px", border: `1.5px solid ${T.border}`,
    borderRadius: "6px", fontFamily: "'Noto Sans', sans-serif", fontSize: 13,
    color: T.text, background: T.white, outline: "none", boxSizing: "border-box",
  };

  return (
    <Box sx={{ fontFamily: "'Noto Sans', sans-serif", background: T.bg, minHeight: "100%", p: 0 }}>

      {/* Page title (topbar handles the main title, this is optional) */}

      {/* ── Two-column grid ── */}
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, alignItems: "start" }}>

        {/* ══════════ LEFT CARD ══════════ */}
        <Box sx={{ background: T.white, borderRadius: "10px", border: `1px solid ${T.border}`, boxShadow: "0 1px 3px rgba(0,0,0,.05)", overflow: "hidden" }}>
          {/* Card header */}
          <Box sx={{ px: 2.5, py: 1.8, borderBottom: `1px solid ${T.border}` }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: T.dark, display: "flex", alignItems: "center", gap: 1 }}>
              <Box component="span" sx={{ fontSize: 16 }}>🏭</Box>
              {isEdit ? "Edit Supplier — Basic Details" : "Add New Supplier — Basic Details"}
            </Typography>
          </Box>

          <Box sx={{ p: 2.5, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>

            {/* COMPANY INFORMATION */}
            <Sec icon="🏢" label="Company Information" />

            <F label="Company / Supplier Name" req span={2}>
              <input style={txtStyle} placeholder="e.g. Kajaria Ceramics Limited"
                value={form.companyName} onChange={set("companyName")}
                onFocus={(e) => e.target.style.borderColor = T.primary}
                onBlur={(e)  => e.target.style.borderColor = T.border} />
            </F>

            <F label="Contact Person Name" req>
              <input style={txtStyle} placeholder="Sales Manager / Owner name"
                value={form.supplierName} onChange={set("supplierName")}
                onFocus={(e) => e.target.style.borderColor = T.primary}
                onBlur={(e)  => e.target.style.borderColor = T.border} />
            </F>
            <F label="Designation">
              <input style={txtStyle} placeholder="Sales Manager / Owner"
                value={form.designation} onChange={set("designation")}
                onFocus={(e) => e.target.style.borderColor = T.primary}
                onBlur={(e)  => e.target.style.borderColor = T.border} />
            </F>

            <F label="Primary Mobile" req>
              <input style={txtStyle} placeholder="9876543210" maxLength={10}
                value={form.companyPhone}
                onChange={(e) => setForm((f) => ({ ...f, companyPhone: e.target.value.replace(/\D/g,"").slice(0,10) }))}
                onFocus={(e) => e.target.style.borderColor = T.primary}
                onBlur={(e)  => e.target.style.borderColor = T.border} />
            </F>
            <F label="Alternate Mobile / Landline">
              <input style={txtStyle} placeholder="0427-2234567"
                value={form.altPhone} onChange={set("altPhone")}
                onFocus={(e) => e.target.style.borderColor = T.primary}
                onBlur={(e)  => e.target.style.borderColor = T.border} />
            </F>

            <F label="Email Address">
              <input style={txtStyle} placeholder="sales@kajaria.com" type="email"
                value={form.companyEmail} onChange={set("companyEmail")}
                onFocus={(e) => e.target.style.borderColor = T.primary}
                onBlur={(e)  => e.target.style.borderColor = T.border} />
            </F>
            <F label="Website">
              <input style={txtStyle} placeholder="www.kajaria.com"
                value={form.companyWebsite} onChange={set("companyWebsite")}
                onFocus={(e) => e.target.style.borderColor = T.primary}
                onBlur={(e)  => e.target.style.borderColor = T.border} />
            </F>

            <Hr />

            {/* ADDRESS DETAILS */}
            <Sec icon="📍" label="Address Details" />

            <F label="Full Address (Door No, Street, Area)" req span={2}>
              <textarea style={{ ...txtStyle, minHeight: 72, resize: "vertical" }}
                placeholder="45, Industrial Area, Guindy..."
                value={form.companyAddress} onChange={set("companyAddress")}
                onFocus={(e) => e.target.style.borderColor = T.primary}
                onBlur={(e)  => e.target.style.borderColor = T.border} />
            </F>

            <F label="City / Town" req>
              <input style={txtStyle} placeholder="Chennai"
                value={form.city} onChange={set("city")}
                onFocus={(e) => e.target.style.borderColor = T.primary}
                onBlur={(e)  => e.target.style.borderColor = T.border} />
            </F>
            <F label="State" req>
              <select style={selStyle} value={form.state} onChange={set("state")}
                onFocus={(e) => e.target.style.borderColor = T.primary}
                onBlur={(e)  => e.target.style.borderColor = T.border}>
                <option value="">— Select State —</option>
                {INDIA_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </F>

            {/* Pincode spans only 1 col — we use an empty placeholder for the 2nd col */}
            <F label="Pincode" req>
              <input style={txtStyle} placeholder="600032" maxLength={6}
                value={form.pincode}
                onChange={(e) => handlePincode(e.target.value)}
                onFocus={(e) => e.target.style.borderColor = T.primary}
                onBlur={(e)  => e.target.style.borderColor = T.border} />
              {pincodeLoading && <Box sx={{ fontSize: 11, color: T.muted, mt: 0.5 }}>Fetching location...</Box>}
            </F>
            <Box /> {/* empty grid cell */}

            <Hr />

            {/* RATING & NOTES */}
            <Sec icon="*" label="Rating & Notes" />

            <F label="Supplier Rating">
              <select style={selStyle} value={form.rating} onChange={set("rating")}>
                {["5 Star - Excellent","4 Star - Good","3 Star - Average","2 Star - Below Average"].map((o) => <option key={o}>{o}</option>)}
              </select>
            </F>
            <F label="Priority / Status">
              <select style={selStyle} value={form.priority} onChange={set("priority")}>
                {["Primary Supplier","Secondary Supplier","Backup / Emergency","Inactive"].map((o) => <option key={o}>{o}</option>)}
              </select>
            </F>

            <F label="Internal Notes" span={2}>
              <textarea style={{ ...txtStyle, minHeight: 68, resize: "vertical" }}
                placeholder="e.g. Good quality, delays in June. Contact Venkat for urgent orders. Min. order: 100 boxes."
                value={form.internalNotes} onChange={set("internalNotes")}
                onFocus={(e) => e.target.style.borderColor = T.primary}
                onBlur={(e)  => e.target.style.borderColor = T.border} />
            </F>

          </Box>
        </Box>

        {/* ══════════ RIGHT CARD ══════════ */}
        <Box sx={{ background: T.white, borderRadius: "10px", border: `1px solid ${T.border}`, boxShadow: "0 1px 3px rgba(0,0,0,.05)", overflow: "hidden" }}>
          {/* Card header */}
          <Box sx={{ px: 2.5, py: 1.8, borderBottom: `1px solid ${T.border}` }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: T.dark, display: "flex", alignItems: "center", gap: 1 }}>
              <Box component="span" sx={{ fontSize: 16 }}>💰</Box>
              Financial & Tax Details
            </Typography>
          </Box>

          <Box sx={{ p: 2.5, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>

            {/* GST & TAX */}
            <Sec icon="🧾" label="GST & Tax" />

            <F label="GSTIN (Supplier)" req>
              <input style={txtStyle} placeholder="33ABCDE1234F1Z5"
                value={form.gstin} onChange={set("gstin")}
                onFocus={(e) => e.target.style.borderColor = T.primary}
                onBlur={(e)  => e.target.style.borderColor = T.border} />
            </F>
            <F label="PAN Number">
              <input style={txtStyle} placeholder="ABCDE1234F"
                value={form.panNumber} onChange={set("panNumber")}
                onFocus={(e) => e.target.style.borderColor = T.primary}
                onBlur={(e)  => e.target.style.borderColor = T.border} />
            </F>

            <F label="State Code">
              <input style={txtStyle} placeholder="33 (TN), 29 (KA), 24 (GJ)"
                value={form.stateCode} onChange={set("stateCode")}
                onFocus={(e) => e.target.style.borderColor = T.primary}
                onBlur={(e)  => e.target.style.borderColor = T.border} />
            </F>
            <F label="Registration Type">
              <select style={selStyle} value={form.registrationType} onChange={set("registrationType")}>
                {["Regular (GST)","Composition","Unregistered"].map((o) => <option key={o}>{o}</option>)}
              </select>
            </F>

            <Hr />

            {/* PAYMENT & CREDIT TERMS */}
            <Sec icon="💳" label="Payment & Credit Terms" />

            <F label="Payment Terms" req>
              <select style={selStyle} value={form.paymentTerms} onChange={set("paymentTerms")}>
                {["Advance Payment","On Delivery (COD)","Net 7 Days","Net 15 Days","Net 30 Days","Net 45 Days","Net 60 Days"].map((o) => <option key={o}>{o}</option>)}
              </select>
            </F>
            <F label="Credit Limit (₹)">
              <input style={txtStyle} placeholder="500000" type="number" min={0}
                value={form.creditLimit} onChange={set("creditLimit")}
                onFocus={(e) => e.target.style.borderColor = T.primary}
                onBlur={(e)  => e.target.style.borderColor = T.border} />
            </F>

            <F label="Discount % (Standard)">
              <input style={txtStyle} placeholder="5" type="number" min={0} max={100} step={0.1}
                value={form.discountPct} onChange={set("discountPct")}
                onFocus={(e) => e.target.style.borderColor = T.primary}
                onBlur={(e)  => e.target.style.borderColor = T.border} />
            </F>
            <F label="Freight / Transport">
              <select style={selStyle} value={form.freight} onChange={set("freight")}>
                {["Supplier Pays (Free Delivery)","We Pay","Shared 50-50"].map((o) => <option key={o}>{o}</option>)}
              </select>
            </F>

            <Hr />

            {/* BANK ACCOUNT DETAILS */}
            <Sec icon="🏦" label="Bank Account Details" />

            <F label="Bank Name" req>
              <input style={txtStyle} placeholder="HDFC Bank / SBI..."
                value={form.bankName} onChange={set("bankName")}
                onFocus={(e) => e.target.style.borderColor = T.primary}
                onBlur={(e)  => e.target.style.borderColor = T.border} />
            </F>
            <F label="Account Number" req>
              <input style={txtStyle} placeholder="123456789012345"
                value={form.accountNo} onChange={set("accountNo")}
                onFocus={(e) => e.target.style.borderColor = T.primary}
                onBlur={(e)  => e.target.style.borderColor = T.border} />
            </F>

            <F label="IFSC Code" req>
              <input style={txtStyle} placeholder="HDFC0001234"
                value={form.ifscCode} onChange={set("ifscCode")}
                onFocus={(e) => e.target.style.borderColor = T.primary}
                onBlur={(e)  => e.target.style.borderColor = T.border} />
            </F>
            <F label="Account Holder Name">
              <input style={txtStyle} placeholder="Kajaria Ceramics Ltd."
                value={form.accountHolder} onChange={set("accountHolder")}
                onFocus={(e) => e.target.style.borderColor = T.primary}
                onBlur={(e)  => e.target.style.borderColor = T.border} />
            </F>

            <F label="Branch Name">
              <input style={txtStyle} placeholder="Guindy Branch, Chennai"
                value={form.branch} onChange={set("branch")}
                onFocus={(e) => e.target.style.borderColor = T.primary}
                onBlur={(e)  => e.target.style.borderColor = T.border} />
            </F>
            <F label="Account Type">
              <select style={selStyle} value={form.accountType} onChange={set("accountType")}>
                {["Current Account","Savings Account"].map((o) => <option key={o}>{o}</option>)}
              </select>
            </F>

            <F label="UPI ID" span={2}>
              <input style={txtStyle} placeholder="company@upi"
                value={form.upiId} onChange={set("upiId")}
                onFocus={(e) => e.target.style.borderColor = T.primary}
                onBlur={(e)  => e.target.style.borderColor = T.border} />
            </F>

            {/* ── Action buttons ── */}
            <Box sx={{ gridColumn: "span 2", display: "flex", gap: 1.2, mt: 0.5, justifyContent: "flex-end" }}>
              <Box onClick={handleSubmit} sx={{
                display: "inline-flex", alignItems: "center", gap: "7px",
                px: 2.5, py: 1.1, borderRadius: "7px", cursor: loading ? "default" : "pointer",
                background: T.success, color: "#fff", fontSize: 13, fontWeight: 600,
                fontFamily: "'Noto Sans', sans-serif", opacity: loading ? 0.7 : 1,
                transition: "all .17s", "&:hover": !loading ? { background: "#146038" } : {},
              }}>
                ✅ {loading ? (isEdit ? "Updating..." : "Saving...") : (isEdit ? "Update Supplier" : "Save Supplier")}
              </Box>
              <Box onClick={handleCancel} sx={{
                display: "inline-flex", alignItems: "center",
                px: 2, py: 1.1, borderRadius: "7px", cursor: "pointer",
                background: T.white, color: T.text, fontSize: 13, fontWeight: 600,
                border: `1.5px solid ${T.border}`, fontFamily: "'Noto Sans', sans-serif",
                "&:hover": { borderColor: T.primary, color: T.primary, background: T.primaryLight },
              }}>
                Cancel
              </Box>
            </Box>

          </Box>
        </Box>

      </Box>
    </Box>
  );
};

export default SupplierCreate;










