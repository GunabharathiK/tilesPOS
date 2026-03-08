import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  IconButton,
  InputAdornment,
  Alert,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { useEffect, useState } from "react";
import API from "../services/api";
import toast from "react-hot-toast";

const UserManagement = ({ embedded = false }) => {
  const [users, setUsers] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    password: "",
    role: "staff",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await API.get("/auth/users");
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load users");
    }
  };

  const resetForm = () => {
    setForm({ name: "", phone: "", password: "", role: "staff" });
    setShowPassword(false);
    setError("");
  };

  const openAddDialog = () => {
    resetForm();
    setOpenDialog(true);
  };

  const closeAddDialog = () => {
    setOpenDialog(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const safeValue = name === "phone" ? value.replace(/\D/g, "").slice(0, 10) : value;
    setForm((prev) => ({ ...prev, [name]: safeValue }));
    setError("");
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.password.trim()) {
      setError("Name, mobile and password are required");
      return;
    }
    if (form.phone.length !== 10) {
      setError("Mobile number must be 10 digits");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (!["admin", "staff"].includes(form.role)) {
      setError("Role must be admin or staff");
      return;
    }

    setLoading(true);
    try {
      await API.post("/auth/register", {
        name: form.name.trim(),
        phone: form.phone.trim(),
        password: form.password,
        role: form.role,
      });
      toast.success("Staff added");
      closeAddDialog();
      fetchUsers();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const roleChipSx = (role) => {
    if (role === "admin") {
      return {
        background: "#fff1f0",
        color: "#d14334",
        border: "1px solid #ffd8d4",
      };
    }
    return {
      background: "#eef4ff",
      color: "#1a56a0",
      border: "1px solid #d5e5ff",
    };
  };

  const viewUsers = users.map((u) => ({
    ...u,
    role: String(u.role || "").toLowerCase() === "admin" ? "admin" : "staff",
  }));

  return (
    <Box sx={{ p: embedded ? 0 : 2 }}>
      {!embedded ? (
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 24, fontWeight: 800, color: "#1c2333" }}>
            User Management
          </Typography>
          <Typography sx={{ color: "#64748b", fontSize: 13 }}>
            Add and manage admin/staff accounts
          </Typography>
        </Box>
      ) : null}

      <Box sx={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden", background: "#fff" }}>
        <Box sx={{ borderBottom: "1px solid #edf0f5", px: 2.2, py: 1.4 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#1c2333" }}>
            User Management
          </Typography>
        </Box>

        <Box sx={{ p: 1.6 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ background: "#f8fafc" }}>
                {["Name", "Role", "Mobile", "Status"].map((head) => (
                  <TableCell
                    key={head}
                    sx={{
                      fontSize: 11,
                      color: "#7b8ba3",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: ".06em",
                      py: 1.1,
                    }}
                  >
                    {head}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {viewUsers.map((u) => (
                <TableRow key={u._id || u.phone}>
                  <TableCell sx={{ fontSize: 13, fontWeight: 700, color: "#1c2333", py: 1.1 }}>
                    {u.name || "-"}
                  </TableCell>
                  <TableCell sx={{ py: 1.1 }}>
                    <Chip
                      label={u.role === "admin" ? "Admin" : "Staff"}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        fontSize: 11,
                        height: 26,
                        borderRadius: "999px",
                        ...roleChipSx(u.role),
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: 13, color: "#4a5568", py: 1.1 }}>
                    {u.phone || "-"}
                  </TableCell>
                  <TableCell sx={{ py: 1.1 }}>
                    <Chip
                      label="Active"
                      size="small"
                      sx={{
                        fontWeight: 700,
                        fontSize: 11,
                        height: 26,
                        color: "#1a7a4a",
                        border: "1px solid #b8dfca",
                        background: "#ecf9f1",
                        borderRadius: "999px",
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {viewUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 3, color: "#64748b" }}>
                    No users found
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>

          <Box sx={{ mt: 1.2 }}>
            <Button
              variant="outlined"
              onClick={openAddDialog}
              sx={{
                borderColor: "#d0d8e4",
                color: "#2d3748",
                textTransform: "none",
                borderRadius: "10px",
                px: 1.6,
                py: 0.55,
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              + Add Staff
            </Button>
          </Box>
        </Box>
      </Box>

      <Dialog open={openDialog} onClose={closeAddDialog} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800, fontSize: 18, color: "#1c2333" }}>Add Staff</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {error ? (
            <Alert severity="error" sx={{ mb: 1.5 }}>
              {error}
            </Alert>
          ) : null}

          <Box sx={{ display: "grid", gap: 1.3 }}>
            <TextField
              label="Full Name"
              name="name"
              size="small"
              value={form.name}
              onChange={handleChange}
              fullWidth
            />
            <TextField
              label="Mobile"
              name="phone"
              size="small"
              value={form.phone}
              onChange={handleChange}
              inputProps={{ maxLength: 10 }}
              fullWidth
            />
            <TextField
              label="Password"
              name="password"
              type={showPassword ? "text" : "password"}
              size="small"
              value={form.password}
              onChange={handleChange}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword((prev) => !prev)} edge="end" size="small">
                      {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              select
              label="Role"
              name="role"
              size="small"
              value={form.role}
              onChange={handleChange}
              fullWidth
            >
              <MenuItem value="staff">Staff</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeAddDialog} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            variant="contained"
            sx={{
              textTransform: "none",
              fontWeight: 700,
              background: "#1a56a0",
              "&:hover": { background: "#0f3d7a" },
            }}
          >
            {loading ? "Saving..." : "Add Staff"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
