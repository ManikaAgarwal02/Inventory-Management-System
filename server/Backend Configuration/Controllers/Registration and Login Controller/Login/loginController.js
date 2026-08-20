const User= require("../../../Models/UserSchema/user")
const bcrypt= require("bcrypt")
const { response } = require("express")
const jwt= require("jsonwebtoken")

const loginController=async(req,res)=>{
try {

    const{email,password}=req.body

    const existingUser= await User.findOne({email})
    console.log("My exsiting user Data",existingUser )
    if(!existingUser){
        return res.status(400).json({ message: "User Not Found" })
    }

    const matchedPassword= await bcrypt.compare(password,existingUser.password)
    if(!matchedPassword){
        return res.status(400).json({ message: "Password is Invalid" })
    }


    const secretKey=process.env.JWT_SECRET || "Dikshant16121999Chakrayat@123"
    const token= await jwt.sign({id:existingUser._id,email:existingUser.email, role:existingUser.role}, secretKey)

    res.json({
        message:"Loged in Sucessfully",
        token,
        user:{
            id:existingUser._id,
            name:existingUser.name,
            email:existingUser.email,
            role:existingUser.role
        }
    })


} catch (error) {
    console.log(error.message)
    console.log(error)
    res.json("User Not Found")
}
}
module.exports=loginController