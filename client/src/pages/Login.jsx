import { useState } from "react";
import {
  Box,
  Card,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  Alert,
  Divider,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { loginUser } from "../services/authService";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await loginUser(email, password);
      login(res.data);           // save to context + localStorage
      navigate("/");
    } catch (err) {
      setError(err?.response?.data?.error || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Card
        sx={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 4,
          p: 4,
          boxShadow: "0 25px 60px rgba(0,0,0,0.4)",
        }}
      >
        {/* Logo / Icon */}
        <Box textAlign="center" mb={3}>
          <Box
            sx={{
              width: 60, height: 60, borderRadius: 3,
              background: "linear-gradient(135deg, #facc15, #f59e0b)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 12px",
              boxShadow: "0 4px 15px rgba(250,204,21,0.4)",
            }}
          >
            <LockOutlinedIcon sx={{ color: "#1e293b", fontSize: 28 }} />
          </Box>
          <Typography variant="h5" fontWeight={700}>
            Billing Software
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Sign in to your account
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            label="Email"
            type="email"
            fullWidth
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 2 }}
            autoComplete="email"
          />

          <TextField
            label="Password"
            type={showPassword ? "text" : "password"}
            fullWidth
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 3 }}
            autoComplete="current-password"
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

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            sx={{
              background: "linear-gradient(135deg, #facc15, #f59e0b)",
              color: "#1e293b",
              fontWeight: 700,
              borderRadius: 2,
              py: 1.5,
              fontSize: 16,
              "&:hover": {
                background: "linear-gradient(135deg, #fde047, #facc15)",
              },
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Role hint */}
        <Box sx={{ background: "#f8fafc", borderRadius: 2, p: 2 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={1}>
            LOGIN ROLES
          </Typography>
          <Box display="flex" justifyContent="space-between">
            <Box>
              <Typography variant="caption" color="text.secondary">Admin</Typography>
              <Typography variant="body2" fontWeight={500}>Full access</Typography>
            </Box>
            <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
            <Box>
              <Typography variant="caption" color="text.secondary">Staff</Typography>
              <Typography variant="body2" fontWeight={500}>Create invoices only</Typography>
            </Box>
          </Box>
        </Box>
      </Card>
    </Box>
  );
};

export default Login;
