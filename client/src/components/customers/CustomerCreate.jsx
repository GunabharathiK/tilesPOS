import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  TextField,
  Button,
  MenuItem,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  InputAdornment,
  Tabs,
  Tab,
} from "@mui/material";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import SearchIcon from "@mui/icons-material/Search";
import toast from "react-hot-toast";
import { saveCustomer, updateCustomer, getCustomers, deleteCustomer } from "../../services/customerService";
import ConfirmDialog from "../common/ConfirmDialog";

/* ── Constants ── */
const CUSTOMER_TYPES = [
  { key: "Retail Customer",   label: "Retail Customer"   },
  { key: "Dealer",            label: "Dealer"            },
  { key: "Contractor",        label: "Contractor"        },
  { key: "Builder / Project", label: "Builder / Project" },
];

const paymentTermsOptions = ["Cash Only", "Advance", "7 Days", "15 Days", "30 Days"];

const dealerTierOptions = [
  "Platinum (Top Dealer)",
  "Gold",
  "Silver",
  "Bronze",
];

const initialForm = {
  name: "",
  phone: "",
  alternateMobile: "",
  city: "",
  gstin: "",
  address: "",
  customerType: "Retail Customer",
  paymentTerms: "Cash Only",
  dealerDetails: {
    companyName:      "",
    ownerName:        "",
    primaryMobile:    "",
    alternateMobile:  "",
    email:            "",
    city:             "",
    gstin:            "",
    fullAddress:      "",
    dealerTier:       "Platinum (Top Dealer)",
    paymentTerms:     "Advance",
    standardDiscount: "",
    bankAccountNo:    "",
    ifscCode:         "",
    territoryArea:    "",
    notes:            "",
  },
};

/* ── Design tokens ── */
const T = {
  primary:      "#1a56a0",
  primaryDark:  "#0f3d7a",
  primaryLight: "#eef4fd",
  dark:         "#0f172a",
  text:         "#1e293b",
  muted:        "#64748b",
  faint:        "#94a3b8",
  border:       "#dde3ed",
  bg:           "#f1f5f9",
  surface:      "#ffffff",
  surfaceAlt:   "#f8fafc",
  danger:       "#b91c1c",
  dangerLight:  "#fef2f2",
};

/* ── Input style — zero radius ── */
const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 0,
    background: T.surface,
    fontSize: 13,
    "& fieldset": { borderColor: T.border },
    "&:hover fieldset": { borderColor: T.primary },
    "&.Mui-focused fieldset": { borderColor: T.primary, borderWidth: 1.5 },
    "&.Mui-focused": { boxShadow: "0 0 0 3px rgba(26,86,160,.08)" },
  },
  "& .MuiInputLabel-root":          { fontSize: 13, color: T.muted },
  "& .MuiInputLabel-root.Mui-focused": { color: T.primary },
  "& .MuiInputBase-input":          { fontSize: 13 },
  "& .MuiSelect-select":            { fontSize: 13 },
};

/* ── Field label ── */
const Lbl = ({ children, required }) => (
  <Typography sx={{
    fontSize: 10.5, fontWeight: 700, color: T.muted,
    textTransform: "uppercase", letterSpacing: ".07em",
    mb: "5px", display: "block",
  }}>
    {children}{required && <Box component="span" sx={{ color: T.danger }}> *</Box>}
  </Typography>
);

/* ── Section divider ── */
const SectionDivider = ({ label }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, my: 2.5 }}>
    <Box sx={{
      display: "flex", alignItems: "center", gap: 0.8,
      px: 1.4, py: 0.5,
      background: T.primaryLight,
      border: `1px solid #c3d9f5`,
      flexShrink: 0,
    }}>
      <Box sx={{ width: 5, height: 5, background: T.primary }} />
      <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: T.primary, textTransform: "uppercase", letterSpacing: ".08em" }}>
        {label}
      </Typography>
    </Box>
    <Box sx={{ flex: 1, height: "1px", background: T.border }} />
  </Box>
);

