import API from "./api";

// ── Supplier CRUD ────────────────────────────────────────────
export const createSupplier  = (data)       => API.post("/suppliers", data);
export const getSuppliers    = ()            => API.get("/suppliers");
export const getSupplierById = (id)          => API.get(`/suppliers/${id}`);
export const updateSupplier  = (id, data)    => API.put(`/suppliers/${id}`, data);
export const deleteSupplier  = (id)          => API.delete(`/suppliers/${id}`);
export const updatePayment   = (id, data)    => API.patch(`/suppliers/${id}/payment`, data); // legacy

// ── Purchase flow ────────────────────────────────────────────
export const createPurchase        = (data)       => API.post("/suppliers/purchase", data);
export const updatePurchase        = (purchaseId, data) =>
  API.put(`/suppliers/purchase/${purchaseId}`, data);
export const getPurchases          = (supplierId) =>
  supplierId
    ? API.get(`/suppliers/purchase?supplierId=${supplierId}`)
    : API.get("/suppliers/purchase");

// Update payment for a specific purchase (not the whole supplier)
export const updatePurchasePayment = (purchaseId, data) =>
  API.patch(`/suppliers/purchase/${purchaseId}/payment`, data);

// Delete a specific purchase record
export const deletePurchase = (purchaseId) =>
  API.delete(`/suppliers/purchase/${purchaseId}`);
