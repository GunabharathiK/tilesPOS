import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  activateProductLicense,
  importProvisionedSetup,
  requestLicenseAccess,
} from "../services/licenseService";

const LicensePage = () => {
  const navigate = useNavigate();
  const { user, licenseStatus, refreshLicenseStatus } = useAuth();
  const [requestForm, setRequestForm] = useState({ email: "", companyName: "", phone: "", message: "" });
  const [activationForm, setActivationForm] = useState({ email: "", licenseKey: "" });
  const [setupPackage, setSetupPackage] = useState("");
  const [requestState, setRequestState] = useState({ loading: false, error: "", success: "" });
  const [activationState, setActivationState] = useState({ loading: false, error: "", success: "" });
  const [setupState, setSetupState] = useState({ loading: false, error: "", success: "" });

  useEffect(() => {
    if (user && licenseStatus?.isActive) {
      navigate("/", { replace: true });
    }
  }, [user, licenseStatus, navigate]);

  useEffect(() => {
    setRequestForm((prev) => ({
      ...prev,
      companyName: prev.companyName || licenseStatus?.lastLicenseRequest?.companyName || "",
    }));
  }, [licenseStatus]);

  const statusLabel = useMemo(() => {
    if (!licenseStatus) return "Checking";
    if (licenseStatus.status === "licensed") return "Licensed";
    if (licenseStatus.status === "trial") return "Trial";
    return "Expired";
  }, [licenseStatus]);

  const handleRequestChange = (field) => (event) => {
    setRequestForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleActivationChange = (field) => (event) => {
    setActivationForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleRequestLicense = async (event) => {
    event.preventDefault();
    setRequestState({ loading: true, error: "", success: "" });
    try {
      const res = await requestLicenseAccess(requestForm);
      setRequestState({ loading: false, error: "", success: `${res.data.message}. Installation ID: ${res.data.installationId}` });
    } catch (err) {
      setRequestState({
        loading: false,
        error: err?.response?.data?.error || "Failed to submit license request",
        success: "",
      });
    }
  };

  const handleActivateLicense = async (event) => {
    event.preventDefault();
    setActivationState({ loading: true, error: "", success: "" });
    try {
      const res = await activateProductLicense(activationForm.email, activationForm.licenseKey);
      setActivationState({ loading: false, error: "", success: res.data.message });
      await refreshLicenseStatus();
      if (user) {
        navigate("/", { replace: true });
      }
    } catch (err) {
      setActivationState({
        loading: false,
        error: err?.response?.data?.error || "Failed to activate license",
        success: "",
      });
    }
  };

  const handleImportSetup = async (event) => {
    event.preventDefault();
    setSetupState({ loading: true, error: "", success: "" });
    try {
      const res = await importProvisionedSetup(setupPackage);
      setSetupState({ loading: false, error: "", success: res.data.message });
      setActivationForm({
        email: res.data?.licenseStatus?.activatedLicense?.email || "",
        licenseKey: "",
      });
      await refreshLicenseStatus();
      navigate("/login", { replace: true });
    } catch (err) {
      setSetupState({
        loading: false,
        error: err?.response?.data?.error || "Failed to import setup package",
        success: "",
      });
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", px: 2, py: 4, background: "linear-gradient(145deg, #0f172a 0%, #1e293b 50%, #111827 100%)" }}>
      <Card sx={{ width: "100%", maxWidth: 1040, borderRadius: 4, overflow: "hidden" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.1fr 0.9fr" } }}>
          <Box sx={{ p: { xs: 3, md: 5 }, color: "#fff", background: "linear-gradient(160deg, #1d4ed8, #0f172a)" }}>
            <Chip label={statusLabel} sx={{ mb: 2, fontWeight: 700, bgcolor: "#dbeafe", color: "#1d4ed8" }} />
            <Typography variant="h4" fontWeight={800} gutterBottom>Tiles POS License Control</Typography>
            <Typography sx={{ opacity: 0.92, lineHeight: 1.8, mb: 3 }}>
              Each shop installation has its own installation ID. Your owner server should generate the license against that installation ID, not just the email.
            </Typography>

            {licenseStatus?.notification ? <Alert severity={licenseStatus.notification.level} sx={{ mb: 2 }}>{licenseStatus.notification.message}</Alert> : null}

            <Stack spacing={1.1}>
              <Typography>Trial started: {licenseStatus?.trialStartedAt ? new Date(licenseStatus.trialStartedAt).toLocaleDateString("en-IN") : "-"}</Typography>
              <Typography>Trial ends: {licenseStatus?.trialEndsAt ? new Date(licenseStatus.trialEndsAt).toLocaleDateString("en-IN") : "-"}</Typography>
              <Typography>Remaining days: {licenseStatus?.remainingDays ?? 0}</Typography>
              <Typography>Installation ID: {licenseStatus?.installationId || "-"}</Typography>
              <Typography>Database label: {licenseStatus?.databaseLabel || "-"}</Typography>
              {licenseStatus?.activatedLicense ? <Typography>Active email: {licenseStatus.activatedLicense.email}</Typography> : null}
              {licenseStatus?.activatedLicense?.licenseId ? <Typography>License ID: {licenseStatus.activatedLicense.licenseId}</Typography> : null}
              {licenseStatus?.centralSync?.lastSyncedAt ? <Typography>Last central sync: {new Date(licenseStatus.centralSync.lastSyncedAt).toLocaleString("en-IN")}</Typography> : null}
            </Stack>

            <Divider sx={{ my: 3, borderColor: "rgba(255,255,255,0.16)" }} />

            <Typography sx={{ opacity: 0.85, lineHeight: 1.8 }}>
              Verification works even if each customer uses a separate MongoDB database, because the owner license is tied to this installation ID and can be mirrored to your original central server through sync.
            </Typography>

            {licenseStatus?.isActive && !user ? (
              <Button component={RouterLink} to="/login" variant="contained" sx={{ mt: 4, alignSelf: "flex-start", bgcolor: "#facc15", color: "#111827", fontWeight: 800 }}>
                Continue to Login
              </Button>
            ) : null}
          </Box>

          <Box sx={{ p: { xs: 3, md: 4 }, background: "#fff" }}>
            <Typography variant="h6" fontWeight={800} gutterBottom>Activate License</Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Activation succeeds only when email and installation ID match the license that was issued by the owner server.
            </Typography>

            {activationState.error ? <Alert severity="error" sx={{ mb: 2 }}>{activationState.error}</Alert> : null}
            {activationState.success ? <Alert severity="success" sx={{ mb: 2 }}>{activationState.success}</Alert> : null}

            <Box component="form" onSubmit={handleActivateLicense}>
              <TextField label="Customer Email" fullWidth sx={{ mb: 2 }} value={activationForm.email} onChange={handleActivationChange("email")} />
              <TextField label="License Key" fullWidth multiline minRows={4} sx={{ mb: 2 }} value={activationForm.licenseKey} onChange={handleActivationChange("licenseKey")} />
              <Button type="submit" variant="contained" fullWidth disabled={activationState.loading}>
                {activationState.loading ? "Activating..." : "Activate License"}
              </Button>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" fontWeight={800} gutterBottom>Import Provisioned Setup</Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Use this when you already created the client admin and license from the owner panel before handing over the setup.
            </Typography>

            {setupState.error ? <Alert severity="error" sx={{ mb: 2 }}>{setupState.error}</Alert> : null}
            {setupState.success ? <Alert severity="success" sx={{ mb: 2 }}>{setupState.success}</Alert> : null}

            <Box component="form" onSubmit={handleImportSetup}>
              <TextField
                label="Setup Package"
                fullWidth
                multiline
                minRows={5}
                sx={{ mb: 2 }}
                value={setupPackage}
                onChange={(event) => setSetupPackage(event.target.value)}
              />
              <Button type="submit" variant="contained" color="secondary" fullWidth disabled={setupState.loading}>
                {setupState.loading ? "Importing..." : "Import Client Setup"}
              </Button>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" fontWeight={800} gutterBottom>Request License</Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Send this shop request to the owner with email, company details, installation ID, and database label.
            </Typography>

            {requestState.error ? <Alert severity="error" sx={{ mb: 2 }}>{requestState.error}</Alert> : null}
            {requestState.success ? <Alert severity="success" sx={{ mb: 2 }}>{requestState.success}</Alert> : null}

            <Box component="form" onSubmit={handleRequestLicense}>
              <TextField label="Email" fullWidth sx={{ mb: 2 }} value={requestForm.email} onChange={handleRequestChange("email")} />
              <TextField label="Company Name" fullWidth sx={{ mb: 2 }} value={requestForm.companyName} onChange={handleRequestChange("companyName")} />
              <TextField label="Phone" fullWidth sx={{ mb: 2 }} value={requestForm.phone} onChange={handleRequestChange("phone")} />
              <TextField label="Installation ID" fullWidth sx={{ mb: 2 }} value={licenseStatus?.installationId || ""} inputProps={{ readOnly: true }} />
              <TextField label="Database Label" fullWidth sx={{ mb: 2 }} value={licenseStatus?.databaseLabel || ""} inputProps={{ readOnly: true }} />
              <TextField label="Message" fullWidth multiline minRows={3} sx={{ mb: 2 }} value={requestForm.message} onChange={handleRequestChange("message")} />
              <Button type="submit" variant="outlined" fullWidth disabled={requestState.loading}>
                {requestState.loading ? "Sending..." : "Send License Request"}
              </Button>
            </Box>
          </Box>
        </Box>
      </Card>
    </Box>
  );
};

export default LicensePage;
