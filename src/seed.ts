import mongoose from "mongoose";
import dns from "dns";
import dotenv from "dotenv";
import path from "path";
import User from "./models/User";
import { UserRole } from "./types/user.types";

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dns.setServers(["8.8.8.8", "8.8.4.4"]);

// Stored in normalized form (+998 prefix) so that logging in with
// "999999999" works — auth service normalizes 9-digit phones to +998...
const ADMIN_PHONE = "+998999999999";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

async function upsertAdmin() {
  let admin = await User.findOne({ role: UserRole.ADMIN });

  if (!admin) {
    admin = new User({
      firstName: "Admin",
      lastName: "User",
      phone: ADMIN_PHONE,
      password: ADMIN_PASSWORD,
      role: UserRole.ADMIN,
      isVerified: true,
      isActive: true,
    });
  } else {
    admin.phone = ADMIN_PHONE;
    admin.password = ADMIN_PASSWORD;
    admin.role = UserRole.ADMIN;
    admin.firstName = admin.firstName || "Admin";
    admin.lastName = admin.lastName || "User";
    admin.isVerified = true;
    admin.isActive = true;
  }

  // Password "12345" is shorter than the schema minimum (6),
  // so validation is skipped; the pre-save hook still hashes it.
  await admin.save({ validateBeforeSave: false });
}

async function seed() {
  if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
    console.error(
      "Set a strong ADMIN_PASSWORD (min 12 chars) in .env before seeding"
    );
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI!, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log("Connected to MongoDB");

    await upsertAdmin();

    console.log("Admin user created/updated successfully");
    console.log(`Login: ${ADMIN_PHONE}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error: any) {
    console.error("Seed error:", error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seed();
