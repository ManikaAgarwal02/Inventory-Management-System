const mongoose = require("mongoose")

async function connectDB() {
    try {
        const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/InventoryManagementDB"
        await mongoose.connect(mongoUri)
        console.log("MongoDb is connected")
    } catch (error) {
        console.log("MongoDB connection failed:", error.message)
        process.exit(1)
    }
}

module.exports = connectDB
