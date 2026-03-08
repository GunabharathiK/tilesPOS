import API from "./api";

export const loginUser = (phone, password) =>
  API.post("/auth/login", { phone, password });

export const registerUser = (data) =>
  API.post("/auth/register", data);

export const getMe = () =>
  API.get("/auth/me");

export const requestAdminForgotPasswordOtp = (phone) =>
  API.post("/auth/admin/forgot-password/request-otp", { phone });

export const resetAdminPasswordWithOtp = (phone, otp, newPassword) =>
  API.post("/auth/admin/forgot-password/reset", { phone, otp, newPassword });
