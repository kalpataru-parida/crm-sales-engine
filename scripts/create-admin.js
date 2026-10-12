import "dotenv/config";
import database from "../src/config/db.config.js";
import User from "../src/models/user.model.js";

const createAdmin = async () => {
  const {
    BOOTSTRAP_ADMIN_NAME,
    BOOTSTRAP_ADMIN_EMAIL,
    BOOTSTRAP_ADMIN_PHONE,
    BOOTSTRAP_ADMIN_PASSWORD,
  } = process.env;
  if (
    !BOOTSTRAP_ADMIN_NAME ||
    !BOOTSTRAP_ADMIN_EMAIL ||
    !BOOTSTRAP_ADMIN_PHONE ||
    !BOOTSTRAP_ADMIN_PASSWORD ||
    BOOTSTRAP_ADMIN_PASSWORD.length < 8 ||
    BOOTSTRAP_ADMIN_PASSWORD.length > 24
  ) {
    throw new Error(
      "Set BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PHONE, and a 8-24 character BOOTSTRAP_ADMIN_PASSWORD",
    );
  }

  await database.connect();
  if (await User.exists({})) {
    throw new Error(
      "Admin bootstrap is only allowed while the users collection is empty",
    );
  }

  const user = await User.create({
    name: BOOTSTRAP_ADMIN_NAME,
    email: BOOTSTRAP_ADMIN_EMAIL,
    phone: BOOTSTRAP_ADMIN_PHONE,
    password: BOOTSTRAP_ADMIN_PASSWORD,
    role: "ADMIN",
    userStatus: "ACTIVE",
  });
  console.log(`Created initial administrator: ${user.email}`);
};

createAdmin()
  .catch((error) => {
    console.error("Admin bootstrap failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await database.disconnect();
  });
