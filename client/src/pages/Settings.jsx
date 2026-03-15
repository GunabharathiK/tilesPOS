import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import compressImage from "../utils/compressImage";
import UserManagement from "./UserManagement";
import API from "../services/api";
import { parseCsvRows, normalizeImportKey } from "../utils/importByField";

/* ─── Constants ─────────────────────────────────────────────────── */
const GST_RATES         = [0, 5, 12, 18, 28];
const STATE_OPTIONS     = ["Tamil Nadu (33)", "Karnataka (29)", "Andhra Pradesh (37)", "Kerala (32)"];
const TAX_TYPE_OPTIONS  = ["CGST+SGST (Intra-State TN)", "IGST (Inter-State)"];
const DIGIT_ONLY_FIELDS = new Set(["phone"]);
const NUMBER_FIELDS     = new Set(["nextInvoiceNumber", "nextQuotationNumber", "defaultTax"]);
const LAST_BACKUP_KEY   = "lastBackupAt";
const SAVED_RECORDS_KEY = "settingsSavedRecords";

const DEFAULT_CATEGORIES = ["Floor Tile", "Wall Tile", "Vitrified Tile", "Parking Tile", "Granite", "Marble"];
const DEFAULT_BRANDS     = ["Kajaria", "Somany", "Nitco", "Johnson", "Orientbell", "Other"];
const DEFAULT_FINISHES   = ["Matt", "Glossy", "Polished", "Satin", "Rustic"];
const DEFAULT_RACKS      = ["Rack-A1", "Rack-A2", "Rack-B1", "Rack-B2", "Rack-C1"];

const defaultSettings = {
  shopName: "", ownerName: "", phone: "", email: "", address: "",
  state: "", gstNumber: "", upiId: "",
  invoicePrefix: "INV-", nextInvoiceNumber: 1,
  quotationPrefix: "QTN-", nextQuotationNumber: 1,
  defaultTax: 18, taxTypeDefault: "",
  termsAndConditions: "Goods once sold will not be taken back. Subject to local jurisdiction. E&OE.",
  bankName: "", accountNumber: "", whatsappNumber: "",
  autoSendInvoiceWhatsapp: true, sendPaymentReceipt: true,
  dueReminder: false, dailySalesSummary: true, lowStockAlerts: false, logo: "",
};

/* ─── Design tokens — matches CustomerPayments exactly ──────────── */
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

/* ─── Shared input style — zero radius ──────────────────────────── */
const inputBase = {
  width: "100%",
  padding: "8px 10px",
  border: `1px solid ${T.border}`,
  borderRadius: 0,
  fontFamily: "'Noto Sans', sans-serif",
  fontSize: 13,
  color: T.text,
  background: T.surface,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.14s, box-shadow 0.14s",
  lineHeight: 1.5,
};

const focusStyle = { borderColor: T.primary, boxShadow: "0 0 0 3px rgba(26,86,160,.08)" };
const blurStyle  = { borderColor: T.border,  boxShadow: "none" };

/* ─── Field label ────────────────────────────────────────────────── */
const Lbl = ({ children, required }) => (
  <div style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 5 }}>
    {children}{required && <span style={{ color: T.danger, marginLeft: 2 }}>*</span>}
  </div>
);

/* ─── Input atoms ────────────────────────────────────────────────── */
const InputField = ({ label, required, hint, containerStyle, style, ...props }) => (
  <div style={containerStyle}>
    {label && <Lbl required={required}>{label}</Lbl>}
    <input
      style={{ ...inputBase, ...style }}
      onFocus={e => Object.assign(e.target.style, focusStyle)}
      onBlur={e  => Object.assign(e.target.style, blurStyle)}
      {...props}
    />
    {hint && <div style={{ marginTop: 4, fontSize: 11, color: T.faint }}>{hint}</div>}
  </div>
);

const SelectField = ({ label, required, children, containerStyle, style, ...props }) => (
  <div style={containerStyle}>
    {label && <Lbl required={required}>{label}</Lbl>}
    <select
      style={{
        ...inputBase, cursor: "pointer", appearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", paddingRight: 30,
        ...style,
      }}
      onFocus={e => Object.assign(e.target.style, focusStyle)}
      onBlur={e  => Object.assign(e.target.style, blurStyle)}
      {...props}
    >
      {children}
    </select>
  </div>
);

const TextareaField = ({ label, containerStyle, style, ...props }) => (
  <div style={containerStyle}>
    {label && <Lbl>{label}</Lbl>}
    <textarea
      style={{ ...inputBase, resize: "vertical", minHeight: 76, ...style }}
      onFocus={e => Object.assign(e.target.style, { ...focusStyle, resize: "vertical" })}
      onBlur={e  => Object.assign(e.target.style, { ...blurStyle,  resize: "vertical" })}
      {...props}
    />
  </div>
);

/* ─── Card ───────────────────────────────────────────────────────── */
const Card = ({ icon, title, badge, accent, children, id }) => (
  <div id={id} style={{
    background: T.surface,
    border: `1px solid ${T.border}`,
    boxShadow: "0 1px 3px rgba(15,23,42,.06), 0 4px 16px rgba(15,23,42,.04)",
    overflow: "hidden",
    marginBottom: 16,
  }}>
    <div style={{
      padding: "13px 20px",
      borderBottom: `2px solid ${accent || T.primary}`,
      background: `linear-gradient(to right, ${T.primaryLight}, ${T.surface})`,
      display: "flex", alignItems: "center", gap: 9,
    }}>
      <span style={{ fontSize: 15, lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: 13.5, fontWeight: 800, color: T.dark, flex: 1 }}>{title}</span>
      {badge && (
        <span style={{ fontSize: 11, fontWeight: 700, color: T.primary, background: T.primaryLight, border: `1px solid #c3d9f5`, padding: "2px 9px" }}>
          {badge}
        </span>
      )}
    </div>
    <div style={{ padding: "20px 20px" }}>{children}</div>
  </div>
);