/* ─── Main Component ─────────────────────────────────────── */

const CustomerDetailsList = ({ onEditCustomer }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: "", name: "" });

  const fetchAll = async () => {
    try {
      const res = await getCustomers();
      setCustomers(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? customers.filter((c) =>
          [c.name, c.phone, c.city, c.gstin, c.customerType, c.paymentTerms]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q))
        )
      : customers;
    return [...list].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }, [customers, search]);

  const handleDelete = async () => {
    if (!confirmDelete.id) return;
    try {
      await deleteCustomer(confirmDelete.id);
      toast.success("Customer deleted");
      setConfirmDelete({ open: false, id: "", name: "" });
      fetchAll();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Delete failed");
    }
  };

  return (
    <Box sx={{ p: 0 }}>
      <Card sx={{ borderRadius: 0, border: "1px solid #dbe5f0", boxShadow: "0 4px 16px rgba(15,35,60,0.06)", overflow: "hidden" }}>
        <Box sx={{ px: 2.5, py: 1.8, borderBottom: "1px solid #e2eaf4", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
          <Box>
            <Typography sx={{ fontSize: 16, fontWeight: 800, color: "#1c2333" }}>Customer Details</Typography>
            <Typography sx={{ fontSize: 11.5, color: "#64748b" }}>Search and manage customers</Typography>
          </Box>
          <TextField
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers"
            sx={{ width: 260 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: "#94a3b8" }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Box sx={{ overflowX: "auto" }}>
          <Table size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                {["SNo", "Name", "Mobile", "City", "GSTIN", "Type", "Payment Terms", "Actions"].map((h) => (
                  <TableCell
                    key={h}
                    sx={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", py: 1.3, whiteSpace: "nowrap", background: "#f8fafc", borderBottom: "1px solid #e2eaf4" }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: "#94a3b8", fontSize: 13 }}>
                    Loading customers...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: "#94a3b8", fontSize: 13 }}>
                    {search ? `No results for "${search}"` : "No customers found"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row, idx) => (
                  <TableRow key={row._id || idx} hover sx={{ "&:hover": { background: "#f8fafc" } }}>
                    <TableCell sx={{ fontSize: 12, color: "#94a3b8" }}>{idx + 1}</TableCell>
                    <TableCell sx={{ fontSize: 13, fontWeight: 700 }}>{row.name || "-"}</TableCell>
                    <TableCell sx={{ fontSize: 13 }}>{row.phone || "-"}</TableCell>
                    <TableCell sx={{ fontSize: 13 }}>{row.city || "-"}</TableCell>
                    <TableCell sx={{ fontSize: 13 }}>{row.gstin || "-"}</TableCell>
                    <TableCell sx={{ fontSize: 13 }}>{row.customerType || "Retail Customer"}</TableCell>
                    <TableCell sx={{ fontSize: 13 }}>{row.paymentTerms || "-"}</TableCell>
                    <TableCell sx={{ fontSize: 13 }}>
                      <Box sx={{ display: "inline-flex", gap: 0.8 }}>
                        <Button
                          size="small"
                          onClick={() => onEditCustomer && onEditCustomer(row)}
                          sx={{
                            textTransform: "none",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#1a56a0",
                            minWidth: 0,
                            px: 1,
                            py: 0.4,
                            borderRadius: 0,
                            "&:hover": { background: "#eff6ff" },
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          onClick={() => setConfirmDelete({ open: true, id: row._id, name: row.name || "" })}
                          sx={{
                            textTransform: "none",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#dc2626",
                            minWidth: 0,
                            px: 1,
                            py: 0.4,
                            borderRadius: 0,
                            "&:hover": { background: "#fee2e2" },
                          }}
                        >
                          Delete
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
      </Card>

      <ConfirmDialog
        open={confirmDelete.open}
        title="Delete Customer"
        message={`Are you sure you want to delete customer "${confirmDelete.name}"?`}
        confirmText="Delete"
        danger
        onClose={() => setConfirmDelete({ open: false, id: "", name: "" })}
        onConfirm={handleDelete}
      />
    </Box>
  );
};
const CustomerCreate = () => {
  const navigate = useNavigate();
  const [form,              setForm]              = useState(initialForm);
  const [loading,           setLoading]           = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState("");
  const [activeType,        setActiveType]        = useState("Retail Customer");
  const [customers,         setCustomers]         = useState([]);
  const [duplicateDialog,   setDuplicateDialog]   = useState({ open: false, phone: "", customer: null });
  const formTopRef = useRef(null);

  const isBusinessType = activeType !== "Retail Customer";

  const fetchCustomers = async () => {
    try {
      const res = await getCustomers();
      setCustomers(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load customers");
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleChange = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleDealerChange = (field, value) =>
    setForm((prev) => ({ ...prev, dealerDetails: { ...prev.dealerDetails, [field]: value } }));

  const handleTypeSelect = (_, value) => {
    setActiveType(value);
    setForm((prev) => ({ ...prev, customerType: value }));
  };

  const handleSubmit = async () => {
    if (isBusinessType) {
      if (!form.dealerDetails.companyName.trim() || !form.dealerDetails.primaryMobile.trim() || !form.dealerDetails.fullAddress.trim()) {
        toast.error("Company name, mobile and address are required");
        return;
      }
    } else if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      toast.error("Name, phone and address are required");
      return;
    }

    const payload = isBusinessType
      ? {
          ...form,
          name:            form.dealerDetails.companyName,
          phone:           form.dealerDetails.primaryMobile,
          alternateMobile: form.dealerDetails.alternateMobile,
          city:            form.dealerDetails.city,
          gstin:           form.dealerDetails.gstin,
          address:         form.dealerDetails.fullAddress,
          paymentTerms:    form.dealerDetails.paymentTerms,
        }
      : form;

    const normalizedPhone = String(payload.phone || "").replace(/\D/g, "");
    const duplicateCustomer = customers.find((customer) => {
      const customerPhone = String(customer?.phone || "").replace(/\D/g, "");
      if (!customerPhone || customerPhone !== normalizedPhone) return false;
      if (!editingCustomerId) return true;
      return String(customer?._id || "") !== String(editingCustomerId);
    });

    if (normalizedPhone && duplicateCustomer) {
      setDuplicateDialog({ open: true, phone: normalizedPhone, customer: duplicateCustomer });
      return;
    }

    setLoading(true);
    try {
      const request = { ...payload, customerType: activeType, amount: 0, status: "Pending", method: "" };
      if (editingCustomerId) {
        await updateCustomer(editingCustomerId, request);
        toast.success("Customer updated");
      } else {
        await saveCustomer(request);
        toast.success("Customer saved");
      }
      setEditingCustomerId("");
      setForm({ ...initialForm, customerType: activeType });
      fetchCustomers();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to save customer");
    } finally {
      setLoading(false);
    }
  };

  const resetEdit = () => {
    setEditingCustomerId("");
    setForm({ ...initialForm, customerType: activeType });
  };

  const handleEditCustomer = (customer) => {
    if (!customer) return;
    const type = customer.customerType || "Retail Customer";
    setActiveType(type);
    setEditingCustomerId(customer._id || "");

    if (type === "Retail Customer") {
      setForm((prev) => ({
        ...prev, ...initialForm, customerType: type,
        name:            customer.name            || "",
        phone:           customer.phone           || "",
        alternateMobile: customer.alternateMobile || "",
        city:            customer.city            || "",
        gstin:           customer.gstin           || "",
        address:         customer.address         || "",
        paymentTerms:    customer.paymentTerms    || "Cash Only",
      }));
    } else {
      const details = customer.dealerDetails || {};
      setForm((prev) => ({
        ...prev, ...initialForm, customerType: type,
        dealerDetails: {
          ...initialForm.dealerDetails, ...details,
          companyName:     details.companyName     || customer.name            || "",
          primaryMobile:   details.primaryMobile   || customer.phone           || "",
          alternateMobile: details.alternateMobile || customer.alternateMobile || "",
          city:            details.city            || customer.city            || "",
          gstin:           details.gstin           || customer.gstin           || "",
          fullAddress:     details.fullAddress     || customer.address         || "",
          paymentTerms:    details.paymentTerms    || customer.paymentTerms    || initialForm.dealerDetails.paymentTerms,
        },
      }));
    }

    if (formTopRef.current)
      formTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const typeLabel = CUSTOMER_TYPES.find((t) => t.key === activeType)?.label || activeType;

  /* ── Grid helpers ── */
  const grid4 = {
    display: "grid",
    gridTemplateColumns: { xs: "1fr", sm: "repeat(2,1fr)", lg: "repeat(4,1fr)" },
    gap: "14px",
    alignItems: "start",
  };
  const spanTwo = { gridColumn: { xs: "1", sm: "span 2" } };

  /* ════════════════════════ RENDER ════════════════ */
  return (
    <Box ref={formTopRef} sx={{ p: 0, background: T.bg, minHeight: "100%", fontFamily: "'Noto Sans', sans-serif" }}>

      {/* ── Page header bar ── */}
      <Box sx={{
        px: 3, py: 1.8,
        background: T.surface,
        borderBottom: `1px solid ${T.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Box>
          <Typography sx={{ fontSize: 20, fontWeight: 800, color: T.dark, lineHeight: 1.2, letterSpacing: "-.01em" }}>
            {editingCustomerId ? "Edit Customer" : "Create Customer"}
          </Typography>
          <Typography sx={{ fontSize: 12, color: T.muted }}>
            {editingCustomerId ? `Editing: ${typeLabel}` : "Select customer type and fill in the details"}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, fontSize: 12, color: T.muted }}>
          <span>🏠 Home</span>
          <span style={{ margin: "0 4px" }}>›</span>
          <span>Customers</span>
          <span style={{ margin: "0 4px" }}>›</span>
          <span style={{ color: T.primary, fontWeight: 600 }}>
            {editingCustomerId ? "Edit" : "Create"}
          </span>
        </Box>
      </Box>

      <Box sx={{ p: 2.5 }}>

        {/* ── Form card ── */}
        <Box sx={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          boxShadow: "0 1px 3px rgba(15,23,42,.06), 0 4px 16px rgba(15,23,42,.04)",
          overflow: "hidden",
          mb: 2.5,
        }}>

          {/* Card header */}
          <Box sx={{
            px: 2.5, py: 1.8,
            borderBottom: `2px solid ${T.primary}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: `linear-gradient(to right, ${T.primaryLight}, ${T.surface})`,
          }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
              <Box sx={{
                width: 34, height: 34,
                background: `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", flexShrink: 0,
                boxShadow: "0 2px 8px rgba(26,86,160,.25)",
              }}>
                <PersonAddAlt1Icon sx={{ fontSize: 17 }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 14, fontWeight: 800, color: T.dark, lineHeight: 1.15 }}>Customer Details</Typography>
                <Typography sx={{ fontSize: 11, color: T.muted }}>Select customer type and fill in required fields</Typography>
              </Box>
            </Box>
            {editingCustomerId && (
              <Box sx={{
                px: 1.4, py: "4px", fontSize: 11, fontWeight: 700,
                background: "#fef3c7", color: "#92400e",
                border: "1px solid #fde68a",
              }}>
                Editing record
              </Box>
            )}
          </Box>

          <Box sx={{ p: 2.5 }}>

            {/* ── Type tabs ── */}
            <Box sx={{ mb: 2.5, borderBottom: `1px solid ${T.border}` }}>
              <Tabs
                value={activeType}
                onChange={handleTypeSelect}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  minHeight: 40,
                  "& .MuiTabs-indicator": {
                    backgroundColor: T.primary,
                    height: 2,
                  },
                  "& .MuiTabs-flexContainer": { gap: 0 },
                }}
              >
                {CUSTOMER_TYPES.map((type) => (
                  <Tab
                    key={type.key}
                    value={type.key}
                    label={type.label}
                    sx={{
                      minHeight: 40,
                      textTransform: "none",
                      fontWeight: 600,
                      fontSize: 13,
                      color: T.muted,
                      px: 2.5,
                      borderRadius: 0,
                      "&.Mui-selected": { color: T.primary, fontWeight: 700 },
                      "&:hover":        { color: T.primary, background: T.primaryLight },
                      transition: "all .15s",
                    }}
                  />
                ))}
              </Tabs>
            </Box>

            {/* ─── RETAIL CUSTOMER ─── */}
            {!isBusinessType && (
              <Box sx={grid4}>
                <Box>
                  <Lbl required>Full Name</Lbl>
                  <TextField fullWidth size="small" placeholder="e.g. Ravi Kumar"
                    value={form.name} onChange={(e) => handleChange("name", e.target.value)} sx={inputSx} />
                </Box>
                <Box>
                  <Lbl>Customer Type</Lbl>
                  <TextField fullWidth size="small" value={activeType} sx={inputSx} InputProps={{ readOnly: true }} />
                </Box>
                <Box>
                  <Lbl required>Mobile Number</Lbl>
                  <TextField fullWidth size="small" placeholder="10-digit mobile"
                    value={form.phone} inputProps={{ maxLength: 10 }}
                    onChange={(e) => handleChange("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} sx={inputSx} />
                </Box>
                <Box>
                  <Lbl>Alternate Mobile</Lbl>
                  <TextField fullWidth size="small" placeholder="Optional"
                    value={form.alternateMobile} inputProps={{ maxLength: 10 }}
                    onChange={(e) => handleChange("alternateMobile", e.target.value.replace(/\D/g, "").slice(0, 10))} sx={inputSx} />
                </Box>
                <Box>
                  <Lbl>City</Lbl>
                  <TextField fullWidth size="small" placeholder="e.g. Mumbai"
                    value={form.city} onChange={(e) => handleChange("city", e.target.value)} sx={inputSx} />
                </Box>
                <Box>
                  <Lbl>GSTIN (B2B)</Lbl>
                  <TextField fullWidth size="small" placeholder="e.g. 22AAAAA0000A1Z5"
                    value={form.gstin} onChange={(e) => handleChange("gstin", e.target.value.toUpperCase())} sx={inputSx} />
                </Box>
                <Box>
                  <Lbl>Payment Terms</Lbl>
                  <TextField select fullWidth size="small"
                    value={form.paymentTerms} onChange={(e) => handleChange("paymentTerms", e.target.value)} sx={inputSx}>
                    {paymentTermsOptions.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                  </TextField>
                </Box>
                {/* spacer */}
                <Box sx={{ display: { xs: "none", lg: "block" } }} />
                <Box sx={spanTwo}>
                  <Lbl required>Full Address</Lbl>
                  <TextField fullWidth size="small" placeholder="House No., Street, Area, City, Pincode"
                    value={form.address} onChange={(e) => handleChange("address", e.target.value)} sx={inputSx} />
                </Box>
              </Box>
            )}

            {/* ─── BUSINESS TYPE ─── */}
            {isBusinessType && (
              <>
                <Box sx={grid4}>
                  <Box>
                    <Lbl required>Company / Business Name</Lbl>
                    <TextField fullWidth size="small" placeholder="e.g. Sharma Paints Pvt. Ltd."
                      value={form.dealerDetails.companyName}
                      onChange={(e) => handleDealerChange("companyName", e.target.value)} sx={inputSx} />
                  </Box>
                  <Box>
                    <Lbl>Owner / Contact Person</Lbl>
                    <TextField fullWidth size="small" placeholder="e.g. Ramesh Sharma"
                      value={form.dealerDetails.ownerName}
                      onChange={(e) => handleDealerChange("ownerName", e.target.value)} sx={inputSx} />
                  </Box>
                  <Box>
                    <Lbl required>Primary Mobile</Lbl>
                    <TextField fullWidth size="small" placeholder="10-digit mobile"
                      value={form.dealerDetails.primaryMobile} inputProps={{ maxLength: 10 }}
                      onChange={(e) => handleDealerChange("primaryMobile", e.target.value.replace(/\D/g, "").slice(0, 10))} sx={inputSx} />
                  </Box>
                  <Box>
                    <Lbl>Alternate Mobile</Lbl>
                    <TextField fullWidth size="small" placeholder="Optional"
                      value={form.dealerDetails.alternateMobile} inputProps={{ maxLength: 10 }}
                      onChange={(e) => handleDealerChange("alternateMobile", e.target.value.replace(/\D/g, "").slice(0, 10))} sx={inputSx} />
                  </Box>
                  <Box>
                    <Lbl>Email Address</Lbl>
                    <TextField fullWidth size="small" placeholder="e.g. contact@company.com"
                      value={form.dealerDetails.email}
                      onChange={(e) => handleDealerChange("email", e.target.value)} sx={inputSx} />
                  </Box>
                  <Box>
                    <Lbl>City</Lbl>
                    <TextField fullWidth size="small" placeholder="e.g. Delhi"
                      value={form.dealerDetails.city}
                      onChange={(e) => handleDealerChange("city", e.target.value)} sx={inputSx} />
                  </Box>
                  <Box>
                    <Lbl>GSTIN (B2B)</Lbl>
                    <TextField fullWidth size="small" placeholder="e.g. 22AAAAA0000A1Z5"
                      value={form.dealerDetails.gstin}
                      onChange={(e) => handleDealerChange("gstin", e.target.value.toUpperCase())} sx={inputSx} />
                  </Box>
                  <Box>
                    <Lbl>Payment Terms</Lbl>
                    <TextField select fullWidth size="small"
                      value={form.dealerDetails.paymentTerms}
                      onChange={(e) => handleDealerChange("paymentTerms", e.target.value)} sx={inputSx}>
                      {paymentTermsOptions.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                    </TextField>
                  </Box>
                  <Box sx={spanTwo}>
                    <Lbl required>Full Address</Lbl>
                    <TextField fullWidth size="small" placeholder="Shop/Office No., Street, Area, City, Pincode"
                      value={form.dealerDetails.fullAddress}
                      onChange={(e) => handleDealerChange("fullAddress", e.target.value)} sx={inputSx} />
                  </Box>
                  <Box>
                    <Lbl>Business Tier</Lbl>
                    <TextField select fullWidth size="small"
                      value={form.dealerDetails.dealerTier}
                      onChange={(e) => handleDealerChange("dealerTier", e.target.value)} sx={inputSx}>
                      {dealerTierOptions.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                    </TextField>
                  </Box>
                  <Box>
                    <Lbl>Standard Discount %</Lbl>
                    <TextField fullWidth size="small" placeholder="e.g. 10" type="number"
                      value={form.dealerDetails.standardDiscount}
                      onChange={(e) => handleDealerChange("standardDiscount", e.target.value)} sx={inputSx} />
                  </Box>
                  <Box>
                    <Lbl>Territory / Area</Lbl>
                    <TextField fullWidth size="small" placeholder="e.g. North Delhi"
                      value={form.dealerDetails.territoryArea}
                      onChange={(e) => handleDealerChange("territoryArea", e.target.value)} sx={inputSx} />
                  </Box>
                </Box>

                <SectionDivider label="Bank Info" />

                <Box sx={grid4}>
                  <Box>
                    <Lbl>Bank Account No.</Lbl>
                    <TextField fullWidth size="small" placeholder="e.g. 001234567890"
                      value={form.dealerDetails.bankAccountNo}
                      onChange={(e) => handleDealerChange("bankAccountNo", e.target.value)} sx={inputSx} />
                  </Box>
                  <Box>
                    <Lbl>IFSC Code</Lbl>
                    <TextField fullWidth size="small" placeholder="e.g. HDFC0001234"
                      value={form.dealerDetails.ifscCode}
                      onChange={(e) => handleDealerChange("ifscCode", e.target.value.toUpperCase())} sx={inputSx} />
                  </Box>
                  <Box sx={spanTwo}>
                    <Lbl>Notes / Remarks</Lbl>
                    <TextField fullWidth size="small" placeholder="Any special instructions or remarks"
                      value={form.dealerDetails.notes}
                      onChange={(e) => handleDealerChange("notes", e.target.value)} sx={inputSx} />
                  </Box>
                </Box>
              </>
            )}

            {/* ── Action buttons ── */}
            <Box sx={{ mt: 3, pt: 2.5, borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 1, flexWrap: "wrap" }}>
              {editingCustomerId && (
                <Box onClick={resetEdit} sx={{
                  display: "inline-flex", alignItems: "center",
                  px: 2.5, py: "9px",
                  border: `1.5px solid #fca5a5`,
                  background: T.dangerLight,
                  color: T.danger,
                  fontSize: 13, fontWeight: 700,
                  cursor: "pointer", userSelect: "none",
                  "&:hover": { background: "#fee2e2", borderColor: T.danger },
                  transition: "all .15s",
                }}>
                  Cancel Edit
                </Box>
              )}
              <Box onClick={!loading ? handleSubmit : undefined} sx={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                px: 3, py: "9px",
                background: loading ? "#94a3b8" : `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`,
                color: "#fff",
                fontSize: 13, fontWeight: 700,
                cursor: loading ? "default" : "pointer",
                userSelect: "none",
                boxShadow: loading ? "none" : "0 4px 14px rgba(26,86,160,.28)",
                "&:hover": !loading ? { filter: "brightness(1.08)" } : {},
                transition: "all .15s",
              }}>
                {loading ? "Saving..." : `${editingCustomerId ? "Update" : "Save"} ${typeLabel}`}
              </Box>
            </Box>

          </Box>
        </Box>

      {/* ── Customer list below ── */}
      <Box>
        <CustomerDetailsList onEditCustomer={handleEditCustomer} />
      </Box>

      <Dialog
        open={duplicateDialog.open}
        onClose={() => setDuplicateDialog({ open: false, phone: "", customer: null })}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 0 } }}
      >
        <DialogTitle sx={{ fontSize: 16, fontWeight: 800, color: T.dark }}>
          Mobile Number Already Exists
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography sx={{ fontSize: 13, color: T.text, lineHeight: 1.6 }}>
            This phone number already exists for
            {" "}
            <Box component="span" sx={{ fontWeight: 700, color: T.primary }}>
              {duplicateDialog.customer?.name || duplicateDialog.customer?.companyName || "an existing customer"}
            </Box>
            .
            {" "}
            Do you want to go to the previous customer details page or stay here and create a new one?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.2, gap: 1 }}>
          <Button
            onClick={() => {
              setDuplicateDialog({ open: false, phone: "", customer: null });
              navigate("/customers/details");
            }}
            variant="outlined"
            sx={{ borderRadius: 0, textTransform: "none", fontWeight: 700 }}
          >
            Previous
          </Button>
          <Button
            onClick={() => setDuplicateDialog({ open: false, phone: "", customer: null })}
            variant="contained"
            sx={{ borderRadius: 0, textTransform: "none", fontWeight: 700, background: T.primary, "&:hover": { background: T.primaryDark } }}
          >
            Create New
          </Button>
        </DialogActions>
      </Dialog>

      </Box>
    </Box>
  );
};

export default CustomerCreate;

