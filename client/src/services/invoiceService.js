import API from "./api";

export const createInvoice = (data) => API.post("/invoices", data);
export const getInvoices = () => API.get("/invoices");
export const updateInvoice = (id, data) => API.put(`/invoices/${id}`, data);
export const deleteInvoice = (id) => API.delete(`/invoices/${id}`);

export const finalizeInvoiceStock = (id) => API.post(`/invoices/${id}/finalize-stock`);

