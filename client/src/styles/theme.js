import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#2e7d32",
    },
    background: {
      default: "#f5f7fa",
    },
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: "Roboto, sans-serif",
  },
  components: {
    MuiInputBase: {
      styleOverrides: {
        input: {
          fontSize: 13,
          "&::placeholder": {
            fontSize: 11,
            opacity: 1,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          "& .MuiInputBase-input": {
            lineHeight: 1.25,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          verticalAlign: "middle",
        },
        head: {
          fontWeight: 700,
        },
      },
    },
  },
});

export default theme;
