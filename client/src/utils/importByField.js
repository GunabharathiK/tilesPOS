export const normalizeImportKey = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]/g, "");

const parseCsvLine = (line = "") => {
  const out = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim());
};

export const parseCsvRows = (text = "") => {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const rawHeaders = parseCsvLine(lines[0]);
  const headers = rawHeaders.map(normalizeImportKey);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });
    return row;
  });
};

export const mapRowByFieldAliases = (normalizedRow, aliases = {}) => {
  const output = {};
  Object.entries(aliases).forEach(([targetField, keys]) => {
    const candidates = [targetField, ...(Array.isArray(keys) ? keys : [])]
      .map(normalizeImportKey)
      .filter(Boolean);
    const matchKey = candidates.find((k) => normalizedRow[k] !== undefined && normalizedRow[k] !== "");
    if (matchKey) output[targetField] = normalizedRow[matchKey];
  });
  return output;
};
