const User = require("../../model/user")
const bcryptjs = require("bcryptjs")
const generator = require("./otpgenerator")
const otpgenerator = require("otp-generator")
const nodemailer = require("nodemailer")

// function generateOTP() {
//   return Math.floor(100000 + Math.random() * 900000).toString();
// }

// const createOtp = () => {
//   return {
//       otp: generateOTP(),
//       otpExpiry: new Date(Date.now() + 2 * 60 * 1000), // OTP valid for 2 mins
//     };
// };

// const signupController={
//   signup:async (req,res)=>{
//     console.log(req.body)

//     const{name,email,password,confirmPassword,phonenumber}=req.body
//     if(!name|| !email || !password|| !confirmPassword ||!phonenumber){

//       return res.status(400).json({ message: "All Fields are required" });

//     }

//     // console.log(name,email,password,confirmPassword,phonenumber)
//     if(password !== confirmPassword){

//       return res.status(400).json({ message: "Passwords do not match" });
//     }

//      const findUser=await User.findOne({email})
//      if(findUser){
//       return res.status(400).json({ message: "User already exists" });
//      }
//      if(!/^[6-9]\d{9}$/.test(phonenumber)){
//       return res.status(400).json({ message: "Invalid Phone Number" });
//      } const hashedPassword= await bcryptjs.hash(password,10);

//      const{otp,otpExpiry}=createOtp()
//      console.log(otp);



//          const newUser = new User({
//              name:name,
//              email:email,
//              password:hashedPassword,
//              phonenumber:phonenumber,
//              otp,
//              otpExpiry

//          });
//          await newUser.save()

//          const transporter=nodemailer.createTransport({
//                   service:"gmail",
//                   auth:{
//                       user:process.env.GMAIL_USER,
//                       pass:process.env.GMAIL_PASS,
//                   },
//               })
//               const mailoptions={
//                   from:process.env.GMAIL_USER,
//                   to:email,
//                   subject:"Your otp for Login",
//                   text:`Your OTP is :${otp}`
//               }

//                 const info=await transporter.sendMail(mailoptions)
//                 console.log("otp Sent:"+ info.response);
//                 return res.json({message:"OTP Sent",email})





//   }

// }
// Helper function to create an OTP and its expiry time

function createOtp() {
  const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
  const otpExpiry = new Date();
  otpExpiry.setMinutes(otpExpiry.getMinutes() + 1); // OTP expires in 1 minute
  return { otp, otpExpiry };
}

const signupController = {
  signup: async (req, res) => {
    try {
      console.log("Request Body:", req.body);
      const { name, email, password, confirmPassword, phonenumber } = req.body;

      // Validate all fields are present
      if (!name || !email || !password || !confirmPassword || !phonenumber) {
        return res.status(400).json({ message: "All Fields are required" });
      }
      if(/^\s*$/.test(name)){
        return res.status(400).json({message:"Empty spaces not allowed"})
      }
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      // Validate password match
      if (password !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match" });
      }

      const userVerified=await User.findOne({email})
      console.log(userVerified)
      if(userVerified && userVerified.isVerified===false){
        await User.deleteOne({email})
console.log("deleted email:",email)

      }

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Validate phone number (Indian format)
      if (!/^[6-9]\d{9}$/.test(phonenumber)) {
        return res.status(400).json({ message: "Invalid Phone Number" });
      }

      // Hash the password before saving
      const hashedPassword = await bcryptjs.hash(password, 10);

      // Generate OTP and expiry time
      const { otp, otpExpiry } = createOtp();
      console.log("Generated OTP:", otp);

      // Create the new user with OTP details
      const newUser = new User({
        name,
        email,
        password: hashedPassword,
        phonenumber,
        otp,
        otpExpiry,
      });
      await newUser.save();

      // Set up the Nodemailer transporter to send OTP via email
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

      // Return response with email for OTP verification
      return res.json({ message: "OTP Sent", email });
    } catch (error) {
      console.error("Signup Error:", error);
      return res.status(500).json({ message: "Error during sign up" });
    }
  }
}
module.exports = signupController