import { Box, Button } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import InvoicePrint from "../components/billing/InvoicePrint";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const InvoicePreview = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  // ✅ PDF Download
  const handleDownload = async () => {
    const element = document.getElementById("invoice");

    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");

    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    pdf.save(`Invoice-${state.invoiceNo}.pdf`);
  };

  // ✅ PRINT FUNCTION
  const handlePrint = () => {
    const printContent = document.getElementById("invoice").innerHTML;
    const originalContent = document.body.innerHTML;

    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;

    window.location.reload(); // 🔥 important to restore app
  };

  return (
    <Box sx={{ p: 0, minHeight: "100%" }}>
      {/* ACTION BUTTONS */}
      <Box sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          onClick={() => navigate("/invoice", { state })}
        >
          ✏ Edit
        </Button>

        <Button
          variant="contained"
          sx={{ ml: 2 }}
          onClick={handleDownload}
        >
          Download PDF
        </Button>

        {/* ✅ PRINT BUTTON */}
        <Button
          variant="contained"
          color="success"
          sx={{ ml: 2 }}
          onClick={handlePrint}
        >
          🖨 Print
        </Button>
      </Box>

      {/* INVOICE */}
      <Box id="invoice" sx={{ mt: 3 }}>
        <InvoicePrint data={state} />
      </Box>
    </Box>
  );
};

export default InvoicePreview;
