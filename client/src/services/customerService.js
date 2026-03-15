import API from "./api";

export const saveCustomer = (data) =>
  API.post("/customers", data);

export const getCustomers = () =>
  API.get("/customers");

export const updateCustomer = (id, data) =>
  API.put(`/customers/${id}`, data);

export const deleteCustomer = (id) =>
  API.delete(`/customers/${id}`);

export const getCustomerInvoices = () =>
  API.get("/invoices");
