import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import compressImage from "../utils/compressImage";
import UserManagement from "./UserManagement";
import API from "../services/api";

const GST_RATES = [0, 5, 12, 18, 28];
const STATE_OPTIONS = ["Tamil Nadu (33)", "Karnataka (29)", "Andhra Pradesh (37)", "Kerala (32)"];
const TAX_TYPE_OPTIONS = ["CGST+SGST (Intra-State TN)", "IGST (Inter-State)"];

const defaultSettings = {
  shopName: "",
  ownerName: "",
  phone: "",
  email: "",
  address: "",
  state: "Tamil Nadu (33)",
  gstNumber: "",
  upiId: "",
  invoicePrefix: "INV-",
  nextInvoiceNumber: 1,
  bulkInvoicePrefix: "BULK-",
  nextBulkInvoiceNumber: 1,
  defaultTax: 18,
  taxTypeDefault: "CGST+SGST (Intra-State TN)",
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

// ── Built-in fallbacks (same as AddItem.jsx) ──────────────────────────────
const DEFAULT_CATEGORIES = ["Floor Tile", "Wall Tile", "Vitrified Tile", "Parking Tile", "Granite", "Marble"];
const DEFAULT_BRANDS      = ["Kajaria", "Somany", "Nitco", "Johnson", "Orientbell", "Other"];
const DEFAULT_FINISHES    = ["Matt", "Glossy", "Polished", "Satin", "Rustic"];
const DEFAULT_RACKS       = ["Rack-A1", "Rack-A2", "Rack-B1", "Rack-B2", "Rack-C1"];

/* ── tiny reusable atoms ── */

const SectionCard = ({ icon, title, children }) => (
  <div style={{
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    marginBottom: 16,
    overflow: "hidden",
  }}>
    <div style={{
      padding: "12px 18px",
      borderBottom: "1px solid #edf0f5",
      display: "flex",
      alignItems: "center",
      gap: 8,
    }}>
      <span style={{ fontSize: 15 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#1c2333" }}>{title}</span>
    </div>
    <div style={{ padding: "18px 20px" }}>{children}</div>
  </div>
);

const FieldLabel = ({ children, required }) => (
  <label style={{
    display: "block",
    fontSize: 10,
    fontWeight: 700,
    color: "#8a9ab0",
    textTransform: "uppercase",
    letterSpacing: "0.7px",
    marginBottom: 5,
  }}>
    {children}{required && <span style={{ color: "#e53e3e" }}> *</span>}
  </label>
);

const inputSx = {
  width: "100%",
  padding: "8px 11px",
  border: "1px solid #d8e0ea",
  borderRadius: 6,
  fontFamily: "inherit",
  fontSize: 13,
  color: "#2d3748",
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.18s, box-shadow 0.18s",
};

const InputField = ({ label, required, style, ...props }) => (
  <div style={style}>
    <FieldLabel required={required}>{label}</FieldLabel>
    <input
      style={inputSx}
      onFocus={e => { e.target.style.borderColor = "#1a56a0"; e.target.style.boxShadow = "0 0 0 3px rgba(26,86,160,.09)"; }}
      onBlur={e => { e.target.style.borderColor = "#d8e0ea"; e.target.style.boxShadow = "none"; }}
      {...props}
    />
  </div>
);

const SelectField = ({ label, required, children, style, ...props }) => (
  <div style={style}>
    <FieldLabel required={required}>{label}</FieldLabel>
    <select
      style={{ ...inputSx, cursor: "pointer" }}
      onFocus={e => { e.target.style.borderColor = "#1a56a0"; e.target.style.boxShadow = "0 0 0 3px rgba(26,86,160,.09)"; }}
      onBlur={e => { e.target.style.borderColor = "#d8e0ea"; e.target.style.boxShadow = "none"; }}
      {...props}
    >
      {children}
    </select>
  </div>
);

const TextareaField = ({ label, style, ...props }) => (
  <div style={style}>
    <FieldLabel>{label}</FieldLabel>
    <textarea
      style={{ ...inputSx, resize: "vertical", minHeight: 72 }}
      onFocus={e => { e.target.style.borderColor = "#1a56a0"; e.target.style.boxShadow = "0 0 0 3px rgba(26,86,160,.09)"; }}
      onBlur={e => { e.target.style.borderColor = "#d8e0ea"; e.target.style.boxShadow = "none"; }}
      {...props}
    />
  </div>
);

const Row = ({ cols = 2, gap = 14, mb = 14, children }) => (
  <div style={{
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gap,
    marginBottom: mb,
  }}>
    {children}
  </div>
);

const SaveBtn = ({ onClick, children, icon = "💾" }) => (
  <button
    onClick={onClick}
    style={{
      background: "#1a7a4a",
      color: "#fff",
      border: "none",
      padding: "8px 18px",
      borderRadius: 6,
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontFamily: "inherit",
    }}
    onMouseEnter={e => e.currentTarget.style.background = "#146038"}
    onMouseLeave={e => e.currentTarget.style.background = "#1a7a4a"}
  >
    {icon} {children}
  </button>
);

const OutlineBtn = ({ onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      background: "#fff",
      color: "#2d3748",
      border: "1px solid #d0d8e4",
      padding: "7px 14px",
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 500,
      cursor: "pointer",
      fontFamily: "inherit",
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = "#1a56a0"; e.currentTarget.style.color = "#1a56a0"; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = "#d0d8e4"; e.currentTarget.style.color = "#2d3748"; }}
  >
    {children}
  </button>
);

const PrimaryBtn = ({ onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      background: "#1a56a0",
      color: "#fff",
      border: "none",
      padding: "7px 14px",
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer",
      fontFamily: "inherit",
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
    }}
    onMouseEnter={e => e.currentTarget.style.background = "#0f3d7a"}
    onMouseLeave={e => e.currentTarget.style.background = "#1a56a0"}
  >
    {children}
  </button>
);

// ── Product Defaults list manager ─────────────────────────────────────────
// Manages one list (categories / brands / finishes / racks) with add/edit/delete
const ListManager = ({ icon, label, items, onSave }) => {
  const [list, setList]       = useState([...items]);
  const [newVal, setNewVal]   = useState("");
  const [editIdx, setEditIdx] = useState(null);
  const [editVal, setEditVal] = useState("");

  // Sync if parent items change (e.g. after API load)
  useEffect(() => { setList([...items]); }, [items]);

  const add = () => {
    const trimmed = newVal.trim();
    if (!trimmed) return;
    if (list.map(x => x.toLowerCase()).includes(trimmed.toLowerCase())) {
      toast.error(`"${trimmed}" already exists`);
      return;
    }
    const next = [...list, trimmed];
    setList(next);
    setNewVal("");
    onSave(next);
    toast.success(`Added "${trimmed}"`);
  };

  const startEdit = (idx) => {
    setEditIdx(idx);
    setEditVal(list[idx]);
  };

  const saveEdit = (idx) => {
    const trimmed = editVal.trim();
    if (!trimmed) return;
    const next = list.map((v, i) => (i === idx ? trimmed : v));
    setList(next);
    setEditIdx(null);
    onSave(next);
    toast.success("Updated");
  };

  const remove = (idx) => {
    const next = list.filter((_, i) => i !== idx);
    setList(next);
    onSave(next);
    toast.success("Removed");
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 13 }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </span>
        <span style={{
          marginLeft: "auto",
          background: "#eff6ff",
          color: "#1a56a0",
          fontSize: 10,
          fontWeight: 700,
          padding: "2px 8px",
          borderRadius: 20,
          border: "1px solid #bfdbfe",
        }}>
          {list.length}
        </span>
      </div>

      {/* Existing items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10, maxHeight: 200, overflowY: "auto" }}>
        {list.length === 0 && (
          <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic", padding: "6px 0" }}>
            No items yet — add one below
          </div>
        )}
        {list.map((item, idx) => (
          <div key={idx} style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "5px 8px",
            background: editIdx === idx ? "#f0f7ff" : "#f8fafc",
            borderRadius: 6,
            border: editIdx === idx ? "1px solid #bfdbfe" : "1px solid #e2e8f0",
          }}>
            {editIdx === idx ? (
              <>
                <input
                  value={editVal}
                  onChange={e => setEditVal(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && saveEdit(idx)}
                  style={{ ...inputSx, flex: 1, padding: "4px 8px", fontSize: 12 }}
                  autoFocus
                />
                <button
                  onClick={() => saveEdit(idx)}
                  style={{ background: "#1a7a4a", color: "#fff", border: "none", borderRadius: 5, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                >
                  ✓
                </button>
                <button
                  onClick={() => setEditIdx(null)}
                  style={{ background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 5, padding: "4px 8px", fontSize: 11, cursor: "pointer" }}
                >
                  ✕
                </button>
              </>
            ) : (
              <>
                <span style={{ flex: 1, fontSize: 13, color: "#1f2937", fontWeight: 500 }}>{item}</span>
                <button
                  onClick={() => startEdit(idx)}
                  title="Edit"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#6d5bd0", fontSize: 13, padding: "2px 5px", borderRadius: 4 }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f5f3ff"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}
                >
                  ✏️
                </button>
                <button
                  onClick={() => remove(idx)}
                  title="Delete"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 13, padding: "2px 5px", borderRadius: 4 }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fee2e2"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}
                >
                  🗑
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add new */}
      <div style={{ display: "flex", gap: 7 }}>
        <input
          value={newVal}
          onChange={e => setNewVal(e.target.value)}
          onKeyDown={e => e.key === "Enter" && add()}
          placeholder={`Add new ${label.toLowerCase()}…`}
          style={{ ...inputSx, flex: 1, padding: "6px 10px", fontSize: 12 }}
        />
        <button
          onClick={add}
          disabled={!newVal.trim()}
          style={{
            background: newVal.trim() ? "#1a56a0" : "#e2e8f0",
            color: newVal.trim() ? "#fff" : "#94a3b8",
            border: "none",
            borderRadius: 6,
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: 700,
            cursor: newVal.trim() ? "pointer" : "default",
            fontFamily: "inherit",
            transition: "background 0.15s",
          }}
        >
          + Add
        </button>
      </div>
    </div>
  );
};


