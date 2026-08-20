const authorize=(...roles)=>{
    return(req,res,next)=>{
        console.log("Allowed Role: ", roles )
        console.log("Logged in Role:", req.user.role)
        if(!roles.includes(req.user.role)){
            return res.json({message:"Access Denined"})
        }
        next()
    }
}

module.exports=authorize