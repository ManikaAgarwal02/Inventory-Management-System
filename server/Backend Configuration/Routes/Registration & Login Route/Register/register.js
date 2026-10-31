const express= require("express")
const {register}= require("../../../Controllers/Registration and Login Controller/Registration/registrationController")

const router= express.Router();
router.post("/registration/api",register )
module.exports= router;