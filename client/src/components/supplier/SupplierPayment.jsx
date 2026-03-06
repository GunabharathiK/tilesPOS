import {
  Box, Card, Typography, TextField, Button, Grid, Divider,
  IconButton, Chip, Table, TableHead, TableBody,
  TableRow, TableCell, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Menu, MenuItem, Collapse, Avatar,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon   from "@mui/icons-material/KeyboardArrowUp";
import DeleteIcon         from "@mui/icons-material/Delete";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import CreditCardIcon     from "@mui/icons-material/CreditCard";
import PhoneAndroidIcon   from "@mui/icons-material/PhoneAndroid";
import MoneyIcon          from "@mui/icons-material/Money";
import BusinessIcon       from "@mui/icons-material/Business";
import PersonIcon         from "@mui/icons-material/Person";
import FileDownloadIcon   from "@mui/icons-material/FileDownload";
import PictureAsPdfIcon   from "@mui/icons-material/PictureAsPdf";
import TableChartIcon     from "@mui/icons-material/TableChart";
import DescriptionIcon    from "@mui/icons-material/Description";
import ImageIcon          from "@mui/icons-material/Image";
import CheckCircleIcon    from "@mui/icons-material/CheckCircle";
import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate }    from "react-router-dom";
import {
  getSuppliers, getPurchases,
  updatePurchasePayment, deletePurchase,
} from "../../services/supplierService";
import toast from "react-hot-toast";

const fmt     = (n = 0) => Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const fmtDate = (d)     => d ? new Date(d).toLocaleDateString("en-IN") : "—";
const listColorDesigns = (purchase) => {
  const vals = [...new Set((purchase?.products || []).map((x) => (x?.colorDesign || "").trim()).filter(Boolean))];
  return vals.length ? vals.join(", ") : "—";
};

const PAYMENT_MODES = [
  { label: "Cash",        icon: <MoneyIcon />,         color: "#059669" },
  { label: "Card",        icon: <CreditCardIcon />,     color: "#2563eb" },
  { label: "UPI",         icon: <PhoneAndroidIcon />,   color: "#7c3aed" },
  { label: "Net Banking", icon: <AccountBalanceIcon />, color: "#d97706" },
];

