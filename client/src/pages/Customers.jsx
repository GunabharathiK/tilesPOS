import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Card,
  Chip,
  CircularProgress,
  Tabs,
  Tab,
} from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import PaymentsIcon from "@mui/icons-material/Payments";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useLocation } from "react-router-dom";
import CustomerCreate from "../components/customers/CustomerCreate";
import CustomerBill from "../components/customers/CustomerBill";
import CustomerPaymentsDetails from "../components/customers/CustomerPaymentsDetails";
import { getCustomers } from "../services/customerService";
import { getInvoices } from "../services/invoiceService";
import { formatCurrency, groupInvoicesByCustomer } from "../utils/invoiceMetrics";

const heroCardSx = {
  mb: 3,
  p: { xs: 2.5, md: 3 },
  borderRadius: "18px",
  background: "linear-gradient(135deg, #1a56a0 0%, #0f3d7a 100%)",
  color: "#fff",
  boxShadow: "0 18px 40px rgba(15,61,122,0.24)",
};

const StatCard = ({ icon, label, value, accent, iconBg }) => (
  <Box
    sx={{
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: "12px",
      px: 2,
      py: 1.7,
      display: "flex",
      alignItems: "center",
      gap: 1.5,
      minHeight: 98,
      borderTop: `3px solid ${accent}`,
      boxShadow: "0 1px 4px rgba(0,0,0,.05)",
    }}
  >
    <Box
      sx={{
        width: 40,
        height: 40,
        borderRadius: "10px",
        background: iconBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: accent,
        flexShrink: 0,
      }}
    >
      {icon}
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: 11, color: "#718096", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", mb: 0.2 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 20, fontWeight: 800, color: "#1c2333", lineHeight: 1.1, fontFamily: "'Rajdhani', sans-serif" }}>
        {value}
      </Typography>
    </Box>
  </Box>
);

const statusColor = (status) => {
  if (status === "Paid") return "success";
  if (status === "Partial") return "warning";
  return "error";
};

const getCustomerType = (customer = {}) => {
  const raw = customer.customerType || customer.saleType || "Retail Customer";
  if (raw === "Dealer" || raw === "Wholesale") return "Dealer";
  if (raw === "Contractor" || raw === "B2B") return "Contractor";
  if (raw === "Builder / Project") return "Builder / Project";
  return "Retail Customer";
};

