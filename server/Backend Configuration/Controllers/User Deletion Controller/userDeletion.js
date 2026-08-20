const User = require("../../Models/UserSchema/user")

const deletedUser= async(req,res)=>{ 

try {
        const {id}=req.params;
    await User.findByIdAndDelete(id)
    res.json({
    success:true,
    message:"User Has been Deleted"
   })
} catch (error) {
    console.log(error.message)
    res.json({
    success:false,
    message:"Server Error"
   })
}

}
module.exports = { deletedUser };