const mongoose = require('mongoose');

/**
 * Connects to MongoDB using MONGO_URI from the environment.
 * Exits the process if the connection fails, since the API is useless without a database.
 */
async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
}

module.exports = connectDB;