const Customers = () => {
  const location = useLocation();
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingTypeTab, setPendingTypeTab] = useState(0);

  const pathParts = location.pathname.split("/").filter(Boolean);
  const active = pathParts[1] || "overview";

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [customerRes, invoiceRes] = await Promise.all([getCustomers(), getInvoices()]);
        setCustomers(Array.isArray(customerRes.data) ? customerRes.data : []);
        setInvoices(Array.isArray(invoiceRes.data) ? invoiceRes.data : []);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const groupedCustomers = useMemo(() => groupInvoicesByCustomer(invoices), [invoices]);

  const totals = useMemo(() => {
    return groupedCustomers.reduce(
      (acc, entry) => {
        acc.amount += entry.totals.amount;
        acc.paid += entry.totals.paid;
        acc.due += entry.totals.due;
        if (entry.status === "Paid") acc.paidCustomers += 1;
        if (entry.status === "Partial") acc.partialCustomers += 1;
        if (entry.status === "Pending") acc.pendingCustomers += 1;
        return acc;
      },
      { amount: 0, paid: 0, due: 0, paidCustomers: 0, partialCustomers: 0, pendingCustomers: 0 }
    );
  }, [groupedCustomers]);

  const fallbackCustomers = useMemo(() => {
    const existingNames = new Set(groupedCustomers.map((entry) => entry.customer.name));
    return customers
      .filter((customer) => !existingNames.has(customer.name))
      .map((customer) => ({
        customer,
        totals: { amount: 0, paid: 0, due: 0 },
        invoiceCount: 0,
        status: customer.status || "Pending",
      }));
  }, [customers, groupedCustomers]);

  const overviewRows = useMemo(() => {
    const computed = groupedCustomers.map((entry) => ({
      key: entry.key,
      customer: entry.customer,
      totals: entry.totals,
      invoiceCount: entry.invoiceCount,
      status: entry.status,
    }));

    return [...computed, ...fallbackCustomers.map((entry) => ({
      key: `${entry.customer.name}|${entry.customer.phone}`,
      customer: entry.customer,
      totals: entry.totals,
      invoiceCount: entry.invoiceCount,
      status: entry.status,
    }))];
  }, [groupedCustomers, fallbackCustomers]);

  const renderOverview = () => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      );
    }

    return (
      <>
        <Card sx={heroCardSx}>
          <Typography sx={{ fontSize: 30, fontWeight: 800, fontFamily: "Rajdhani, sans-serif", lineHeight: 1 }}>
            Customer Dashboard
          </Typography>
          <Typography sx={{ mt: 0.8, fontSize: 13, color: "rgba(255,255,255,0.76)" }}>
            Customer records, billing totals, and collection status in one place
          </Typography>
        </Card>

        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" }, mb: 3 }}>
          <StatCard
            icon={<PeopleIcon fontSize="small" />}
            label="Total Customers"
            value={overviewRows.length}
            accent="#2563eb"
            iconBg="#eff6ff"
          />
          <StatCard
            icon={<PaymentsIcon fontSize="small" />}
            label="Collected"
            value={`Rs. ${formatCurrency(totals.paid)}`}
            accent="#15803d"
            iconBg="#f0fdf4"
          />
          <StatCard
            icon={<HourglassBottomIcon fontSize="small" />}
            label="Outstanding"
            value={`Rs. ${formatCurrency(totals.due)}`}
            accent="#b45309"
            iconBg="#fffbeb"
          />
          <StatCard
            icon={<ReceiptLongIcon fontSize="small" />}
            label="Active Bills"
            value={invoices.length}
            accent="#7c3aed"
            iconBg="#f5f3ff"
          />
        </Box>

        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 2fr) minmax(0, 1fr)" }, alignItems: "stretch" }}>
          <Card sx={{ borderRadius: "16px", border: "1px solid #dbe5f0", overflow: "hidden", boxShadow: "0 8px 24px rgba(15,35,60,0.06)" }}>
            <Box sx={{ p: 2.5, background: "#fafcfe", borderBottom: "1px solid #e2e8f0" }}>
              <Typography sx={{ fontSize: 16, fontWeight: 800, color: "#1c2333" }}>Pending Payments</Typography>
              <Typography sx={{ fontSize: 12, color: "#718096", mt: 0.4 }}>
                Filter pending by customer type
              </Typography>
            </Box>

            <Box sx={{ px: 1.4, pt: 0.8, borderBottom: "1px solid #e2e8f0", background: "#fff" }}>
              <Tabs
                value={pendingTypeTab}
                onChange={(_, val) => setPendingTypeTab(val)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ minHeight: 40, "& .MuiTab-root": { textTransform: "none", minHeight: 40, fontSize: 12, fontWeight: 700 } }}
              >
                {["All", "Retail Customer", "Dealer", "Contractor", "Builder / Project"].map((type) => (
                  <Tab key={type} label={type} />
                ))}
              </Tabs>
            </Box>

            <Box sx={{ p: 1.6, display: "flex", flexDirection: "column", gap: 1, maxHeight: 420, overflowY: "auto" }}>
              {overviewRows
                .filter((row) => Number(row.totals.due || 0) > 0)
                .filter((row) => {
                  const type = getCustomerType(row.customer);
                  const selected = ["All", "Retail Customer", "Dealer", "Contractor", "Builder / Project"][pendingTypeTab];
                  return selected === "All" ? true : type === selected;
                })
                .sort((a, b) => Number(b.totals.due || 0) - Number(a.totals.due || 0))
                .slice(0, 12)
                .map((row) => (
                  <Box
                    key={row.key}
                    sx={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      px: 1.2,
                      py: 1,
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#1c2333", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {row.customer.name || "-"}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: "#718096" }}>
                        {getCustomerType(row.customer)} | Bills: {row.invoiceCount}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "right" }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 800, color: "#c0392b", fontFamily: "'Rajdhani', sans-serif" }}>
                        Rs. {formatCurrency(row.totals.due)}
                      </Typography>
                      <Chip size="small" label={row.status} color={statusColor(row.status)} sx={{ mt: 0.2 }} />
                    </Box>
                  </Box>
                ))}

              {overviewRows
                .filter((row) => Number(row.totals.due || 0) > 0)
                .filter((row) => {
                  const type = getCustomerType(row.customer);
                  const selected = ["All", "Retail Customer", "Dealer", "Contractor", "Builder / Project"][pendingTypeTab];
                  return selected === "All" ? true : type === selected;
                }).length === 0 && (
                <Typography sx={{ py: 8, textAlign: "center", color: "#718096", fontSize: 13 }}>
                  No pending customers in this type
                </Typography>
              )}
            </Box>
          </Card>

          <Card sx={{ borderRadius: "16px", border: "1px solid #dbe5f0", overflow: "hidden", boxShadow: "0 8px 24px rgba(15,35,60,0.06)" }}>
            <Box sx={{ p: 2.5, background: "#fafcfe", borderBottom: "1px solid #e2e8f0" }}>
              <Typography sx={{ fontSize: 16, fontWeight: 800, color: "#1c2333" }}>Customer Type Payments</Typography>
              <Typography sx={{ fontSize: 12, color: "#718096", mt: 0.4 }}>
                Paid vs due grouped by customer type
              </Typography>
            </Box>
            <Box sx={{ p: 1.4 }}>
              {overviewRows.length === 0 ? (
                <Typography sx={{ py: 6, textAlign: "center", color: "#718096", fontSize: 13 }}>
                  No customer records found
                </Typography>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={["Retail Customer", "Dealer", "Contractor", "Builder / Project"].map((type) => {
                      const rows = overviewRows.filter((row) => getCustomerType(row.customer) === type);
                      return {
                        name: type === "Builder / Project" ? "Builder" : type.split(" ")[0],
                        Paid: rows.reduce((sum, row) => sum + Number(row.totals.paid || 0), 0),
                        Due: rows.reduce((sum, row) => sum + Number(row.totals.due || 0), 0),
                      };
                    })}
                    margin={{ top: 6, right: 8, left: 0, bottom: 0 }}
                    barSize={20}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => (v > 999 ? `${Math.round(v / 1000)}k` : v)} axisLine={false} tickLine={false} width={36} />
                    <Tooltip formatter={(val) => `Rs. ${formatCurrency(val)}`} />
                    <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
                    <Bar dataKey="Paid" fill="#1a7a4a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Due" fill="#c0392b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Box>
          </Card>
        </Box>
      </>
    );
  };

  const renderContent = () => {
    if (active === "overview") return renderOverview();
    if (active === "create") return <CustomerCreate />;
    if (active === "bill") return <CustomerBill />;
    if (active === "payments") return <CustomerPaymentsDetails />;
    return null;
  };

  return <Box p={0}>{renderContent()}</Box>;
};

export default Customers;
