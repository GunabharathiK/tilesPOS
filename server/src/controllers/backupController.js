const User = require("../models/User");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");
const Supplier = require("../models/Supplier");
const Purchase = require("../models/Purchase");
const Payment = require("../models/Payment");
const fs = require("fs/promises");
const path = require("path");

const COLLECTIONS = [
  { key: "users", model: User },
  { key: "products", model: Product },
  { key: "customers", model: Customer },
  { key: "invoices", model: Invoice },
  { key: "suppliers", model: Supplier },
  { key: "purchases", model: Purchase },
  { key: "payments", model: Payment },
];

exports.exportBackup = async (_req, res) => {
  try {
    const data = {};
    for (const { key, model } of COLLECTIONS) {
      data[key] = await model.find({}).lean();
    }

    return res.json({
      generatedAt: new Date().toISOString(),
      version: 1,
      data,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to export backup" });
  }
};

exports.createBackupNow = async (_req, res) => {
  try {
    const data = {};
    for (const { key, model } of COLLECTIONS) {
      data[key] = await model.find({}).lean();
    }

    const generatedAt = new Date().toISOString();
    const payload = {
      generatedAt,
      version: 1,
      data,
    };

    const backupDir = path.join(process.cwd(), "backups");
    await fs.mkdir(backupDir, { recursive: true });
    const safeStamp = generatedAt.replace(/[:.]/g, "-");
    const fileName = `billing-backup-${safeStamp}.json`;
    const filePath = path.join(backupDir, fileName);
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");

    return res.json({
      message: "Backup created successfully",
      generatedAt,
      fileName,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to create backup" });
  }
};

exports.restoreBackup = async (req, res) => {
  try {
    const incoming = req.body?.data && typeof req.body.data === "object" ? req.body.data : req.body;
    if (!incoming || typeof incoming !== "object") {
      return res.status(400).json({ error: "Invalid backup payload" });
    }

    const hasAnyCollection = COLLECTIONS.some(({ key }) => Array.isArray(incoming[key]));
    if (!hasAnyCollection) {
      return res.status(400).json({ error: "No valid collections found in backup payload" });
    }

    for (const { key, model } of COLLECTIONS) {
      if (!Array.isArray(incoming[key])) continue;
      const docs = incoming[key];
      await model.deleteMany({});
      if (docs.length) {
        await model.insertMany(docs, { ordered: false });
      }
    }

    return res.json({ message: "Backup restored successfully" });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to restore backup" });
  }
};
