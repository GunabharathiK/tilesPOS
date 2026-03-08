import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import compressImage from "../utils/compressImage";
import UserManagement from "./UserManagement";

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

const SaveBtn = ({ onClick, children }) => (
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
    👤 {children}
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


/* ── Main component ── */
const Settings = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [logoPreview, setLogoPreview] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("shopSettings");
    if (saved) {
      try { setSettings(prev => ({ ...prev, ...JSON.parse(saved) })); } catch { /**/ }
    }
  }, []);

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
    <div style={{ padding: "18px 22px" }}>
      {/* Two-column layout: left ~55% / right ~45% */}
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
            <SaveBtn onClick={handleSaveProfile}>Save Profile</SaveBtn>
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
            <SaveBtn onClick={handleSaveInvoice}>Save</SaveBtn>
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
            {/* Checkboxes exactly as in screenshot */}
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
            <SaveBtn onClick={handleSaveNotifications}>Save</SaveBtn>
          </SectionCard>

          {/* Backup & Data */}
          <SectionCard icon="🗄️" title="Backup & Data">
            {/* Green info bar */}
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

          {/* Logo Upload (optional, hidden until needed) */}
          <input id="shop-logo-upload" type="file" accept="image/*" hidden onChange={handleLogo} />

        </div>
      </div>
    </div>
  );
};

export default Settings;

