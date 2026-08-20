const User = require("../../Models/UserSchema/user")


    const updateUser=async (req,res)=>{
        try {

            const{name, email}=req.body

            const updatedUser= await User.findByIdAndUpdate(req.params.id,
                {name,email}
            )

            res.json({
                message:"successfully updated",
                data:updatedUser
            })

            console.log("data has been updated :" ,updateUser)
            
        } catch (error) {
            console.log(error)
        }
    }

    module.exports= updateUser