/* ─── Section label ──────────────────────────────────────────────── */
const SectionLabel = ({ children }) => (
  <div style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 12 }}>
    {children}
  </div>
);

/* ─── Field grid ─────────────────────────────────────────────────── */
const Grid = ({ cols = 2, gap = 13, mb = 13, children }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap, marginBottom: mb }}>
    {children}
  </div>
);

/* ─── Divider ────────────────────────────────────────────────────── */
const Divider = ({ mt = 14, mb = 14 }) => (
  <div style={{ height: 1, background: T.border, margin: `${mt}px 0 ${mb}px` }} />
);

/* ─── Action button ──────────────────────────────────────────────── */
const Btn = ({ variant = "primary", size = "md", icon, onClick, children, disabled }) => {
  const sz = { sm: { padding: "6px 13px", fontSize: 12 }, md: { padding: "9px 18px", fontSize: 13 } }[size];
  const variants = {
    primary: { bg: T.primary,      color: "#fff",    border: "none",                          hoverBg: T.primaryDark },
    green:   { bg: T.success,      color: "#fff",    border: "none",                          hoverBg: "#166534" },
    outline: { bg: T.surface,      color: T.muted,   border: `1px solid ${T.border}`,         hoverBg: T.surfaceAlt },
    ghost:   { bg: "transparent",  color: T.primary, border: `1px solid ${T.primaryLight}`,   hoverBg: T.primaryLight },
    danger:  { bg: T.dangerLight,  color: T.danger,  border: `1px solid #fecaca`,             hoverBg: "#fee2e2" },
  };
  const v = variants[variant] || variants.primary;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...sz,
        background: disabled ? "#e2e8f0" : v.bg,
        color: disabled ? T.faint : v.color,
        border: v.border || "none",
        borderRadius: 0,
        fontFamily: "'Noto Sans', sans-serif",
        fontWeight: 700,
        cursor: disabled ? "default" : "pointer",
        display: "inline-flex", alignItems: "center", gap: 6,
        transition: "all .14s", whiteSpace: "nowrap",
        opacity: disabled ? 0.7 : 1,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = v.hoverBg; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = disabled ? "#e2e8f0" : v.bg; }}
    >
      {icon && <span style={{ fontSize: 13, lineHeight: 1 }}>{icon}</span>}
      {children}
    </button>
  );
};

/* ─── Toggle row ─────────────────────────────────────────────────── */
const ToggleRow = ({ label, desc, checked, onChange }) => (
  <label style={{ display: "flex", alignItems: "flex-start", gap: 11, cursor: "pointer", padding: "9px 10px", transition: "background .12s" }}
    onMouseEnter={e => e.currentTarget.style.background = T.surfaceAlt}
    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
  >
    <div style={{ width: 36, height: 20, borderRadius: 10, flexShrink: 0, marginTop: 2, background: checked ? T.primary : T.faint, position: "relative", transition: "background .2s", cursor: "pointer" }}>
      <div style={{ position: "absolute", top: 3, left: checked ? 18 : 3, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
      <input type="checkbox" checked={checked} onChange={onChange} style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", margin: 0, cursor: "pointer" }} />
    </div>
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: T.text, lineHeight: 1.4 }}>{label}</div>
      {desc && <div style={{ fontSize: 11.5, color: T.faint, marginTop: 1 }}>{desc}</div>}
    </div>
  </label>
);

/* ─── Status badge ───────────────────────────────────────────────── */
const StatusBadge = ({ label, color, bg, border }) => (
  <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", fontSize: 10.5, fontWeight: 700, color, background: bg, border: `1px solid ${border}` }}>
    {label}
  </span>
);

/* ─── ListManager ────────────────────────────────────────────────── */
const ListManager = ({ icon, label, items, onSave }) => {
  const [list,    setList]    = useState([...items]);
  const [newVal,  setNewVal]  = useState("");
  const [editIdx, setEditIdx] = useState(null);
  const [editVal, setEditVal] = useState("");

  useEffect(() => { setList([...items]); }, [items]);

  const add = () => {
    const t = newVal.trim();
    if (!t) return;
    if (list.map(x => x.toLowerCase()).includes(t.toLowerCase())) { toast.error(`"${t}" already exists`); return; }
    const next = [...list, t];
    setList(next); setNewVal(""); onSave(next); toast.success(`Added "${t}"`);
  };

  const saveEdit = idx => {
    const t = editVal.trim();
    if (!t) return;
    if (list.some((v, i) => i !== idx && v.toLowerCase() === t.toLowerCase())) { toast.error(`"${t}" already exists`); return; }
    const next = list.map((v, i) => i === idx ? t : v);
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
        <span style={{ fontSize: 12, fontWeight: 700, color: T.dark }}>{label}</span>
        <span style={{ marginLeft: "auto", fontSize: 10.5, fontWeight: 700, color: T.primary, background: T.primaryLight, border: `1px solid #c3d9f5`, padding: "2px 8px" }}>
          {list.length}
        </span>
      </div>

      {/* Items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 9, maxHeight: 188, overflowY: "auto" }}>
        {list.length === 0 && (
          <div style={{ fontSize: 12, color: T.faint, fontStyle: "italic", padding: "8px 4px" }}>No items yet</div>
        )}
        {list.map((item, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 8px", background: editIdx === idx ? T.primaryLight : T.surfaceAlt, border: `1px solid ${editIdx === idx ? "#c3d9f5" : T.border}`, transition: "border-color .12s" }}>
            {editIdx === idx ? (
              <>
                <input value={editVal} onChange={e => setEditVal(e.target.value)} onKeyDown={e => e.key === "Enter" && saveEdit(idx)}
                  style={{ ...inputBase, flex: 1, padding: "4px 7px", fontSize: 12.5 }} autoFocus
                  onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => Object.assign(e.target.style, blurStyle)}
                />
                <button onClick={() => saveEdit(idx)} style={{ background: T.success, color: "#fff", border: "none", padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", borderRadius: 0 }}>✓</button>
                <button onClick={() => setEditIdx(null)} style={{ background: T.border, color: T.muted, border: "none", padding: "4px 9px", fontSize: 12, cursor: "pointer", borderRadius: 0 }}>✕</button>
              </>
            ) : (
              <>
                <span style={{ flex: 1, fontSize: 13, color: T.text, fontWeight: 500 }}>{item}</span>
                <button onClick={() => { setEditIdx(idx); setEditVal(item); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: T.primary, fontSize: 13, padding: "2px 5px", lineHeight: 1 }}
                  onMouseEnter={e => e.currentTarget.style.background = T.primaryLight}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}
                >✏️</button>
                <button onClick={() => remove(idx)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: T.danger, fontSize: 13, padding: "2px 5px", lineHeight: 1 }}
                  onMouseEnter={e => e.currentTarget.style.background = T.dangerLight}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}
                >🗑</button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add new */}
      <div style={{ display: "flex", gap: 5 }}>
        <input
          value={newVal} onChange={e => setNewVal(e.target.value)} onKeyDown={e => e.key === "Enter" && add()}
          placeholder={`New ${label.toLowerCase()}…`}
          style={{ ...inputBase, flex: 1, padding: "7px 9px", fontSize: 12.5 }}
          onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => Object.assign(e.target.style, blurStyle)}
        />
        <button onClick={add} disabled={!newVal.trim()}
          style={{ background: newVal.trim() ? T.primary : "#e2e8f0", color: newVal.trim() ? "#fff" : T.faint, border: "none", borderRadius: 0, padding: "7px 13px", fontSize: 12.5, fontWeight: 700, cursor: newVal.trim() ? "pointer" : "default", fontFamily: "inherit", whiteSpace: "nowrap", transition: "background .14s" }}>
          + Add
        </button>
      </div>
    </div>
  );
};

