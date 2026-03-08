export const formatCurrency = (value = 0) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const getInvoiceAmount = (invoice = {}) => {
  const paymentAmount = Number(invoice?.payment?.amount);
  if (Number.isFinite(paymentAmount) && paymentAmount > 0) return paymentAmount;

  const itemsTotal = Array.isArray(invoice?.items)
    ? invoice.items.reduce((sum, item) => sum + Number(item?.total || 0), 0)
    : 0;

  const extraTax = Number(invoice?.taxAmount || 0);
  const extraDiscount = Number(invoice?.discountAmount || 0);
  return Math.max(0, itemsTotal + extraTax - extraDiscount);
};

export const getInvoicePaymentMetrics = (invoice = {}) => {
  const amount = getInvoiceAmount(invoice);
  const paidCandidate = Number(invoice?.payment?.paidAmount);
  const dueCandidate = Number(invoice?.payment?.dueAmount);

  let paidAmount = Number.isFinite(paidCandidate) ? paidCandidate : undefined;
  let dueAmount = Number.isFinite(dueCandidate) ? dueCandidate : undefined;

  if (paidAmount === undefined && dueAmount !== undefined) {
    paidAmount = Math.max(0, amount - dueAmount);
  }

  if (dueAmount === undefined && paidAmount !== undefined) {
    dueAmount = Math.max(0, amount - paidAmount);
  }

  if (paidAmount === undefined && dueAmount === undefined) {
    if (invoice?.status === "Paid") {
      paidAmount = amount;
      dueAmount = 0;
    } else if (invoice?.status === "Partial") {
      paidAmount = 0;
      dueAmount = amount;
    } else {
      paidAmount = 0;
      dueAmount = amount;
    }
  }

  paidAmount = Math.min(amount, Math.max(0, Number(paidAmount || 0)));
  dueAmount = Math.max(0, Number(dueAmount ?? Math.max(0, amount - paidAmount)));

  const status = dueAmount <= 0 && amount > 0 ? "Paid" : paidAmount > 0 ? "Partial" : "Pending";

  return { amount, paidAmount, dueAmount, status };
};

export const groupInvoicesByCustomer = (invoices = []) => {
  const grouped = new Map();

  invoices.forEach((invoice) => {
    const customer = invoice?.customer || {};
    const key = `${customer?.name || "Unknown"}|${customer?.phone || ""}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        customer: {
          name: customer?.name || "Unknown",
          phone: customer?.phone || "",
          address: customer?.address || "",
        },
        invoices: [],
        totals: { amount: 0, paid: 0, due: 0 },
        status: "Pending",
      });
    }

    const bucket = grouped.get(key);
    const metrics = getInvoicePaymentMetrics(invoice);
    bucket.invoices.push(invoice);
    bucket.totals.amount += metrics.amount;
    bucket.totals.paid += metrics.paidAmount;
    bucket.totals.due += metrics.dueAmount;
  });

  return Array.from(grouped.values()).map((entry) => ({
    ...entry,
    invoiceCount: entry.invoices.length,
    status: entry.totals.due <= 0 && entry.totals.amount > 0
      ? "Paid"
      : entry.totals.paid > 0
        ? "Partial"
        : "Pending",
  }));
};
