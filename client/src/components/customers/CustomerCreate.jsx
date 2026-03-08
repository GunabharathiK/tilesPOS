import { useState } from "react";
import {
  Box,
  Card,
  Typography,
  TextField,
  Button,
  MenuItem,
  Tabs,
  Tab,
} from "@mui/material";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import toast from "react-hot-toast";
import { saveCustomer } from "../../services/customerService";

const CUSTOMER_TYPES = [
  { key: "Retail Customer", label: "Retail Customer" },
  { key: "Dealer", label: "Dealer" },
  { key: "Contractor", label: "Contractor" },
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
    companyName: "",
    ownerName: "",
    primaryMobile: "",
    alternateMobile: "",
    email: "",
    city: "",
    gstin: "",
    fullAddress: "",
    dealerTier: "Platinum (Top Dealer)",
    paymentTerms: "Advance",
    standardDiscount: "",
    bankAccountNo: "",
    ifscCode: "",
    territoryArea: "",
    notes: "",
  },
};

const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "10px",
    background: "#fff",
    fontSize: 13,
    "& fieldset": { borderColor: "#dbe5f0" },
    "&:hover fieldset": { borderColor: "#94a3b8" },
    "&.Mui-focused fieldset": { borderColor: "#1a56a0", borderWidth: 2 },
  },
  "& .MuiInputLabel-root": { fontSize: 13 },
  "& .MuiInputLabel-root.Mui-focused": { color: "#1a56a0" },
  "& .MuiInputBase-input": { fontSize: 13 },
};

const SectionHeader = ({ icon, title, subtitle }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1.3, mb: 2.5 }}>
    <Box
      sx={{
        width: 34,
        height: 34,
        borderRadius: "10px",
        background: "linear-gradient(135deg, #1a56a0, #0f3d7a)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        boxShadow: "0 8px 20px rgba(15,61,122,0.2)",
        flexShrink: 0,
      }}
    >
      {icon}
    </Box>
    <Box>
      <Typography sx={{ fontSize: 15, fontWeight: 800, color: "#1c2333" }}>{title}</Typography>
      <Typography sx={{ fontSize: 11, color: "#718096" }}>{subtitle}</Typography>
    </Box>
  </Box>
);

