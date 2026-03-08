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
    charges = {},
    notes = "",
    payment = {},
    status = "Pending",
    documentType,
  } = data || {};

  const isQuotation =
    documentType === "quotation" || String(invoiceNo || "").toUpperCase().startsWith("QTN");

  const customerName = typeof customer === "object" ? customer?.name : customer;
  const customerPhone = customer?.phone || "";
  const customerAddress = customer?.address || "";
  const customerGstin = customer?.gstin || "";
  const customerType =
    customer?.customerType ||
    customer?.saleType ||
    data?.customerType ||
    data?.saleType ||
    "Retail Customer";
  const isBusinessCustomer = customerType !== "Retail Customer";

  // Bank details — resolve from customer, dealerDetails, or businessMeta
  const customerBankAccountNo =
    customer?.bankAccountNo ||
    customer?.dealerDetails?.bankAccountNo ||
    data?.businessMeta?.bankAccountNo ||
    "";
  const customerIfscCode =
    customer?.ifscCode ||
    customer?.dealerDetails?.ifscCode ||
    data?.businessMeta?.ifscCode ||
    "";
  const customerAccountHolder =
    customer?.accountHolder ||
    customer?.dealerDetails?.ownerName ||
    data?.businessMeta?.accountHolder ||
    "";
  const hasBankDetails = isBusinessCustomer && (customerBankAccountNo || customerIfscCode || customerAccountHolder);

  // Read from shopSettings (saved by Settings.jsx)
  const shopSettings = (() => {
    try { return JSON.parse(localStorage.getItem("shopSettings")) || {}; } catch { return {}; }
  })();

  const shopName    = shopSettings.shopName    || company;
  const shopAddress = shopSettings.address     || "";
  const shopPhone   = shopSettings.phone       || "";
  const shopEmail   = shopSettings.email       || "";
  const shopGstin   = shopSettings.gstNumber   || "";
  const shopLogo    = shopSettings.logo        || "";
  const shopUpi     = shopSettings.upiId       || "";
  const shopBank    = shopSettings.bankName    || "";
  const shopAccount = shopSettings.accountNumber || "";
  const shopTerms   = shopSettings.termsAndConditions || "";
  const shopFooter  = "Thank you for your business!";

  const baseAmount = items.reduce((acc, i) => acc + Number(i.quantity || 0) * Number(i.price || 0), 0);
  const totalItems = items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
  const itemGstAmount = items.reduce((acc, i) => acc + Number(i.gstAmount || 0), 0);
  const itemDiscountAmount = items.reduce((acc, i) => acc + Number(i.discountAmount || 0), 0);
  const subTotal = baseAmount + itemGstAmount - itemDiscountAmount;
  const transportAmount = Number(charges?.transport || 0);
  const flatDiscountAmount = Number(charges?.extraDiscount || 0);
  const useFlatCharges = transportAmount !== 0 || flatDiscountAmount !== 0;
  const taxableBase = useFlatCharges ? Math.max(0, subTotal - flatDiscountAmount + transportAmount) : subTotal;
  const extraGstAmount = (taxableBase * Number(tax || 0)) / 100;
  const extraDiscountAmount = useFlatCharges ? flatDiscountAmount : (subTotal * Number(discount || 0)) / 100;
  const final = useFlatCharges ? taxableBase + extraGstAmount : subTotal + extraGstAmount - extraDiscountAmount;

  const paidAmountRaw = Number(payment?.paidAmount);
  const dueAmountRaw = Number(payment?.dueAmount);
  const paidAmount = Number.isFinite(paidAmountRaw) ? paidAmountRaw : ((status || "").toLowerCase() === "paid" ? final : 0);
  const pendingAmount = Number.isFinite(dueAmountRaw) ? dueAmountRaw : Math.max(0, final - paidAmount);

  const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const statusColor =
    (status || "").toLowerCase() === "paid" ? "#166534" :
    (status || "").toLowerCase() === "partial" ? "#92400e" : "#991b1b";
  const statusBg =
    (status || "").toLowerCase() === "paid" ? "#dcfce7" :
    (status || "").toLowerCase() === "partial" ? "#fef9c3" : "#fee2e2";

  const dateStr = date?.split(" ")[0] || "";
  const timeStr = date?.split(" ").slice(1).join(" ") || "";

  const COL_HEADER = {
    fontSize: 11,
    fontWeight: 700,
    color: "#fff",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    py: "10px",
    px: "8px",
    whiteSpace: "nowrap",
  };

  const COL_CELL = {
    fontSize: 12.5,
    py: "9px",
    px: "8px",
    color: "#1e293b",
    borderBottom: "1px solid #f1f5f9",
  };

  return (
    <Box
      sx={{
        width: "794px",
        minHeight: "1123px",
        margin: "auto",
        background: "#fff",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ── Accent strip top ── */}
      <Box sx={{ height: 6, background: "linear-gradient(90deg, #0f172a 0%, #1a56a0 60%, #facc15 100%)" }} />

      {/* ── Header ── */}
      <Box
        sx={{
          px: 5,
          pt: 3.5,
          pb: 3,
          display: "grid",
          gridTemplateColumns: "1fr auto",
          alignItems: "flex-start",
          gap: 2,
        }}
      >
        {/* Left: company info */}
        <Box>
          {shopLogo && (
            <img src={shopLogo} alt="logo" style={{ height: 52, marginBottom: 8, objectFit: "contain" }} />
          )}
          <Typography sx={{ fontSize: 22, fontWeight: 800, color: "#0f172a", lineHeight: 1, letterSpacing: "-0.02em" }}>
            {shopName}
          </Typography>
          {shopAddress && (
            <Typography sx={{ fontSize: 12, color: "#64748b", mt: 0.4, maxWidth: 300, lineHeight: 1.5 }}>
              {shopAddress}
            </Typography>
          )}
          {shopPhone && (
            <Typography sx={{ fontSize: 12, color: "#475569", mt: 0.3 }}>
              📞 {shopPhone}{shopEmail ? `  ·  ${shopEmail}` : ""}
            </Typography>
          )}
          {shopGstin && (
            <Typography sx={{ fontSize: 12, color: "#475569", mt: 0.3 }}>
              <Box component="span" sx={{ fontWeight: 700 }}>GSTIN: </Box>
              <Box component="span" sx={{ fontFamily: "monospace" }}>{shopGstin}</Box>
            </Typography>
          )}
        </Box>

        {/* Right: document type + invoice meta */}
        <Box sx={{ textAlign: "right" }}>
          <Box
            sx={{
              display: "inline-block",
              px: 2.5,
              py: 1,
              borderRadius: "8px",
              background: isQuotation ? "#fffbeb" : "#eff6ff",
              border: isQuotation ? "2px solid #facc15" : "2px solid #1a56a0",
              mb: 1.5,
            }}
          >
            <Typography
              sx={{
                fontSize: 18,
                fontWeight: 900,
                color: isQuotation ? "#92400e" : "#1a56a0",
                letterSpacing: "0.12em",
              }}
            >
              {isQuotation ? "QUOTATION" : "INVOICE"}
            </Typography>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: "auto auto", gap: "3px 12px", justifyContent: "end" }}>
            {[
              [isQuotation ? "Quotation No" : "Invoice No", invoiceNo],
              ["Date", dateStr],
              ...(timeStr ? [["Time", timeStr]] : []),
            ].map(([label, val]) => (
              <>
                <Typography key={`l-${label}`} sx={{ fontSize: 12, color: "#94a3b8", textAlign: "right", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {label}
                </Typography>
                <Typography key={`v-${label}`} sx={{ fontSize: 12, fontWeight: 700, color: "#0f172a", textAlign: "right" }}>
                  {val || "—"}
                </Typography>
              </>
            ))}
          </Box>
        </Box>
      </Box>

      {/* ── Bill To / Ship To banner ── */}
      <Box sx={{ mx: 5, mb: 3, borderRadius: "10px", overflow: "hidden", border: "1px solid #e2eaf4" }}>
        <Box sx={{ px: 2, py: 0.8, background: "#0f172a" }}>
          <Typography sx={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Bill To
          </Typography>
        </Box>
        <Box sx={{ px: 2.5, py: 1.8, background: "#f8fafc", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
          {/* Left: name, phone, address */}
          <Box>
            <Typography sx={{ fontSize: 16, fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>
              {customerName || "—"}
            </Typography>
            {customerPhone && (
              <Typography sx={{ fontSize: 12.5, color: "#475569", mt: 0.5 }}>
                📞 {customerPhone}
              </Typography>
            )}
            {customerAddress && (
              <Typography sx={{ fontSize: 12, color: "#64748b", mt: 0.4, lineHeight: 1.5 }}>
                {customerAddress}
              </Typography>
            )}
            {isBusinessCustomer && customerType && (
              <Box
                sx={{
                  mt: 0.8,
                  display: "inline-flex",
                  alignItems: "center",
                  px: 1.2,
                  py: 0.3,
                  borderRadius: "6px",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                }}
              >
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: "#1a56a0", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {customerType}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Right: GSTIN + bank details (business customers only) */}
          <Box sx={{ textAlign: "right" }}>
            {customerGstin && (
              <Box sx={{ mb: hasBankDetails ? 1.5 : 0 }}>
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  GSTIN
                </Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#0f172a", fontFamily: "monospace", mt: 0.3 }}>
                  {customerGstin}
                </Typography>
              </Box>
            )}

            {hasBankDetails && (
              <Box
                sx={{
                  p: 1.2,
                  borderRadius: "8px",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  textAlign: "right",
                }}
              >
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: "#166534", textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.6 }}>
                  Bank Details
                </Typography>
                {customerAccountHolder && (
                  <Typography sx={{ fontSize: 11.5, color: "#166534", fontWeight: 600 }}>
                    {customerAccountHolder}
                  </Typography>
                )}
                {customerBankAccountNo && (
                  <Typography sx={{ fontSize: 11.5, color: "#334155", fontFamily: "monospace", mt: 0.3 }}>
                    A/C: {customerBankAccountNo}
                  </Typography>
                )}
                {customerIfscCode && (
                  <Typography sx={{ fontSize: 11.5, color: "#334155", fontFamily: "monospace", mt: 0.2 }}>
                    IFSC: {customerIfscCode}
                  </Typography>
                )}
              </Box>
            )}

            {/* Fallback: no GSTIN and no bank details for retail */}
            {!customerGstin && !hasBankDetails && (
              <Typography sx={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>
                Retail Customer
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      {/* ── Items Table ── */}
      <Box sx={{ mx: 5, mb: 3, borderRadius: "10px", overflow: "hidden", border: "1px solid #e2eaf4" }}>
        <Box
          component="table"
          sx={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}
        >
          <Box component="thead">
            <Box component="tr" sx={{ background: "#0f172a" }}>
              {[
                { label: "#", w: "4%", align: "left" },
                { label: "Code", w: "8%", align: "left" },
                { label: "Product Name", w: "16%", align: "left" },
                { label: "Category", w: "10%", align: "left" },
                { label: "Finish", w: "10%", align: "left" },
                { label: "Qty", w: "6%", align: "right" },
                { label: "Size", w: "7%", align: "center" },
                { label: "UOM", w: "7%", align: "center" },
                { label: "Price", w: "10%", align: "right" },
                { label: "GST%", w: "7%", align: "right" },
                { label: "Disc%", w: "6%", align: "right" },
                { label: "Total", w: "9%", align: "right" },
              ].map((col) => (
                <Box
                  component="th"
                  key={col.label}
                  sx={{ ...COL_HEADER, width: col.w, textAlign: col.align }}
                >
                  {col.label}
                </Box>
              ))}
            </Box>
          </Box>

          <Box component="tbody">
            {items.map((item, idx) => (
              <Box
                component="tr"
                key={idx}
                sx={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc" }}
              >
                <Box component="td" sx={{ ...COL_CELL, color: "#94a3b8" }}>{idx + 1}</Box>
                <Box component="td" sx={{ ...COL_CELL, color: "#0891b2", fontWeight: 700, fontFamily: "monospace", fontSize: 11 }}>
                  {item.code ? item.code.toUpperCase() : "—"}
                </Box>
                <Box component="td" sx={{ ...COL_CELL, fontWeight: 600 }}>{item.name || "—"}</Box>
                <Box component="td" sx={{ ...COL_CELL, color: "#64748b" }}>{item.category || "—"}</Box>
                <Box component="td" sx={{ ...COL_CELL, color: "#64748b" }}>{item.finish || "—"}</Box>
                <Box component="td" sx={{ ...COL_CELL, textAlign: "right", fontWeight: 700 }}>{item.quantity || 0}</Box>
                <Box component="td" sx={{ ...COL_CELL, textAlign: "center", color: "#64748b" }}>{item.size || "—"}</Box>
                <Box component="td" sx={{ ...COL_CELL, textAlign: "center", color: "#64748b" }}>{item.uom || "—"}</Box>
                <Box component="td" sx={{ ...COL_CELL, textAlign: "right" }}>₹{fmt(item.price)}</Box>
                <Box component="td" sx={{ ...COL_CELL, textAlign: "right", color: "#64748b" }}>{Number(item.gst || 0)}%</Box>
                <Box component="td" sx={{ ...COL_CELL, textAlign: "right", color: "#64748b" }}>{Number(item.discount || 0)}%</Box>
                <Box component="td" sx={{ ...COL_CELL, textAlign: "right", fontWeight: 700, color: "#0f172a" }}>
                  ₹{fmt(item.total)}
                </Box>
              </Box>
            ))}

            {/* Empty state */}
            {items.length === 0 && (
              <Box component="tr">
                <Box component="td" colSpan={12} sx={{ py: 3, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                  No items
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* ── Summary + Signatures ── */}
      <Box sx={{ mx: 5, mb: 4, display: "grid", gridTemplateColumns: "1fr 300px", gap: 3, alignItems: "flex-start" }}>

        {/* Left: notes + signatures */}
        <Box>
          {notes && (
            <Box sx={{ mb: 2.5, p: 2, borderRadius: "8px", background: "#fffbeb", border: "1px solid #fde68a" }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.06em", mb: 0.5 }}>
                Notes
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: "#78350f", lineHeight: 1.6 }}>{notes}</Typography>
            </Box>
          )}

          {/* Signature boxes */}
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2, mt: notes ? 0 : 2 }}>
            {["Company Seal", "Salesman Sign", "Manager Sign"].map((label) => (
              <Box key={label} sx={{ textAlign: "center" }}>
                <Box
                  sx={{
                    height: 60,
                    border: "1.5px dashed #cbd5e1",
                    borderRadius: "8px",
                    background: "#f8fafc",
                    mb: 1,
                  }}
                />
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Right: totals */}
        <Box sx={{ borderRadius: "10px", overflow: "hidden", border: "1px solid #e2eaf4" }}>
          {/* Summary rows */}
          {[
            { label: "Total Items", value: totalItems, mono: false },
            { label: "Base Amount", value: `₹${fmt(baseAmount)}`, mono: true },
            ...(itemGstAmount > 0 ? [{ label: "Item GST", value: `₹${fmt(itemGstAmount)}`, mono: true }] : []),
            ...(itemDiscountAmount > 0 ? [{ label: "Item Discount", value: `−₹${fmt(itemDiscountAmount)}`, mono: true, red: true }] : []),
            ...(useFlatCharges && transportAmount > 0 ? [{ label: "Transport", value: `₹${fmt(transportAmount)}`, mono: true }] : []),
            ...(extraGstAmount > 0 ? [{ label: `GST (${Number(tax) || 0}%)`, value: `₹${fmt(extraGstAmount)}`, mono: true }] : []),
            ...(extraDiscountAmount > 0 ? [{ label: useFlatCharges ? "Extra Discount" : `Discount (${Number(discount) || 0}%)`, value: `−₹${fmt(extraDiscountAmount)}`, mono: true, red: true }] : []),
          ].map((row, i) => (
            <Box
              key={row.label}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                px: 2,
                py: 0.9,
                background: i % 2 === 0 ? "#f8fafc" : "#fff",
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              <Typography sx={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{row.label}</Typography>
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: row.red ? "#dc2626" : "#0f172a", fontFamily: row.mono ? "monospace" : "inherit" }}>
                {row.value}
              </Typography>
            </Box>
          ))}

          {/* Final amount */}
          <Box sx={{ px: 2, py: 1.4, background: "#0f172a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Final Amount
            </Typography>
            <Typography sx={{ fontSize: 17, fontWeight: 900, color: "#facc15", fontFamily: "monospace" }}>
              ₹{fmt(final)}
            </Typography>
          </Box>

          {/* Payment rows (invoice only) */}
          {!isQuotation && (
            <>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 2, py: 0.9, background: "#f0fdf4", borderBottom: "1px solid #bbf7d0" }}>
                <Typography sx={{ fontSize: 12, color: "#166534", fontWeight: 600 }}>Paid Amount</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#166534", fontFamily: "monospace" }}>₹{fmt(paidAmount)}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 2, py: 0.9, background: pendingAmount > 0 ? "#fff7f7" : "#f0fdf4", borderBottom: "1px solid #fecaca" }}>
                <Typography sx={{ fontSize: 12, color: pendingAmount > 0 ? "#991b1b" : "#166534", fontWeight: 600 }}>
                  {pendingAmount > 0 ? "Amount Due" : "Balance Due"}
                </Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 800, color: pendingAmount > 0 ? "#dc2626" : "#166534", fontFamily: "monospace" }}>
                  ₹{fmt(pendingAmount)}
                </Typography>
              </Box>
              <Box sx={{ px: 2, py: 1, display: "flex", justifyContent: "space-between", alignItems: "center", background: statusBg }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: statusColor, textTransform: "uppercase", letterSpacing: "0.06em" }}>Status</Typography>
                <Box sx={{ px: 1.5, py: 0.3, borderRadius: "6px", background: "#fff", border: `1.5px solid ${statusColor}` }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 800, color: statusColor, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {status || "Pending"}
                  </Typography>
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Box>

      {/* ── Footer ── */}
      <Box sx={{ mx: 5, mb: 2, pt: 2, borderTop: "1px solid #e2eaf4" }}>
        {/* Terms & conditions */}
        {shopTerms && (
          <Box sx={{ mb: 1.5, p: 1.5, borderRadius: "7px", background: "#f8fafc", border: "1px solid #e2eaf4" }}>
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.5 }}>
              Terms & Conditions
            </Typography>
            <Typography sx={{ fontSize: 11, color: "#64748b", lineHeight: 1.6 }}>
              {shopTerms}
            </Typography>
          </Box>
        )}

        {/* Shop bank + UPI row */}
        {(shopBank || shopAccount || shopUpi) && (
          <Box sx={{ mb: 1.5, display: "flex", gap: 3, flexWrap: "wrap" }}>
            {(shopBank || shopAccount) && (
              <Box>
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Bank
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: "#334155", fontWeight: 600 }}>{shopBank}</Typography>
                {shopAccount && (
                  <Typography sx={{ fontSize: 11.5, color: "#334155", fontFamily: "monospace" }}>
                    A/C: {shopAccount}
                  </Typography>
                )}
              </Box>
            )}
            {shopUpi && (
              <Box>
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  UPI
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: "#334155", fontFamily: "monospace" }}>{shopUpi}</Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Bottom bar */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography sx={{ fontSize: 11, color: "#94a3b8" }}>
            {shopName}{shopAddress ? ` · ${shopAddress}` : ""}
          </Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#64748b", fontStyle: "italic" }}>
            {shopFooter}
          </Typography>
        </Box>
      </Box>

      {/* ── Bottom accent ── */}
      <Box sx={{ height: 4, background: "linear-gradient(90deg, #facc15 0%, #1a56a0 50%, #0f172a 100%)" }} />
    </Box>
  );
};

export default InvoicePrint;
