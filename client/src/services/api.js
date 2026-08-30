import axios from "axios";

const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  if (typeof window !== "undefined" && window.location.protocol === "file:") {
    return "http://127.0.0.1:5000/api";
  }

  return "http://127.0.0.1:5000/api";
};

const API = axios.create({
  baseURL: getBaseUrl(),
});

export default API;
