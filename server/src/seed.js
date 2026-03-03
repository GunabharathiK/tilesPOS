// ─────────────────────────────────────────────────────────────
// Run once to create the default admin account:
//   node src/seed.js
// ─────────────────────────────────────────────────────────────
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const existing = await User.findOne({ email: "admin@billing.com" });
  if (existing) {
    console.log("✅ Admin already exists");
    process.exit();
  }

  await User.create({
    name: "Admin",
    email: "admin@billing.com",
    password: "admin123",
    role: "admin",
  });

  console.log("✅ Admin created: admin@billing.com / admin123");
  process.exit();
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});