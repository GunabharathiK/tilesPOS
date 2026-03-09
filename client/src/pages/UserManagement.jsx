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
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useEffect, useState } from "react";
import API from "../services/api";
import toast from "react-hot-toast";

const UserManagement = ({ embedded = false }) => {
  const [users, setUsers] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dialogMode, setDialogMode] = useState("add");
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

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
    setDialogMode("add");
    setEditingUser(null);
    resetForm();
    setOpenDialog(true);
  };

  const openEditDialog = (user) => {
    setDialogMode("edit");
    setEditingUser(user);
    setForm({
      name: user?.name || "",
      phone: user?.phone || "",
      password: "",
      role: String(user?.role || "").toLowerCase() === "admin" ? "admin" : "staff",
    });
    setShowPassword(false);
    setError("");
    setOpenDialog(true);
  };

  const closeAddDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const safeValue = name === "phone" ? value.replace(/\D/g, "").slice(0, 10) : value;
    setForm((prev) => ({ ...prev, [name]: safeValue }));
    setError("");
  };

  const handleSubmit = async () => {
    const isEdit = dialogMode === "edit";
    if (!form.name.trim() || !form.phone.trim() || (!isEdit && !form.password.trim())) {
      setError(isEdit ? "Name and mobile are required" : "Name, mobile and password are required");
      return;
    }
    if (form.phone.length !== 10) {
      setError("Mobile number must be 10 digits");
      return;
    }
    if (form.password && form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (!["admin", "staff"].includes(form.role)) {
      setError("Role must be admin or staff");
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        const payload = {
          name: form.name.trim(),
          phone: form.phone.trim(),
          role: form.role,
        };
        if (form.password.trim()) {
          payload.password = form.password;
        }
        await API.put(`/auth/users/${editingUser?._id}`, payload);
        toast.success("User updated");
      } else {
        await API.post("/auth/register", {
          name: form.name.trim(),
          phone: form.phone.trim(),
          password: form.password,
          role: form.role,
        });
        toast.success("Staff added");
      }
      closeAddDialog();
      fetchUsers();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser?._id) return;
    setLoading(true);
    try {
      await API.delete(`/auth/users/${deletingUser._id}`);
      toast.success("User deleted");
      setDeletingUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to delete user");
    } finally {
      setLoading(false);
    }
  };

  const adminCount = users.filter((u) => String(u?.role || "").toLowerCase() === "admin").length;
  const isOnlyAdmin = (user) =>
    String(user?.role || "").toLowerCase() === "admin" && adminCount <= 1;

  const handleDeleteClick = (user) => {
    if (isOnlyAdmin(user)) {
      toast.error("At least one admin account is required");
      return;
    }
    setDeletingUser(user);
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
                {["Name", "Role", "Mobile", "Actions"].map((head) => (
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
                  <TableCell sx={{ py: 1.1, minWidth: 126 }}>
                    <Box sx={{ display: "flex", gap: 0.8 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => openEditDialog(u)}
                        startIcon={<EditOutlinedIcon sx={{ fontSize: 15 }} />}
                        sx={{ textTransform: "none", borderRadius: "8px", fontSize: 11, px: 0.8, py: 0.2, minWidth: "auto" }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        aria-disabled={isOnlyAdmin(u)}
                        onClick={() => handleDeleteClick(u)}
                        startIcon={<DeleteOutlineIcon sx={{ fontSize: 15 }} />}
                        sx={{
                          textTransform: "none",
                          borderRadius: "8px",
                          fontSize: 11,
                          px: 0.8,
                          py: 0.2,
                          minWidth: "auto",
                          opacity: isOnlyAdmin(u) ? 0.45 : 1,
                          cursor: isOnlyAdmin(u) ? "not-allowed" : "pointer",
                        }}
                      >
                        Delete
                      </Button>
                    </Box>
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
        <DialogTitle sx={{ fontWeight: 800, fontSize: 18, color: "#1c2333" }}>
          {dialogMode === "edit" ? "Edit User" : "Add Staff"}
        </DialogTitle>
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
              label={dialogMode === "edit" ? "New Password (optional)" : "Password"}
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
            {loading ? "Saving..." : dialogMode === "edit" ? "Save Changes" : "Add Staff"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deletingUser} onClose={() => setDeletingUser(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800, fontSize: 18, color: "#1c2333" }}>Delete User</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography sx={{ fontSize: 14, color: "#475569" }}>
            Are you sure you want to delete {deletingUser?.name || "this user"}?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeletingUser(null)} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteUser}
            disabled={loading}
            color="error"
            variant="contained"
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
