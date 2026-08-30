import API from "./api";

export const getLicenseStatus = () => API.get("/license/status");

export const requestLicenseAccess = (data) => API.post("/license/request", data);

export const activateProductLicense = (email, licenseKey) =>
  API.post("/license/activate", { email, licenseKey });

export const importProvisionedSetup = (setupPackage) =>
  API.post("/license/bootstrap/setup", { setupPackage });

export const getLicenseDashboard = () => API.get("/license/admin/dashboard");

export const generateProductLicense = (data) => API.post("/license/admin/generate", data);

export const provisionClientSetup = (data) => API.post("/license/admin/provision", data);
