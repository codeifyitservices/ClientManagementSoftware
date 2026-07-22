import mongoose from "mongoose";
import Admin from "../models/adminModel.js";
import Service from "../models/serviceModel.js";

const seedAdmin = async () => {
  try {
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      console.log("No administrative profiles found. Seeding default admin account...");
      const admin = new Admin({
        email: "admin@clientflow.com",
        password: "admin123",
      });
      await admin.save();
      console.log("\n==================================================");
      console.log("[SEED] Default admin seeded successfully!");
      console.log("Credentials: admin@clientflow.com / admin123");
      console.log("==================================================\n");
    }
  } catch (err) {
    console.error("Error seeding admin profile:", err.message);
  }
};

const seedServices = async () => {
  try {
    const count = await Service.countDocuments();
    if (count === 0) {
      console.log("No billing services found. Seeding mockup defaults...");
      const defaults = [
        { name: "Website Development", sacCode: "998314", gstRate: 18 },
        { name: "Mobile App Development", sacCode: "998314", gstRate: 18 },
        { name: "Software Development", sacCode: "998314", gstRate: 18 },
        { name: "Hosting", sacCode: "998315", gstRate: 18 },
        { name: "Domain Registration", sacCode: "998315", gstRate: 18 },
        { name: "AMC", sacCode: "998313", gstRate: 18 },
      ];
      await Service.insertMany(defaults);
      console.log("[SEED] Seeded default billing services list! 🎉");
    }
  } catch (err) {
    console.error("Error seeding default services:", err.message);
  }
};

const connectMongo = () => {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log("Mongo connected successfully");
      seedAdmin();
      seedServices();
    })
    .catch((err) => {
      console.log("Error in connecting to mongo:", err.message);
    });
};

export default connectMongo;
