import { useEffect, useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useLocation } from "react-router-dom";
import {
  getSuppliers,
  getPurchases,
  updatePurchasePayment,
} from "../../services/supplierService";
import toast from "react-hot-toast";

const T = {
  primary: "#1a56a0",
  primaryDark: "#0f3d7a",
  primaryLight: "#e8f0fb",
  success: "#1a7a4a",
  successLight: "#e8f5ee",
  danger: "#c0392b",
  dark: "#1c2333",
  text: "#2d3748",
  muted: "#718096",
  border: "#e2e8f0",
  bg: "#f0f4f8",
  white: "#fff",
};

const inp = (extra = {}) => ({
  padding: "9px 12px",
  border: `1.5px solid ${T.border}`,
  borderRadius: "6px",
  fontFamily: "'Noto Sans', sans-serif",
  fontSize: 13,
  color: T.text,
  background: T.white,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  transition: "border-color .15s, box-shadow .15s",
  ...extra,
});

const onFocus = (e) => {
  e.target.style.borderColor = T.primary;
  e.target.style.boxShadow = "0 0 0 3px rgba(26,86,160,.08)";
};

const onBlur = (e) => {
  e.target.style.borderColor = T.border;
  e.target.style.boxShadow = "none";
};

const Lbl = ({ children, req }) => (
  <Box
    component="label"
    sx={{
      display: "block",
      fontSize: 11,
      fontWeight: 700,
      color: T.muted,
      textTransform: "uppercase",
      letterSpacing: ".6px",
      mb: "6px",
      fontFamily: "'Noto Sans', sans-serif",
    }}
  >
    {children}
    {req && <Box component="span" sx={{ color: T.danger }}> *</Box>}
  </Box>
);

const genSPAY = () => `SPAY-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, "0")}`;
const todayStr = () => new Date().toISOString().split("T")[0];
const fmt = (n = 0) => Number(n).toLocaleString("en-IN");
const fmtDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime())
    ? d
    : `${String(dt.getDate()).padStart(2, "0")}-${String(dt.getMonth() + 1).padStart(2, "0")}-${dt.getFullYear()}`;
};

const PAYMENT_MODES = [
  "Cash",
  "NEFT / Online Transfer",
  "Cheque",
  "UPI",
  "Card",
];

const normalizePaymentMode = (mode) => (
  mode === "NEFT / Online Transfer" ? "Net Banking" : mode
);

