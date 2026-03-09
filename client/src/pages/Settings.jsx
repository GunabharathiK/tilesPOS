import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import compressImage from "../utils/compressImage";
import UserManagement from "./UserManagement";
import API from "../services/api";
import { parseCsvRows, normalizeImportKey } from "../utils/importByField";

const GST_RATES = [0, 5, 12, 18, 28];
const STATE_OPTIONS = ["Tamil Nadu (33)", "Karnataka (29)", "Andhra Pradesh (37)", "Kerala (32)"];
const TAX_TYPE_OPTIONS = ["CGST+SGST (Intra-State TN)", "IGST (Inter-State)"];

const defaultSettings = {
  shopName: "",
  ownerName: "",
  phone: "",
  email: "",
  address: "",
  state: "",
  gstNumber: "",
  upiId: "",
  invoicePrefix: "INV-",
  nextInvoiceNumber: 1,
  bulkInvoicePrefix: "BULK-",
  nextBulkInvoiceNumber: 1,
  defaultTax: 18,
  taxTypeDefault: "",
  termsAndConditions: "Goods once sold will not be taken back. Subject to local jurisdiction. E&OE.",
  bankName: "",
  accountNumber: "",
  whatsappNumber: "",
  autoSendInvoiceWhatsapp: true,
  sendPaymentReceipt: true,
  dueReminder: false,
  dailySalesSummary: true,
  lowStockAlerts: false,
  logo: "",
};

const DEFAULT_CATEGORIES = ["Floor Tile", "Wall Tile", "Vitrified Tile", "Parking Tile", "Granite", "Marble"];
const DEFAULT_BRANDS      = ["Kajaria", "Somany", "Nitco", "Johnson", "Orientbell", "Other"];
const DEFAULT_FINISHES    = ["Matt", "Glossy", "Polished", "Satin", "Rustic"];
const DEFAULT_RACKS       = ["Rack-A1", "Rack-A2", "Rack-B1", "Rack-B2", "Rack-C1"];
const DIGIT_ONLY_FIELDS = new Set(["phone", "whatsappNumber"]);
const NUMBER_FIELDS = new Set(["nextInvoiceNumber", "nextBulkInvoiceNumber", "defaultTax"]);
const LAST_BACKUP_KEY = "lastBackupAt";
const SAVED_RECORDS_KEY = "settingsSavedRecords";
const SAVED_WHATSAPP_KEY = "savedWhatsappNumber";

/* ─── Design tokens ─────────────────────────────────────────────── */
const T = {
  // Colors
  bg:         "#f4f6fa",
  surface:    "#ffffff",
  border:     "#e4e9f0",
  borderFocus:"#3b6fd4",
  text:       "#1a2236",
  textSub:    "#5a677d",
  textMute:   "#9baabb",
  accent:     "#3b6fd4",
  accentDark: "#2754b5",
  accentBg:   "#eef3fc",
  green:      "#1a7a4a",
  greenDark:  "#14603a",
  greenBg:    "#edfaf3",
  red:        "#dc2626",
  redBg:      "#fef2f2",
  // Spacing
  radius:     "8px",
  radiusSm:   "6px",
  // Shadow
  cardShadow: "0 1px 3px rgba(26,34,54,0.07), 0 4px 12px rgba(26,34,54,0.04)",
};

/* ─── Base atoms ─────────────────────────────────────────────────── */

const inputBase = {
  width: "100%",
  padding: "9px 12px",
  border: `1px solid ${T.border}`,
  borderRadius: T.radiusSm,
  fontFamily: "'DM Sans', system-ui, sans-serif",
  fontSize: 13.5,
  color: T.text,
  background: T.surface,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s, box-shadow 0.15s",
  lineHeight: 1.5,
};

const InputField = ({ label, required, hint, style, containerStyle, className, ...props }) => (
  <div style={containerStyle}>
    {label && (
      <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: T.textSub, marginBottom: 5, letterSpacing: "0.02em" }}>
        {label}{required && <span style={{ color: T.red, marginLeft: 2 }}>*</span>}
      </label>
    )}
    <input
      className={["settings-input", className].filter(Boolean).join(" ")}
      style={{ ...inputBase, ...style }}
      onFocus={e => { e.target.style.borderColor = T.borderFocus; e.target.style.boxShadow = "0 0 0 3px rgba(59,111,212,0.1)"; }}
      onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = "none"; }}
      {...props}
    />
    {hint && <p style={{ margin: "4px 0 0", fontSize: 11, color: T.textMute }}>{hint}</p>}
  </div>
);

const SelectField = ({ label, required, children, containerStyle, ...props }) => (
  <div style={containerStyle}>
    {label && (
      <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: T.textSub, marginBottom: 5, letterSpacing: "0.02em" }}>
        {label}{required && <span style={{ color: T.red, marginLeft: 2 }}>*</span>}
      </label>
    )}
    <select
      style={{ ...inputBase, cursor: "pointer", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%235a677d' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 11px center", paddingRight: 32 }}
      onFocus={e => { e.target.style.borderColor = T.borderFocus; e.target.style.boxShadow = "0 0 0 3px rgba(59,111,212,0.1)"; }}
      onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = "none"; }}
      {...props}
    >
      {children}
    </select>
  </div>
);

const TextareaField = ({ label, containerStyle, className, ...props }) => (
  <div style={containerStyle}>
    {label && (
      <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: T.textSub, marginBottom: 5, letterSpacing: "0.02em" }}>
        {label}
      </label>
    )}
    <textarea
      className={["settings-input", className].filter(Boolean).join(" ")}
      style={{ ...inputBase, resize: "vertical", minHeight: 78 }}
      onFocus={e => { e.target.style.borderColor = T.borderFocus; e.target.style.boxShadow = "0 0 0 3px rgba(59,111,212,0.1)"; }}
      onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = "none"; }}
      {...props}
    />
  </div>
);

