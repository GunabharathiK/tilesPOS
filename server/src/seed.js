// ─────────────────────────────────────────────────────────────
// Run once to create the default admin account:
//   node src/seed.js
// ─────────────────────────────────────────────────────────────
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

const ADMIN_PHONE = "6383014473";
const ADMIN_PASSWORD = "guna8352";

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const existing = await User.findOne({ phone: ADMIN_PHONE });
  if (existing) {
    console.log(`✅ Admin already exists: ${ADMIN_PHONE}`);
    process.exit();
  }

  await User.create({
    name: "Admin",
    phone: ADMIN_PHONE,
    password: ADMIN_PASSWORD,
    role: "admin",
  });

  console.log(`✅ Admin created: ${ADMIN_PHONE} / ${ADMIN_PASSWORD}`);
  process.exit();
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
