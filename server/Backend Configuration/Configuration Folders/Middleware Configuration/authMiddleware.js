const jwt= require("jsonwebtoken")

const verifyToken=(req,res,next)=>{
 const authHeader=req.headers.authorization;
 console.log(authHeader)
 if(!authHeader){
    return res.status(401).json({
        message:"Token is Missing/Token is invalid"
    })
 }
 

//  Berer token
const token= authHeader.split(" ")[1];



try {

    const secretKey=process.env.JWT_SECRET || "Dikshant16121999Chakrayat@123"
    const decode= jwt.verify(token,secretKey)
    console.log(decode)

    req.user= decode
    next()
    
} catch (error) {
    console.log(error.message)
    console.log(error)
    res.json(error)
}


}
module.exports=verifyToken