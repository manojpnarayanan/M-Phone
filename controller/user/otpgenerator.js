const otpgenerator=require("otp-generator")
const nodemailer=require("nodemailer")
const jwt=require("jsonwebtoken")
const User=require("../../model/user")
const bcryptjs = require("bcryptjs");

const generator={
    otpGenerate: async (req,res)=>{
        try{
        if (!req.body || !req.body.email) {
            return res.status(400).json({ message: "Email is required" });
        }
           console.log(req.body)      
        const {email,password,name,phonenumber}=req.body
        const otp=  Math.floor(100000 + Math.random() * 900000);
        // await User.updateOne({email},{otp})
         //GENERATE OTP
        const otpExpiry=new Date();
        otpExpiry.setMinutes(otpExpiry.getMinutes()+5);  //OTP expires in 5 minutes
         // Save OTP and expiry in database
       
        await User.findOneAndUpdate({email},{otp,otpExpiry})

        //CREATE JWT WITH OTP MAIL
        const otpToken=jwt.sign(
            {email,otp,otpExpiry,name,password,phonenumber},
            process.env.JWT_SECRET,
            {expiresIn:"5m"})

        //SEND OTP VIA MAIL
        const transporter=nodemailer.createTransport({
            service:"gmail",
            auth:{
                user:process.env.GMAIL_USER,
                pass:process.env.GMAIL_PASS,
            },
        })
        const mailoptions={
            from:process.env.GMAIL_USER,
            to:email,
            subject:"Your otp for Login",
            text:`Your OTP is :${otp}`
        }
        
          const info=await transporter.sendMail(mailoptions)
          console.log("otp Sent:"+ info.response);
          return res.json({message:"OTP Sent",email,otpToken})
            }catch(error){
                console.log(error)
                res.status(500).send("Failed to send OTP")
            }
        
    
    },

    otpValidate: async (req,res)=>{
        try{

        const {otp,otpToken}=req.body;
        console.log(req.body)
        // const user=await User.findOne({email})
    
        const decoded=jwt.verify(otpToken,process.env.JWT_SECRET);
           console.log("decoded:",decoded)
           

        //CHECK OTP &EXPIRY
        if(decoded.otp!==Number(req.body.otp)|| Date.now()> new Date(decoded.otpExpiry)){
            return res.status(400).json({message:"Invalid or Expired OTP"})
        }
          

          if (!decoded.email) {
            return res.status(400).json({ message: "Invalid token" });
          }

   
        
          let existingUser=await User.findOne({email:decoded.email})
          console.log(existingUser)
          if( ! existingUser){ 
            console.log("User already exists")  
            // return res.status(400).json({message:"User already exists"})
          }      
         const hashedPassword= await bcryptjs.hash(decoded.password,10);
    
        const newUser = new User({
            name:decoded.name,
            email:decoded.email,
            password:hashedPassword,
            phonenumber:decoded.phonenumber

        });
        await newUser.save()
        console.log(newUser,"Created")
          
    //    return  res.redirect("/user/login")
        //  res.status(200).json({message:"OTP verified",newUser})
        return res.json({ message: "OTP Verified! Redirecting to login...", redirect: "/user/login" });
    }catch (error) {
       res.status(500).send("Error signing up")
    }

        // await newUser.save();

        // req.login(user,(err)=>{
        //     if(err) return next(err)
        //         res.redirect("/dashboard")
        // })
            
       


    }
    
    
    
}
module.exports=generator