const ORG_SYNC_HEADER = "x-org-sync-token";

const getCentralServerUrl = () =>
  String(process.env.CENTRAL_LICENSE_SERVER_URL || "").trim().replace(/\/+$/, "");

const getSyncToken = () => String(process.env.CENTRAL_SYNC_TOKEN || "").trim();

const isCentralSyncConfigured = () => Boolean(getCentralServerUrl() && getSyncToken());

const postToCentral = async (path, payload) => {
  if (!isCentralSyncConfigured()) {
    return { skipped: true, reason: "Central sync is not configured" };
  }

  const response = await fetch(`${getCentralServerUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [ORG_SYNC_HEADER]: getSyncToken(),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || `Central sync failed with ${response.status}`);
  }
  return data;
};

module.exports = {
  ORG_SYNC_HEADER,
  getCentralServerUrl,
  isCentralSyncConfigured,
  postToCentral,
};
