import API from "./api";

export const loginUser = (email, password) =>
  API.post("/auth/login", { email, password });

export const registerUser = (data) =>
  API.post("/auth/register", data);

export const getMe = () =>
  API.get("/auth/me");