/* ─── SavedDetailsCard ───────────────────────────────────────────── */
const SavedDetailsCard = ({ records, onEdit, onDelete, showCompany = true, showInvoice = true }) => {
  const company = showCompany ? records?.company : null;
  const invoice = showInvoice ? records?.invoice : null;
  if (!company && !invoice) return null;

  const Section = ({ label, record, type }) => {
    if (!record) return null;
    return (
      <div style={{ border: `1px solid ${T.border}`, padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: T.dark }}>{label}</span>
          <StatusBadge label="Saved" color={T.success} bg={T.successLight} border="#bbf7d0" />
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <Btn variant="outline" size="sm" onClick={() => onEdit(type)}>Edit</Btn>
            <Btn variant="danger"  size="sm" onClick={() => onDelete(type)}>Delete</Btn>
          </div>
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          {record.rows.map(r => (
            <div key={`${type}-${r.label}`} style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10, fontSize: 12.5, borderBottom: `1px solid ${T.borderLight}`, paddingBottom: 5 }}>
              <div style={{ color: T.muted, fontWeight: 600 }}>{r.label}</div>
              <div style={{ color: T.text }}>{String(r.value || "—")}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: T.faint }}>Saved: {record.savedAt || "—"}</div>
      </div>
    );
  };

  return (
    <Card icon="✅" title="Saved Details" accent={T.success}>
      <div style={{ display: "grid", gap: 10 }}>
        {company && <Section label="Company Profile"  record={company} type="company" />}
        {invoice && <Section label="Invoice Settings" record={invoice} type="invoice" />}
      </div>
    </Card>
  );
};

/* ─── Validation helpers ─────────────────────────────────────────── */
const validators = {
  profile: (s) => {
    if (!String(s.shopName  || "").trim()) return "Shop Name is required";
    if (!String(s.ownerName || "").trim()) return "Owner Name is required";
    const ph = String(s.phone || "").trim();
    if (!ph)           return "Mobile Number is required";
    if (ph.length !== 10) return "Mobile Number must be exactly 10 digits";
    if (s.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) return "Enter a valid email address";
    if (s.gstNumber && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(s.gstNumber.toUpperCase())) return "Enter a valid GSTIN (15 characters)";
    return null;
  },
  invoice: (s) => {
    if (!String(s.invoicePrefix     || "").trim()) return "Invoice Prefix is required";
    if (!String(s.quotationPrefix   || "").trim()) return "Quotation Prefix is required";
    const inv  = Number(s.nextInvoiceNumber);
    const qtn  = Number(s.nextQuotationNumber);
    if (!Number.isFinite(inv)  || inv  <= 0) return "Starting Invoice No. must be greater than 0";
    if (!Number.isFinite(qtn)  || qtn  <= 0) return "Starting Quotation No. must be greater than 0";
    return null;
  },
};

