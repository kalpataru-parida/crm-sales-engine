import mongoose from "mongoose";
//import seedDatabase from "../Seeder/index.js";

async function connect() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required");
  }
  await mongoose.connect(process.env.MONGO_URI, {
    dbName: process.env.DB_NAME,
  });
  console.log("Database Connected successfully");
}

async function disconnect() {
  await mongoose.disconnect();
}

export default { connect, disconnect };
