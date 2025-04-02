const User = require("../../model/user")
const bcryptjs = require("bcryptjs")
const generator = require("./otpgenerator")
const otpgenerator = require("otp-generator")
const nodemailer = require("nodemailer")



function createOtp() {
  const otp = Math.floor(100000 + Math.random() * 900000);
  const otpExpiry = new Date();
  otpExpiry.setMinutes(otpExpiry.getMinutes() + 1);
  return { otp, otpExpiry };
}

const signupController = {
  signup: async (req, res) => {
    try {
      // console.log("Request Body:", req.body);
      const { name, email, password, confirmPassword, phonenumber, referralCode } = req.body;


      if (!name || !email || !password || !confirmPassword || !phonenumber) {
        return res.status(400).json({ message: "All Fields are required" });
      }
      if (/^\s*$/.test(name)) {
        return res.status(400).json({ message: "Empty spaces not allowed" })
      }
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match" });
      }

      const userVerified = await User.findOne({ email })
      // console.log(userVerified)
      if (userVerified && userVerified.isVerified === false) {
        await User.deleteOne({ email })
        // console.log("deleted email:",email)

      }


      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      if (!/^[6-9]\d{9}$/.test(phonenumber)) {
        return res.status(400).json({ message: "Invalid Phone Number" });
      }

      const hashedPassword = await bcryptjs.hash(password, 10);

      const { otp, otpExpiry } = createOtp();
      console.log("Generated OTP:", otp);


      const newUser = new User({
        name,
        email,
        password: hashedPassword,
        phonenumber,
        otp,
        otpExpiry,
      });

      let referrer = null
      if (referralCode) {
        referrer = await User.findOne({ referralCode: referralCode })
        if (referrer) {
          newUser.referredBy = referrer._id
        }

      }

      console.log("referred ", referrer)

      await newUser.save();

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS,
        },
      });

      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: email,
        subject: "Your OTP for Verification",
        text: `Your OTP is: ${otp}`,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log("OTP Sent:", info.response);

      return res.json({ message: "OTP Sent", email });
    } catch (error) {
      console.error("Signup Error:", error);
      return res.status(500).json({ message: "Error during sign up" });
    }
  }
}
module.exports = signupController