const CustomerCreate = () => {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [activeType, setActiveType] = useState("Retail Customer");

  const isBusinessType = activeType !== "Retail Customer";

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDealerChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      dealerDetails: { ...prev.dealerDetails, [field]: value },
    }));
  };

  const handleTypeSelect = (_, value) => {
    setActiveType(value);
    setForm((prev) => ({ ...prev, customerType: value }));
  };

  const handleSubmit = async () => {
    if (isBusinessType) {
      if (
        !form.dealerDetails.companyName.trim() ||
        !form.dealerDetails.primaryMobile.trim() ||
        !form.dealerDetails.fullAddress.trim()
      ) {
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
          name: form.dealerDetails.companyName,
          phone: form.dealerDetails.primaryMobile,
          alternateMobile: form.dealerDetails.alternateMobile,
          city: form.dealerDetails.city,
          gstin: form.dealerDetails.gstin,
          address: form.dealerDetails.fullAddress,
          paymentTerms: form.dealerDetails.paymentTerms,
        }
      : form;

    setLoading(true);
    try {
      await saveCustomer({
        ...payload,
        customerType: activeType,
        amount: 0,
        status: "Pending",
        method: "",
      });
      toast.success("Customer saved");
      setForm({ ...initialForm, customerType: activeType });
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to save customer");
    } finally {
      setLoading(false);
    }
  };

  // Grid layout: 4 columns on lg, 2 on sm, 1 on xs
  const gridSx = {
    display: "grid",
    gridTemplateColumns: {
      xs: "1fr",
      sm: "repeat(2, 1fr)",
      lg: "repeat(4, 1fr)",
    },
    gap: 1.5,
    alignItems: "start",
  };

  // Address field spans 2 columns
  const addressSx = {
    gridColumn: { xs: "1", sm: "span 2", lg: "span 2" },
  };

  const typeLabel = CUSTOMER_TYPES.find((t) => t.key === activeType)?.label || activeType;

  return (
    <Box sx={{ p: 0, background: "#f0f4f8", minHeight: "100%" }}>
      {/* Header */}
      <Card
        sx={{
          mb: 3,
          p: { xs: 2.5, md: 3 },
          borderRadius: "18px",
          background: "linear-gradient(135deg, #1a56a0 0%, #0f3d7a 100%)",
          color: "#fff",
          boxShadow: "0 18px 40px rgba(15,61,122,0.24)",
        }}
      >
        <Typography
          sx={{ fontSize: 28, fontWeight: 800, fontFamily: "Rajdhani, sans-serif", lineHeight: 1 }}
        >
          Create Customer
        </Typography>
        <Typography sx={{ mt: 0.8, fontSize: 13, color: "rgba(255,255,255,0.76)" }}>
          Choose customer type and fill in the details
        </Typography>
      </Card>

      <Card
        sx={{
          p: 2.5,
          borderRadius: "16px",
          border: "1px solid #dbe5f0",
          boxShadow: "0 8px 24px rgba(15,35,60,0.06)",
        }}
      >
        <SectionHeader
          icon={<PersonAddAlt1Icon sx={{ fontSize: 17 }} />}
          title="Customer Details"
          subtitle="Select customer type and fill in required fields"
        />

        {/* Tabs */}
        <Tabs
          value={activeType}
          onChange={handleTypeSelect}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            mb: 3,
            minHeight: 42,
            borderBottom: "1px solid #e2eaf4",
            "& .MuiTabs-indicator": {
              backgroundColor: "#1a56a0",
              height: 3,
              borderRadius: "3px 3px 0 0",
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
                minHeight: 42,
                textTransform: "none",
                fontWeight: 600,
                fontSize: 13,
                color: "#64748b",
                px: 2.5,
                "&.Mui-selected": {
                  color: "#1a56a0",
                  fontWeight: 700,
                },
                "&:hover": {
                  color: "#1a56a0",
                  background: "rgba(26,86,160,0.04)",
                },
              }}
            />
          ))}
        </Tabs>

        {/* ─── RETAIL CUSTOMER FIELDS ─── */}
        {!isBusinessType && (
          <Box sx={gridSx}>
            <TextField
              fullWidth
              required
              size="small"
              label="Full Name"
              placeholder="e.g. Ravi Kumar"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              sx={inputSx}
            />
            <TextField
              fullWidth
              size="small"
              label="Customer Type"
              value={activeType}
              sx={inputSx}
              InputProps={{ readOnly: true }}
            />
            <TextField
              fullWidth
              required
              size="small"
              label="Mobile Number"
              placeholder="10-digit mobile"
              value={form.phone}
              inputProps={{ maxLength: 10 }}
              onChange={(e) =>
                handleChange("phone", e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              sx={inputSx}
            />
            <TextField
              fullWidth
              size="small"
              label="Alternate Mobile"
              placeholder="Optional"
              value={form.alternateMobile}
              inputProps={{ maxLength: 10 }}
              onChange={(e) =>
                handleChange("alternateMobile", e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              sx={inputSx}
            />
            <TextField
              fullWidth
              size="small"
              label="City"
              placeholder="e.g. Mumbai"
              value={form.city}
              onChange={(e) => handleChange("city", e.target.value)}
              sx={inputSx}
            />
            <TextField
              fullWidth
              size="small"
              label="GSTIN (B2B)"
              placeholder="e.g. 22AAAAA0000A1Z5"
              value={form.gstin}
              onChange={(e) => handleChange("gstin", e.target.value.toUpperCase())}
              sx={inputSx}
            />
            <TextField
              select
              fullWidth
              size="small"
              label="Payment Terms"
              value={form.paymentTerms}
              onChange={(e) => handleChange("paymentTerms", e.target.value)}
              sx={inputSx}
            >
              {paymentTermsOptions.map((opt) => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))}
            </TextField>
            {/* Empty cell to keep address aligned to start of next row */}
            <Box sx={{ display: { xs: "none", lg: "block" } }} />
            <TextField
              fullWidth
              required
              size="small"
              label="Full Address"
              placeholder="House No., Street, Area, City, Pincode"
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
              sx={{ ...inputSx, ...addressSx }}
            />
          </Box>
        )}

        {/* ─── BUSINESS TYPE FIELDS (Dealer / Contractor / Builder) ─── */}
        {isBusinessType && (
          <>
            {/* — Business Info — */}
            <Box sx={gridSx}>
              <TextField
                fullWidth
                required
                size="small"
                label="Company / Business Name"
                placeholder="e.g. Sharma Paints Pvt. Ltd."
                value={form.dealerDetails.companyName}
                onChange={(e) => handleDealerChange("companyName", e.target.value)}
                sx={inputSx}
              />
              <TextField
                fullWidth
                size="small"
                label="Owner / Contact Person"
                placeholder="e.g. Ramesh Sharma"
                value={form.dealerDetails.ownerName}
                onChange={(e) => handleDealerChange("ownerName", e.target.value)}
                sx={inputSx}
              />
              <TextField
                fullWidth
                required
                size="small"
                label="Primary Mobile"
                placeholder="10-digit mobile"
                value={form.dealerDetails.primaryMobile}
                inputProps={{ maxLength: 10 }}
                onChange={(e) =>
                  handleDealerChange("primaryMobile", e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                sx={inputSx}
              />
              <TextField
                fullWidth
                size="small"
                label="Alternate Mobile"
                placeholder="Optional"
                value={form.dealerDetails.alternateMobile}
                inputProps={{ maxLength: 10 }}
                onChange={(e) =>
                  handleDealerChange("alternateMobile", e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                sx={inputSx}
              />
              <TextField
                fullWidth
                size="small"
                label="Email Address"
                placeholder="e.g. contact@company.com"
                value={form.dealerDetails.email}
                onChange={(e) => handleDealerChange("email", e.target.value)}
                sx={inputSx}
              />
              <TextField
                fullWidth
                size="small"
                label="City"
                placeholder="e.g. Delhi"
                value={form.dealerDetails.city}
                onChange={(e) => handleDealerChange("city", e.target.value)}
                sx={inputSx}
              />
              <TextField
                fullWidth
                size="small"
                label="GSTIN (B2B)"
                placeholder="e.g. 22AAAAA0000A1Z5"
                value={form.dealerDetails.gstin}
                onChange={(e) => handleDealerChange("gstin", e.target.value.toUpperCase())}
                sx={inputSx}
              />
              <TextField
                select
                fullWidth
                size="small"
                label="Payment Terms"
                value={form.dealerDetails.paymentTerms}
                onChange={(e) => handleDealerChange("paymentTerms", e.target.value)}
                sx={inputSx}
              >
                {paymentTermsOptions.map((opt) => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </TextField>
              <TextField
                fullWidth
                required
                size="small"
                label="Full Address"
                placeholder="Shop/Office No., Street, Area, City, Pincode"
                value={form.dealerDetails.fullAddress}
                onChange={(e) => handleDealerChange("fullAddress", e.target.value)}
                sx={{ ...inputSx, ...addressSx }}
              />
              <TextField
                select
                fullWidth
                size="small"
                label="Business Tier"
                value={form.dealerDetails.dealerTier}
                onChange={(e) => handleDealerChange("dealerTier", e.target.value)}
                sx={inputSx}
              >
                {dealerTierOptions.map((opt) => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </TextField>
              <TextField
                fullWidth
                size="small"
                label="Standard Discount %"
                placeholder="e.g. 10"
                type="number"
                value={form.dealerDetails.standardDiscount}
                onChange={(e) => handleDealerChange("standardDiscount", e.target.value)}
                sx={inputSx}
              />
              <TextField
                fullWidth
                size="small"
                label="Territory / Area"
                placeholder="e.g. North Delhi"
                value={form.dealerDetails.territoryArea}
                onChange={(e) => handleDealerChange("territoryArea", e.target.value)}
                sx={inputSx}
              />
            </Box>

            {/* ─── Bank Info Divider ─── */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                my: 2.5,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 1.5,
                  py: 0.5,
                  borderRadius: "8px",
                  background: "rgba(26,86,160,0.07)",
                  border: "1px solid rgba(26,86,160,0.15)",
                  flexShrink: 0,
                }}
              >
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#1a56a0",
                  }}
                />
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#1a56a0",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Bank Info
                </Typography>
              </Box>
              <Box sx={{ flex: 1, height: "1px", background: "#e2eaf4" }} />
            </Box>

            {/* — Bank Fields — */}
            <Box sx={gridSx}>
              <TextField
                fullWidth
                size="small"
                label="Bank Account No."
                placeholder="e.g. 001234567890"
                value={form.dealerDetails.bankAccountNo}
                onChange={(e) => handleDealerChange("bankAccountNo", e.target.value)}
                sx={inputSx}
              />
              <TextField
                fullWidth
                size="small"
                label="IFSC Code"
                placeholder="e.g. HDFC0001234"
                value={form.dealerDetails.ifscCode}
                onChange={(e) => handleDealerChange("ifscCode", e.target.value.toUpperCase())}
                sx={inputSx}
              />
              <TextField
                fullWidth
                size="small"
                label="Notes / Remarks"
                placeholder="Any special instructions or remarks"
                value={form.dealerDetails.notes}
                onChange={(e) => handleDealerChange("notes", e.target.value)}
                sx={{ ...inputSx, ...addressSx }}
              />
            </Box>
          </>
        )}

        {/* Submit */}
        <Box mt={3} display="flex" justifyContent="flex-end">
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
            sx={{
              borderRadius: "10px",
              px: 4,
              py: 1,
              textTransform: "none",
              fontWeight: 700,
              fontSize: 13,
              background: "linear-gradient(135deg, #1a56a0, #0f3d7a)",
              boxShadow: "0 6px 18px rgba(15,61,122,0.25)",
              "&:hover": {
                background: "linear-gradient(135deg, #1648880, #0d3570)",
                boxShadow: "0 8px 22px rgba(15,61,122,0.35)",
              },
            }}
          >
            {loading ? "Saving..." : `Save ${typeLabel}`}
          </Button>
        </Box>
      </Card>
    </Box>
  );
};

export default CustomerCreate;
