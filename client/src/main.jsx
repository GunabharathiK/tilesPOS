import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "./styles/theme";
import { Toaster } from "react-hot-toast";

ReactDOM.createRoot(document.getElementById("root")).render(
  <ThemeProvider theme={theme}>
  <CssBaseline />
  <App />
  <Toaster
  position="top-right"
  toastOptions={{
    style: {
      borderRadius: "10px",
      background: "#333",
      color: "#fff",
    },
  }}
/>
</ThemeProvider>
);