/* Card with header stripe */
const Card = ({ icon, title, badge, children, style }) => (
  <div style={{
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: 10,
    boxShadow: T.cardShadow,
    overflow: "hidden",
    marginBottom: 18,
    ...style,
  }}>
    <div style={{
      padding: "13px 18px",
      borderBottom: `1px solid ${T.border}`,
      display: "flex",
      alignItems: "center",
      gap: 9,
      background: "#fafbfd",
    }}>
      <span style={{ fontSize: 15, lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: T.text, flex: 1 }}>{title}</span>
      {badge && (
        <span style={{ fontSize: 11, fontWeight: 600, color: T.accent, background: T.accentBg, border: `1px solid #c7d9f8`, borderRadius: 20, padding: "2px 9px" }}>
          {badge}
        </span>
      )}
    </div>
    <div style={{ padding: "18px 20px" }}>{children}</div>
  </div>
);

/* Field grid */
const Grid = ({ cols = 2, gap = 14, mb = 14, children }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap, marginBottom: mb }}>
    {children}
  </div>
);

/* Buttons */
const Btn = ({ variant = "primary", size = "md", icon, onClick, children, disabled }) => {
  const sizes = { sm: { padding: "6px 13px", fontSize: 12 }, md: { padding: "8px 16px", fontSize: 13 } };
  const variants = {
    primary:  { background: T.accent,     color: "#fff", border: "none", hover: T.accentDark },
    green:    { background: T.green,      color: "#fff", border: "none", hover: T.greenDark },
    outline:  { background: T.surface,    color: T.textSub, border: `1px solid ${T.border}`, hover: null },
    ghost:    { background: "transparent", color: T.accent, border: `1px solid ${T.accentBg}`, hover: null },
    danger:   { background: T.redBg,      color: T.red, border: `1px solid #fca5a5`, hover: null },
  };
  const v = variants[variant];
  const s = sizes[size];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...s,
        background: disabled ? "#e9ecf0" : v.background,
        color: disabled ? T.textMute : v.color,
        border: v.border || "none",
        borderRadius: T.radiusSm,
        fontFamily: "inherit",
        fontWeight: 600,
        cursor: disabled ? "default" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        transition: "background 0.15s, opacity 0.15s",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={e => { if (!disabled && v.hover) e.currentTarget.style.background = v.hover; }}
      onMouseLeave={e => { if (!disabled && v.hover) e.currentTarget.style.background = v.background; }}
    >
      {icon && <span style={{ fontSize: 13, lineHeight: 1 }}>{icon}</span>}
      {children}
    </button>
  );
};

/* Toggle / checkbox row */
const ToggleRow = ({ label, desc, checked, onChange }) => (
  <label style={{ display: "flex", alignItems: "flex-start", gap: 11, cursor: "pointer", padding: "9px 12px", borderRadius: T.radiusSm, transition: "background 0.12s" }}
    onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
  >
    <div style={{
      width: 36, height: 20, borderRadius: 10, flexShrink: 0, marginTop: 1,
      background: checked ? T.accent : "#d1d9e6",
      position: "relative", transition: "background 0.2s", cursor: "pointer",
    }}>
      <div style={{
        position: "absolute", top: 3, left: checked ? 18 : 3,
        width: 14, height: 14, borderRadius: "50%", background: "#fff",
        transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
      }} />
      <input type="checkbox" checked={checked} onChange={onChange} style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", margin: 0, cursor: "pointer" }} />
    </div>
    <div>
      <div style={{ fontSize: 13, fontWeight: 500, color: T.text, lineHeight: 1.4 }}>{label}</div>
      {desc && <div style={{ fontSize: 11.5, color: T.textMute, marginTop: 1 }}>{desc}</div>}
    </div>
  </label>
);

/* Divider */
const Divider = ({ mb = 14, mt = 14 }) => (
  <div style={{ height: 1, background: T.border, margin: `${mt}px 0 ${mb}px` }} />
);