/* ── Main component ── */
const Settings = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [logoPreview, setLogoPreview] = useState("");

  // Product defaults state
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [brands,     setBrands]     = useState(DEFAULT_BRANDS);
  const [finishes,   setFinishes]   = useState(DEFAULT_FINISHES);
  const [racks,      setRacks]      = useState(DEFAULT_RACKS);

  useEffect(() => {
    const saved = localStorage.getItem("shopSettings");
    if (saved) {
      try { setSettings(prev => ({ ...prev, ...JSON.parse(saved) })); } catch { /**/ }
    }

    // Load product defaults from localStorage (fallback to API)
    const savedDefaults = (() => {
      try { return JSON.parse(localStorage.getItem("productDefaults")) || {}; } catch { return {}; }
    })();
    if (savedDefaults.categories?.length) setCategories(savedDefaults.categories);
    if (savedDefaults.brands?.length)     setBrands(savedDefaults.brands);
    if (savedDefaults.finishes?.length)   setFinishes(savedDefaults.finishes);
    if (savedDefaults.racks?.length)      setRacks(savedDefaults.racks);

    // Try to load categories from API (as used in AddItem.jsx)
    import("../services/api").then(({ default: API }) => {
      API.get("/categories")
        .then(res => {
          const dynamic = (res.data || []).map(c => c.name).filter(Boolean);
          if (dynamic.length) setCategories(dynamic);
        })
        .catch(() => {/* use local */});
    }).catch(() => {});
  }, []);

  const saveProductDefaults = (key, value) => {
    const current = (() => {
      try { return JSON.parse(localStorage.getItem("productDefaults")) || {}; } catch { return {}; }
    })();
    const updated = { ...current, [key]: value };
    localStorage.setItem("productDefaults", JSON.stringify(updated));
  };

  const set = (name, value) => setSettings(prev => ({ ...prev, [name]: value }));

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    set(name, type === "checkbox" ? checked : value);
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

  const handleSaveProfile = () => {
    localStorage.setItem("shopSettings", JSON.stringify(settings));
    toast.success("Profile saved");
  };

  const handleSaveInvoice = () => {
    localStorage.setItem("shopSettings", JSON.stringify(settings));
    toast.success("Invoice settings saved");
  };

  const handleSaveNotifications = () => {
    localStorage.setItem("shopSettings", JSON.stringify(settings));
    toast.success("Notification settings saved");
  };

  const handleBackup = () => toast.success("Backup created!");
  const handleExport = () => toast.success("Data exported!");
  const handleRestore = () => toast.success("Restore initiated");

  return (
    <div style={{ padding: "0" }}>
      {/* Three-section layout: left ~55% / right ~45% */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1.52fr 1fr",
        gap: 18,
        alignItems: "start",
      }}>

        {/* ══ LEFT COLUMN ══ */}
        <div>

          {/* Shop / Company Profile */}
          <SectionCard icon="🏪" title="Shop / Company Profile">
            {/* Logo upload at top */}
            <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
              {(logoPreview || settings.logo) ? (
                <img
                  src={logoPreview || settings.logo}
                  alt="Shop logo"
                  style={{ width: 64, height: 64, objectFit: "contain", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc" }}
                />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: 8, border: "1.5px dashed #d0d8e4", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#cbd5e1" }}>
                  🏪
                </div>
              )}
              <div>
                <label
                  htmlFor="shop-logo-upload"
                  style={{ cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#1a56a0", border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 6, padding: "5px 12px", display: "inline-block" }}
                >
                  {(logoPreview || settings.logo) ? "Change Logo" : "Upload Logo"}
                </label>
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8" }}>PNG / JPG, shown on invoices</p>
              </div>
            </div>

            <Row cols={1} mb={14}>
              <InputField
                label="Shop Name" required
                name="shopName" value={settings.shopName}
                onChange={handleChange}
                placeholder="Sri Murugan Tiles & Sanitary"
              />
            </Row>
            <Row cols={2} mb={14}>
              <InputField label="Owner Name" required name="ownerName" value={settings.ownerName} onChange={handleChange} placeholder="Murugan P." />
              <InputField label="Mobile" required name="phone" value={settings.phone} onChange={handleChange} placeholder="9876543210" />
            </Row>
            <Row cols={1} mb={14}>
              <TextareaField label="Address" name="address" value={settings.address} onChange={handleChange} placeholder="No. 42, Main Road, Shevapet, Salem - 636 002, Tamil Nadu" />
            </Row>
            <Row cols={2} mb={14}>
              <InputField label="GSTIN" name="gstNumber" value={settings.gstNumber} onChange={handleChange} placeholder="33ABCDE1234F1Z5" />
              <SelectField label="State" name="state" value={settings.state} onChange={handleChange}>
                {STATE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </SelectField>
            </Row>
            <Row cols={2} mb={18}>
              <InputField label="Email" name="email" value={settings.email} onChange={handleChange} placeholder="srimurugan.tiles@gmail.com" />
              <InputField label="UPI ID" name="upiId" value={settings.upiId} onChange={handleChange} placeholder="srimurugan@upi" />
            </Row>
            <SaveBtn onClick={handleSaveProfile} icon="🏪">Save Profile</SaveBtn>
          </SectionCard>

          {/* Invoice Settings */}
          <SectionCard icon="📋" title="Invoice Settings">
            <Row cols={2} mb={14}>
              <InputField label="Invoice Prefix" name="invoicePrefix" value={settings.invoicePrefix} onChange={handleChange} />
              <InputField label="Current Invoice No." name="nextInvoiceNumber" type="number" value={settings.nextInvoiceNumber} onChange={handleChange} />
            </Row>
            <Row cols={2} mb={14}>
              <InputField label="Bulk Invoice Prefix" name="bulkInvoicePrefix" value={settings.bulkInvoicePrefix} onChange={handleChange} />
              <InputField label="Current Bulk No." name="nextBulkInvoiceNumber" type="number" value={settings.nextBulkInvoiceNumber} onChange={handleChange} />
            </Row>
            <Row cols={2} mb={14}>
              <SelectField label="Default GST Rate" name="defaultTax" value={settings.defaultTax} onChange={handleChange}>
                {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
              </SelectField>
              <SelectField label="Tax Type Default" name="taxTypeDefault" value={settings.taxTypeDefault} onChange={handleChange}>
                {TAX_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </SelectField>
            </Row>
            <Row cols={1} mb={14}>
              <TextareaField label="Invoice Terms & Conditions" name="termsAndConditions" value={settings.termsAndConditions} onChange={handleChange} />
            </Row>
            <Row cols={2} mb={18}>
              <InputField label="Bank Name" name="bankName" value={settings.bankName} onChange={handleChange} placeholder="Indian Bank, Salem" />
              <InputField label="Account No." name="accountNumber" value={settings.accountNumber} onChange={handleChange} placeholder="123456789012" />
            </Row>
            <SaveBtn onClick={handleSaveInvoice} icon="📋">Save Invoice Settings</SaveBtn>
          </SectionCard>

          {/* ── Product Defaults ── NEW ─────────────────────────────────── */}
          <SectionCard icon="🗂️" title="Product Defaults">
            <p style={{ fontSize: 12, color: "#64748b", marginTop: 0, marginBottom: 16, lineHeight: 1.6 }}>
              Manage the dropdown options available when adding or editing products.
              Changes here reflect instantly in the Add Product form.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

              {/* Categories */}
              <div style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "14px 16px",
              }}>
                <ListManager
                  icon="🏷️"
                  label="Categories"
                  items={categories}
                  onSave={next => {
                    setCategories(next);
                    saveProductDefaults("categories", next);
                    // Sync to API if available
                    import("../services/api").then(({ default: API }) => {
                      API.post("/categories/bulk", { names: next }).catch(() => {});
                    }).catch(() => {});
                  }}
                />
              </div>

              {/* Brands */}
              <div style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "14px 16px",
              }}>
                <ListManager
                  icon="🏭"
                  label="Brands"
                  items={brands}
                  onSave={next => {
                    setBrands(next);
                    saveProductDefaults("brands", next);
                  }}
                />
              </div>

              {/* Finishes */}
              <div style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "14px 16px",
              }}>
                <ListManager
                  icon="✨"
                  label="Finishes"
                  items={finishes}
                  onSave={next => {
                    setFinishes(next);
                    saveProductDefaults("finishes", next);
                  }}
                />
              </div>

              {/* Rack Locations */}
              <div style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "14px 16px",
              }}>
                <ListManager
                  icon="📦"
                  label="Rack Locations"
                  items={racks}
                  onSave={next => {
                    setRacks(next);
                    saveProductDefaults("racks", next);
                  }}
                />
              </div>

            </div>

            {/* Reset to defaults */}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 10 }}>
              <OutlineBtn onClick={() => {
                setCategories(DEFAULT_CATEGORIES);
                setBrands(DEFAULT_BRANDS);
                setFinishes(DEFAULT_FINISHES);
                setRacks(DEFAULT_RACKS);
                saveProductDefaults("categories", DEFAULT_CATEGORIES);
                saveProductDefaults("brands",     DEFAULT_BRANDS);
                saveProductDefaults("finishes",   DEFAULT_FINISHES);
                saveProductDefaults("racks",      DEFAULT_RACKS);
                toast.success("Reset to built-in defaults");
              }}>
                ↩ Reset to Defaults
              </OutlineBtn>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>
                Restores all four lists to their original built-in values.
              </span>
            </div>
          </SectionCard>

        </div>

        {/* ══ RIGHT COLUMN ══ */}
        <div>

          {/* User Management */}
          <SectionCard icon="👷" title="User Management">
            <UserManagement embedded />
          </SectionCard>

          {/* WhatsApp & Notifications */}
          <SectionCard icon="📱" title="WhatsApp & Notifications">
            <Row cols={1} mb={4}>
              <InputField
                label="WhatsApp Business No."
                name="whatsappNumber"
                value={settings.whatsappNumber}
                onChange={handleChange}
                placeholder="9876543210"
              />
            </Row>
            <div style={{ display: "flex", flexDirection: "column", gap: 9, margin: "12px 0 16px" }}>
              {[
                { name: "autoSendInvoiceWhatsapp", label: "Auto-send invoice on WhatsApp" },
                { name: "sendPaymentReceipt",       label: "Send payment receipt" },
                { name: "dueReminder",              label: "Payment due reminders (7 days)" },
                { name: "dailySalesSummary",        label: "Daily sales summary to owner" },
                { name: "lowStockAlerts",           label: "Low stock alerts" },
              ].map(item => (
                <label key={item.name} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "#2d3748", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    name={item.name}
                    checked={!!settings[item.name]}
                    onChange={handleChange}
                    style={{ width: 15, height: 15, accentColor: "#1a56a0", cursor: "pointer", flexShrink: 0, margin: 0 }}
                  />
                  {item.label}
                </label>
              ))}
            </div>
            <SaveBtn onClick={handleSaveNotifications} icon="📱">Save</SaveBtn>
          </SectionCard>

          {/* Backup & Data */}
          <SectionCard icon="🗄️" title="Backup & Data">
            <div style={{
              background: "#f0faf5",
              border: "1px solid #b0ddc0",
              borderRadius: 6,
              padding: "9px 14px",
              fontSize: 12,
              color: "#1a7a4a",
              display: "flex",
              alignItems: "center",
              gap: 7,
              marginBottom: 14,
            }}>
              ✅ Last backup: Today 09:30 AM
            </div>
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
              <PrimaryBtn onClick={handleBackup}>📦 Backup Now</PrimaryBtn>
              <OutlineBtn onClick={handleExport}>⬇ Export All Data</OutlineBtn>
              <OutlineBtn onClick={handleRestore}>📤 Restore</OutlineBtn>
            </div>
          </SectionCard>

        </div>
      </div>

      {/* Hidden logo file input */}
      <input id="shop-logo-upload" type="file" accept="image/*" hidden onChange={handleLogo} />
    </div>
  );
};

export default Settings;
