const express= require("express")
// const router= express. Router();
const {register}= require("../../../Controllers/Registration and Login Controller/Registration/registrationController")

const rateLimit= require("../../../Configuration Folders/Middleware Configuration/rateLimit")
const router= express.Router();
const registerLimiter= rateLimit({ windowMs: 60*60*1000, max: 30, message: "Too many sign-up attempts, please try again later" })
router.post("/registration/api", registerLimiter, register )
module.exports= router;