/* ─── ListManager ─────────────────────────────────────────────────── */
const ListManager = ({ icon, label, items, onSave }) => {
  const [list, setList]       = useState([...items]);
  const [newVal, setNewVal]   = useState("");
  const [editIdx, setEditIdx] = useState(null);
  const [editVal, setEditVal] = useState("");

  useEffect(() => { setList([...items]); }, [items]);

  const add = () => {
    const trimmed = newVal.trim();
    if (!trimmed) return;
    if (list.map(x => x.toLowerCase()).includes(trimmed.toLowerCase())) {
      toast.error(`"${trimmed}" already exists`); return;
    }
    const next = [...list, trimmed];
    setList(next); setNewVal(""); onSave(next);
    toast.success(`Added "${trimmed}"`);
  };

  const saveEdit = idx => {
    const trimmed = editVal.trim();
    if (!trimmed) return;
    const exists = list.some((v, i) => i !== idx && String(v).toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      toast.error(`"${trimmed}" already exists`);
      return;
    }
    const next = list.map((v, i) => (i === idx ? trimmed : v));
    setList(next); setEditIdx(null); onSave(next); toast.success("Updated");
  };

  const remove = idx => {
    const next = list.filter((_, i) => i !== idx);
    setList(next); onSave(next); toast.success("Removed");
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{label}</span>
        <span style={{ marginLeft: "auto", fontSize: 10.5, fontWeight: 700, color: T.accent, background: T.accentBg, border: `1px solid #c7d9f8`, borderRadius: 20, padding: "2px 8px" }}>
          {list.length}
        </span>
      </div>

      {/* Items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10, maxHeight: 188, overflowY: "auto", paddingRight: 2 }}>
        {list.length === 0 && (
          <div style={{ fontSize: 12, color: T.textMute, fontStyle: "italic", padding: "8px 4px" }}>No items yet</div>
        )}
        {list.map((item, idx) => (
          <div key={idx} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 8px", borderRadius: T.radiusSm,
            background: editIdx === idx ? T.accentBg : "#f7f9fc",
            border: `1px solid ${editIdx === idx ? "#c7d9f8" : T.border}`,
            transition: "border-color 0.12s",
          }}>
            {editIdx === idx ? (
              <>
                <input
                  value={editVal}
                  onChange={e => setEditVal(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && saveEdit(idx)}
                  style={{ ...inputBase, flex: 1, padding: "4px 8px", fontSize: 12.5 }}
                  autoFocus
                />
                <button onClick={() => saveEdit(idx)} style={{ background: T.green, color: "#fff", border: "none", borderRadius: 5, padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✓</button>
                <button onClick={() => setEditIdx(null)} style={{ background: T.border, color: T.textSub, border: "none", borderRadius: 5, padding: "4px 9px", fontSize: 12, cursor: "pointer" }}>✕</button>
              </>
            ) : (
              <>
                <span style={{ flex: 1, fontSize: 13, color: T.text, fontWeight: 500 }}>{item}</span>
                <button onClick={() => { setEditIdx(idx); setEditVal(item); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#7c6fcd", fontSize: 13, padding: "2px 5px", borderRadius: 4, lineHeight: 1 }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f0eeff"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}
                >✏️</button>
                <button onClick={() => remove(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: T.red, fontSize: 13, padding: "2px 5px", borderRadius: 4, lineHeight: 1 }}
                  onMouseEnter={e => e.currentTarget.style.background = T.redBg}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}
                >🗑</button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add new */}
      <div style={{ display: "flex", gap: 6 }}>
        <input
          value={newVal}
          onChange={e => setNewVal(e.target.value)}
          onKeyDown={e => e.key === "Enter" && add()}
          placeholder={`New ${label.toLowerCase()}…`}
          style={{ ...inputBase, flex: 1, padding: "7px 10px", fontSize: 12.5 }}
          onFocus={e => { e.target.style.borderColor = T.borderFocus; e.target.style.boxShadow = "0 0 0 3px rgba(59,111,212,0.1)"; }}
          onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = "none"; }}
        />
        <button
          onClick={add}
          disabled={!newVal.trim()}
          style={{
            background: newVal.trim() ? T.accent : "#e9ecf0",
            color: newVal.trim() ? "#fff" : T.textMute,
            border: "none", borderRadius: T.radiusSm,
            padding: "7px 13px", fontSize: 12.5, fontWeight: 700,
            cursor: newVal.trim() ? "pointer" : "default",
            fontFamily: "inherit", whiteSpace: "nowrap",
            transition: "background 0.15s",
          }}
        >+ Add</button>
      </div>
    </div>
  );
};

/* ─── Section label with separator ──────────────────────────────── */
const SectionLabel = ({ children }) => (
  <div style={{ fontSize: 10.5, fontWeight: 700, color: T.textMute, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
    {children}
  </div>
);

const SavedDetailsCard = ({ records, onEdit, onDelete }) => {
  const company = records?.company || null;
  const invoice = records?.invoice || null;
  if (!company && !invoice) return null;

  const Section = ({ label, record, type }) => {
    if (!record) return null;
    return (
      <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: T.text }}>{label}</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <Btn variant="outline" size="sm" onClick={() => onEdit(type)}>Edit</Btn>
            <Btn variant="danger" size="sm" onClick={() => onDelete(type)}>Delete</Btn>
          </div>
        </div>
        <div style={{ display: "grid", gap: 7 }}>
          {record.rows.map((r) => (
            <div key={`${type}-${r.label}`} style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 10, fontSize: 13 }}>
              <div style={{ color: T.textMute, fontWeight: 600 }}>{r.label}</div>
              <div style={{ color: T.text }}>{String(r.value || "-")}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8, fontSize: 11.5, color: T.textMute }}>
          Saved at: {record.savedAt || "-"}
        </div>
      </div>
    );
  };

  return (
    <Card icon="✅" title="Saved Details">
      <div style={{ display: "grid", gap: 10 }}>
        <Section label="Company Profile" record={company} type="company" />
        <Section label="Invoice Settings" record={invoice} type="invoice" />
      </div>
    </Card>
  );
};

