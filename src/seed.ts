import mongoose from "mongoose";
import dns from "dns";
import dotenv from "dotenv";
import path from "path";
import User from "./models/User";
import { UserRole } from "./types/user.types";

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dns.setServers(["8.8.8.8", "8.8.4.4"]);

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log("Connected to MongoDB");

    const existing = await User.findOne({ phone: "admin" });
    if (existing) {
      console.log("Admin user already exists. Updating password...");
      existing.password = "qwerty";
      existing.firstName = "Admin";
      existing.lastName = "User";
      existing.role = UserRole.ADMIN;
      existing.isVerified = true;
      await existing.save();
      console.log("Admin user updated successfully");
    } else {
      await User.create({
        firstName: "Admin",
        lastName: "User",
        phone: "admin",
        password: "qwerty",
        role: UserRole.ADMIN,
        isVerified: true,
        isActive: true,
      });
      console.log("Admin user created successfully");
    }

    console.log("Login: admin");
    console.log("Password: qwerty");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error: any) {
    console.error("Seed error:", error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seed();
