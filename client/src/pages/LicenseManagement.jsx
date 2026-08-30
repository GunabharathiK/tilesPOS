import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import EmailIcon from "@mui/icons-material/Email";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
  generateProductLicense,
  getLicenseDashboard,
  provisionClientSetup,
} from "../services/licenseService";

const createInstallationId = () => {
  const randomPart = Math.random().toString(16).slice(2, 8);
  const timePart = Date.now().toString(16).slice(-6);
  return `tiles-${timePart}${randomPart}`;
};

const LicenseManagement = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    email: "",
    customerName: "",
    companyName: "",
    installationId: "",
    databaseLabel: "",
    months: 3,
    sendToCustomer: true,
    generatedFromRequestEmail: "",
  });
  const [state, setState] = useState({ loading: false, error: "", success: "", key: "" });
  const [provisionForm, setProvisionForm] = useState({
    email: "",
    customerName: "",
    companyName: "",
    phone: "",
    installationId: "",
    databaseLabel: "",
    adminName: "",
    adminPhone: "",
    adminPassword: "",
    months: 3,
  });
  const [provisionState, setProvisionState] = useState({
    loading: false,
    error: "",
    success: "",
    setupPackage: "",
  });

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await getLicenseDashboard();
      setDashboard(res.data);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err?.response?.data?.error || "Failed to load license dashboard",
      }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    setForm((prev) => (prev.installationId ? prev : { ...prev, installationId: createInstallationId() }));
    setProvisionForm((prev) => (prev.installationId ? prev : { ...prev, installationId: createInstallationId() }));
  }, []);

  const handleGenerate = async (event) => {
    event.preventDefault();
    setState({ loading: true, error: "", success: "", key: "" });
    try {
      const res = await generateProductLicense(form);
      setState({
        loading: false,
        error: "",
        success: res.data.message,
        key: res.data.license.licenseKey,
      });
      await loadDashboard();
    } catch (err) {
      setState({
        loading: false,
        error: err?.response?.data?.error || "Failed to generate license",
        success: "",
        key: "",
      });
    }
  };

  const copyKey = async () => {
    if (!state.key) return;
    await navigator.clipboard.writeText(state.key);
  };

  const copySetupPackage = async () => {
    if (!provisionState.setupPackage) return;
    await navigator.clipboard.writeText(provisionState.setupPackage);
  };

  const applyRequest = (item) => {
    setForm((prev) => ({
      ...prev,
      email: item.email || "",
      customerName: item.companyName || "",
      companyName: item.companyName || "",
      installationId: item.installationId || "",
      databaseLabel: item.databaseLabel || "",
      generatedFromRequestEmail: item.email || "",
    }));
    setProvisionForm((prev) => ({
      ...prev,
      email: item.email || "",
      customerName: item.companyName || "",
      companyName: item.companyName || "",
      phone: item.phone || "",
      installationId: item.installationId || "",
      databaseLabel: item.databaseLabel || "",
      adminPhone: item.phone || "",
    }));
  };

  const handleProvision = async (event) => {
    event.preventDefault();
    setProvisionState({ loading: true, error: "", success: "", setupPackage: "" });
    try {
      const res = await provisionClientSetup(provisionForm);
      setProvisionState({
        loading: false,
        error: "",
        success: res.data.message,
        setupPackage: res.data.setupPackage,
      });
      await loadDashboard();
    } catch (err) {
      setProvisionState({
        loading: false,
        error: err?.response?.data?.error || "Failed to generate setup package",
        success: "",
        setupPackage: "",
      });
    }
  };

  return (
    <Box sx={{ p: 3, display: "grid", gap: 3 }}>
      <Card>
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
            <Box>
              <Typography variant="h5" fontWeight={800}>License Management</Typography>
              <Typography color="text.secondary">
                Generate installation-bound licenses and monitor customer expiry from one owner server.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Chip label={`SMTP ${dashboard?.smtpConfigured ? "Ready" : "Missing"}`} color={dashboard?.smtpConfigured ? "success" : "warning"} />
              <Chip label={`Central Sync ${dashboard?.centralSyncConfigured ? "Ready" : "Off"}`} color={dashboard?.centralSyncConfigured ? "success" : "default"} />
              <Chip label={dashboard?.status?.status || "loading"} />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1.2fr" }, gap: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={800} gutterBottom>Generate License</Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Bind the license to one installation ID so you can verify exactly which customer machine owns that key.
            </Typography>

            {state.error ? <Alert severity="error" sx={{ mb: 2 }}>{state.error}</Alert> : null}
            {state.success ? <Alert severity="success" sx={{ mb: 2 }}>{state.success}</Alert> : null}

            <Box component="form" onSubmit={handleGenerate}>
              <TextField label="Customer Email" fullWidth sx={{ mb: 2 }} value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              <TextField label="Customer Name" fullWidth sx={{ mb: 2 }} value={form.customerName} onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))} />
              <TextField label="Company Name" fullWidth sx={{ mb: 2 }} value={form.companyName} onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))} />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
                <TextField label="Installation ID" fullWidth value={form.installationId} onChange={(e) => setForm((p) => ({ ...p, installationId: e.target.value }))} />
                <Button variant="outlined" onClick={() => setForm((p) => ({ ...p, installationId: createInstallationId() }))}>
                  Auto Generate
                </Button>
              </Stack>
              <TextField label="Database Label" fullWidth sx={{ mb: 2 }} value={form.databaseLabel} onChange={(e) => setForm((p) => ({ ...p, databaseLabel: e.target.value }))} />
              <TextField label="Months" type="number" fullWidth sx={{ mb: 2 }} value={form.months} onChange={(e) => setForm((p) => ({ ...p, months: Number(e.target.value) }))} />
              <TextField label="Request Email Reference" fullWidth sx={{ mb: 2 }} value={form.generatedFromRequestEmail} onChange={(e) => setForm((p) => ({ ...p, generatedFromRequestEmail: e.target.value }))} />
              <TextField select label="Delivery" fullWidth sx={{ mb: 2 }} value={String(form.sendToCustomer)} onChange={(e) => setForm((p) => ({ ...p, sendToCustomer: e.target.value === "true" }))}>
                <MenuItem value="true">Generate and send by email</MenuItem>
                <MenuItem value="false">Generate only</MenuItem>
              </TextField>
              <Button type="submit" variant="contained" fullWidth disabled={state.loading}>
                {state.loading ? "Generating..." : "Generate License"}
              </Button>
            </Box>

            {state.key ? (
              <>
                <Divider sx={{ my: 2 }} />
                <TextField label="Generated Key" fullWidth multiline minRows={5} value={state.key} />
                <Button variant="outlined" startIcon={<ContentCopyIcon />} sx={{ mt: 2 }} onClick={copyKey}>
                  Copy License Key
                </Button>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Box sx={{ display: "grid", gap: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={800} gutterBottom>Current Installation Status</Typography>
              <Stack spacing={1}>
                <Typography>Trial ends: {dashboard?.status?.trialEndsAt ? new Date(dashboard.status.trialEndsAt).toLocaleDateString("en-IN") : "-"}</Typography>
                <Typography>Remaining days: {dashboard?.status?.remainingDays ?? "-"}</Typography>
                <Typography>Owner email: {dashboard?.ownerEmail || "Not configured"}</Typography>
                <Typography>Installation ID: {dashboard?.status?.installationId || "-"}</Typography>
                <Typography>Database label: {dashboard?.status?.databaseLabel || "-"}</Typography>
                {dashboard?.status?.notification ? <Alert severity={dashboard.status.notification.level}>{dashboard.status.notification.message}</Alert> : null}
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={800} gutterBottom>Provision Client Setup</Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Create the client admin, create the installation-bound license, and generate one signed setup package you can share with that customer.
              </Typography>

              {provisionState.error ? <Alert severity="error" sx={{ mb: 2 }}>{provisionState.error}</Alert> : null}
              {provisionState.success ? <Alert severity="success" sx={{ mb: 2 }}>{provisionState.success}</Alert> : null}

              <Box component="form" onSubmit={handleProvision}>
                <TextField label="Customer Email" fullWidth sx={{ mb: 2 }} value={provisionForm.email} onChange={(e) => setProvisionForm((p) => ({ ...p, email: e.target.value }))} />
                <TextField label="Customer Name" fullWidth sx={{ mb: 2 }} value={provisionForm.customerName} onChange={(e) => setProvisionForm((p) => ({ ...p, customerName: e.target.value }))} />
                <TextField label="Company Name" fullWidth sx={{ mb: 2 }} value={provisionForm.companyName} onChange={(e) => setProvisionForm((p) => ({ ...p, companyName: e.target.value }))} />
                <TextField label="Customer Phone" fullWidth sx={{ mb: 2 }} value={provisionForm.phone} onChange={(e) => setProvisionForm((p) => ({ ...p, phone: e.target.value }))} />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
                  <TextField label="Installation ID" fullWidth value={provisionForm.installationId} onChange={(e) => setProvisionForm((p) => ({ ...p, installationId: e.target.value }))} />
                  <Button variant="outlined" onClick={() => setProvisionForm((p) => ({ ...p, installationId: createInstallationId() }))}>
                    Auto Generate
                  </Button>
                </Stack>
                <TextField label="Database Label" fullWidth sx={{ mb: 2 }} value={provisionForm.databaseLabel} onChange={(e) => setProvisionForm((p) => ({ ...p, databaseLabel: e.target.value }))} />
                <TextField label="Client Admin Name" fullWidth sx={{ mb: 2 }} value={provisionForm.adminName} onChange={(e) => setProvisionForm((p) => ({ ...p, adminName: e.target.value }))} />
                <TextField label="Client Admin Phone" fullWidth sx={{ mb: 2 }} value={provisionForm.adminPhone} onChange={(e) => setProvisionForm((p) => ({ ...p, adminPhone: e.target.value }))} />
                <TextField label="Client Admin Password" type="password" fullWidth sx={{ mb: 2 }} value={provisionForm.adminPassword} onChange={(e) => setProvisionForm((p) => ({ ...p, adminPassword: e.target.value }))} />
                <TextField label="Months" type="number" fullWidth sx={{ mb: 2 }} value={provisionForm.months} onChange={(e) => setProvisionForm((p) => ({ ...p, months: Number(e.target.value) }))} />
                <Button type="submit" variant="contained" fullWidth disabled={provisionState.loading}>
                  {provisionState.loading ? "Creating..." : "Generate Client Setup Package"}
                </Button>
              </Box>

              {provisionState.setupPackage ? (
                <>
                  <Divider sx={{ my: 2 }} />
                  <TextField label="Setup Package" fullWidth multiline minRows={6} value={provisionState.setupPackage} />
                  <Button variant="outlined" startIcon={<ContentCopyIcon />} sx={{ mt: 2 }} onClick={copySetupPackage}>
                    Copy Setup Package
                  </Button>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={800} gutterBottom>Expiring Soon Notifications</Typography>
              {(dashboard?.expiringSoon || []).length === 0 ? (
                <Typography color="text.secondary">No licenses are close to expiry right now.</Typography>
              ) : (
                <Stack spacing={1.2}>
                  {dashboard.expiringSoon.map((item) => (
                    <Alert key={item._id} severity="warning" icon={<WarningAmberIcon />}>
                      {item.email} at {item.companyName || item.databaseLabel || item.installationId} expires on {new Date(item.expiresAt).toLocaleDateString("en-IN")}
                    </Alert>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={800} gutterBottom>Recent License Requests</Typography>
              {loading ? (
                <Typography color="text.secondary">Loading requests...</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Email</TableCell>
                      <TableCell>Company</TableCell>
                      <TableCell>Install ID</TableCell>
                      <TableCell>Use</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(dashboard?.requests || []).map((item) => (
                      <TableRow key={item._id}>
                        <TableCell>{item.email}</TableCell>
                        <TableCell>{item.companyName || "-"}</TableCell>
                        <TableCell>{item.installationId || "-"}</TableCell>
                        <TableCell><Button size="small" onClick={() => applyRequest(item)}>Use</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={800} gutterBottom>Synced Installations</Typography>
              {loading ? (
                <Typography color="text.secondary">Loading installations...</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Install ID</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Database</TableCell>
                      <TableCell>Last Seen</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(dashboard?.installations || []).map((item) => (
                      <TableRow key={item._id}>
                        <TableCell>{item.installationId}</TableCell>
                        <TableCell>{item.licenseStatus}</TableCell>
                        <TableCell>{item.databaseLabel || "-"}</TableCell>
                        <TableCell>{item.lastSeenAt ? new Date(item.lastSeenAt).toLocaleString("en-IN") : "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={800} gutterBottom>Recently Generated Licenses</Typography>
              {loading ? (
                <Typography color="text.secondary">Loading licenses...</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Email</TableCell>
                      <TableCell>Install ID</TableCell>
                      <TableCell>Expires</TableCell>
                      <TableCell>Delivery</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(dashboard?.issues || []).map((item) => (
                      <TableRow key={item._id}>
                        <TableCell>{item.email}</TableCell>
                        <TableCell>{item.installationId || "-"}</TableCell>
                        <TableCell>{new Date(item.expiresAt).toLocaleDateString("en-IN")}</TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip size="small" label={item.keyPreview} />
                            {item.emailSentToCustomer ? <EmailIcon fontSize="small" color="success" /> : null}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={800} gutterBottom>Provisioned Client Setups</Typography>
              {loading ? (
                <Typography color="text.secondary">Loading setup packages...</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Company</TableCell>
                      <TableCell>Install ID</TableCell>
                      <TableCell>Client Admin</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(dashboard?.provisions || []).map((item) => (
                      <TableRow key={item._id}>
                        <TableCell>{item.companyName || item.customerName || "-"}</TableCell>
                        <TableCell>{item.installationId || "-"}</TableCell>
                        <TableCell>{item.adminPhone || "-"}</TableCell>
                        <TableCell>{item.status || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default LicenseManagement;