/* ─── Main Settings component ────────────────────────────────────── */
const Settings = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [logoPreview, setLogoPreview] = useState("");
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [brands,     setBrands]     = useState(DEFAULT_BRANDS);
  const [finishes,   setFinishes]   = useState(DEFAULT_FINISHES);
  const [racks,      setRacks]      = useState(DEFAULT_RACKS);
  const [backupBusy, setBackupBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState(() => localStorage.getItem(LAST_BACKUP_KEY) || "");
  const restoreInputRef = useRef(null);
  const [savedRecords, setSavedRecords] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(SAVED_RECORDS_KEY)) || { company: null, invoice: null };
    } catch {
      return { company: null, invoice: null };
    }
  });
  const [savedWhatsappNumber, setSavedWhatsappNumber] = useState(
    () => localStorage.getItem(SAVED_WHATSAPP_KEY) || ""
  );

  useEffect(() => {
    const saved = localStorage.getItem("shopSettings");
    if (saved) {
      try { setSettings(prev => ({ ...prev, ...JSON.parse(saved) })); } catch { /**/ }
    }
    const savedDefaults = (() => {
      try { return JSON.parse(localStorage.getItem("productDefaults")) || {}; } catch { return {}; }
    })();
    if (savedDefaults.categories?.length) setCategories(savedDefaults.categories);
    if (savedDefaults.brands?.length)     setBrands(savedDefaults.brands);
    if (savedDefaults.finishes?.length)   setFinishes(savedDefaults.finishes);
    if (savedDefaults.racks?.length)      setRacks(savedDefaults.racks);

    API.get("/categories")
      .then(res => {
        const dynamic = (res.data || []).map(c => c.name).filter(Boolean);
        if (dynamic.length) setCategories(dynamic);
      })
      .catch(() => {});
  }, []);

  const saveProductDefaults = (key, value) => {
    const current = (() => {
      try { return JSON.parse(localStorage.getItem("productDefaults")) || {}; } catch { return {}; }
    })();
    localStorage.setItem("productDefaults", JSON.stringify({ ...current, [key]: value }));
  };

  const set = (name, value) => setSettings(prev => ({ ...prev, [name]: value }));
  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      set(name, checked);
      return;
    }
    if (DIGIT_ONLY_FIELDS.has(name)) {
      set(name, String(value || "").replace(/\D/g, "").slice(0, 10));
      return;
    }
    if (NUMBER_FIELDS.has(name)) {
      set(name, value === "" ? "" : Number(value));
      return;
    }
    set(name, value);
  };

  const handleLogo = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 300, 0.8);
      setLogoPreview(compressed);
      set("logo", compressed);
    } catch { toast.error("Failed to process logo"); }
  };

  const persist = (msg) => { localStorage.setItem("shopSettings", JSON.stringify(settings)); toast.success(msg); };
  const saveRecords = (next) => {
    setSavedRecords(next);
    localStorage.setItem(SAVED_RECORDS_KEY, JSON.stringify(next));
  };

  const handleEditSavedRecord = (type) => {
    const record = savedRecords?.[type];
    if (!record?.data) return;
    setSettings((prev) => ({ ...prev, ...record.data }));
    toast.success(`${type === "company" ? "Company" : "Invoice"} details loaded for editing`);
  };

  const handleDeleteSavedRecord = (type) => {
    const next = { ...savedRecords, [type]: null };
    saveRecords(next);
    toast.success(`${type === "company" ? "Company" : "Invoice"} saved details deleted`);
  };

  const handleSaveProfile = () => {
    if (!String(settings.shopName || "").trim()) {
      toast.error("Shop Name is required");
      return;
    }
    if (!String(settings.ownerName || "").trim()) {
      toast.error("Owner Name is required");
      return;
    }
    const phone = String(settings.phone || "").trim();
    if (!phone) {
      toast.error("Mobile Number is required");
      return;
    }
    if (phone.length !== 10) {
      toast.error("Mobile Number must be 10 digits");
      return;
    }
    persist("Profile saved");
    saveRecords({
      ...savedRecords,
      company: {
        data: {
          shopName: settings.shopName,
          ownerName: settings.ownerName,
          phone: settings.phone,
          email: settings.email,
          address: settings.address,
          state: settings.state,
          gstNumber: settings.gstNumber,
          upiId: settings.upiId,
          logo: settings.logo,
        },
        rows: [
          { label: "Shop Name", value: settings.shopName },
          { label: "Owner Name", value: settings.ownerName },
          { label: "Mobile Number", value: settings.phone },
          { label: "Email", value: settings.email },
          { label: "Address", value: settings.address },
          { label: "State", value: settings.state },
          { label: "GSTIN", value: settings.gstNumber },
          { label: "UPI ID", value: settings.upiId },
        ],
        savedAt: new Date().toLocaleString("en-IN"),
      },
    });
    setSettings((prev) => ({
      ...prev,
      shopName: "",
      ownerName: "",
      phone: "",
      email: "",
      address: "",
      state: "",
      gstNumber: "",
      upiId: "",
    }));
  };

  const handleSaveInvoice = () => {
    if (!String(settings.invoicePrefix || "").trim()) {
      toast.error("Invoice Prefix is required");
      return;
    }
    if (!String(settings.bulkInvoicePrefix || "").trim()) {
      toast.error("Bulk Invoice Prefix is required");
      return;
    }
    const invNo = Number(settings.nextInvoiceNumber);
    const bulkNo = Number(settings.nextBulkInvoiceNumber);
    if (!Number.isFinite(invNo) || invNo <= 0) {
      toast.error("Starting Invoice No. must be greater than 0");
      return;
    }
    if (!Number.isFinite(bulkNo) || bulkNo <= 0) {
      toast.error("Starting Bulk No. must be greater than 0");
      return;
    }
    persist("Invoice settings saved");
    saveRecords({
      ...savedRecords,
      invoice: {
        data: {
          invoicePrefix: settings.invoicePrefix,
          nextInvoiceNumber: settings.nextInvoiceNumber,
          bulkInvoicePrefix: settings.bulkInvoicePrefix,
          nextBulkInvoiceNumber: settings.nextBulkInvoiceNumber,
          defaultTax: settings.defaultTax,
          taxTypeDefault: settings.taxTypeDefault,
          termsAndConditions: settings.termsAndConditions,
          bankName: settings.bankName,
          accountNumber: settings.accountNumber,
        },
        rows: [
          { label: "Invoice Prefix", value: settings.invoicePrefix },
          { label: "Starting Invoice No.", value: settings.nextInvoiceNumber },
          { label: "Bulk Prefix", value: settings.bulkInvoicePrefix },
          { label: "Starting Bulk No.", value: settings.nextBulkInvoiceNumber },
          { label: "Default GST Rate", value: `${settings.defaultTax}%` },
          { label: "Default Tax Type", value: settings.taxTypeDefault },
          { label: "Terms & Conditions", value: settings.termsAndConditions },
          { label: "Bank Name", value: settings.bankName },
          { label: "Account Number", value: settings.accountNumber },
        ],
        savedAt: new Date().toLocaleString("en-IN"),
      },
    });
    setSettings((prev) => ({
      ...prev,
      invoicePrefix: "",
      nextInvoiceNumber: "",
      bulkInvoicePrefix: "",
      nextBulkInvoiceNumber: "",
      defaultTax: "",
      taxTypeDefault: "",
      termsAndConditions: "",
      bankName: "",
      accountNumber: "",
    }));
  };

  const handleSaveWhatsappNumber = () => {
    const number = String(settings.whatsappNumber || "").trim();
    if (!number) {
      toast.error("WhatsApp Business Number is required");
      return;
    }
    if (number.length !== 10) {
      toast.error("WhatsApp Business Number must be 10 digits");
      return;
    }
    const updated = { ...settings, whatsappNumber: "" };
    setSettings(updated);
    localStorage.setItem("shopSettings", JSON.stringify(updated));
    localStorage.setItem(SAVED_WHATSAPP_KEY, number);
    setSavedWhatsappNumber(number);
    toast.success("WhatsApp number saved");
  };

  const handleSaveNotifications = () => {
    const whatsapp = String(settings.whatsappNumber || "").trim();
    if (whatsapp && whatsapp.length !== 10) {
      toast.error("WhatsApp Business Number must be 10 digits");
      return;
    }
    persist("Notification settings saved");
  };

  const saveLastBackupAt = (isoString) => {
    localStorage.setItem(LAST_BACKUP_KEY, isoString);
    setLastBackupAt(isoString);
  };

  const fmtLastBackup = (isoString) => {
    if (!isoString) return "Never";
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "Never";
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const downloadFile = (content, fileName, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const escapeCsv = (value) => {
    const raw = value === null || value === undefined ? "" : String(value);
    if (/[",\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
    return raw;
  };

  const toCsv = (rows = [], columns = []) => {
    const header = columns.map((c) => escapeCsv(c.header)).join(",");
    const body = rows.map((row) => columns.map((c) => escapeCsv(row?.[c.key])).join(",")).join("\n");
    return `${header}\n${body}`;
  };

  const toHtmlTable = (rows = [], columns = []) => {
    const esc = (v) =>
      String(v === null || v === undefined ? "" : v)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    const head = columns.map((c) => `<th>${esc(c.header)}</th>`).join("");
    const body = rows
      .map((row) => `<tr>${columns.map((c) => `<td>${esc(row?.[c.key])}</td>`).join("")}</tr>`)
      .join("");
    return `<!doctype html><html><head><meta charset="utf-8"></head><body><table border="1"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
  };

  const getExportConfigs = (data = {}, stamp = "") => [
    {
      name: `products-${stamp}`,
      rows: Array.isArray(data.products) ? data.products : [],
      columns: [
        { key: "name", header: "Name" },
        { key: "code", header: "Code" },
        { key: "category", header: "Category" },
        { key: "brand", header: "Brand" },
        { key: "finish", header: "Finish" },
        { key: "size", header: "Size" },
        { key: "price", header: "Price" },
        { key: "stock", header: "Stock" },
      ],
    },
    {
      name: `customers-${stamp}`,
      rows: Array.isArray(data.customers) ? data.customers : [],
      columns: [
        { key: "name", header: "Name" },
        { key: "phone", header: "Phone" },
        { key: "city", header: "City" },
        { key: "gstin", header: "GSTIN" },
        { key: "customerType", header: "Customer Type" },
        { key: "paymentTerms", header: "Payment Terms" },
        { key: "totalSpent", header: "Total Spent" },
      ],
    },
    {
      name: `suppliers-${stamp}`,
      rows: Array.isArray(data.suppliers) ? data.suppliers : [],
      columns: [
        { key: "companyName", header: "Company Name" },
        { key: "supplierName", header: "Supplier Name" },
        { key: "companyPhone", header: "Phone" },
        { key: "city", header: "City" },
        { key: "gstin", header: "GSTIN" },
        { key: "paymentTerms", header: "Payment Terms" },
        { key: "totalDue", header: "Total Due" },
      ],
    },
    {
      name: `invoices-${stamp}`,
      rows: (Array.isArray(data.invoices) ? data.invoices : []).map((inv) => ({
        invoiceNo: inv?.invoiceNo || "",
        date: inv?.date || "",
        customerName: inv?.customer?.name || "",
        customerPhone: inv?.customer?.phone || "",
        status: inv?.status || "",
        paymentMethod: inv?.payment?.method || "",
        paidAmount: inv?.payment?.paidAmount || 0,
        dueAmount: inv?.payment?.dueAmount || 0,
        itemCount: Array.isArray(inv?.items) ? inv.items.length : 0,
      })),
      columns: [
        { key: "invoiceNo", header: "Invoice No" },
        { key: "date", header: "Date" },
        { key: "customerName", header: "Customer Name" },
        { key: "customerPhone", header: "Customer Phone" },
        { key: "status", header: "Status" },
        { key: "paymentMethod", header: "Payment Method" },
        { key: "paidAmount", header: "Paid Amount" },
        { key: "dueAmount", header: "Due Amount" },
        { key: "itemCount", header: "Items" },
      ],
    },
    {
      name: `purchases-${stamp}`,
      rows: Array.isArray(data.purchases) ? data.purchases : [],
      columns: [
        { key: "grnNo", header: "GRN No" },
        { key: "invoiceNo", header: "Invoice No" },
        { key: "invoiceDate", header: "Invoice Date" },
        { key: "supplierName", header: "Supplier Name" },
        { key: "grandTotal", header: "Grand Total" },
        { key: "totalPaid", header: "Total Paid" },
        { key: "totalDue", header: "Total Due" },
        { key: "paymentStatus", header: "Payment Status" },
      ],
    },
  ];

  const handleBackupNow = async () => {
    setBackupBusy(true);
    try {
      const res = await API.get("/system/backup/export");
      const serverData = res?.data?.data || {};
      const generatedAt = new Date().toISOString();
      const stamp = generatedAt.replace(/[:.]/g, "-");
      const shopSettingsRaw = localStorage.getItem("shopSettings");
      const productDefaultsRaw = localStorage.getItem("productDefaults");
      const payload = {
        meta: { app: "billing-software", version: 1, generatedAt },
        server: serverData,
        client: {
          shopSettings: shopSettingsRaw ? JSON.parse(shopSettingsRaw) : settings,
          productDefaults: productDefaultsRaw ? JSON.parse(productDefaultsRaw) : { categories, brands, finishes, racks },
        },
      };
      downloadFile(
        JSON.stringify(payload, null, 2),
        `billing-backup-${stamp}.json`,
        "application/json;charset=utf-8;"
      );
      saveLastBackupAt(generatedAt);
      toast.success("Backup downloaded as JSON");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to create backup");
    } finally {
      setBackupBusy(false);
    }
  };

  const handleExportData = async () => {
    setExportBusy(true);
    try {
      const res = await API.get("/system/backup/export");
      const data = res?.data?.data || {};
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const exports = getExportConfigs(data, stamp);

      exports.forEach(({ name, rows, columns }) => {
        const html = toHtmlTable(rows, columns);
        downloadFile(html, `${name}.xls`, "application/vnd.ms-excel;charset=utf-8;");
      });

      toast.success("Data exported as Excel files");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to export data");
    } finally {
      setExportBusy(false);
    }
  };

  const triggerRestorePicker = () => {
    restoreInputRef.current?.click();
  };

  const handleRestoreFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const ok = window.confirm("Restoring will overwrite current database data. Continue?");
    if (!ok) return;

    setRestoreBusy(true);
    try {
      const lowerName = String(file.name || "").toLowerCase();
      const ext = lowerName.split(".").pop() || "";
      const text = await file.text();

      if (ext === "json") {
        const parsed = JSON.parse(text);
        const serverPayload =
          parsed?.server && typeof parsed.server === "object"
            ? parsed.server
            : parsed?.data && typeof parsed.data === "object"
              ? parsed.data
              : parsed;

        await API.post("/system/backup/restore", { data: serverPayload });

        if (parsed?.client?.shopSettings && typeof parsed.client.shopSettings === "object") {
          localStorage.setItem("shopSettings", JSON.stringify(parsed.client.shopSettings));
          setSettings((prev) => ({ ...prev, ...parsed.client.shopSettings }));
        }
        if (parsed?.client?.productDefaults && typeof parsed.client.productDefaults === "object") {
          const d = parsed.client.productDefaults;
          localStorage.setItem("productDefaults", JSON.stringify(d));
          if (Array.isArray(d.categories) && d.categories.length) setCategories(d.categories);
          if (Array.isArray(d.brands) && d.brands.length) setBrands(d.brands);
          if (Array.isArray(d.finishes) && d.finishes.length) setFinishes(d.finishes);
          if (Array.isArray(d.racks) && d.racks.length) setRacks(d.racks);
        }
      } else if (ext === "csv" || ext === "xls" || ext === "xlsx") {
        const collectionKey = lowerName.includes("product")
          ? "products"
          : lowerName.includes("customer")
            ? "customers"
            : lowerName.includes("supplier")
              ? "suppliers"
              : lowerName.includes("invoice")
                ? "invoices"
                : lowerName.includes("purchase")
                  ? "purchases"
                  : lowerName.includes("user")
                    ? "users"
                    : "";

        if (!collectionKey) {
          throw new Error("Unable to detect data type from file name. Use names like products/customers/invoices...");
        }

        let normalizedRows = [];
        if (ext === "csv") {
          normalizedRows = parseCsvRows(text);
        } else {
          const doc = new DOMParser().parseFromString(text, "text/html");
          const table = doc.querySelector("table");
          if (!table) throw new Error("Invalid Excel file");
          const rows = Array.from(table.querySelectorAll("tr"));
          if (rows.length < 2) throw new Error("No data rows found");
          const headers = Array.from(rows[0].querySelectorAll("th,td"))
            .map((c) => normalizeImportKey(c.textContent || ""));
          normalizedRows = rows.slice(1).map((tr) => {
            const cells = Array.from(tr.querySelectorAll("td"));
            const row = {};
            headers.forEach((h, i) => {
              row[h] = (cells[i]?.textContent || "").trim();
            });
            return row;
          });
        }

        const toNum = (v) => {
          const n = Number(v);
          return Number.isFinite(n) ? n : 0;
        };

        const payloadRows = normalizedRows.map((r) => {
          if (collectionKey === "products") {
            return {
              name: r.name || "",
              code: r.code || "",
              category: r.category || "",
              brand: r.brand || "",
              finish: r.finish || "",
              size: r.size || "",
              price: toNum(r.price),
              stock: toNum(r.stock),
            };
          }
          if (collectionKey === "customers") {
            return {
              name: r.name || "",
              phone: r.phone || "",
              city: r.city || "",
              gstin: r.gstin || "",
              customerType: r.customertype || "",
              paymentTerms: r.paymentterms || "",
              totalSpent: toNum(r.totalspent),
            };
          }
          if (collectionKey === "suppliers") {
            return {
              companyName: r.companyname || "",
              supplierName: r.suppliername || "",
              companyPhone: r.phone || r.companyphone || "",
              city: r.city || "",
              gstin: r.gstin || "",
              paymentTerms: r.paymentterms || "",
              totalDue: toNum(r.totaldue),
            };
          }
          if (collectionKey === "invoices") {
            return {
              invoiceNo: r.invoiceno || "",
              date: r.date || "",
              status: r.status || "",
              customer: { name: r.customername || "", phone: r.customerphone || "" },
              payment: {
                method: r.paymentmethod || "",
                paidAmount: toNum(r.paidamount),
                dueAmount: toNum(r.dueamount),
              },
            };
          }
          if (collectionKey === "purchases") {
            return {
              grnNo: r.grnno || "",
              invoiceNo: r.invoiceno || "",
              invoiceDate: r.invoicedate || "",
              supplierName: r.suppliername || "",
              grandTotal: toNum(r.grandtotal),
              totalPaid: toNum(r.totalpaid),
              totalDue: toNum(r.totaldue),
              paymentStatus: r.paymentstatus || "",
            };
          }
          if (collectionKey === "users") {
            return {
              name: r.name || "",
              phone: r.phone || "",
              role: (r.role || "staff").toLowerCase() === "admin" ? "admin" : "staff",
            };
          }
          return {};
        });

        await API.post("/system/backup/restore", { data: { [collectionKey]: payloadRows } });
      } else {
        throw new Error("Unsupported file format");
      }

      saveLastBackupAt(new Date().toISOString());
      toast.success("Backup restored successfully");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to restore backup");
    } finally {
      setRestoreBusy(false);
    }
  };

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", padding: 0 }}>
      <style>{`.settings-input::placeholder{font-size:11px;color:${T.textMute};}`}</style>
      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)",
        gap: 18,
        alignItems: "start",
      }}>

        {/* ══ LEFT COLUMN ══ */}
        <div>

          {/* Shop Profile */}
          <Card icon="🏪" title="Shop / Company Profile">
            {/* Logo row */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, padding: "14px 16px", background: "#f7f9fc", borderRadius: T.radiusSm, border: `1px solid ${T.border}` }}>
              {(logoPreview || settings.logo) ? (
                <img src={logoPreview || settings.logo} alt="Shop logo"
                  style={{ width: 58, height: 58, objectFit: "contain", borderRadius: 8, border: `1px solid ${T.border}`, background: "#fff", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 58, height: 58, borderRadius: 8, border: `2px dashed ${T.border}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: T.border, flexShrink: 0 }}>
                  🏪
                </div>
              )}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 4 }}>Shop Logo</div>
                <div style={{ fontSize: 12, color: T.textMute, marginBottom: 8 }}>Displayed on invoices & receipts • PNG or JPG</div>
                <label htmlFor="shop-logo-upload"
                  style={{ fontSize: 12, fontWeight: 600, color: T.accent, border: `1px solid #c7d9f8`, background: T.accentBg, borderRadius: T.radiusSm, padding: "5px 13px", cursor: "pointer", display: "inline-block" }}>
                  {(logoPreview || settings.logo) ? "Change Logo" : "Upload Logo"}
                </label>
              </div>
            </div>

            <SectionLabel>Business Details</SectionLabel>
            <Grid cols={1} mb={12}>
              <InputField label="Shop Name" required name="shopName" value={settings.shopName} onChange={handleChange} placeholder="Sri Murugan Tiles & Sanitary" />
            </Grid>
            <Grid cols={2} mb={12}>
              <InputField label="Owner Name" required name="ownerName" value={settings.ownerName} onChange={handleChange} placeholder="Murugan P." />
              <InputField label="Mobile Number" required name="phone" value={settings.phone} onChange={handleChange} placeholder="9876543210" />
            </Grid>
            <Grid cols={1} mb={12}>
              <TextareaField label="Address" name="address" value={settings.address} onChange={handleChange} placeholder="No. 42, Main Road, Shevapet, Salem - 636 002, Tamil Nadu" />
            </Grid>

            <Divider mt={4} mb={14} />
            <SectionLabel>Tax & Registration</SectionLabel>
            <Grid cols={2} mb={12}>
              <InputField label="GSTIN" name="gstNumber" value={settings.gstNumber} onChange={handleChange} placeholder="33ABCDE1234F1Z5" />
              <SelectField label="State" name="state" value={settings.state} onChange={handleChange}>
                <option value="">Select State</option>
                {STATE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </SelectField>
            </Grid>

            <Divider mt={4} mb={14} />
            <SectionLabel>Contact & Payments</SectionLabel>
            <Grid cols={2} mb={18}>
              <InputField label="Email Address" name="email" value={settings.email} onChange={handleChange} placeholder="srimurugan.tiles@gmail.com" />
              <InputField label="UPI ID" name="upiId" value={settings.upiId} onChange={handleChange} placeholder="srimurugan@upi" />
            </Grid>

            <Btn variant="green" icon="💾" onClick={handleSaveProfile}>Save Profile</Btn>
          </Card>

          {/* Invoice Settings */}
          <Card icon="📋" title="Invoice Settings">
            <SectionLabel>Invoice Numbering</SectionLabel>
            <Grid cols={2} mb={12}>
              <InputField label="Invoice Prefix" name="invoicePrefix" value={settings.invoicePrefix} onChange={handleChange} />
              <InputField label="Starting Invoice No." name="nextInvoiceNumber" type="number" value={settings.nextInvoiceNumber} onChange={handleChange} />
            </Grid>
            <Grid cols={2} mb={16}>
              <InputField label="Bulk Invoice Prefix" name="bulkInvoicePrefix" value={settings.bulkInvoicePrefix} onChange={handleChange} />
              <InputField label="Starting Bulk No." name="nextBulkInvoiceNumber" type="number" value={settings.nextBulkInvoiceNumber} onChange={handleChange} />
            </Grid>

            <Divider mt={4} mb={14} />
            <SectionLabel>Tax Defaults</SectionLabel>
            <Grid cols={2} mb={14}>
              <SelectField label="Default GST Rate" name="defaultTax" value={settings.defaultTax} onChange={handleChange}>
                {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
              </SelectField>
              <SelectField label="Default Tax Type" name="taxTypeDefault" value={settings.taxTypeDefault} onChange={handleChange}>
                <option value="">Select GST Type</option>
                {TAX_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </SelectField>
            </Grid>

            <Divider mt={4} mb={14} />
            <SectionLabel>Terms & Banking</SectionLabel>
            <Grid cols={1} mb={12}>
              <TextareaField label="Terms & Conditions" name="termsAndConditions" value={settings.termsAndConditions} onChange={handleChange} />
            </Grid>
            <Grid cols={2} mb={18}>
              <InputField label="Bank Name" name="bankName" value={settings.bankName} onChange={handleChange} placeholder="Indian Bank, Salem" />
              <InputField label="Account Number" name="accountNumber" value={settings.accountNumber} onChange={handleChange} placeholder="123456789012" />
            </Grid>

            <Btn variant="green" icon="📋" onClick={handleSaveInvoice}>Save Invoice Settings</Btn>
          </Card>

          {/* Product Defaults */}
          <Card icon="🗂️" title="Product Defaults">
            <p style={{ fontSize: 12.5, color: T.textSub, marginTop: 0, marginBottom: 16, lineHeight: 1.7 }}>
              Manage dropdown options used when adding or editing products. Changes apply immediately in the Add Product form.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                { icon: "🏷️", label: "Categories", items: categories, key: "categories", set: setCategories },
                { icon: "🏭", label: "Brands",     items: brands,     key: "brands",     set: setBrands },
                { icon: "✨", label: "Finishes",   items: finishes,   key: "finishes",   set: setFinishes },
                { icon: "📦", label: "Rack Locations", items: racks,  key: "racks",      set: setRacks },
              ].map(({ icon, label, items, key, set: setter }) => (
                <div key={key} style={{ background: "#f7f9fc", border: `1px solid ${T.border}`, borderRadius: 8, padding: "14px 15px" }}>
                  <ListManager
                    icon={icon} label={label} items={items}
                    onSave={next => {
                      setter(next);
                      saveProductDefaults(key, next);
                      if (key === "categories") {
                        API.post("/categories/bulk", { names: next }).catch(() => {});
                      }
                    }}
                  />
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12 }}>
              <Btn variant="outline" icon="↩" onClick={() => {
                setCategories(DEFAULT_CATEGORIES); setBrands(DEFAULT_BRANDS);
                setFinishes(DEFAULT_FINISHES); setRacks(DEFAULT_RACKS);
                ["categories", "brands", "finishes", "racks"].forEach((k, i) =>
                  saveProductDefaults(k, [DEFAULT_CATEGORIES, DEFAULT_BRANDS, DEFAULT_FINISHES, DEFAULT_RACKS][i])
                );
                API.post("/categories/bulk", { names: DEFAULT_CATEGORIES }).catch(() => {});
                toast.success("Reset to built-in defaults");
              }}>
                Reset to Defaults
              </Btn>
              <span style={{ fontSize: 11.5, color: T.textMute }}>Restores all four lists to their original built-in values</span>
            </div>
          </Card>

        </div>

        {/* ══ RIGHT COLUMN ══ */}
        <div>

          {/* User Management */}
          <Card icon="👷" title="User Management">
            <UserManagement embedded />
          </Card>

          {/* WhatsApp & Notifications */}
          <Card icon="📱" title="WhatsApp & Notifications">
            <SectionLabel>WhatsApp Business</SectionLabel>
            <Grid cols={1} mb={14}>
              <InputField
                label="WhatsApp Business Number"
                name="whatsappNumber"
                value={settings.whatsappNumber}
                onChange={handleChange}
                placeholder="9876543210"
                hint="Used for sending invoices and alerts"
              />
            </Grid>
            <div style={{ marginTop: -4, marginBottom: 10 }}>
              <Btn variant="outline" size="sm" onClick={handleSaveWhatsappNumber}>Save Number</Btn>
              <div style={{ marginTop: 8, fontSize: 12, color: T.textSub }}>
                Saved Number:- {savedWhatsappNumber || "-"}
              </div>
            </div>

            <Divider mt={4} mb={8} />
            <SectionLabel>Notification Preferences</SectionLabel>

            <div style={{ display: "flex", flexDirection: "column", marginBottom: 16 }}>
              {[
                { name: "autoSendInvoiceWhatsapp", label: "Auto-send invoice on WhatsApp",  desc: "Sends invoice PDF after each sale" },
                { name: "sendPaymentReceipt",       label: "Send payment receipts",          desc: "Notify customer on payment" },
                { name: "dueReminder",              label: "Payment due reminders",          desc: "7-day advance reminders for dues" },
                { name: "dailySalesSummary",        label: "Daily sales summary",            desc: "End-of-day summary to owner" },
                { name: "lowStockAlerts",           label: "Low stock alerts",               desc: "Alert when stock falls below threshold" },
              ].map(item => (
                <ToggleRow
                  key={item.name}
                  label={item.label}
                  desc={item.desc}
                  checked={!!settings[item.name]}
                  onChange={e => set(item.name, e.target.checked)}
                />
              ))}
            </div>

            <Btn variant="green" icon="📱" onClick={handleSaveNotifications}>Save Settings</Btn>
          </Card>

          {/* Backup & Data */}
          <Card icon="🗄️" title="Backup & Data">
            {/* Status banner */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              background: T.greenBg, border: `1px solid #a7f3d0`,
              borderRadius: T.radiusSm, padding: "10px 14px", marginBottom: 16,
            }}>
              <span style={{ fontSize: 15 }}>✅</span>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "#065f46" }}>All data backed up</div>
                <div style={{ fontSize: 11.5, color: "#047857" }}>Last backup: {fmtLastBackup(lastBackupAt)}</div>
              </div>
            </div>

            <SectionLabel>Actions</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <Btn
                variant="primary"
                icon="📦"
                onClick={handleBackupNow}
                disabled={backupBusy || exportBusy || restoreBusy}
              >
                {backupBusy ? "Creating..." : "Backup Now"}
              </Btn>
              <Btn
                variant="outline"
                icon="⬇"
                onClick={handleExportData}
                disabled={backupBusy || exportBusy || restoreBusy}
              >
                {exportBusy ? "Exporting..." : "Export Data"}
              </Btn>
            </div>
            <Btn
              variant="outline"
              icon="📤"
              onClick={triggerRestorePicker}
              disabled={backupBusy || exportBusy || restoreBusy}
            >
              {restoreBusy ? "Restoring..." : "Restore from Backup"}
            </Btn>

            <div style={{ marginTop: 16, padding: "12px 14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: T.radiusSm }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "#92400e", marginBottom: 2 }}>⚠ Before restoring</div>
              <div style={{ fontSize: 11, color: "#a16207", lineHeight: 1.6 }}>Restoring will overwrite current data. Make sure to create a backup first.</div>
            </div>
          </Card>

          <SavedDetailsCard
            records={savedRecords}
            onEdit={handleEditSavedRecord}
            onDelete={handleDeleteSavedRecord}
          />

        </div>
      </div>

      <input id="shop-logo-upload" type="file" accept="image/*" hidden onChange={handleLogo} />
      <input
        ref={restoreInputRef}
        type="file"
        accept=".json,.csv,.xls,.xlsx,application/json,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        hidden
        onChange={handleRestoreFile}
      />
    </div>
  );
};

export default Settings;
