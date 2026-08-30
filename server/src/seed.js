require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

const OWNER_PHONE = process.env.OWNER_PHONE || "6383014473";
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || "guna8352";

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const existing = await User.findOne({ phone: OWNER_PHONE });
  if (existing) {
    console.log(`Owner already exists: ${OWNER_PHONE}`);
    process.exit();
  }

  await User.create({
    name: "Owner",
    phone: OWNER_PHONE,
    password: OWNER_PASSWORD,
    role: "owner",
  });

  console.log(`Owner created: ${OWNER_PHONE} / ${OWNER_PASSWORD}`);
  process.exit();
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
