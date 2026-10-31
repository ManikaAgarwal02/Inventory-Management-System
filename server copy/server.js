const express= require("express")
const app= express()
require("dotenv").config()
const connectDB= require("./Backend Configuration/Configuration Folders/DB Configuration/dbCofig")
const cors=require("cors")
const RegistrationApi= require("./Backend Configuration/Routes/Registration & Login Route/Register/register")
const getUsers= require("./Backend Configuration/Routes/Get All User Route/getUser")
const deleteUsers= require("./Backend Configuration/Routes/User Data Deleted/userDataDelete")
const updatedUser= require("./Backend Configuration/Routes/User Updation Route/userUpdateRoute")
const LoginRoute= require("./Backend Configuration/Routes/Registration & Login Route/Login/loginRoute")
const categoryRoute= require("./Backend Configuration/Routes/Category Route/categoryRoute")
const supplierRoute= require("./Backend Configuration/Routes/Supplier Route/supplierRoute")
const productRoute= require("./Backend Configuration/Routes/Product Route/productRoute")
const stockRoute= require("./Backend Configuration/Routes/Stock Route/stockRoute")
const dashboardRoute= require("./Backend Configuration/Routes/Dashboard Route/dashboardRoute")
const activityLogRoute= require("./Backend Configuration/Routes/Activity Log Route/activityLogRoute")
const warehouseRoute= require("./Backend Configuration/Routes/Warehouse Route/warehouseRoute")
const purchaseOrderRoute= require("./Backend Configuration/Routes/Purchase Order Route/purchaseOrderRoute")
const reportRoute= require("./Backend Configuration/Routes/Report Route/reportRoute")
const importRoute= require("./Backend Configuration/Routes/Import Route/importRoute")
const profileRoute= require("./Backend Configuration/Routes/Profile Route/profileRoute")
const stockRequestRoute = require("./Backend Configuration/Routes/Stock Request Route/stockRequestRoute")



// 2mb (default is 100kb) so a few thousand CSV import rows fit in one request
app.use(express.json({ limit: "2mb" }))
// Express 5 leaves req.body undefined when a request has no body; controllers expect an object
app.use((req, res, next) => {
    if (req.body === undefined) req.body = {}
    next()
})
// CLIENT_ORIGIN (comma-separated) restricts browser access in production; unset = open (local dev)
const allowedOrigins = process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(",").map((o) => o.trim()) : null
app.use(cors(allowedOrigins ? { origin: allowedOrigins } : undefined))

if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is missing. Copy .env.example to .env and set a secret.")
    process.exit(1)
}

if (process.env.NODE_ENV === "production" && process.env.JWT_SECRET === "change-this-secret-in-production") {
    console.error("Refusing to start: replace the placeholder JWT_SECRET in .env")
    process.exit(1)
}



app.use("/api", RegistrationApi)
app.use("/api", getUsers)
app.use("/api", deleteUsers)
app.use("/api", updatedUser)
app.use("/api",LoginRoute)
app.use("/api", categoryRoute)
app.use("/api", supplierRoute)
app.use("/api", productRoute)
app.use("/api", stockRoute)
app.use("/api", dashboardRoute)
app.use("/api", activityLogRoute)
app.use("/api", warehouseRoute)
app.use("/api", purchaseOrderRoute)
app.use("/api", reportRoute)
app.use("/api", profileRoute)
app.use("/api", importRoute)
app.use("/api", stockRequestRoute)




// unknown API routes and unexpected errors return JSON instead of an HTML page
app.use("/api", (req, res) => {
    res.status(404).json({ message: "API route not found" })
})

app.use((err, req, res, next) => {
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ message: "Invalid JSON in request body" })
    }
    console.log(err)
    const status = err.status || 500
    // don't leak internal error text on server errors
    res.status(status).json({ message: status >= 500 ? "Something went wrong" : (err.message || "Bad request") })
})

const PORT = process.env.PORT || 4000

if (require.main === module) {
    connectDB()
    app.listen(PORT,()=>{
        console.log(`Your Server is running at port ${PORT}`)
    })
}

module.exports = app