/* ═══════════════════════════════════════════════════════ */
const Settings = ({ section = "all" }) => {
  const navigate = useNavigate();

  const [settings,          setSettings]          = useState(defaultSettings);
  const [logoPreview,       setLogoPreview]       = useState("");
  const [categories,        setCategories]        = useState(DEFAULT_CATEGORIES);
  const [brands,            setBrands]            = useState(DEFAULT_BRANDS);
  const [finishes,          setFinishes]          = useState(DEFAULT_FINISHES);
  const [racks,             setRacks]             = useState(DEFAULT_RACKS);
  const [backupBusy,        setBackupBusy]        = useState(false);
  const [exportBusy,        setExportBusy]        = useState(false);
  const [restoreBusy,       setRestoreBusy]       = useState(false);
  const [lastBackupAt,      setLastBackupAt]      = useState(() => localStorage.getItem(LAST_BACKUP_KEY) || "");
  const [savedRecords,      setSavedRecords]      = useState(() => {
    try { return JSON.parse(localStorage.getItem(SAVED_RECORDS_KEY)) || { company: null, invoice: null }; }
    catch { return { company: null, invoice: null }; }
  });
  const [errors, setErrors] = useState({});

  const restoreInputRef = useRef(null);

  /* ── Visibility flags ── */
  const view         = section || "all";
  const showAll      = view === "all";
  const showCompany  = showAll || view === "company-profile";
  const showInvoice  = showAll || view === "invoice-settings";
  const showProduct  = showAll || view === "product-defaults";
  const showUsers    = showAll || view === "user-management";
  const showBackup   = showAll || view === "backup-data";
  const showSaved    = showAll;
  const showSavedForCompany = view === "company-profile";
  const showSavedForInvoice = view === "invoice-settings";
  const leftHas  = showCompany || showInvoice || showProduct;
  const rightHas = showUsers   || showBackup || showSaved;
  const gridCols = leftHas && rightHas ? "minmax(0, 1.6fr) minmax(0, 1fr)" : "minmax(0, 1fr)";

  /* ── Load persisted data ── */
  useEffect(() => {
    const saved = localStorage.getItem("shopSettings");
    if (saved) { try { setSettings(p => ({ ...p, ...JSON.parse(saved) })); } catch { /**/ } }
    const defs = (() => { try { return JSON.parse(localStorage.getItem("productDefaults")) || {}; } catch { return {}; } })();
    if (defs.categories?.length) setCategories(defs.categories);
    if (defs.brands?.length)     setBrands(defs.brands);
    if (defs.finishes?.length)   setFinishes(defs.finishes);
    if (defs.racks?.length)      setRacks(defs.racks);
    API.get("/categories")
      .then(res => { const d = (res.data || []).map(c => c.name).filter(Boolean); if (d.length) setCategories(d); })
      .catch(() => {});
  }, []);

  /* ── Helpers ── */
  const set = (name, value) => {
    setSettings(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => { const n = { ...p }; delete n[name]; return n; });
  };

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") { set(name, checked); return; }
    if (DIGIT_ONLY_FIELDS.has(name)) { set(name, String(value || "").replace(/\D/g, "").slice(0, 10)); return; }
    if (NUMBER_FIELDS.has(name))     { set(name, value === "" ? "" : Number(value)); return; }
    set(name, value);
  };

  const handleLogo = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 300, 0.8);
      setLogoPreview(compressed); set("logo", compressed);
    } catch { toast.error("Failed to process logo"); }
  };

  const persist = msg => { localStorage.setItem("shopSettings", JSON.stringify(settings)); toast.success(msg); };

  const saveRecords = next => {
    setSavedRecords(next);
    localStorage.setItem(SAVED_RECORDS_KEY, JSON.stringify(next));
  };

  const saveProductDefaults = (key, value) => {
    const cur = (() => { try { return JSON.parse(localStorage.getItem("productDefaults")) || {}; } catch { return {}; } })();
    localStorage.setItem("productDefaults", JSON.stringify({ ...cur, [key]: value }));
  };

  const saveLastBackupAt = iso => { localStorage.setItem(LAST_BACKUP_KEY, iso); setLastBackupAt(iso); };

  const fmtLastBackup = iso => {
    if (!iso) return "Never";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "Never" : d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  /* ── Validate & show field-level errors ── */
  const validate = (type, fields) => {
    const msg = validators[type]?.(settings);
    if (msg) {
      // Map error to relevant field for inline highlighting
      const fieldMap = {
        "Shop Name":     "shopName",
        "Owner Name":    "ownerName",
        "Mobile Number": "phone",
        "email":         "email",
        "GSTIN":         "gstNumber",
        "Invoice Prefix": "invoicePrefix",
        "Quotation Prefix": "quotationPrefix",
        "Starting Invoice No.": "nextInvoiceNumber",
        "Starting Quotation No.": "nextQuotationNumber",
      };
      const errorField = Object.keys(fieldMap).find(k => msg.includes(k));
      if (errorField) setErrors(p => ({ ...p, [fieldMap[errorField]]: msg }));
      toast.error(msg);
      return false;
    }
    setErrors({});
    return true;
  };

  /* ── Save handlers ── */
  const handleEditSavedRecord = type => {
    const record = savedRecords?.[type];
    if (!record?.data) return;
    setSettings(p => ({ ...p, ...record.data }));
    toast.success(`${type === "company" ? "Company" : "Invoice"} details loaded for editing`);
  };

  const handleDeleteSavedRecord = type => {
    saveRecords({ ...savedRecords, [type]: null });
    toast.success(`${type === "company" ? "Company" : "Invoice"} saved details deleted`);
  };

  const handleSaveProfile = () => {
    if (!validate("profile")) return;
    persist("Profile saved");
    saveRecords({
      ...savedRecords,
      company: {
        data: { shopName: settings.shopName, ownerName: settings.ownerName, phone: settings.phone, email: settings.email, address: settings.address, state: settings.state, gstNumber: settings.gstNumber, upiId: settings.upiId, logo: settings.logo },
        rows: [
          { label: "Shop Name",    value: settings.shopName },
          { label: "Owner Name",   value: settings.ownerName },
          { label: "Mobile",       value: settings.phone },
          { label: "Email",        value: settings.email },
          { label: "Address",      value: settings.address },
          { label: "State",        value: settings.state },
          { label: "GSTIN",        value: settings.gstNumber },
          { label: "UPI ID",       value: settings.upiId },
        ],
        savedAt: new Date().toLocaleString("en-IN"),
      },
    });
    setSettings(p => ({ ...p, shopName: "", ownerName: "", phone: "", email: "", address: "", state: "", gstNumber: "", upiId: "" }));
  };

  const handleSaveInvoice = () => {
    if (!validate("invoice")) return;
    persist("Invoice settings saved");
    saveRecords({
      ...savedRecords,
      invoice: {
        data: { invoicePrefix: settings.invoicePrefix, nextInvoiceNumber: settings.nextInvoiceNumber, quotationPrefix: settings.quotationPrefix, nextQuotationNumber: settings.nextQuotationNumber, defaultTax: settings.defaultTax, taxTypeDefault: settings.taxTypeDefault, termsAndConditions: settings.termsAndConditions, bankName: settings.bankName, accountNumber: settings.accountNumber },
        rows: [
          { label: "Invoice Prefix",       value: settings.invoicePrefix },
          { label: "Starting Invoice No.", value: settings.nextInvoiceNumber },
          { label: "Quotation Prefix",     value: settings.quotationPrefix },
          { label: "Starting Quotation No.", value: settings.nextQuotationNumber },
          { label: "Default GST Rate",      value: `${settings.defaultTax}%` },
          { label: "Default Tax Type",      value: settings.taxTypeDefault },
          { label: "Terms & Conditions",    value: settings.termsAndConditions },
          { label: "Bank Name",             value: settings.bankName },
          { label: "Account Number",        value: settings.accountNumber },
        ],
        savedAt: new Date().toLocaleString("en-IN"),
      },
    });
    setSettings(p => ({ ...p, invoicePrefix: "", nextInvoiceNumber: "", quotationPrefix: "", nextQuotationNumber: "", defaultTax: "", taxTypeDefault: "", termsAndConditions: "", bankName: "", accountNumber: "" }));
  };

  /* ── Export/Backup utilities ── */
  const downloadFile = (content, fileName, mimeType) => {
    const url  = URL.createObjectURL(new Blob([content], { type: mimeType }));
    const link = Object.assign(document.createElement("a"), { href: url, download: fileName });
    document.body.appendChild(link); link.click(); link.remove();
    URL.revokeObjectURL(url);
  };

  const escapeCsv = v => { const r = v == null ? "" : String(v); return /[",\n]/.test(r) ? `"${r.replace(/"/g, '""')}"` : r; };

  const toHtmlTable = (rows = [], columns = []) => {
    const esc = v => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const head = columns.map(c => `<th>${esc(c.header)}</th>`).join("");
    const body = rows.map(row => `<tr>${columns.map(c => `<td>${esc(row?.[c.key])}</td>`).join("")}</tr>`).join("");
    return `<!doctype html><html><head><meta charset="utf-8"></head><body><table border="1"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
  };

  const getExportConfigs = (data = {}, stamp = "") => [
    { name: `products-${stamp}`,  rows: Array.isArray(data.products)  ? data.products  : [], columns: [{ key: "name", header: "Name" }, { key: "code", header: "Code" }, { key: "category", header: "Category" }, { key: "brand", header: "Brand" }, { key: "finish", header: "Finish" }, { key: "size", header: "Size" }, { key: "price", header: "Price" }, { key: "stock", header: "Stock" }] },
    { name: `customers-${stamp}`, rows: Array.isArray(data.customers) ? data.customers : [], columns: [{ key: "name", header: "Name" }, { key: "phone", header: "Phone" }, { key: "city", header: "City" }, { key: "gstin", header: "GSTIN" }, { key: "customerType", header: "Customer Type" }, { key: "paymentTerms", header: "Payment Terms" }, { key: "totalSpent", header: "Total Spent" }] },
    { name: `suppliers-${stamp}`, rows: Array.isArray(data.suppliers) ? data.suppliers : [], columns: [{ key: "companyName", header: "Company Name" }, { key: "supplierName", header: "Supplier Name" }, { key: "companyPhone", header: "Phone" }, { key: "city", header: "City" }, { key: "gstin", header: "GSTIN" }, { key: "paymentTerms", header: "Payment Terms" }, { key: "totalDue", header: "Total Due" }] },
    {
      name: `invoices-${stamp}`,
      rows: (Array.isArray(data.invoices) ? data.invoices : []).map(inv => ({ invoiceNo: inv?.invoiceNo || "", date: inv?.date || "", customerName: inv?.customer?.name || "", customerPhone: inv?.customer?.phone || "", status: inv?.status || "", paymentMethod: inv?.payment?.method || "", paidAmount: inv?.payment?.paidAmount || 0, dueAmount: inv?.payment?.dueAmount || 0, itemCount: Array.isArray(inv?.items) ? inv.items.length : 0 })),
      columns: [{ key: "invoiceNo", header: "Invoice No" }, { key: "date", header: "Date" }, { key: "customerName", header: "Customer Name" }, { key: "customerPhone", header: "Customer Phone" }, { key: "status", header: "Status" }, { key: "paymentMethod", header: "Payment Method" }, { key: "paidAmount", header: "Paid Amount" }, { key: "dueAmount", header: "Due Amount" }, { key: "itemCount", header: "Items" }],
    },
    { name: `purchases-${stamp}`, rows: Array.isArray(data.purchases) ? data.purchases : [], columns: [{ key: "grnNo", header: "GRN No" }, { key: "invoiceNo", header: "Invoice No" }, { key: "invoiceDate", header: "Invoice Date" }, { key: "supplierName", header: "Supplier Name" }, { key: "grandTotal", header: "Grand Total" }, { key: "totalPaid", header: "Total Paid" }, { key: "totalDue", header: "Total Due" }, { key: "paymentStatus", header: "Payment Status" }] },
  ];

  const createBackupPackage = async () => {
    const res        = await API.get("/system/backup/export");
    const serverData = res?.data?.data || {};
    const generatedAt= new Date().toISOString();
    const stamp      = generatedAt.replace(/[:.]/g, "-");
    const payload    = {
      meta:   { app: "billing-software", version: 1, generatedAt },
      server: serverData,
      client: {
        shopSettings:   localStorage.getItem("shopSettings") ? JSON.parse(localStorage.getItem("shopSettings")) : settings,
        productDefaults: localStorage.getItem("productDefaults") ? JSON.parse(localStorage.getItem("productDefaults")) : { categories, brands, finishes, racks },
      },
    };
    return {
      generatedAt,
      fileName: `billing-backup-${stamp}.json`,
      text: JSON.stringify(payload, null, 2),
    };
  };

  const handleBackupNow = async () => {
    setBackupBusy(true);
    try {
      const backup = await createBackupPackage();
      downloadFile(backup.text, backup.fileName, "application/json;charset=utf-8;");
      saveLastBackupAt(backup.generatedAt);
      toast.success("Backup downloaded as JSON");
    } catch (err) { toast.error(err?.response?.data?.error || "Failed to create backup"); }
    finally { setBackupBusy(false); }
  };

  const handleSendBackupWhatsapp = async () => {
    setBackupBusy(true);
    try {
      const backup = await createBackupPackage();
      const file = new File([backup.text], backup.fileName, { type: "application/json" });
      const message = `Billing software backup\nGenerated: ${fmtLastBackup(backup.generatedAt)}`;
      saveLastBackupAt(backup.generatedAt);
      const isMobile = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent || "");
      const canShareFile = Boolean(
        window.isSecureContext &&
        isMobile &&
        navigator.share &&
        navigator.canShare?.({ files: [file] })
      );

      if (canShareFile) {
        await navigator.share({ title: backup.fileName, text: message, files: [file] });
        toast.success("Backup shared");
        return;
      }

      downloadFile(backup.text, backup.fileName, "application/json;charset=utf-8;");
      window.open(isMobile ? "https://wa.me/" : "https://web.whatsapp.com/", "_blank");
      toast.success("Backup downloaded. Attach the file in WhatsApp.");
    } catch (err) { toast.error(err?.response?.data?.error || err?.message || "Failed to prepare backup for WhatsApp"); }
    finally { setBackupBusy(false); }
  };

  const handleExportData = async () => {
    setExportBusy(true);
    try {
      const res    = await API.get("/system/backup/export");
      const data   = res?.data?.data || {};
      const stamp  = new Date().toISOString().replace(/[:.]/g, "-");
      getExportConfigs(data, stamp).forEach(({ name, rows, columns }) =>
        downloadFile(toHtmlTable(rows, columns), `${name}.xls`, "application/vnd.ms-excel;charset=utf-8;")
      );
      toast.success("Data exported as Excel files");
    } catch (err) { toast.error(err?.response?.data?.error || "Failed to export data"); }
    finally { setExportBusy(false); }
  };

  const handleRestoreFile = async e => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!window.confirm("Restoring will overwrite current database data. Continue?")) return;
    setRestoreBusy(true);
    try {
      const lowerName = String(file.name || "").toLowerCase();
      const ext  = lowerName.split(".").pop() || "";
      const text = await file.text();

      if (ext === "json") {
        const parsed        = JSON.parse(text);
        const serverPayload = parsed?.server && typeof parsed.server === "object" ? parsed.server : parsed?.data && typeof parsed.data === "object" ? parsed.data : parsed;
        await API.post("/system/backup/restore", { data: serverPayload });
        if (parsed?.client?.shopSettings)    { localStorage.setItem("shopSettings", JSON.stringify(parsed.client.shopSettings)); setSettings(p => ({ ...p, ...parsed.client.shopSettings })); }
        if (parsed?.client?.productDefaults) {
          const d = parsed.client.productDefaults;
          localStorage.setItem("productDefaults", JSON.stringify(d));
          if (Array.isArray(d.categories) && d.categories.length) setCategories(d.categories);
          if (Array.isArray(d.brands)     && d.brands.length)     setBrands(d.brands);
          if (Array.isArray(d.finishes)   && d.finishes.length)   setFinishes(d.finishes);
          if (Array.isArray(d.racks)      && d.racks.length)      setRacks(d.racks);
        }
      } else if (["csv", "xls", "xlsx"].includes(ext)) {
        const collectionKeyMap = { product: "products", customer: "customers", supplier: "suppliers", invoice: "invoices", purchase: "purchases", user: "users" };
        const collectionKey   = Object.keys(collectionKeyMap).find(k => lowerName.includes(k));
        if (!collectionKey) throw new Error("Unable to detect data type from file name. Use names like products/customers/invoices...");

        let normalizedRows = [];
        if (ext === "csv") {
          normalizedRows = parseCsvRows(text);
        } else {
          const doc = new DOMParser().parseFromString(text, "text/html");
          const table = doc.querySelector("table");
          if (!table) throw new Error("Invalid Excel file");
          const rows = Array.from(table.querySelectorAll("tr"));
          if (rows.length < 2) throw new Error("No data rows found");
          const headers = Array.from(rows[0].querySelectorAll("th,td")).map(c => normalizeImportKey(c.textContent || ""));
          normalizedRows = rows.slice(1).map(tr => {
            const cells = Array.from(tr.querySelectorAll("td"));
            const row = {};
            headers.forEach((h, i) => { row[h] = (cells[i]?.textContent || "").trim(); });
            return row;
          });
        }

        const toNum = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
        const mappers = {
          products:  r => ({ name: r.name || "", code: r.code || "", category: r.category || "", brand: r.brand || "", finish: r.finish || "", size: r.size || "", price: toNum(r.price), stock: toNum(r.stock) }),
          customers: r => ({ name: r.name || "", phone: r.phone || "", city: r.city || "", gstin: r.gstin || "", customerType: r.customertype || "", paymentTerms: r.paymentterms || "", totalSpent: toNum(r.totalspent) }),
          suppliers: r => ({ companyName: r.companyname || "", supplierName: r.suppliername || "", companyPhone: r.phone || r.companyphone || "", city: r.city || "", gstin: r.gstin || "", paymentTerms: r.paymentterms || "", totalDue: toNum(r.totaldue) }),
          invoices:  r => ({ invoiceNo: r.invoiceno || "", date: r.date || "", status: r.status || "", customer: { name: r.customername || "", phone: r.customerphone || "" }, payment: { method: r.paymentmethod || "", paidAmount: toNum(r.paidamount), dueAmount: toNum(r.dueamount) } }),
          purchases: r => ({ grnNo: r.grnno || "", invoiceNo: r.invoiceno || "", invoiceDate: r.invoicedate || "", supplierName: r.suppliername || "", grandTotal: toNum(r.grandtotal), totalPaid: toNum(r.totalpaid), totalDue: toNum(r.totaldue), paymentStatus: r.paymentstatus || "" }),
          users:     r => ({ name: r.name || "", phone: r.phone || "", role: (r.role || "staff").toLowerCase() === "admin" ? "admin" : "staff" }),
        };
        const key = collectionKeyMap[collectionKey];
        await API.post("/system/backup/restore", { data: { [key]: normalizedRows.map(mappers[key] || (r => r)) } });
      } else {
        throw new Error("Unsupported file format. Use .json, .csv, or .xls");
      }

      saveLastBackupAt(new Date().toISOString());
      toast.success("Backup restored successfully");
    } catch (err) { toast.error(err?.response?.data?.error || err?.message || "Failed to restore backup"); }
    finally { setRestoreBusy(false); }
  };

  /* ─── Field error helper ─────────────────────────────────────── */
  const fieldErr = name => errors[name]
    ? <div style={{ marginTop: 4, fontSize: 11, color: T.danger, fontWeight: 600 }}>⚠ {errors[name]}</div>
    : null;

  const errBorder = name => errors[name] ? { borderColor: T.danger, boxShadow: "0 0 0 3px rgba(185,28,28,.08)" } : {};

  /* ─── Render ─────────────────────────────────────────────────── */
  return (
    <div style={{ fontFamily: "'Noto Sans', sans-serif", padding: 0, background: T.bg, minHeight: "100%" }}>
      {/* Page header */}
      <div style={{ padding: "14px 24px", background: T.surface, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.dark, lineHeight: 1.2, letterSpacing: "-.01em" }}>Settings</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 1 }}>Manage shop profile, invoice, products and system preferences</div>
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700, color: T.muted, background: T.surfaceAlt, border: `1px solid ${T.border}`, padding: "5px 10px" }}>
          {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </div>
      </div>

      <div style={{ padding: "0 20px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: 16, alignItems: "start" }}>

          {/* ══ LEFT COLUMN ══ */}
          {leftHas && (
          <div>

            {/* Company Profile */}
            {showCompany && (
            <Card id="company-profile" icon="🏪" title="Shop / Company Profile">

              {/* Logo row */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18, padding: "13px 14px", background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
                {(logoPreview || settings.logo) ? (
                  <img src={logoPreview || settings.logo} alt="Shop logo" style={{ width: 56, height: 56, objectFit: "contain", border: `1px solid ${T.border}`, background: T.surface, flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 56, height: 56, border: `2px dashed ${T.border}`, background: T.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: T.faint, flexShrink: 0 }}>🏪</div>
                )}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 3 }}>Shop Logo</div>
                  <div style={{ fontSize: 11.5, color: T.faint, marginBottom: 8 }}>Displayed on invoices & receipts · PNG or JPG</div>
                  <label htmlFor="shop-logo-upload" style={{ fontSize: 12, fontWeight: 700, color: T.primary, border: `1px solid #c3d9f5`, background: T.primaryLight, padding: "5px 12px", cursor: "pointer", display: "inline-block" }}>
                    {(logoPreview || settings.logo) ? "Change Logo" : "Upload Logo"}
                  </label>
                </div>
              </div>

              <SectionLabel>Business Details</SectionLabel>
              <Grid cols={1} mb={12}>
                <div>
                  <InputField label="Shop Name" required name="shopName" value={settings.shopName} onChange={handleChange} placeholder="Sri Murugan Tiles & Sanitary" style={errBorder("shopName")} />
                  {fieldErr("shopName")}
                </div>
              </Grid>
              <Grid cols={2} mb={12}>
                <div>
                  <InputField label="Owner Name" required name="ownerName" value={settings.ownerName} onChange={handleChange} placeholder="Murugan P." style={errBorder("ownerName")} />
                  {fieldErr("ownerName")}
                </div>
                <div>
                  <InputField label="Mobile Number" required name="phone" value={settings.phone} onChange={handleChange} placeholder="9876543210" style={errBorder("phone")} />
                  {fieldErr("phone")}
                </div>
              </Grid>
              <Grid cols={1} mb={12}>
                <TextareaField label="Address" name="address" value={settings.address} onChange={handleChange} placeholder="No. 42, Main Road, Shevapet, Salem - 636 002, Tamil Nadu" />
              </Grid>

              <Divider mt={4} mb={14} />
              <SectionLabel>Tax & Registration</SectionLabel>
              <Grid cols={2} mb={12}>
                <div>
                  <InputField label="GSTIN" name="gstNumber" value={settings.gstNumber} onChange={handleChange} placeholder="33ABCDE1234F1Z5" style={errBorder("gstNumber")} />
                  {fieldErr("gstNumber")}
                </div>
                <SelectField label="State" name="state" value={settings.state} onChange={handleChange}>
                  <option value="">Select State</option>
                  {STATE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </SelectField>
              </Grid>

              <Divider mt={4} mb={14} />
              <SectionLabel>Contact & Payments</SectionLabel>
              <Grid cols={2} mb={18}>
                <div>
                  <InputField label="Email Address" name="email" value={settings.email} onChange={handleChange} placeholder="srimurugan.tiles@gmail.com" style={errBorder("email")} />
                  {fieldErr("email")}
                </div>
                <InputField label="UPI ID" name="upiId" value={settings.upiId} onChange={handleChange} placeholder="srimurugan@upi" />
              </Grid>

              <Btn variant="green" icon="💾" onClick={handleSaveProfile}>Save Profile</Btn>
            </Card>
            )}
            {showCompany && showSavedForCompany && (
              <SavedDetailsCard records={savedRecords} onEdit={handleEditSavedRecord} onDelete={handleDeleteSavedRecord} showCompany showInvoice={false} />
            )}

            {/* Invoice Settings */}
            {showInvoice && (
            <Card id="invoice-settings" icon="📋" title="Invoice Settings">
              <SectionLabel>Invoice Numbering</SectionLabel>
              <Grid cols={2} mb={12}>
                <div>
                  <InputField label="Invoice Prefix" name="invoicePrefix" value={settings.invoicePrefix} onChange={handleChange} style={errBorder("invoicePrefix")} />
                  {fieldErr("invoicePrefix")}
                </div>
                <div>
                  <InputField label="Starting Invoice No." name="nextInvoiceNumber" type="number" value={settings.nextInvoiceNumber} onChange={handleChange} style={errBorder("nextInvoiceNumber")} />
                  {fieldErr("nextInvoiceNumber")}
                </div>
              </Grid>
              <Grid cols={2} mb={12}>
                <div>
                  <InputField label="Quotation Prefix" name="quotationPrefix" value={settings.quotationPrefix} onChange={handleChange} style={errBorder("quotationPrefix")} />
                  {fieldErr("quotationPrefix")}
                </div>
                <div>
                  <InputField label="Starting Quotation No." name="nextQuotationNumber" type="number" value={settings.nextQuotationNumber} onChange={handleChange} style={errBorder("nextQuotationNumber")} />
                  {fieldErr("nextQuotationNumber")}
                </div>
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
                <InputField label="Bank Name"       name="bankName"       value={settings.bankName}       onChange={handleChange} placeholder="Indian Bank, Salem" />
                <InputField label="Account Number"  name="accountNumber"  value={settings.accountNumber}  onChange={handleChange} placeholder="123456789012" />
              </Grid>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Btn variant="green" icon="📋" onClick={handleSaveInvoice}>Save Invoice Settings</Btn>
                <Btn variant="outline" icon="🧾" onClick={() => navigate("/bill-format")}>Invoice Format</Btn>
              </div>
            </Card>
            )}
            {showInvoice && showSavedForInvoice && (
              <SavedDetailsCard records={savedRecords} onEdit={handleEditSavedRecord} onDelete={handleDeleteSavedRecord} showCompany={false} showInvoice />
            )}

            {/* Product Defaults */}
            {showProduct && (
            <Card id="product-defaults" icon="🗂️" title="Product Defaults">
              <p style={{ fontSize: 12.5, color: T.muted, marginTop: 0, marginBottom: 16, lineHeight: 1.7 }}>
                Manage dropdown options used when adding or editing products. Changes apply immediately.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { icon: "🏷️", label: "Categories",    items: categories, key: "categories", set: setCategories },
                  { icon: "🏭", label: "Brands",         items: brands,     key: "brands",     set: setBrands },
                  { icon: "✨", label: "Finishes",       items: finishes,   key: "finishes",   set: setFinishes },
                  { icon: "📦", label: "Rack Locations", items: racks,      key: "racks",      set: setRacks },
                ].map(({ icon, label, items, key, set: setter }) => (
                  <div key={key} style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, padding: "13px 14px" }}>
                    <ListManager icon={icon} label={label} items={items}
                      onSave={next => {
                        setter(next); saveProductDefaults(key, next);
                        if (key === "categories") API.post("/categories/bulk", { names: next }).catch(() => {});
                      }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, paddingTop: 13, borderTop: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12 }}>
                <Btn variant="outline" icon="↩" onClick={() => {
                  setCategories(DEFAULT_CATEGORIES); setBrands(DEFAULT_BRANDS); setFinishes(DEFAULT_FINISHES); setRacks(DEFAULT_RACKS);
                  ["categories", "brands", "finishes", "racks"].forEach((k, i) => saveProductDefaults(k, [DEFAULT_CATEGORIES, DEFAULT_BRANDS, DEFAULT_FINISHES, DEFAULT_RACKS][i]));
                  API.post("/categories/bulk", { names: DEFAULT_CATEGORIES }).catch(() => {});
                  toast.success("Reset to built-in defaults");
                }}>Reset to Defaults</Btn>
                <span style={{ fontSize: 11.5, color: T.faint }}>Restores all four lists to their original built-in values</span>
              </div>
            </Card>
            )}

          </div>
          )}

          {/* ══ RIGHT COLUMN ══ */}
          {rightHas && (
          <div>

            {/* User Management */}
            {showUsers && (
            <Card id="user-management" icon="👷" title="User Management">
              <UserManagement embedded />
            </Card>
            )}

            {/* Backup & Data */}
            {showBackup && (
            <Card id="backup-data" icon="🗄️" title="Backup & Data">
              {/* Status banner */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.successLight, border: `1px solid #a7f3d0`, padding: "10px 14px", marginBottom: 16 }}>
                <span style={{ fontSize: 15 }}>✅</span>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#065f46" }}>All data backed up</div>
                  <div style={{ fontSize: 11.5, color: T.success }}>Last backup: {fmtLastBackup(lastBackupAt)}</div>
                </div>
              </div>

              <SectionLabel>Actions</SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <Btn variant="primary" icon="📦" onClick={handleBackupNow}   disabled={backupBusy  || exportBusy || restoreBusy}>{backupBusy  ? "Creating…"  : "Backup Now"}</Btn>
                <Btn variant="outline" icon="⬇"  onClick={handleExportData}  disabled={backupBusy  || exportBusy || restoreBusy}>{exportBusy  ? "Exporting…" : "Export Data"}</Btn>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 2 }}>
                <Btn variant="outline" icon="📤" onClick={() => restoreInputRef.current?.click()} disabled={backupBusy || exportBusy || restoreBusy}>
                  {restoreBusy ? "Restoring…" : "Restore from Backup"}
                </Btn>
                <Btn variant="green" icon="📱" onClick={handleSendBackupWhatsapp} disabled={backupBusy || exportBusy || restoreBusy}>
                  Send to WhatsApp
                </Btn>
              </div>

              <div style={{ marginTop: 14, padding: "11px 13px", background: T.warningLight, border: `1px solid #fde68a` }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: T.warning, marginBottom: 2 }}>⚠ Before restoring</div>
                <div style={{ fontSize: 11, color: "#a16207", lineHeight: 1.6 }}>Restoring will overwrite current data. Create a backup first.</div>
              </div>
            </Card>
            )}

            {showSaved && (
              <SavedDetailsCard records={savedRecords} onEdit={handleEditSavedRecord} onDelete={handleDeleteSavedRecord} />
            )}

          </div>
          )}
        </div>
      </div>

      {/* Hidden file inputs */}
      <input id="shop-logo-upload" type="file" accept="image/*" hidden onChange={handleLogo} />
      <input ref={restoreInputRef} type="file" accept=".json,.csv,.xls,.xlsx,application/json,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden onChange={handleRestoreFile} />
    </div>
  );
};

export default Settings;
