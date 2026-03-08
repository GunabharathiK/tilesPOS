import API from "./api";

export const loginUser = (phone, password) =>
  API.post("/auth/login", { phone, password });

export const registerUser = (data) =>
  API.post("/auth/register", data);

export const getMe = () =>
  API.get("/auth/me");