const SupplierPayment = () => {
  const location = useLocation();
  const preselectedSupplier = location.state?.supplier || null;
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [supplierId, setSupplierId] = useState(location.state?.supplierId || "");
  const [spayNo] = useState(genSPAY);
  const [payDate, setPayDate] = useState(todayStr());
  const [amountPaying, setAmountPaying] = useState("");
  const [paymentMode, setPaymentMode] = useState("NEFT / Online Transfer");
  const [txnRef, setTxnRef] = useState("");
  const [selectedGRNs, setSelectedGRNs] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    const [sRes, pRes] = await Promise.all([getSuppliers(), getPurchases()]);
    setSuppliers(Array.isArray(sRes.data) ? sRes.data : []);
    setPurchases(Array.isArray(pRes.data) ? pRes.data : []);
  };

  useEffect(() => {
    loadData().catch(() => toast.error("Failed to load data"));
  }, []);

  const selectedSupplier =
    suppliers.find((supplier) => supplier._id === supplierId) || preselectedSupplier;

  const livePurchases = useMemo(
    () => purchases.filter((purchase) => !purchase.isDraft),
    [purchases]
  );

  const payablePurchases = useMemo(
    () => livePurchases.filter((p) => Number(p.totalDue || 0) > 0),
    [livePurchases]
  );

  const supplierPurchases = useMemo(
    () =>
      payablePurchases.filter((p) => {
        const pid = p.supplierId?._id || p.supplierId;
        return pid === supplierId && p.paymentStatus !== "Paid";
      }),
    [payablePurchases, supplierId]
  );

  const totalOutstanding = supplierPurchases.reduce((sum, purchase) => sum + Number(purchase.totalDue || 0), 0);

  const supplierSummary = useMemo(
    () =>
      suppliers
        .map((supplier) => {
          const rows = livePurchases.filter((p) => {
            const pid = p.supplierId?._id || p.supplierId;
            return pid === supplier._id;
          });
          const due = rows.reduce((sum, row) => sum + Number(row.totalDue || 0), 0);
          const paid = rows.reduce((sum, row) => sum + Number(row.totalPaid || 0), 0);
          return { ...supplier, due, paid, cleared: due <= 0 && paid > 0 };
        })
        .sort((a, b) => b.due - a.due),
    [livePurchases, suppliers]
  );

  const activeTargets = selectedGRNs.length > 0
    ? supplierPurchases.filter((purchase) => selectedGRNs.includes(purchase._id))
    : supplierPurchases;

  const activeTargetDue = activeTargets.reduce((sum, purchase) => sum + Number(purchase.totalDue || 0), 0);

  const toggleGRN = (id) => {
    setSelectedGRNs((prev) => (
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    ));
  };

  const quickSet = (value) => {
    const max = activeTargetDue || totalOutstanding;
    setAmountPaying(String(max > 0 ? Math.min(value, max) : value));
  };

  const resetForm = () => {
    setSupplierId("");
    setAmountPaying("");
    setPaymentMode("");
    setTxnRef("");
    setSelectedGRNs([]);
    setRemarks("");
    setPayDate("");
  };

  const handleRecord = async () => {
    if (!supplierId) {
      toast.error("Please select a supplier");
      return;
    }
    if (!amountPaying || Number(amountPaying) <= 0) {
      toast.error("Enter a valid amount to pay");
      return;
    }
    if (!paymentMode) {
      toast.error("Select a payment mode");
      return;
    }
    if (activeTargets.length === 0) {
      toast.error("No pending invoices available for payment");
      return;
    }
    if (Number(amountPaying) > activeTargetDue) {
      toast.error(`Amount exceeds selected due of Rs.${fmt(activeTargetDue)}`);
      return;
    }

    setSaving(true);
    try {
      let remaining = Number(amountPaying);

      for (const purchase of activeTargets) {
        if (remaining <= 0) break;

        const due = Number(purchase.totalDue || 0);
        const paying = Math.min(remaining, due);
        const payable = Number(purchase.finalPayable || purchase.grandTotal || purchase.totalInvoiceAmount || 0);
        const newPaid = Number(purchase.totalPaid || 0) + paying;
        remaining -= paying;

        await updatePurchasePayment(purchase._id, {
          totalPaid: newPaid,
          finalPayable: payable,
          paymentMode: normalizePaymentMode(paymentMode),
          paymentType: newPaid >= payable ? "Full Payment" : "Partial",
          paymentDate: payDate,
          referenceNo: txnRef,
          remarks,
        });
      }

      toast.success("Payment recorded successfully");
      await loadData();
      resetForm();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Payment failed");
    } finally {
      setSaving(false);
    }
  };

  const handleAdvice = () => {
    const supplier = suppliers.find((item) => item._id === supplierId);
    if (!supplier) {
      toast.error("Select a supplier first");
      return;
    }

    const lines = activeTargets
      .map((purchase) => `${purchase.grnNo || purchase.invoiceNo} - Rs.${fmt(purchase.totalDue || 0)}`)
      .join(", ");

    const popup = window.open("", "_blank");
    if (!popup) return;

    popup.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Payment Advice</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#1f2937}h2{color:#1a56a0;margin:0 0 16px}.row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e5e7eb}.muted{color:#64748b}.amt{font-weight:700;color:#15803d}</style></head><body><h2>Payment Advice</h2><div class="row"><span class="muted">Supplier</span><span>${supplier.companyName || supplier.name}</span></div><div class="row"><span class="muted">Payment Date</span><span>${fmtDate(payDate)}</span></div><div class="row"><span class="muted">Payment Mode</span><span>${paymentMode}</span></div><div class="row"><span class="muted">Reference No.</span><span>${txnRef || "-"}</span></div><div class="row"><span class="muted">Against Invoice(s)</span><span>${lines || "-"}</span></div><div class="row"><span class="muted">Remarks</span><span>${remarks || "-"}</span></div><div class="row"><span class="muted">Amount Paying</span><span class="amt">Rs.${fmt(amountPaying || 0)}</span></div></body></html>`);
    popup.document.close();
    popup.focus();
  };

  const selStyle = { ...inp(), cursor: "pointer", appearance: "auto" };

  return (
    <Box sx={{ fontFamily: "'Noto Sans', sans-serif", background: T.bg, minHeight: "100%", p: 0 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 2, alignItems: "start" }}>
        <Box
          sx={{
            background: T.white,
            borderRadius: "10px",
            border: `1px solid ${T.border}`,
            boxShadow: "0 1px 4px rgba(0,0,0,.05)",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              px: 2.5,
              py: 1.8,
              borderBottom: `1px solid ${T.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: T.dark, display: "flex", alignItems: "center", gap: 1 }}>
              <Box component="span" sx={{ fontSize: 16 }}>Pay</Box>
              Pay to Supplier
            </Typography>
            <Box sx={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700, color: T.primary, letterSpacing: "1px" }}>
              {spayNo}
            </Box>
          </Box>

          <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: "18px" }}>
            {selectedSupplier && (
              <Box sx={{ p: 2, border: `1px solid ${T.border}`, borderRadius: "8px", background: "#fafbfc", display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: ".5px", mb: 0.4 }}>
                    Supplier
                  </Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: T.dark }}>
                    {selectedSupplier.companyName || selectedSupplier.name}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: ".5px", mb: 0.4 }}>
                    Contact
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: T.text }}>
                    {selectedSupplier.companyPhone || selectedSupplier.phone || "-"}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: ".5px", mb: 0.4 }}>
                    Bank
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: T.text }}>
                    {selectedSupplier.bankName || "-"}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: ".5px", mb: 0.4 }}>
                    Recommended Ref
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: T.text }}>
                    {selectedSupplier.accountNo ? `A/C ${selectedSupplier.accountNo}` : selectedSupplier.upiId || "-"}
                  </Typography>
                </Box>
              </Box>
            )}
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <Box>
                <Lbl req>Select Supplier</Lbl>
                <select
                  style={selStyle}
                  value={supplierId}
                  onChange={(e) => {
                    setSupplierId(e.target.value);
                    setSelectedGRNs([]);
                    setAmountPaying("");
                  }}
                  onFocus={onFocus}
                  onBlur={onBlur}
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier._id} value={supplier._id}>
                      {supplier.companyName || supplier.name}
                    </option>
                  ))}
                </select>
              </Box>
              <Box>
                <Lbl>Payment Date</Lbl>
                <input
                  type="date"
                  style={inp()}
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </Box>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <Box>
                <Lbl>Total Outstanding (Rs)</Lbl>
                <Box
                  sx={{
                    ...inp(),
                    background: "#f0f4f8",
                    cursor: "default",
                    display: "flex",
                    alignItems: "center",
                    fontFamily: "'Rajdhani', sans-serif",
                    fontWeight: 700,
                    fontSize: 15,
                    color: totalOutstanding > 0 ? T.danger : T.success,
                  }}
                >
                  {supplierId ? `Rs.${fmt(totalOutstanding)}` : <Box sx={{ color: T.muted, fontSize: 13, fontWeight: 400 }}>Select a supplier</Box>}
                </Box>
              </Box>

              <Box>
                <Lbl req>Amount Paying (Rs)</Lbl>
                <input
                  type="number"
                  min={0}
                  style={inp()}
                  placeholder="0"
                  value={amountPaying}
                  onChange={(e) => setAmountPaying(e.target.value)}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />

                <Box sx={{ display: "flex", gap: 0.8, mt: 1, flexWrap: "wrap" }}>
                  {[
                    { label: "10K", val: 10000 },
                    { label: "50K", val: 50000 },
                    { label: "1L", val: 100000 },
                    { label: "2L", val: 200000 },
                    { label: "Full", val: activeTargetDue || totalOutstanding },
                  ].map(({ label, val }) => (
                    <Box
                      key={label}
                      onClick={() => quickSet(val)}
                      sx={{
                        px: 1.4,
                        py: 0.4,
                        borderRadius: "5px",
                        cursor: "pointer",
                        border: `1.5px solid ${T.border}`,
                        background: T.white,
                        fontSize: 12,
                        fontWeight: 600,
                        color: T.text,
                        fontFamily: "'Noto Sans', sans-serif",
                        "&:hover": { borderColor: T.primary, color: T.primary, background: T.primaryLight },
                        transition: "all .13s",
                      }}
                    >
                      {label}
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <Box>
                <Lbl req>Payment Mode</Lbl>
                <select
                  style={selStyle}
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  onFocus={onFocus}
                  onBlur={onBlur}
                >
                  {PAYMENT_MODES.map((mode) => <option key={mode}>{mode}</option>)}
                </select>
              </Box>
              <Box>
                <Lbl>Transaction / Cheque Ref No.</Lbl>
                <input
                  style={inp()}
                  placeholder="UTR no. / Cheque no."
                  value={txnRef}
                  onChange={(e) => setTxnRef(e.target.value)}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </Box>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <Box>
                <Lbl>Against Invoice(s)</Lbl>
                {supplierPurchases.length > 0 ? (
                  <Box sx={{ border: `1.5px solid ${T.border}`, borderRadius: "6px", overflow: "hidden", background: T.white }}>
                    {supplierPurchases.map((purchase, index) => {
                      const isSelected = selectedGRNs.includes(purchase._id);
                      return (
                        <Box
                          key={purchase._id}
                          onClick={() => toggleGRN(purchase._id)}
                          sx={{
                            px: 1.5,
                            py: 1,
                            background: isSelected ? "#dbeafe" : index % 2 === 0 ? T.white : "#fafbfc",
                            cursor: "pointer",
                            borderBottom: index < supplierPurchases.length - 1 ? `1px solid ${T.border}` : "none",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            "&:hover": { background: isSelected ? "#bfdbfe" : T.primaryLight },
                            transition: "background .13s",
                          }}
                        >
                          <Typography sx={{ fontSize: 13, fontFamily: "'DM Mono', monospace", color: T.dark }}>
                            {purchase.grnNo || purchase.invoiceNo}
                          </Typography>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.danger, fontFamily: "'Rajdhani', sans-serif" }}>
                            Rs.{fmt(purchase.totalDue)}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                ) : (
                  <Box sx={{ ...inp(), background: "#f8fafc", color: T.muted, display: "flex", alignItems: "center", minHeight: 80, justifyContent: "center", fontSize: 12 }}>
                    {supplierId ? "No pending invoices" : "Select a supplier first"}
                  </Box>
                )}
                {selectedGRNs.length > 0 && (
                  <Box sx={{ fontSize: 11, color: T.muted, mt: 0.5 }}>
                    {selectedGRNs.length} invoice{selectedGRNs.length > 1 ? "s" : ""} selected
                  </Box>
                )}
              </Box>

              <Box>
                <Lbl>Remarks</Lbl>
                <textarea
                  style={{ ...inp(), minHeight: 100, resize: "vertical", fontFamily: "'Noto Sans', sans-serif" }}
                  placeholder={`e.g. Part payment for ${supplierPurchases[0]?.grnNo || "GRN-2026-0016"}`}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </Box>
            </Box>

            <Box sx={{ display: "flex", gap: 1.2, pt: 0.5 }}>
              <Box
                onClick={() => !saving && handleRecord()}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  px: 2.5,
                  py: 1.2,
                  borderRadius: "7px",
                  cursor: saving ? "default" : "pointer",
                  background: T.success,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "'Noto Sans', sans-serif",
                  opacity: saving ? 0.75 : 1,
                  "&:hover": !saving ? { background: "#146038", boxShadow: "0 4px 12px rgba(26,122,74,.3)" } : {},
                  transition: "all .17s",
                }}
              >
                {saving ? "Recording..." : "Record Payment"}
              </Box>

              <Box
                onClick={handleAdvice}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  px: 2,
                  py: 1.2,
                  borderRadius: "7px",
                  cursor: "pointer",
                  background: T.white,
                  color: T.text,
                  fontSize: 13,
                  fontWeight: 600,
                  border: `1.5px solid ${T.border}`,
                  fontFamily: "'Noto Sans', sans-serif",
                  "&:hover": { borderColor: T.primary, color: T.primary, background: T.primaryLight },
                  transition: "all .17s",
                }}
              >
                Payment Advice
              </Box>
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            background: T.white,
            borderRadius: "10px",
            border: `1px solid ${T.border}`,
            boxShadow: "0 1px 4px rgba(0,0,0,.05)",
            overflow: "hidden",
          }}
        >
          <Box sx={{ px: 2.5, py: 1.8, borderBottom: `1px solid ${T.border}` }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: T.dark }}>
              Supplier Payable Summary
            </Typography>
          </Box>

          <Box sx={{ p: 0 }}>
            {supplierSummary.length === 0 ? (
              <Box sx={{ p: 3, textAlign: "center", color: T.muted, fontSize: 13 }}>
                No suppliers found
              </Box>
            ) : (
              supplierSummary.map((supplier, index) => {
                const isActive = supplier._id === supplierId;
                const cleared = supplier.due <= 0 && supplier.paid > 0;
                const loc = [supplier.city, supplier.state].filter(Boolean).join(", ");
                const terms = supplier.paymentTerms || "30 days";

                return (
                  <Box
                    key={supplier._id}
                    onClick={() => {
                      setSupplierId(supplier._id);
                      setSelectedGRNs([]);
                      setAmountPaying("");
                    }}
                    sx={{
                      px: 2.5,
                      py: 1.8,
                      borderBottom: index < supplierSummary.length - 1 ? `1px solid ${T.border}` : "none",
                      cursor: "pointer",
                      background: isActive ? T.primaryLight : T.white,
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      "&:hover": { background: isActive ? T.primaryLight : "#f8fafc" },
                      transition: "background .13s",
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: T.dark, fontFamily: "'Noto Sans', sans-serif" }}>
                        {supplier.companyName || supplier.name}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: T.muted, mt: 0.3 }}>
                        {loc && `${loc} · `}Terms: {terms}
                      </Typography>
                    </Box>

                    <Box sx={{ textAlign: "right", flexShrink: 0, ml: 2 }}>
                      <Typography sx={{ fontSize: 15, fontWeight: 800, fontFamily: "'Rajdhani', sans-serif", color: cleared ? T.success : supplier.due > 0 ? T.danger : T.muted }}>
                        Rs.{fmt(supplier.due)}
                      </Typography>
                      <Typography sx={{ fontSize: 11, fontWeight: 600, color: cleared ? T.success : supplier.due > 0 ? T.danger : T.muted, mt: 0.2 }}>
                        {cleared ? "Cleared" : supplier.due > 0 ? "Due" : "-"}
                      </Typography>
                    </Box>
                  </Box>
                );
              })
            )}
          </Box>

          {supplierSummary.length > 0 && (
            <Box sx={{ px: 2.5, py: 1.5, borderTop: `2px solid ${T.border}`, background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: T.muted }}>
                Total Payable
              </Typography>
              <Typography sx={{ fontSize: 16, fontWeight: 800, color: T.danger, fontFamily: "'Rajdhani', sans-serif" }}>
                Rs.{fmt(supplierSummary.reduce((sum, item) => sum + Number(item.due || 0), 0))}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default SupplierPayment;
