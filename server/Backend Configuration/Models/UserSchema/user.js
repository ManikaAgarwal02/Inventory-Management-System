const mongoose= require("mongoose")

const userSchema= mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password:String,
    role:{ type: String, enum: ["admin", "staff"], default: "staff" },
},{ timestamps: true })

module.exports= mongoose.model("User", userSchema)