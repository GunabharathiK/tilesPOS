import { Box, Typography } from "@mui/material";
import SupplierDetails from "../components/supplier/SupplierDetails";

const SupplierProductDetails = () => {
  return (
    <Box sx={{ p: 3, background: "#f0f4f8", minHeight: "100vh" }}>
      <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#1c2333", fontFamily: "'Rajdhani', sans-serif", mb: 0.3 }}>
        Supplier Product Details
      </Typography>
      <Typography sx={{ fontSize: 12, color: "#718096", mb: 1.6 }}>
        View all suppliers with products, purchase totals, and actions.
      </Typography>

      <SupplierDetails />
    </Box>
  );
};

export default SupplierProductDetails;
