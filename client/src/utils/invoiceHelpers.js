export const EMPTY_CUSTOMER = { name: "", phone: "", address: "" };

export const CUSTOMER_TYPE_OPTIONS = [
  "Retail Customer",
  "Dealer",
  "Contractor",
  "Builder / Project",
];

export const normalizeCustomerType = (value) => {
  if (value === "Dealer" || value === "Wholesale") return "Dealer";
  if (value === "Contractor" || value === "B2B") return "Contractor";
  if (value === "Builder / Project") return "Builder / Project";
  return "Retail Customer";
};

export const getRateByCustomerType = (product, customerType) => {
  const retail = Number(product?.price || 0);
  const dealer = Number(product?.dealerPrice || 0);
  const contractor = Number(product?.contractorPrice || 0);
  const minimum = Number(product?.minimumSellPrice || 0);

  if (customerType === "Dealer") return dealer > 0 ? dealer : retail;
  if (customerType === "Contractor") return contractor > 0 ? contractor : (dealer > 0 ? dealer : retail);
  if (customerType === "Builder / Project") {
    if (minimum > 0) return minimum;
    if (contractor > 0) return contractor;
    if (dealer > 0) return dealer;
    return retail;
  }
  return retail;
};

export const isTransientNumberInput = (value) =>
  value === "" || value === "-" || value === "." || value === "-." || String(value).endsWith(".");

export const EMPTY_ITEM = {
  productId: "",
  code: "",
  name: "",
  category: "",
  finish: "",
  quantity: "",
  boxes: "",
  size: "",
  uom: "",
  price: 0,
  total: 0,
  availableStock: null,
  coverageArea: 0,
};

export const formatMoney2 = (value = 0) => Number(value || 0).toFixed(2);

export const getCoveragePerBox = (product) => {
  const directCoverage = Number(product?.coverageArea || 0);
  if (directCoverage > 0) return directCoverage;

  const stock = Number(product?.stock || 0);
  const stockBoxes = Number(product?.stockBoxes || 0);
  if (stock > 0 && stockBoxes > 0) return stock / stockBoxes;

  return 0;
};

export const buildWhatsappBillMessage = ({
  isQuotation,
  customerName,
  invoiceNo,
  billDate,
  items = [],
  finalAmount = 0,
}) => {
  const previewItems = items
    .filter((item) => item?.name)
    .slice(0, 5)
    .map((item) => `- ${item.name} | Qty: ${Number(item.quantity || 0)} | Total: Rs.${formatMoney2(item.total)}`);
  const moreItemsCount = Math.max(0, items.filter((item) => item?.name).length - previewItems.length);
  const itemBlock = previewItems.length ? previewItems.join("\n") : "- No items";

  return [
    `${isQuotation ? "Tiles Shop Quotation" : "Tiles Shop Bill"}`,
    "",
    `Customer: ${customerName || "Customer"}`,
    `${isQuotation ? "Quotation" : "Invoice"} No: ${invoiceNo || "-"}`,
    `Date: ${billDate || "-"}`,
    "",
    "Items:",
    itemBlock,
    ...(moreItemsCount > 0 ? [`...and ${moreItemsCount} more item(s)`] : []),
    "",
    `Total: Rs.${formatMoney2(finalAmount)}`,
    "",
    "Thank you for shopping with us!",
  ].join("\n");
};
