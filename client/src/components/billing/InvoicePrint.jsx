import { Box, Typography } from "@mui/material";

const InvoicePrint = ({ data }) => {
  const {
    customer,
    items = [],
    invoiceNo,
    date,
    company = "Renix Software",
    tax = 0,
    discount = 0,
  } = data || {};

  const customerName = typeof customer === "object" ? customer?.name : customer;
  const customerPhone = customer?.phone || "";
  const customerAddress = customer?.address || "";
  const customerDistrict = customer?.district || "";
  const customerState = customer?.state || "";
  const customerPincode = customer?.pincode || "";

  const format = JSON.parse(localStorage.getItem("billFormat")) || {};

  const subtotal = items.reduce((acc, i) => acc + (Number(i.total) || 0), 0);
  const taxAmount = (subtotal * tax) / 100;
  const discountAmount = (subtotal * discount) / 100;
  const final = subtotal + taxAmount - discountAmount;

  return (
    <Box sx={{
      width: "794px",
      minHeight: "1123px",
      margin: "auto",
      background: "#fff",
      padding: "40px",
      boxShadow: "0 0 10px rgba(0,0,0,0.1)",
      fontFamily: "Arial, sans-serif",
    }}>

      {/* HEADER */}
      <Box sx={{
        background: "#facc15", p: 2,
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      }}>
        <Box>
          <Typography fontWeight="bold" fontSize={13} mb={0.5}>Bill To</Typography>
          <Typography fontWeight="bold">{customerName}</Typography>
          {customerPhone && <Typography fontSize={13}>📞 {customerPhone}</Typography>}
          {customerAddress && <Typography fontSize={13}>{customerAddress}</Typography>}
          {(customerDistrict || customerState || customerPincode) && (
            <Typography fontSize={13}>
              {[customerDistrict, customerState, customerPincode].filter(Boolean).join(", ")}
            </Typography>
          )}
        </Box>

        <Box textAlign="right">
          {format.showLogo && format.logo && (
            <img src={format.logo} alt="logo" style={{ height: 50, marginBottom: 5 }} />
          )}
          <Typography fontWeight="bold">{format.shopName || company}</Typography>
          {format.address && <Typography fontSize={13}>{format.address}</Typography>}
          {format.showGST && format.gst && <Typography fontSize={13}>GST: {format.gst}</Typography>}
        </Box>
      </Box>

      {/* TITLE */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
        <Typography variant="h4" fontWeight="bold">INVOICE</Typography>
        <Box textAlign="right">
          <Typography>Invoice No: {invoiceNo}</Typography>
          <Typography>Date: {date?.split(" ")[0]}</Typography>
          <Typography>Time: {date?.split(" ").slice(1).join(" ")}</Typography>
        </Box>
      </Box>

      {/* TABLE HEADER — Code | Item | Qty | Size | UOM | Price | Total */}
      <Box sx={{
        display: "grid",
        gridTemplateColumns: "0.3fr 0.8fr 2fr 0.6fr 0.8fr 0.8fr 1fr 1.2fr",
        mt: 4, borderBottom: "2px solid black", pb: 1,
        fontWeight: "bold", fontSize: 13,
      }}>
        <span>#</span>
        <span>Code</span>
        <span>Item</span>
        <span>Qty</span>
        <span>Size</span>
        <span>UOM</span>
        <span>Price</span>
        <span>Total</span>
      </Box>

      {/* ITEMS */}
      {items.map((item, index) => (
        <Box key={index} sx={{
          display: "grid",
          gridTemplateColumns: "0.3fr 0.8fr 2fr 0.6fr 0.8fr 0.8fr 1fr 1.2fr",
          py: 1, borderBottom: "1px solid #e5e7eb", fontSize: 13,
        }}>
          <span>{index + 1}</span>
          <span style={{ color: "#15803d", fontWeight: 600 }}>{item.code ? item.code.toUpperCase() : "—"}</span>
          <span>{item.name}</span>
          <span>{item.quantity}</span>
          <span>{item.size || "—"}</span>
          <span>{item.uom || "—"}</span>
          <span>₹{item.price}</span>
          <span>₹{Number(item.total).toFixed(2)}</span>
        </Box>
      ))}

      {/* TOTALS */}
      <Box sx={{ mt: 4, textAlign: "right" }}>
        <Typography>Subtotal: ₹{subtotal.toFixed(2)}</Typography>
        <Typography>Tax ({tax}%): ₹{taxAmount.toFixed(2)}</Typography>
        <Typography>Discount ({discount}%): ₹{discountAmount.toFixed(2)}</Typography>
        <Typography variant="h6" fontWeight="bold" mt={1}>
          Grand Total: ₹{final.toFixed(2)}
        </Typography>
      </Box>

      {/* FOOTER */}
      <Box mt={6} textAlign="center">
        <Typography>{format.footer || "Thank you for your business!"}</Typography>
      </Box>
    </Box>
  );
};

export default InvoicePrint;
