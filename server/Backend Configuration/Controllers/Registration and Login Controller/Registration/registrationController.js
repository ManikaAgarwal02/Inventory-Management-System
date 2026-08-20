const User = require("../../../Models/UserSchema/user")
const bcrypt = require("bcrypt");

const register = async (req, res) => {
    try {

        const { name, email, password, role } = req.body;

        // checking the User 
        const checkExistingUser = await User.findOne({ email });
 
        if (checkExistingUser) {
            return res.status(400).json({
                message: "User Already Exists"
            });
        }


        //  Password Hasihng
        console.log("Password Before Hashing:", password);

        const hashedPassword = await bcrypt.hash(password, 10);

        console.log("Password After Hashing:", hashedPassword);

        const user = new User({
            name,
            email,
            password: hashedPassword,
            role: role === "admin" ? "admin" : "staff"
        });

        const data = await user.save();

        res.status(201).json({
            message: "Registration Successful",
            registeredData: data
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }
};

module.exports = { register };