const otpgenerator = require("otp-generator")
const nodemailer = require("nodemailer")
const jwt = require("jsonwebtoken")
const User = require("../../model/user")
const bcryptjs = require("bcryptjs");

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

const createOtp = () => {
    return {
        otp: generateOTP(),
        otpExpires: new Date(Date.now() + 2 * 60 * 1000), // OTP valid for 2 mins
    };
};

const generator = {
    // otpGenerate: async (req,res)=>{
    //     try{
    //     if (!req.body || !req.body.email) {
    //         return res.status(400).json({ message: "Email is required" });
    //     }
    //        console.log(req.body)      
    //     const {email,password,name,phonenumber}=req.body
    //     const otp=  Math.floor(100000 + Math.random() * 900000);
    //     console.log(otp)
    //       //GENERATE OTP
    //       const otpExpiry=new Date();
    //       otpExpiry.setMinutes(otpExpiry.getMinutes()+1);  //OTP expires in 1 minutes
    //     const hashedPassword= await bcryptjs.hash(password,10);

    //     const newUser = new User({
    //         name:name,
    //         email:email,
    //         password:hashedPassword,
    //         phonenumber:phonenumber,
    //         otp,
    //         otpExpiry

    //     });
    //     await newUser.save()
    //     // console.log("Created")



    //      // Save OTP and expiry in database

    //     await User.findOneAndUpdate({email},{otp,otpExpiry})

    //     //CREATE JWT WITH OTP MAIL
    //     // const otpToken=jwt.sign(
    //     //     {email,otp,otpExpiry,name,password,phonenumber},
    //     //     process.env.JWT_SECRET,
    //     //     {expiresIn:"5m"})

    //     //SEND OTP VIA MAIL
    //     const transporter=nodemailer.createTransport({
    //         service:"gmail",
    //         auth:{
    //             user:process.env.GMAIL_USER,
    //             pass:process.env.GMAIL_PASS,
    //         },
    //     })
    //     const mailoptions={
    //         from:process.env.GMAIL_USER,
    //         to:email,
    //         subject:"Your otp for Login",
    //         text:`Your OTP is :${otp}`
    //     }

    //       const info=await transporter.sendMail(mailoptions)
    //       console.log("otp Sent:"+ info.response);
    //       return res.json({message:"OTP Sent",email})
    //         }catch(error){
    //             console.log(error)
    //             res.status(500).send("Failed to send OTP")
    //         }


    // },

    otpValidate: async (req, res) => {
        try {
            const { otpToken, otp } = req.body
            const email = req.params.email;
            console.log("vaalidate body", req.body)
            const user = await User.findOne({ email })

            // const decoded=jwt.verify(otpToken,process.env.JWT_SECRET);
            //    console.log("decoded:",decoded)


            //CHECK OTP &EXPIRY
            // if(decoded.otp!==Number(req.body.otp)|| Date.now()> new Date(decoded.otpExpiry)){
            //     console.log("1");

            //     return res.status(400).json({message:"Invalid or Expired OTP"})
            // }


            //   if (!decoded.email) {
            //     console.log("2");
            //     return res.status(400).json({ message: "Invalid token" });
            //   }



            //   let existingUser=await User.findOne({email:decoded.email})

            //   if( existingUser){ 
            //     console.log("3");
            //     console.log("User already exists")  
            //     return res.status(400).json({message:"User already exists"})
            //   } 


            //  const hashedPassword= await bcryptjs.hash(decoded.password,10);

            // const newUser = new User({
            //     name:decoded.name,
            //     email:decoded.email,
            //     password:hashedPassword,
            //     phonenumber:decoded.phonenumber

            // });
            // await newUser.save()
            // console.log("Created")

            //    return  res.redirect("/user/login")
            //  res.status(200).json({message:"OTP verified",newUser})
            console.log(user)
            if (!user || user.otp !== otp || user.otpExpiry < new Date()) {
                return res.status(401).json({ message: "Invalid OTP" })

            }
            await User.updateOne({ email }, {
                $set: { otp: null, otpExpiry: null, isVerified: true }
            })
            if (user.referredBy) {
            
                const referrer = await User.findById(user.referredBy)
            if (referrer) {
                
                if (!referrer.referrals) {
                  referrer.referrals = [];
                }
                referrer.referrals.push(user._id);
                
                
                if (!referrer.referralDetails) {
                  referrer.referralDetails = [];
                }
                
                referrer.referralDetails.push({
                  userId: user._id,
                  name: user.name,
                  email: user.email,
                  joinedAt: new Date(),
                  status: 'active'
                });
                
            
                referrer.referralRewards = (referrer.referralRewards || 0) + 1;
                
                await referrer.save();
                
              }
            }
            return res.json({ message: "OTP Verified! Redirecting to login...", redirect: "/user/login" });
        } catch (error) {
            console.log("err", error);
            res.status(500).send("Error signing up")
        }
    },
    resendOtp: async (req, res) => {
        try {
            if (!req.body || !req.body.email) {
                return res.status(400).json({ message: "Email missing" })
            }
            //   const {email,name,password,phonenumber}=req.body
            //   console.log("resendotp",req.body)
            //   const user=await User.findOne({email})
            //   if(!user){
            //     return res.status(400).json({message:"User not Found"})
            //   }
            const { email } = req.body
            const user = await User.findOne({ email })
            if (!user) {
                return res.status(400).json({ message: "User not Found" })
            }
            const otp = Math.floor(100000 + Math.random() * 900000)
            console.log("resend otp:", otp)
            const otpExpiry = new Date()
            otpExpiry.setMinutes(otpExpiry.getMinutes() + 1);
            await User.findOneAndUpdate({ email }, { otp, otpExpiry })

            user.otp = otp;
            user.otpExpiry = otpExpiry;
            await user.save()
            //   const otpToken=jwt.sign({
            //     email,otp,otpExpiry},
            //     process.env.JWT_SECRET,
            //     {expiresIn:"1m"}
            //   )
            //   console.log(otpToken.name,otpToken.password,otpToken.password)
            // Send OTP via email
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

            await transporter.sendMail(mailOptions);
            console.log("OTP resent successfully");

            return res.json({ message: "OTP resent successfully" });
        } catch (error) {
            console.log(error)
            return res.status(500).json({ message: "Failed to resend OTP" });

        }
    }



}
module.exports = generator