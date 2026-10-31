const express= require("express")
const loginController= require("../../../Controllers/Registration and Login Controller/Login/loginController")

const rateLimit= require("../../../Configuration Folders/Middleware Configuration/rateLimit")
const router= express.Router();
const loginLimiter= rateLimit({ windowMs: 15*60*1000, max: 30, message: "Too many login attempts, please try again in a few minutes" })

router.post("/loginRoute/api", loginLimiter, loginController )
module.exports= router;