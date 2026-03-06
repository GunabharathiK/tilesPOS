import {
  Box, Card, Typography, TextField, Button, Grid, Divider,
  MenuItem, Stepper, Step, StepLabel, InputAdornment, Autocomplete,
} from "@mui/material";
import BusinessIcon   from "@mui/icons-material/Business";
import PersonIcon     from "@mui/icons-material/Person";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createSupplier, updateSupplier } from "../../services/supplierService";
import toast from "react-hot-toast";

const INDIA_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
  "Uttarakhand","West Bengal","Delhi","Jammu and Kashmir","Ladakh",
  "Puducherry","Chandigarh","Andaman and Nicobar Islands","Dadra and Nagar Haveli",
  "Daman and Diu","Lakshadweep",
];

const STEPS = ["Company Details", "Supplier Contact", "Address"];

const SECTION_ICONS = [
  <BusinessIcon   sx={{ color: "#2563eb" }} />,
  <PersonIcon     sx={{ color: "#7c3aed" }} />,
  <LocationOnIcon sx={{ color: "#059669" }} />,
];

const SupplierCreate = ({ onBack, editSupplier }) => {
  const navigate = useNavigate();
  const isEdit   = !!editSupplier;
  const [step, setStep]       = useState(0);
  const [loading, setLoading] = useState(false);

  // ── Step 0: Company ──────────────────────────────────────
  const [company, setCompany] = useState({
    companyName: "", companyEmail: "", companyWebsite: "",
    licNo: "", gstin: "", companyPhone: "",
  });

  // ── Step 1: Supplier Contact + Bank ─────────────────────
  const [contact, setContact] = useState({
    supplierName: "", supplierPhone: "",
    accountNo: "", ifscCode: "", upiId: "",
    accountHolder: "", bankName: "", branch: "",
  });

  // ── Step 2: Address ──────────────────────────────────────
  const [address, setAddress]               = useState({ companyAddress: "", pincode: "", state: "", city: "" });
  const [pincodeLoading, setPincodeLoading] = useState(false);

  // Pre-fill on edit
  useEffect(() => {
    if (!editSupplier) return;
    setCompany({
      companyName:    editSupplier.companyName    || editSupplier.name  || "",
      companyEmail:   editSupplier.companyEmail   || "",
      companyWebsite: editSupplier.companyWebsite || "",
      licNo:          editSupplier.licNo          || "",
      gstin:          editSupplier.gstin          || "",
      companyPhone:   editSupplier.companyPhone   || editSupplier.phone || "",
    });
    setContact({
      supplierName:  editSupplier.supplierName  || editSupplier.name  || "",
      // Don't fall back to phone/companyPhone — if supplierPhone was never set separately, show blank
      supplierPhone: (editSupplier.supplierPhone && editSupplier.supplierPhone !== editSupplier.companyPhone && editSupplier.supplierPhone !== editSupplier.phone)
                       ? editSupplier.supplierPhone
                       : "",
      accountNo:     editSupplier.accountNo     || "",
      ifscCode:      editSupplier.ifscCode      || "",
      upiId:         editSupplier.upiId         || "",
      accountHolder: editSupplier.accountHolder || "",
      bankName:      editSupplier.bankName      || "",
      branch:        editSupplier.branch        || "",
    });
    setAddress({
      companyAddress: editSupplier.companyAddress || editSupplier.address || "",
      pincode:        editSupplier.pincode || "",
      state:          editSupplier.state   || "",
      city:           editSupplier.city    || "",
    });
  }, [editSupplier]);

  // Pincode auto-fill via postal API
  const handlePincodeChange = async (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setAddress((prev) => ({ ...prev, pincode: val }));
    if (val.length === 6) {
      setPincodeLoading(true);
      try {
        const res  = await fetch(`https://api.postalpincode.in/pincode/${val}`);
        const data = await res.json();
        if (data[0]?.Status === "Success") {
          const post = data[0].PostOffice[0];
          setAddress((prev) => ({ ...prev, state: post.State, city: post.District }));
          toast.success("Location auto-filled ✅");
        }
      } catch { /* silent */ }
      finally { setPincodeLoading(false); }
    }
  };

  const validateStep = () => {
    if (step === 0) {
      if (!company.companyName.trim())  { toast.error("Company name is required");  return false; }
      if (!company.companyPhone.trim()) { toast.error("Company phone is required"); return false; }
    }
    if (step === 1) {
      if (!contact.supplierName.trim())  { toast.error("Supplier name is required");         return false; }
      if (!contact.supplierPhone.trim()) { toast.error("Supplier phone is required");         return false; }
      if (!contact.accountNo.trim())     { toast.error("Account number is required");         return false; }
      if (!contact.ifscCode.trim())      { toast.error("IFSC code is required");              return false; }
      if (!contact.upiId.trim())         { toast.error("UPI ID is required");                 return false; }
      if (!contact.accountHolder.trim()) { toast.error("Account holder name is required");    return false; }
      if (!contact.bankName.trim())      { toast.error("Bank name is required");              return false; }
      if (!contact.branch.trim())        { toast.error("Branch is required");                 return false; }
    }
    if (step === 2) {
      if (!address.companyAddress.trim()) { toast.error("Address is required"); return false; }
      if (!address.pincode.trim())        { toast.error("Pincode is required");  return false; }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    const payload = {
      ...company,
      name:    company.companyName,   // backward compat
      phone:   company.companyPhone,  // backward compat
      ...contact,
      ...address,
      address: address.companyAddress, // backward compat
      items:   [],
      totalPaid:     0,
      paymentStatus: "Pending",
    };

    setLoading(true);
    try {
      if (isEdit) {
        await updateSupplier(editSupplier._id, payload);
        toast.success("Supplier updated ✅");
      } else {
        await createSupplier(payload);
        toast.success("Supplier created ✅ Now add products");
      }
      navigate("/suppliers/products");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Operation failed");
    } finally { setLoading(false); }
  };

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            {isEdit ? "✏️ Edit Supplier" : "➕ Create New Supplier"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isEdit
              ? `Editing: ${editSupplier?.companyName || editSupplier?.name}`
              : "Fill company, contact & address — then add products on the next page"}
          </Typography>
        </Box>
      </Box>

      {/* Stepper */}
      <Card sx={{ p: 3, borderRadius: 3, mb: 3, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
        <Stepper activeStep={step} alternativeLabel>
          {STEPS.map((label, i) => (
            <Step key={label} completed={step > i}
              onClick={() => step > i && setStep(i)}
              sx={{ cursor: step > i ? "pointer" : "default" }}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Card>

      <Card sx={{ p: 3, borderRadius: 3, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>

        {/* ── STEP 0: Company Details ── */}
        {step === 0 && (
          <Box>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              {SECTION_ICONS[0]}
              <Typography variant="h6" fontWeight={700}>Company Details</Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth required label="Company Name"
                  value={company.companyName}
                  onChange={(e) => setCompany({ ...company, companyName: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Company Email" type="email"
                  value={company.companyEmail}
                  onChange={(e) => setCompany({ ...company, companyEmail: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Company Website"
                  value={company.companyWebsite}
                  onChange={(e) => setCompany({ ...company, companyWebsite: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="LIC Number"
                  value={company.licNo}
                  onChange={(e) => setCompany({ ...company, licNo: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="GSTIN"
                  value={company.gstin}
                  onChange={(e) => setCompany({ ...company, gstin: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth required label="Company Phone"
                  value={company.companyPhone}
                  inputProps={{ maxLength: 10, inputMode: "numeric" }}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setCompany({ ...company, companyPhone: val });
                  }} />
              </Grid>
            </Grid>
          </Box>
        )}

        {/* ── STEP 1: Supplier Contact + Bank ── */}
        {step === 1 && (
          <Box>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              {SECTION_ICONS[1]}
              <Typography variant="h6" fontWeight={700}>Supplier Contact & Bank Details</Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />

            <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={2}>
              CONTACT INFO
            </Typography>
            <Grid container spacing={2.5} mb={3}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth required label="Supplier Name"
                  value={contact.supplierName}
                  onChange={(e) => setContact({ ...contact, supplierName: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth required label="Supplier Phone"
                  value={contact.supplierPhone}
                  inputProps={{ maxLength: 10, inputMode: "numeric" }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">+91</InputAdornment>,
                  }}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setContact({ ...contact, supplierPhone: val });
                  }} />
              </Grid>
            </Grid>

            <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={2}>
              BANK DETAILS
            </Typography>
            <Grid container spacing={2.5}>
              {[
                { label: "Account Number",      field: "accountNo"     },
                { label: "IFSC Code",           field: "ifscCode"      },
                { label: "UPI ID",              field: "upiId"         },
                { label: "Account Holder Name", field: "accountHolder" },
                { label: "Bank Name",           field: "bankName"      },
                { label: "Branch",              field: "branch"        },
              ].map(({ label, field }) => (
                <Grid item xs={12} sm={6} key={field}>
                  <TextField fullWidth required label={label}
                    value={contact[field]}
                    onChange={(e) => setContact({ ...contact, [field]: e.target.value })} />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* ── STEP 2: Address ── */}
        {step === 2 && (
          <Box>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              {SECTION_ICONS[2]}
              <Typography variant="h6" fontWeight={700}>Company Address</Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />
            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <TextField fullWidth required label="Company Address" multiline rows={2}
                  value={address.companyAddress}
                  onChange={(e) => setAddress({ ...address, companyAddress: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth required label="Pincode"
                  value={address.pincode}
                  inputProps={{ maxLength: 6, inputMode: "numeric" }}
                  helperText={pincodeLoading ? "Fetching location..." : "Auto-fills state & city"}
                  onChange={handlePincodeChange} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Autocomplete
                  options={INDIA_STATES}
                  value={address.state || null}
                  onChange={(_, val) => setAddress({ ...address, state: val || "" })}
                  renderInput={(params) => <TextField {...params} label="State" fullWidth />}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="City"
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })} />
              </Grid>
            </Grid>

            {/* Hint box on last step */}
            <Box sx={{ mt: 3, p: 2, background: "#eff6ff", borderRadius: 2,
              border: "1px solid #bfdbfe", display: "flex", alignItems: "center", gap: 1.5 }}>
              <Typography fontSize={20}>📦</Typography>
              <Box>
                <Typography fontWeight={600} fontSize={14} color="#1d4ed8">
                  Next: Add Products
                </Typography>
                <Typography fontSize={12} color="text.secondary">
                  After saving, you'll be taken to Supplier Products to record purchases for this supplier.
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* ── Navigation Buttons ── */}
        <Box display="flex" gap={2} mt={4}>
          {step > 0 && (
            <Button variant="outlined" onClick={() => setStep(step - 1)}>
              ← Previous
            </Button>
          )}
          <Box flex={1} />
          {step < 2 ? (
            <Button variant="contained"
              onClick={() => { if (validateStep()) setStep(step + 1); }}>
              Next →
            </Button>
          ) : (
            <Button variant="contained" color="success"
              onClick={handleSubmit} disabled={loading}
              sx={{ fontWeight: 700, px: 4 }}>
              {loading
                ? (isEdit ? "Updating..." : "Creating...")
                : (isEdit ? "✅ Update & Go to Products" : "✅ Create & Add Products")}
            </Button>
          )}
        </Box>
      </Card>
    </Box>
  );
};

export default SupplierCreate;