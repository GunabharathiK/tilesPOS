import API from "./api";

export const saveCustomer = (data) =>
  API.post("/customers", data);

export const getCustomers = () =>
  API.get("/customers");