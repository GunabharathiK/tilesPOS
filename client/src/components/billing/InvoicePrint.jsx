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
    payment = {},
    status = "Pending",
  } = data || {};

  const customerName = typeof customer === "object" ? customer?.name : customer;
  const customerPhone = customer?.phone || "";
  const customerAddress = customer?.address || "";
  const customerBankName = customer?.bankName || "";
  const customerBranch = customer?.branch || "";
  const customerAccountHolder = customer?.accountHolder || "";
  const customerAccountNo = customer?.accountNo || "";
  const customerIfscCode = customer?.ifscCode || "";
  const customerUpiId = customer?.upiId || "";

  const hasBankDetails =
    customerBankName || customerAccountNo || customerIfscCode || customerUpiId || customerBranch || customerAccountHolder;

  const format = JSON.parse(localStorage.getItem("billFormat")) || {};

  const baseAmount = items.reduce((acc, i) => acc + Number(i.quantity || 0) * Number(i.price || 0), 0);
  const totalItems = items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
  const itemGstAmount = items.reduce((acc, i) => acc + Number(i.gstAmount || 0), 0);
  const itemDiscountAmount = items.reduce((acc, i) => acc + Number(i.discountAmount || 0), 0);
  const subTotal = baseAmount + itemGstAmount - itemDiscountAmount;
  const extraGstAmount = (subTotal * Number(tax || 0)) / 100;
  const extraDiscountAmount = (subTotal * Number(discount || 0)) / 100;
  const final = subTotal + extraGstAmount - extraDiscountAmount;

  const paidAmountRaw = Number(payment?.paidAmount);
  const dueAmountRaw = Number(payment?.dueAmount);
  const paidAmount = Number.isFinite(paidAmountRaw)
    ? paidAmountRaw
    : ((status || "").toLowerCase() === "paid" ? final : 0);
  const pendingAmount = Number.isFinite(dueAmountRaw)
    ? dueAmountRaw
    : Math.max(0, final - paidAmount);

  return (
    <Box
      sx={{
        width: "794px",
        minHeight: "1123px",
        margin: "auto",
        background: "#fff",
        padding: "40px",
        boxShadow: "0 0 10px rgba(0,0,0,0.1)",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <Typography variant="h3" fontWeight="bold" sx={{ lineHeight: 1, mb: 2.2 }}>
        INVOICE
      </Typography>

      <Box
        sx={{
          background: "#facc15",
          px: 2.6,
          py: 2.4,
          display: "grid",
          gridTemplateColumns: "1.7fr 1fr",
          alignItems: "start",
          columnGap: 2.2,
        }}
      >
        <Box sx={{ pr: 1.6 }}>
          <Typography fontWeight="bold" fontSize={14} mb={0.7}>
            Bill To
          </Typography>
          <Typography fontWeight="bold" fontSize={16}>{customerName}</Typography>
          {customerPhone && (
            <Typography fontSize={14} sx={{ mt: 0.35, lineHeight: 1.35 }}>Phone: {customerPhone}</Typography>
          )}
          {customerAddress && (
            <Typography fontSize={14} sx={{ mt: 0.2, lineHeight: 1.35 }}>{customerAddress}</Typography>
          )}
        </Box>

        <Box textAlign="right" sx={{ pl: 0.8 }}>
          {format.showLogo && format.logo && (
            <img src={format.logo} alt="logo" style={{ height: 50, marginBottom: 5 }} />
          )}
          <Typography fontWeight="bold" fontSize={16}>{format.shopName || company}</Typography>
          {format.address && (
            <Typography fontSize={14} sx={{ mt: 0.2, lineHeight: 1.35 }}>{format.address}</Typography>
          )}
          {format.showGST && format.gst && (
            <Typography fontSize={14} sx={{ mt: 0.2 }}>GST: {format.gst}</Typography>
          )}
        </Box>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1.5, alignItems: "flex-start" }}>
        <Box>
          {hasBankDetails && (
            <Box sx={{ mt: 0.2 }}>
              <Typography fontWeight={700} fontSize={14} mb={0.35}>Bank Details</Typography>
              {customerBankName && <Typography fontSize={13}>Bank: {customerBankName}</Typography>}
              {customerBranch && <Typography fontSize={13}>Branch: {customerBranch}</Typography>}
              {customerAccountHolder && <Typography fontSize={13}>A/C Name: {customerAccountHolder}</Typography>}
              {customerAccountNo && <Typography fontSize={13}>A/C No: {customerAccountNo}</Typography>}
              {customerIfscCode && <Typography fontSize={13}>IFSC: {customerIfscCode}</Typography>}
              {customerUpiId && <Typography fontSize={13}>UPI: {customerUpiId}</Typography>}
            </Box>
          )}
        </Box>
        <Box textAlign="right">
          <Typography>Invoice No: {invoiceNo}</Typography>
          <Typography>Date: {date?.split(" ")[0]}</Typography>
          <Typography>Time: {date?.split(" ").slice(1).join(" ")}</Typography>
        </Box>
      </Box>

      <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", mt: 4, tableLayout: "fixed", fontSize: 13 }}>
        <Box component="thead">
          <Box component="tr" sx={{ borderBottom: "2px solid #111827" }}>
            <Box component="th" sx={{ width: "4%", textAlign: "left", pb: 1 }}>#</Box>
            <Box component="th" sx={{ width: "8%", textAlign: "left", pb: 1 }}>Code</Box>
            <Box component="th" sx={{ width: "18%", textAlign: "left", pb: 1 }}>Name</Box>
            <Box component="th" sx={{ width: "14%", textAlign: "left", pb: 1 }}>Color/Design</Box>
            <Box component="th" sx={{ width: "7%", textAlign: "right", pb: 1 }}>Qty</Box>
            <Box component="th" sx={{ width: "8%", textAlign: "center", pb: 1 }}>Size</Box>
            <Box component="th" sx={{ width: "8%", textAlign: "center", pb: 1 }}>UOM</Box>
            <Box component="th" sx={{ width: "11%", textAlign: "right", pb: 1 }}>Price</Box>
            <Box component="th" sx={{ width: "7%", textAlign: "right", pb: 1 }}>GST%</Box>
            <Box component="th" sx={{ width: "7%", textAlign: "right", pb: 1 }}>Disc%</Box>
            <Box component="th" sx={{ width: "12%", textAlign: "right", pb: 1 }}>Total</Box>
          </Box>
        </Box>
        <Box component="tbody">
          {items.map((item, index) => (
            <Box component="tr" key={index} sx={{ borderBottom: "1px solid #e5e7eb" }}>
              <Box component="td" sx={{ py: 1 }}>{index + 1}</Box>
              <Box component="td" sx={{ py: 1, color: "#15803d", fontWeight: 600 }}>
                {item.code ? item.code.toUpperCase() : "-"}
              </Box>
              <Box component="td" sx={{ py: 1 }}>{item.name || "-"}</Box>
              <Box component="td" sx={{ py: 1 }}>{item.colorDesign || "-"}</Box>
              <Box component="td" sx={{ py: 1, textAlign: "right" }}>{item.quantity || 0}</Box>
              <Box component="td" sx={{ py: 1, textAlign: "center" }}>{item.size || "-"}</Box>
              <Box component="td" sx={{ py: 1, textAlign: "center" }}>{item.uom || "-"}</Box>
              <Box component="td" sx={{ py: 1, textAlign: "right" }}>Rs.{Number(item.price || 0).toFixed(2)}</Box>
              <Box component="td" sx={{ py: 1, textAlign: "right" }}>{Number(item.gst || 0)}%</Box>
              <Box component="td" sx={{ py: 1, textAlign: "right" }}>{Number(item.discount || 0)}%</Box>
              <Box component="td" sx={{ py: 1, textAlign: "right" }}>Rs.{Number(item.total || 0).toFixed(2)}</Box>
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{ mt: 4, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 3 }}>
        <Box sx={{ width: 320, pt: 0.5 }}>
          <Typography fontWeight={700} mb={3}>Company Seal</Typography>
          <Box sx={{ height: 70 }} />
          <Box sx={{ borderBottom: "1px dashed #9ca3af" }} />

          <Typography fontWeight={700} mt={4} mb={1.5}>Salesman Sign</Typography>
          <Box sx={{ borderBottom: "1px solid #9ca3af", mt: 2 }} />

          <Typography fontWeight={700} mt={4} mb={1.5}>Manager Sign</Typography>
          <Box sx={{ borderBottom: "1px solid #9ca3af", mt: 2 }} />
        </Box>

        <Box sx={{ width: 360 }}>
          <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: 15 }}>
            <Box component="tbody">
              {[
                ["Total Items", totalItems],
                ["Total Initial Amount", `Rs.${baseAmount.toFixed(2)}`],
                [`Overall GST (${Number(tax) || 0}%)`, `Rs.${extraGstAmount.toFixed(2)}`],
                [`Overall Discount (${Number(discount) || 0}%)`, `Rs.${extraDiscountAmount.toFixed(2)}`],
                ["Final Amount", `Rs.${final.toFixed(2)}`],
                ["Paid Amount", `Rs.${paidAmount.toFixed(2)}`],
                ["Pending Amount", `Rs.${pendingAmount.toFixed(2)}`],
                ["Status", status || "Pending"],
              ].map(([label, value]) => (
                <Box component="tr" key={label} sx={{ borderBottom: "1px dashed #e2e8f0" }}>
                  <Box component="td" sx={{ py: 0.7, color: "text.secondary" }}>{label}</Box>
                  <Box component="td" sx={{ py: 0.7, textAlign: "right", fontWeight: 700 }}>{value}</Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>

      <Box mt={6} textAlign="center">
        <Typography>{format.footer || "Thank you for your business!"}</Typography>
      </Box>
    </Box>
  );
};

export default InvoicePrint;
