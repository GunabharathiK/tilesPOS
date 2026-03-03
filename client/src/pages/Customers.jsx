import { useEffect, useState } from "react";
import { getCustomers } from "../services/customerService";
import { Card, Typography, Box } from "@mui/material";

const Customers = () => {
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const res = await getCustomers();
    setCustomers(res.data);
  };

  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="h6">Customers</Typography>

      {customers.map((c) => (
        <Box key={c._id} sx={{ mt: 2 }}>
          <Typography><b>{c.name}</b></Typography>
          <Typography>Total Spent: ₹{c.totalSpent}</Typography>
        </Box>
      ))}
    </Card>
  );
};

export default Customers;