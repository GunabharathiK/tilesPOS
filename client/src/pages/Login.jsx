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
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  loginUser,
  requestAdminForgotPasswordOtp,
  resetAdminPasswordWithOtp,
} from "../services/authService";

const ADMIN_PHONE = "6383014473";

const Login = () => {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [otpRequested, setOtpRequested] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();
  const isAdminPhone = phone === ADMIN_PHONE;

  const resetForgotState = () => {
    setOtpRequested(false);
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setForgotError("");
    setForgotSuccess("");
    setForgotLoading(false);
  };

  const handleOpenForgot = () => {
    resetForgotState();
    setForgotOpen(true);
  };

  const handleCloseForgot = () => {
    resetForgotState();
    setForgotOpen(false);
  };

  const handleRequestOtp = async () => {
    setForgotError("");
    setForgotSuccess("");
    setForgotLoading(true);
    try {
      const res = await requestAdminForgotPasswordOtp(phone);
      setOtpRequested(true);
      setForgotSuccess(
        res?.data?.devOtp
          ? `OTP sent. Dev OTP: ${res.data.devOtp}`
          : "OTP sent to admin mobile number"
      );
    } catch (err) {
      setForgotError(err?.response?.data?.error || "Failed to send OTP");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setForgotError("");
    setForgotSuccess("");

    if (!otp || otp.length !== 6) {
      setForgotError("Enter valid 6-digit OTP");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setForgotError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError("Confirm password does not match");
      return;
    }

    setForgotLoading(true);
    try {
      await resetAdminPasswordWithOtp(phone, otp, newPassword);
      setForgotSuccess("Password reset successful. You can login now.");
      setPassword("");
      setTimeout(() => handleCloseForgot(), 800);
    } catch (err) {
      setForgotError(err?.response?.data?.error || "Failed to reset password");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await loginUser(phone, password);
      login(res.data);
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
        <Box textAlign="center" mb={3}>
          <Box
            sx={{
              width: 60,
              height: 60,
              borderRadius: 3,
              background: "linear-gradient(135deg, #facc15, #f59e0b)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
              boxShadow: "0 4px 15px rgba(250,204,21,0.4)",
            }}
          >
            <LockOutlinedIcon sx={{ color: "#1e293b", fontSize: 28 }} />
          </Box>
          <Typography variant="h5" fontWeight={700}>
            Billing Software
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            label="Phone Number"
            fullWidth
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            sx={{ mb: 3 }}
            autoComplete="tel"
            inputProps={{ maxLength: 10 }}
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
          {isAdminPhone && (
            <Box sx={{ mb: 2, textAlign: "right" }}>
              <Link component="button" type="button" onClick={handleOpenForgot} underline="hover" sx={{ fontSize: 13 }}>
                Forgot Password (Admin)
              </Link>
            </Box>
          )}

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
            {loading ? "Logging in..." : "Login"}
          </Button>
        </Box>

        <Dialog open={forgotOpen} onClose={handleCloseForgot} fullWidth maxWidth="xs">
          <DialogTitle>Admin Forgot Password</DialogTitle>
          <DialogContent>
            {forgotError && (
              <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
                {forgotError}
              </Alert>
            )}
            {forgotSuccess && (
              <Alert severity="success" sx={{ mb: 2, mt: 1 }}>
                {forgotSuccess}
              </Alert>
            )}
            <TextField
              label="Admin Mobile Number"
              fullWidth
              value={phone}
              sx={{ mt: 1, mb: 2 }}
              inputProps={{ readOnly: true }}
            />
            {otpRequested && (
              <>
                <TextField
                  label="OTP"
                  fullWidth
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="New Password"
                  type="password"
                  fullWidth
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Confirm Password"
                  type="password"
                  fullWidth
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleCloseForgot}>Cancel</Button>
            {!otpRequested ? (
              <Button variant="contained" onClick={handleRequestOtp} disabled={forgotLoading}>
                {forgotLoading ? "Sending..." : "Send OTP"}
              </Button>
            ) : (
              <Button variant="contained" onClick={handleResetPassword} disabled={forgotLoading}>
                {forgotLoading ? "Resetting..." : "Reset Password"}
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Card>
    </Box>
  );
};

export default Login;
