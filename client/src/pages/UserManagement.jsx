import {
  Box,
  Card,
  Typography,
  TextField,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Chip,
  Grid,
  Divider,
  InputAdornment,
  Alert,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import BadgeIcon from "@mui/icons-material/Badge";

import { useState, useEffect } from "react";
import API from "../services/api";
import toast from "react-hot-toast";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "staff",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await API.get("/auth/users");
      setUsers(res.data);
    } catch {
      toast.error("Failed to load users");
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password) {
      setError("All fields are required");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await API.post("/auth/register", form);
      toast.success(`${form.role === "admin" ? "Admin" : "Staff"} account created ✅`);
      setForm({ name: "", email: "", password: "", role: "staff" });
      fetchUsers();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"?`)) return;
    try {
      await API.delete(`/auth/users/${id}`);
      toast.success("User deleted");
      fetchUsers();
    } catch {
      toast.error("Failed to delete user");
    }
  };

  const adminCount = users.filter((u) => u.role === "admin").length;
  const staffCount = users.filter((u) => u.role === "staff").length;

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight={700} mb={0.5}>
        User Management
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Create and manage admin and staff accounts
      </Typography>

      {/* STATS */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, borderRadius: 3, background: "#fefce8", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <AdminPanelSettingsIcon sx={{ color: "#ca8a04", fontSize: 32 }} />
              <Box>
                <Typography variant="body2" color="text.secondary">Admins</Typography>
                <Typography variant="h5" fontWeight={700}>{adminCount}</Typography>
              </Box>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, borderRadius: 3, background: "#eff6ff", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <BadgeIcon sx={{ color: "#2563eb", fontSize: 32 }} />
              <Box>
                <Typography variant="body2" color="text.secondary">Staff</Typography>
                <Typography variant="h5" fontWeight={700}>{staffCount}</Typography>
              </Box>
            </Box>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* CREATE USER FORM */}
        <Grid item xs={12} md={5}>
          <Card sx={{ p: 3, borderRadius: 3, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <PersonAddIcon sx={{ color: "#6366f1" }} />
              <Typography variant="h6" fontWeight={600}>Create New User</Typography>
            </Box>

            <Divider sx={{ mb: 2 }} />

            {error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <Box display="flex" flexDirection="column" gap={2}>
              <TextField
                label="Full Name"
                name="name"
                fullWidth
                value={form.name}
                onChange={handleChange}
              />

              <TextField
                label="Email"
                name="email"
                type="email"
                fullWidth
                value={form.email}
                onChange={handleChange}
              />

              <TextField
                label="Password"
                name="password"
                type={showPassword ? "text" : "password"}
                fullWidth
                value={form.password}
                onChange={handleChange}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {/* Role selector */}
              <Box>
                <Typography variant="body2" color="text.secondary" mb={1} fontWeight={500}>
                  Role
                </Typography>
                <Box display="flex" gap={1.5}>
                  <Box
                    onClick={() => setForm({ ...form, role: "staff" })}
                    sx={{
                      flex: 1, p: 1.5, borderRadius: 2, cursor: "pointer", textAlign: "center",
                      border: form.role === "staff" ? "2px solid #6366f1" : "2px solid #e2e8f0",
                      background: form.role === "staff" ? "#eef2ff" : "#fff",
                      transition: "all 0.2s",
                    }}
                  >
                    <BadgeIcon sx={{ color: form.role === "staff" ? "#6366f1" : "#94a3b8", mb: 0.5 }} />
                    <Typography variant="body2" fontWeight={600} color={form.role === "staff" ? "#6366f1" : "text.secondary"}>
                      Staff
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Create invoices only
                    </Typography>
                  </Box>

                  <Box
                    onClick={() => setForm({ ...form, role: "admin" })}
                    sx={{
                      flex: 1, p: 1.5, borderRadius: 2, cursor: "pointer", textAlign: "center",
                      border: form.role === "admin" ? "2px solid #ca8a04" : "2px solid #e2e8f0",
                      background: form.role === "admin" ? "#fefce8" : "#fff",
                      transition: "all 0.2s",
                    }}
                  >
                    <AdminPanelSettingsIcon sx={{ color: form.role === "admin" ? "#ca8a04" : "#94a3b8", mb: 0.5 }} />
                    <Typography variant="body2" fontWeight={600} color={form.role === "admin" ? "#ca8a04" : "text.secondary"}>
                      Admin
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Full access
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleSubmit}
                disabled={loading}
                startIcon={<PersonAddIcon />}
                sx={{
                  borderRadius: 2,
                  py: 1.4,
                  fontWeight: 700,
                  background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                  "&:hover": { background: "linear-gradient(135deg, #4f46e5, #4338ca)" },
                }}
              >
                {loading ? "Creating..." : "Create Account"}
              </Button>
            </Box>
          </Card>
        </Grid>

        {/* USER LIST */}
        <Grid item xs={12} md={7}>
          <Card sx={{ borderRadius: 3, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
            <Box p={2.5} pb={1}>
              <Typography variant="h6" fontWeight={600}>All Users</Typography>
            </Box>

            <Table>
              <TableHead>
                <TableRow sx={{ background: "#f8fafc" }}>
                  <TableCell sx={{ fontWeight: 600, color: "text.secondary", fontSize: 12 }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "text.secondary", fontSize: 12 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "text.secondary", fontSize: 12 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "text.secondary", fontSize: 12 }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "text.secondary", fontSize: 12 }}>Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {users.map((u, index) => (
                  <TableRow key={u._id} hover>
                    <TableCell>{index + 1}</TableCell>

                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <Box sx={{
                          width: 34, height: 34, borderRadius: "50%",
                          background: u.role === "admin" ? "#fef3c7" : "#ede9fe",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontWeight: 700, fontSize: 14,
                          color: u.role === "admin" ? "#92400e" : "#5b21b6",
                        }}>
                          {u.name?.[0]?.toUpperCase()}
                        </Box>
                        <Typography fontWeight={500} fontSize={14}>{u.name}</Typography>
                      </Box>
                    </TableCell>

                    <TableCell sx={{ fontSize: 13, color: "text.secondary" }}>{u.email}</TableCell>

                    <TableCell>
                      <Chip
                        label={u.role}
                        size="small"
                        icon={u.role === "admin"
                          ? <AdminPanelSettingsIcon style={{ fontSize: 14 }} />
                          : <BadgeIcon style={{ fontSize: 14 }} />}
                        sx={{
                          fontWeight: 600,
                          background: u.role === "admin" ? "#fef3c7" : "#ede9fe",
                          color: u.role === "admin" ? "#92400e" : "#5b21b6",
                          textTransform: "capitalize",
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => handleDelete(u._id, u.name)}
                        title="Delete user"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}

                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: "text.secondary" }}>
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default UserManagement;