const buildExportData = (purchase, supplier) => ({
  "Invoice No":    purchase.invoiceNo || "",
  "Invoice Date":  fmtDate(purchase.invoiceDate),
  "Company":       supplier?.companyName || supplier?.name || purchase.supplierName || "",
  "Phone":         supplier?.companyPhone || supplier?.phone || "",
  "Grand Total":   `Rs.${fmt(purchase.grandTotal)}`,
  "Final Payable": `Rs.${fmt(purchase.finalPayable || purchase.grandTotal)}`,
  "Total Paid":    `Rs.${fmt(purchase.totalPaid)}`,
  "Amount Due":    `Rs.${fmt(purchase.totalDue)}`,
  "Status":        purchase.paymentStatus || "",
});
const exportToPDF = (data, name) => {
  const rows = Object.entries(data).map(([k, v]) =>
    `<tr><td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#64748b;width:45%">${k}</td><td style="padding:6px 12px;border-bottom:1px solid #e2e8f0">${v}</td></tr>`).join("");
  const w = window.open("", "_blank");
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${name}</title><style>body{font-family:Arial,sans-serif;padding:32px}h2{color:#1d4ed8}table{width:100%;border-collapse:collapse;border:1px solid #e2e8f0}</style></head><body><h2>Payment - ${name}</h2><table>${rows}</table></body></html>`);
  w.document.close(); w.onload = () => { w.print(); w.close(); };
};
const exportToExcel = (data, name) => {
  const rows = Object.entries(data).map(([k, v]) => `<tr><td><b>${k}</b></td><td>${v}</td></tr>`).join("");
  const blob = new Blob([`<html><body><table>${rows}</table></body></html>`], { type: "application/vnd.ms-excel" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${name}.xls`; a.click();
};
const exportToWord = (data, name) => {
  const rows = Object.entries(data).map(([k, v]) => `<p><b>${k}:</b> ${v}</p>`).join("");
  const blob = new Blob([`<html><body>${rows}</body></html>`], { type: "application/msword" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${name}.doc`; a.click();
};
const exportToImage = async (data, name) => {
  const canvas = document.createElement("canvas");
  canvas.width = 600; canvas.height = 60 + Object.keys(data).length * 36 + 40;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#1d4ed8"; ctx.font = "bold 18px Arial"; ctx.fillText(`Payment - ${name}`, 24, 40);
  Object.entries(data).forEach(([k, v], i) => {
    const y = 60 + i * 36 + 24;
    if (i % 2 === 0) { ctx.fillStyle = "#f8fafc"; ctx.fillRect(0, y - 20, canvas.width, 36); }
    ctx.fillStyle = "#64748b"; ctx.font = "bold 13px Arial"; ctx.fillText(k, 24, y);
    ctx.fillStyle = "#1e293b"; ctx.font = "13px Arial"; ctx.fillText(String(v), 280, y);
  });
  const a = document.createElement("a"); a.download = `${name}.png`; a.href = canvas.toDataURL("image/png"); a.click();
};

const ExportMenu = ({ purchase, supplier }) => {
  const [anchor, setAnchor] = useState(null);
  const name = `${supplier?.companyName || purchase.supplierName || "supplier"}_${purchase.invoiceNo || "inv"}`;
  const data = buildExportData(purchase, supplier);
  return (
    <>
      <Button size="small" variant="outlined" startIcon={<FileDownloadIcon />}
        onClick={(e) => { e.stopPropagation(); setAnchor(e.currentTarget); }}>Export</Button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} PaperProps={{ sx: { borderRadius: 2 } }}>
        {[
          { label: "PDF",   icon: <PictureAsPdfIcon fontSize="small" sx={{ color: "#dc2626" }} />, fn: () => exportToPDF(data, name) },
          { label: "Excel", icon: <TableChartIcon   fontSize="small" sx={{ color: "#15803d" }} />, fn: () => exportToExcel(data, name) },
          { label: "Word",  icon: <DescriptionIcon  fontSize="small" sx={{ color: "#2563eb" }} />, fn: () => exportToWord(data, name) },
          { label: "Image", icon: <ImageIcon        fontSize="small" sx={{ color: "#7c3aed" }} />, fn: () => exportToImage(data, name) },
        ].map((o) => (
          <MenuItem key={o.label} onClick={() => { o.fn(); setAnchor(null); }} sx={{ gap: 1.5, fontSize: 13 }}>
            {o.icon} Export as {o.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

// ── Payment Dialog ────────────────────────────────────────────
const PaymentDialog = ({ purchase, supplier, open, onClose, onSaved }) => {
  const [paymentType,   setPaymentType]   = useState("Full Payment");
  const [paymentMode,   setPaymentMode]   = useState("Cash");
  const [partialAmt,    setPartialAmt]    = useState("");
  const [amtError,      setAmtError]      = useState("");
  const [discPctInput,  setDiscPctInput]  = useState("");
  const [gstPctInput,   setGstPctInput]   = useState("");
  const [confirmedDisc, setConfirmedDisc] = useState(0);
  const [confirmedGst,  setConfirmedGst]  = useState(0);
  const [loading,       setLoading]       = useState(false);
  const [done,          setDone]          = useState(false);

  const grandTotal  = Number(purchase?.grandTotal || 0);
  const alreadyPaid = Number(purchase?.totalPaid  ?? 0);
  const extraDiscAmt = grandTotal * confirmedDisc / 100;
  const afterDisc    = grandTotal - extraDiscAmt;
  const extraGstAmt  = afterDisc  * confirmedGst  / 100;
  const finalPayable = afterDisc  + extraGstAmt;
  const remaining    = Math.max(0, finalPayable - alreadyPaid);
  const fullPayAmt   = remaining;
  const amountToPay  = paymentType === "Full Payment" ? fullPayAmt : paymentType === "Pending" ? 0 : Number(partialAmt) || 0;

  useEffect(() => {
    if (!purchase || !open) return;
    setPaymentType(purchase.paymentType || "Full Payment");
    setPaymentMode(purchase.paymentMode || "Cash");
    setPartialAmt(""); setAmtError("");
    setDiscPctInput(purchase.extraDiscountPct ? String(purchase.extraDiscountPct) : "");
    setGstPctInput(purchase.extraGstPct ? String(purchase.extraGstPct) : "");
    setConfirmedDisc(purchase.extraDiscountPct || 0);
    setConfirmedGst(purchase.extraGstPct || 0);
    setDone(false);
  }, [purchase?._id, open]);

  useEffect(() => {
    if (paymentType !== "Partial") { setAmtError(""); return; }
    const v = Number(partialAmt) || 0;
    if (v <= 0) setAmtError("Amount must be greater than 0");
    else if (v >= fullPayAmt) setAmtError(`Must be less than Rs.${fmt(fullPayAmt)}`);
    else setAmtError("");
  }, [partialAmt, paymentType, fullPayAmt]);

  const handleConfirmDiscGst = () => {
    setConfirmedDisc(Math.min(100, Math.max(0, Number(discPctInput) || 0)));
    setConfirmedGst(Math.min(100,  Math.max(0, Number(gstPctInput)  || 0)));
    toast.success("GST & Discount applied");
  };

  const handleDone = async () => {
    if (done) return;
    if (paymentType === "Partial" && (amtError || !partialAmt)) { toast.error(amtError || "Enter partial amount"); return; }
    const paying = paymentType === "Pending" ? 0 : paymentType === "Full Payment" ? remaining : Number(partialAmt);
    const newTotalPaid = alreadyPaid + paying;
    const newStatus = paymentType === "Pending" ? "Pending" : newTotalPaid >= finalPayable ? "Paid" : "Partial";
    setLoading(true); setDone(true);
    try {
      await updatePurchasePayment(purchase._id, {
        totalPaid: newTotalPaid, paymentStatus: newStatus,
        paymentMode: paymentType === "Pending" ? "" : paymentMode, paymentType,
        extraDiscountPct: confirmedDisc, extraDiscountAmt: extraDiscAmt,
        extraGstPct: confirmedGst, extraGstAmt, finalPayable,
      });
      toast.success("Payment saved");
      onSaved(); onClose();
    } catch { toast.error("Failed to save payment"); setDone(false); }
    finally { setLoading(false); }
  };

  if (!purchase) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ pb: 1, borderBottom: "1px solid #e2e8f0" }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography fontWeight={700} fontSize={20}>Payment — Invoice #{purchase.invoiceNo}</Typography>
            <Typography variant="body2" color="text.secondary">
              {supplier?.companyName || purchase.supplierName} · {fmtDate(purchase.invoiceDate)}
            </Typography>
          </Box>
          <ExportMenu purchase={purchase} supplier={supplier} />
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ display: "flex", overflowX: "auto", minHeight: 420 }}>
          {/* COL 1 */}
          <Box sx={{ minWidth: 210, p: 2, borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 1.5 }}>
            {supplier && (<>
              <Box sx={{ background: "#f8fafc", borderRadius: 2, p: 1.5, border: "1px solid #e2e8f0" }}>
                <Box display="flex" alignItems="center" gap={0.8} mb={1}>
                  <BusinessIcon sx={{ fontSize: 13, color: "#2563eb" }} />
                  <Typography fontSize={10} fontWeight={700} color="text.secondary">COMPANY</Typography>
                </Box>
                {[["Company",supplier.companyName||supplier.name],["Phone",supplier.companyPhone||supplier.phone],["Email",supplier.companyEmail],["GSTIN",supplier.gstin],["Address",supplier.companyAddress||supplier.address]].filter(([,v])=>v).map(([k,v])=>(
                  <Box key={k} display="flex" gap={1} mb={0.4}><Typography fontSize={10} color="text.secondary" minWidth={50}>{k}:</Typography><Typography fontSize={11} fontWeight={500} sx={{ wordBreak:"break-word" }}>{v}</Typography></Box>
                ))}
              </Box>
              <Box sx={{ background: "#f8fafc", borderRadius: 2, p: 1.5, border: "1px solid #e2e8f0" }}>
                <Box display="flex" alignItems="center" gap={0.8} mb={1}>
                  <PersonIcon sx={{ fontSize: 13, color: "#7c3aed" }} />
                  <Typography fontSize={10} fontWeight={700} color="text.secondary">SUPPLIER</Typography>
                </Box>
                {[
                  ["Name",  supplier.supplierName || (supplier.name !== supplier.companyName ? supplier.name : null)],
                  ["Phone", supplier.supplierPhone || null],
                ].filter(([,v])=>v).map(([k,v])=>(
                  <Box key={k} display="flex" gap={1} mb={0.4}><Typography fontSize={10} color="text.secondary" minWidth={40}>{k}:</Typography><Typography fontSize={11} fontWeight={500}>{v}</Typography></Box>
                ))}
              </Box>
              {(supplier.accountNo||supplier.upiId) && (
                <Box sx={{ background: "#f8fafc", borderRadius: 2, p: 1.5, border: "1px solid #e2e8f0" }}>
                  <Box display="flex" alignItems="center" gap={0.8} mb={1}>
                    <AccountBalanceIcon sx={{ fontSize: 13, color: "#d97706" }} />
                    <Typography fontSize={10} fontWeight={700} color="text.secondary">BANK</Typography>
                  </Box>
                  {[["A/C",supplier.accountNo],["IFSC",supplier.ifscCode],["UPI",supplier.upiId],["Bank",supplier.bankName],["Branch",supplier.branch],["Holder",supplier.accountHolder]].filter(([,v])=>v).map(([k,v])=>(
                    <Box key={k} display="flex" gap={1} mb={0.4}><Typography fontSize={10} color="text.secondary" minWidth={44}>{k}:</Typography><Typography fontSize={11} fontWeight={500} sx={{ wordBreak:"break-word" }}>{v}</Typography></Box>
                  ))}
                </Box>
              )}
            </>)}
          </Box>
          {/* COL 2 */}
          <Box sx={{ minWidth: 280, p: 2, borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Box sx={{ background: "#eff6ff", borderRadius: 2, p: 2, border: "1px solid #bfdbfe" }}>
              <Typography fontSize={11} fontWeight={700} color="#1d4ed8" mb={1.5}>PURCHASE SUMMARY</Typography>
              {[{label:"Subtotal",val:purchase.subtotal,color:"text.primary",sign:""},{label:"Item Discount",val:purchase.totalDiscount,color:"#dc2626",sign:"- "},{label:"Item GST",val:purchase.totalGst,color:"#d97706",sign:"+ "},{label:"Additional",val:purchase.additionalTotal,color:"#7c3aed",sign:"+ "}].map(({label,val,color,sign})=>(
                <Box key={label} display="flex" justifyContent="space-between" mb={0.8}><Typography fontSize={12} color="text.secondary">{label}</Typography><Typography fontSize={12} fontWeight={600} color={color}>{sign}Rs.{fmt(val)}</Typography></Box>
              ))}
              <Divider sx={{ my: 1 }} />
              <Box display="flex" justifyContent="space-between">
                <Typography fontWeight={700} fontSize={13}>Grand Total</Typography>
                <Typography fontWeight={800} color="#1d4ed8" fontSize={15}>Rs.{fmt(grandTotal)}</Typography>
              </Box>
            </Box>
            <Box sx={{ background: "#fafafa", borderRadius: 2, p: 2, border: "1px solid #e2e8f0" }}>
              <Typography fontSize={11} fontWeight={700} color="text.secondary" mb={1.5}>EXTRA GST & DISCOUNT</Typography>
              <TextField fullWidth size="small" label="Discount %" type="number" value={discPctInput}
                inputProps={{ min:0, max:100, step:0.1 }}
                InputProps={{ endAdornment: <Typography fontSize={12} color="text.secondary">%</Typography> }}
                onChange={(e) => setDiscPctInput(e.target.value)} sx={{ mb: 1.5 }} />
              <TextField fullWidth size="small" label="GST %" type="number" value={gstPctInput}
                inputProps={{ min:0, max:100, step:0.1 }}
                InputProps={{ endAdornment: <Typography fontSize={12} color="text.secondary">%</Typography> }}
                onChange={(e) => setGstPctInput(e.target.value)} sx={{ mb: 1.5 }} />
              <Button fullWidth variant="contained" size="small" startIcon={<CheckCircleIcon />}
                onClick={handleConfirmDiscGst} sx={{ background: "#1d4ed8", fontWeight: 700, mb: 1.5 }}>
                Confirm GST & Discount
              </Button>
              {(confirmedDisc > 0 || confirmedGst > 0) && (
                <Box sx={{ p: 1.2, background: "#fff", borderRadius: 1.5, border: "1px solid #e2e8f0" }}>
                  <Box display="flex" justifyContent="space-between" mb={0.5}><Typography fontSize={11} color="text.secondary">Grand Total</Typography><Typography fontSize={11} fontWeight={600}>Rs.{fmt(grandTotal)}</Typography></Box>
                  {confirmedDisc > 0 && <Box display="flex" justifyContent="space-between" mb={0.5}><Typography fontSize={11} color="#dc2626">Discount ({confirmedDisc}%)</Typography><Typography fontSize={11} fontWeight={600} color="#dc2626">- Rs.{fmt(extraDiscAmt)}</Typography></Box>}
                  {confirmedGst  > 0 && <Box display="flex" justifyContent="space-between" mb={0.5}><Typography fontSize={11} color="#d97706">GST ({confirmedGst}%)</Typography><Typography fontSize={11} fontWeight={600} color="#d97706">+ Rs.{fmt(extraGstAmt)}</Typography></Box>}
                  <Divider sx={{ my: 0.5 }} />
                  <Box display="flex" justifyContent="space-between"><Typography fontSize={11} fontWeight={700}>Final Payable</Typography><Typography fontSize={13} fontWeight={800} color="#1d4ed8">Rs.{fmt(finalPayable)}</Typography></Box>
                </Box>
              )}
            </Box>
            {[{label:"Final Payable",val:finalPayable,color:"#1d4ed8",bg:"#eff6ff"},{label:"Already Paid",val:alreadyPaid,color:"#15803d",bg:"#ecfdf5"},{label:"Remaining Due",val:remaining,color:"#dc2626",bg:"#fef2f2"}].map(({label,val,color,bg})=>(
              <Box key={label} sx={{ background:bg, borderRadius:2, p:1.2, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <Typography fontSize={11} color="text.secondary">{label}</Typography>
                <Typography fontWeight={700} color={color} fontSize={13}>Rs.{fmt(val)}</Typography>
              </Box>
            ))}
          </Box>
          {/* COL 3 */}
          <Box sx={{ flex: 1, minWidth: 280, p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <Box>
              <Typography fontSize={11} fontWeight={700} color="text.secondary" mb={1}>PAYMENT TYPE *</Typography>
              <Box display="flex" gap={1}>
                {[{t:"Full Payment",sub:`Rs.${fmt(fullPayAmt)}`,subColor:"#15803d"},{t:"Partial",sub:"custom",subColor:"#d97706"},{t:"Pending",sub:"Rs.0",subColor:"#dc2626"}].map(({t,sub,subColor})=>(
                  <Box key={t} onClick={()=>setPaymentType(t)} sx={{ flex:1, textAlign:"center", py:1.2, px:0.5, borderRadius:2, cursor:"pointer", border:"2px solid", borderColor:paymentType===t?"#1d4ed8":"#e2e8f0", background:paymentType===t?"#eff6ff":"#fff", transition:"all 0.15s" }}>
                    <Typography fontSize={12} fontWeight={600} color={paymentType===t?"#1d4ed8":"text.secondary"}>{t}</Typography>
                    <Typography fontSize={11} fontWeight={500} color={subColor}>{sub}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
            {paymentType === "Partial" && (
              <TextField fullWidth size="small" label="Amount to Pay" type="number" value={partialAmt} error={!!amtError}
                helperText={amtError || `Between Rs.1 and Rs.${fmt(fullPayAmt - 1)}`}
                inputProps={{ min: 1 }} onChange={(e) => setPartialAmt(e.target.value)} />
            )}
            {paymentType !== "Pending" && (
              <Box sx={{ background:"#ecfdf5", borderRadius:2, p:2, border:"1px solid #bbf7d0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <Typography fontWeight={600} color="#15803d">Amount to Pay Now</Typography>
                <Typography fontWeight={800} fontSize={18} color="#15803d">Rs.{fmt(amountToPay)}</Typography>
              </Box>
            )}
            {paymentType !== "Pending" && (
              <Box>
                <Typography fontSize={11} fontWeight={700} color="text.secondary" mb={1}>PAYMENT MODE *</Typography>
                <Grid container spacing={1}>
                  {PAYMENT_MODES.map((m) => (
                    <Grid item xs={6} key={m.label}>
                      <Box onClick={()=>setPaymentMode(m.label)} sx={{ border:`2px solid ${paymentMode===m.label?m.color:"#e2e8f0"}`, borderRadius:2, p:1.2, cursor:"pointer", display:"flex", alignItems:"center", gap:1, background:paymentMode===m.label?`${m.color}15`:"#fff", transition:"all 0.15s" }}>
                        <Box sx={{ color:m.color, "& svg":{ fontSize:18 } }}>{m.icon}</Box>
                        <Typography fontSize={12} fontWeight={600} color={paymentMode===m.label?m.color:"text.secondary"}>{m.label}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1.5, borderTop: "1px solid #e2e8f0" }}>
        <Button variant="outlined" onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="success" onClick={handleDone}
          disabled={loading||done||(paymentType==="Partial"&&!!amtError)} sx={{ fontWeight:700, px:4 }}>
          {loading ? "Saving..." : "Done"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Company Row ───────────────────────────────────────────────
const CompanyRow = ({ supplier, purchases, serial, onPay, onDelete }) => {
  const [open, setOpen] = useState(false);
  const companyTotal = purchases.reduce((s, p) => s + (p.finalPayable || p.grandTotal || 0), 0);
  const companyPaid  = purchases.reduce((s, p) => s + (p.totalPaid  || 0), 0);
  const companyDue   = purchases.reduce((s, p) => s + (p.totalDue   || 0), 0);
  const totalItems   = purchases.reduce((s, p) => s + (p.products?.length || 0), 0);
  const companyStatus = companyDue <= 0 && companyTotal > 0 ? "Paid" : companyPaid > 0 ? "Partial" : "Pending";

  return (
    <>
      <TableRow hover sx={{ "& > *": { borderBottom:"unset" }, cursor:"pointer" }} onClick={() => setOpen(!open)}>
        <TableCell sx={{ width:40 }}>
          <IconButton size="small">{open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}</IconButton>
        </TableCell>
        <TableCell sx={{ fontWeight:600, color:"#94a3b8", width:40 }}>{serial}</TableCell>
        <TableCell>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Avatar sx={{ width:32, height:32, bgcolor:"#eff6ff", color:"#2563eb", fontSize:13, fontWeight:700 }}>
              {supplier.companyName?.[0]?.toUpperCase() || supplier.name?.[0]?.toUpperCase()}
            </Avatar>
            <Box>
              <Typography fontWeight={700} fontSize={14}>{supplier.companyName || supplier.name}</Typography>
              <Typography fontSize={11} color="text.secondary">{purchases.length} invoice{purchases.length!==1?"s":""} · {totalItems} items</Typography>
            </Box>
          </Box>
        </TableCell>
        <TableCell sx={{ fontWeight:700, color:"#1d4ed8" }}>Rs.{fmt(companyTotal)}</TableCell>
        <TableCell sx={{ fontWeight:600, color:"#15803d" }}>Rs.{fmt(companyPaid)}</TableCell>
        <TableCell sx={{ fontWeight:700, color:companyDue>0?"#dc2626":"#15803d" }}>Rs.{fmt(companyDue)}</TableCell>
        <TableCell>
          <Chip label={companyStatus} size="small" color={companyStatus==="Paid"?"success":companyStatus==="Partial"?"warning":"error"} />
        </TableCell>
        <TableCell />
      </TableRow>

      <TableRow>
        <TableCell colSpan={9} sx={{ py:0, background:"#fafbfc" }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ mx:2, my:1.5 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ background:"#f1f5f9" }}>
                    {["Invoice No","Supplier Name","Date","Items","Color/Design","Total Amount","Paid","Pending","Actions"].map((h)=>(
                      <TableCell key={h} sx={{ fontWeight:600, fontSize:12, whiteSpace:"nowrap" }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {purchases.map((p) => {
                    const payable = p.finalPayable || p.grandTotal || 0;
                    const paid    = p.totalPaid    || 0;
                    const due     = p.totalDue     || 0;
                    const isPaid  = p.paymentStatus === "Paid";
                    return (
                      <TableRow key={p._id} hover>
                        <TableCell><Typography fontSize={12} fontWeight={700} color="#2563eb">{p.invoiceNo}</Typography></TableCell>
                        <TableCell sx={{ fontSize:12 }}>{supplier.supplierName || supplier.name || "—"}</TableCell>
                        <TableCell sx={{ fontSize:12, color:"#64748b", whiteSpace:"nowrap" }}>{fmtDate(p.invoiceDate)}</TableCell>
                        <TableCell sx={{ fontSize:12 }}>{p.products?.length || 0} items</TableCell>
                        <TableCell sx={{ fontSize:12, maxWidth:220 }}>{listColorDesigns(p)}</TableCell>
                        <TableCell sx={{ fontSize:12, fontWeight:600 }}>Rs.{fmt(payable)}</TableCell>
                        <TableCell sx={{ fontSize:12, fontWeight:600, color:"#15803d" }}>Rs.{fmt(paid)}</TableCell>
                        <TableCell sx={{ fontSize:12, fontWeight:600, color:due>0?"#dc2626":"#15803d" }}>Rs.{fmt(due)}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Box display="flex" gap={0.5} alignItems="center">
                            {/* PAY — always shown, disabled when already paid */}
                            <Button size="small" variant="contained" color="success"
                              disabled={isPaid}
                              sx={{ minWidth:48, fontWeight:700, fontSize:11,
                                ...(isPaid && { bgcolor:"#d1fae5 !important", color:"#6ee7b7 !important", boxShadow:"none" }) }}
                              onClick={() => onPay(p)}>
                              PAY
                            </Button>
                            {/* EDIT */}
                            <Button size="small" variant="outlined"
                              sx={{ minWidth:48, fontSize:11 }}
                              onClick={() => onPay(p)}>
                              EDIT
                            </Button>
                            {/* EXPORT */}
                            <ExportMenu purchase={p} supplier={supplier} />
                            {/* DELETE */}
                            <IconButton size="small" color="error"
                              onClick={() => onDelete(p)}
                              sx={{ border:"1px solid #fecaca", borderRadius:1, "&:hover":{ background:"#fef2f2" } }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                {/* Footer totals */}
                <TableBody>
                  <TableRow sx={{ background:"#f8fafc" }}>
                    <TableCell colSpan={3} sx={{ borderTop:"2px solid #e2e8f0", py:1 }}>
                      <Typography fontSize={12} fontWeight={700} color="text.secondary">Total Items: {totalItems}</Typography>
                    </TableCell>
                    <TableCell sx={{ borderTop:"2px solid #e2e8f0" }} />
                    <TableCell sx={{ borderTop:"2px solid #e2e8f0" }} />
                    <TableCell sx={{ borderTop:"2px solid #e2e8f0", fontWeight:800, fontSize:13, color:"#1d4ed8" }}>Rs.{fmt(companyTotal)}</TableCell>
                    <TableCell sx={{ borderTop:"2px solid #e2e8f0", fontWeight:800, fontSize:13, color:"#15803d" }}>Rs.{fmt(companyPaid)}</TableCell>
                    <TableCell sx={{ borderTop:"2px solid #e2e8f0", fontWeight:800, fontSize:13, color:companyDue>0?"#dc2626":"#15803d" }}>Rs.{fmt(companyDue)}</TableCell>
                    <TableCell sx={{ borderTop:"2px solid #e2e8f0" }} />
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

// ── Main Page ─────────────────────────────────────────────────
const SupplierPayment = ({ onBack }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const purchaseDataFromNav = location.state || null;
  const autoOpenFired = useRef(false);

  const [purchases,      setPurchases]      = useState([]);
  const [suppliersMap,   setSuppliersMap]   = useState({});
  const [tab,            setTab]            = useState(0);
  const [search,         setSearch]         = useState("");
  const [dialogPurchase, setDialogPurchase] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    if (autoOpenFired.current) return;
    if (!purchaseDataFromNav?.supplierId || purchases.length === 0) return;
    const match = purchases.find((p) => p.supplierId === purchaseDataFromNav.supplierId);
    if (match) { autoOpenFired.current = true; setDialogPurchase(match); navigate(location.pathname, { replace:true, state:null }); }
  }, [purchaseDataFromNav, purchases]);

  const fetchAll = async () => {
    try {
      const [purRes, supRes] = await Promise.all([getPurchases(), getSuppliers()]);
      const map = {};
      (supRes.data || []).forEach((s) => { map[s._id] = s; });
      setPurchases(purRes.data || []);
      setSuppliersMap(map);
    } catch { toast.error("Failed to fetch data"); }
  };

  const handleDelete = async (purchase) => {
    if (!window.confirm(`Delete invoice "${purchase.invoiceNo}"? This cannot be undone.`)) return;
    try { await deletePurchase(purchase._id); toast.success("Invoice deleted"); fetchAll(); }
    catch { toast.error("Failed to delete invoice"); }
  };

  const groupedBySupplier = {};
  purchases.forEach((p) => {
    const sid = p.supplierId?.toString();
    if (!groupedBySupplier[sid]) groupedBySupplier[sid] = [];
    groupedBySupplier[sid].push(p);
  });
  Object.values(groupedBySupplier).forEach((arr) => arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));

  const allSupplierIds = Object.keys(groupedBySupplier).sort((a, b) => {
    return new Date(groupedBySupplier[b][0]?.createdAt || 0) - new Date(groupedBySupplier[a][0]?.createdAt || 0);
  });

  const totalGrandAll = purchases.reduce((s, p) => s + (p.finalPayable || p.grandTotal || 0), 0);
  const totalPaidAll  = purchases.reduce((s, p) => s + (p.totalPaid  || 0), 0);
  const totalDueAll   = purchases.reduce((s, p) => s + (p.totalDue   || 0), 0);
  const pendingCount  = purchases.filter((p) => p.paymentStatus !== "Paid").length;
  const paidCount     = purchases.filter((p) => p.paymentStatus === "Paid").length;
  const partialCount  = purchases.filter((p) => p.paymentStatus === "Partial").length;

  const filteredIds = allSupplierIds.filter((sid) => {
    const s = suppliersMap[sid];
    const pList = groupedBySupplier[sid] || [];
    const q = search.trim().toLowerCase();
    let matchesTab = true;
    if (tab === 1) matchesTab = pList.some((p) => p.paymentStatus !== "Paid");
    if (tab === 2) matchesTab = pList.some((p) => p.paymentStatus === "Paid");
    if (tab === 3) matchesTab = pList.some((p) => p.paymentStatus === "Partial");
    if (!matchesTab) return false;
    if (!q) return true;
    return [s?.companyName, s?.name, s?.supplierName, s?.companyPhone, s?.phone, ...pList.map((p) => p.invoiceNo)]
      .some((v) => v?.toLowerCase().includes(q));
  });

  return (
    <Box p={3}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Supplier Payment</Typography>
          <Typography variant="body2" color="text.secondary">Manage and track payments per purchase invoice</Typography>
        </Box>
        {onBack && <Button variant="outlined" onClick={onBack}>Back</Button>}
      </Box>

      <Grid container spacing={3} mb={3}>
        {[
          { label:"Total Purchase Value", val:`Rs.${fmt(totalGrandAll)}`, sub:`${purchases.length} purchases`, bg:"#eff6ff", border:"#bfdbfe", color:"#1d4ed8" },
          { label:"Total Paid",           val:`Rs.${fmt(totalPaidAll)}`,  sub:`${paidCount} fully paid`,        bg:"#ecfdf5", border:"#bbf7d0", color:"#15803d" },
          { label:"Total Due",            val:`Rs.${fmt(totalDueAll)}`,   sub:`${pendingCount} pending`,         bg:"#fef2f2", border:"#fecaca", color:"#dc2626" },
        ].map((s) => (
          <Grid item xs={12} sm={4} key={s.label}>
            <Card sx={{ p:2.5, borderRadius:3, background:s.bg, border:`1.5px solid ${s.border}`, boxShadow:"none" }}>
              <Typography variant="body2" color="text.secondary">{s.label}</Typography>
              <Typography variant="h5" fontWeight={800} color={s.color}>{s.val}</Typography>
              <Typography variant="caption" color="text.secondary">{s.sub}</Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ p:3, borderRadius:3, boxShadow:"0 2px 12px rgba(0,0,0,0.07)" }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb:2 }}>
          {[
            { label:"All Payments", count:purchases.length },
            { label:"Pending",      count:pendingCount,  color:"error"   },
            { label:"Paid",         count:paidCount,     color:"success" },
            { label:"Partial",      count:partialCount,  color:"warning" },
          ].map(({ label, count, color }) => (
            <Tab key={label} label={
              <Box display="flex" gap={1} alignItems="center">
                {label}<Chip label={count} size="small" color={color || undefined} />
              </Box>
            } />
          ))}
        </Tabs>

        <TextField fullWidth size="small"
          placeholder="Search by company name, supplier name, invoice..."
          value={search} onChange={(e) => setSearch(e.target.value)} sx={{ mb:2 }}
          InputProps={{ startAdornment: <Typography fontSize={15} sx={{ mr:1, color:"text.secondary" }}>🔍</Typography> }}
        />

        {filteredIds.length === 0 ? (
          <Box sx={{ textAlign:"center", py:6, color:"text.secondary" }}>
            <Typography>{search ? "No results found" : "No records found"}</Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX:"auto" }}>
            <Table>
              <TableHead sx={{ background:"#f1f5f9" }}>
                <TableRow>
                  <TableCell sx={{ width:40 }} />
                  <TableCell sx={{ fontWeight:600, fontSize:13, width:40 }}>SNo</TableCell>
                  <TableCell sx={{ fontWeight:600, fontSize:13 }}>Company Name</TableCell>
                  <TableCell sx={{ fontWeight:600, fontSize:13 }}>Company Total Amount</TableCell>
                  <TableCell sx={{ fontWeight:600, fontSize:13 }}>Company Paid Amount</TableCell>
                  <TableCell sx={{ fontWeight:600, fontSize:13 }}>Company Pending Amount</TableCell>
                  <TableCell sx={{ fontWeight:600, fontSize:13 }}>Status</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredIds.map((sid, i) => {
                  const supplier = suppliersMap[sid] || { name: groupedBySupplier[sid][0]?.supplierName || "Unknown" };
                  const pList    = groupedBySupplier[sid] || [];
                  const filtered =
                    tab === 1 ? pList.filter((p) => p.paymentStatus !== "Paid")    :
                    tab === 2 ? pList.filter((p) => p.paymentStatus === "Paid")    :
                    tab === 3 ? pList.filter((p) => p.paymentStatus === "Partial") :
                    pList;
                  return (
                    <CompanyRow key={sid} supplier={supplier} purchases={filtered} serial={i+1}
                      onPay={(p) => setDialogPurchase(p)} onDelete={handleDelete} />
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </Card>

      <PaymentDialog
        purchase={dialogPurchase}
        supplier={dialogPurchase ? suppliersMap[dialogPurchase.supplierId?.toString()] : null}
        open={!!dialogPurchase}
        onClose={() => setDialogPurchase(null)}
        onSaved={fetchAll}
      />
    </Box>
  );
};

export default SupplierPayment;
