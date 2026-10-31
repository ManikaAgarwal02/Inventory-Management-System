const express = require("express")
const router = express.Router()
const getUser = require("../../Controllers/Get All User Controller/getUser")
const verifyToken = require("../../Configuration Folders/Middleware Configuration/authMiddleware")
const authorize = require("../../Configuration Folders/Middleware Configuration/roleSpecificMiddleware")

router.get("/getData", verifyToken, authorize("admin"), getUser)

module.exports = router
