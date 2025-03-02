const User=require("../../model/user")
const bcryptjs=require("bcryptjs")
const jwt=require("jsonwebtoken")
const nodemailer = require('nodemailer');
const Product=require("../../model/addproduct")

const userController={
    login: async(req,res)=>{
        try{
            const {email,password}=req.body
            
            const user=await User.findOne({email})

            if(!user){
                // return res.status(400).send("User not found")
                return res.redirect('/user/login?error=User not found');
            }
            const isMatch=await bcryptjs.compare(password,user.password)

            if(!isMatch){
                // return res.status(400).send("Invalid Credentials")
                return res.redirect('/user/login?error=Invalid Credentials')
            }
                 // GENERATE TOKEN
            const token=jwt.sign({
                id:user._id,
                email:user.email},
                process.env.JWT_SECRET,
                {expiresIn:"2h",                  
            })
            // console.log(token)
            // STORE TOKEN IN HTTP-ONLY COOKIE
            res.cookie("token",token,{httpOnly:true})
            res.redirect("/user/dashboard?success=Login successful")
        }catch(error){
            console.log(error)
            // res.status(500).send("Server error")
            res.redirect('/user/login?error=Server error');
        }
    },
    loadDashboard:async (req,res)=>{
        try{
           const token=req.cookies.token
           
            const decoded=jwt.verify(token,process.env.JWT_SECRET)
            // console.log("token decoded",decoded)
           
           const user=await User.findById(decoded.id)
        //    console.log(userId)
            let query={}
            if(req.query.search){
                query={
                    $or:[
                        {name:{$regex:req.query.search,$options:"i"}},
                        {description:{$regex:req.query.search,$options:"i"}}
                    ]
                }
            }
        const products=await Product.find(query);
        
        res.render("user/home",{user,products,searchQuery:req.query.search || ""})
        }catch(error){
            console.log(error)
            res.status(500).send("Error fetching Data")
        }
   } ,
   forgotPassword:async (req,res)=>{
     try{
           const {email}=req.body
        //    console.log(email)
           const user=await User.findOne({email:email})
        //    console.log(user)
           if(!user){
            return res.status(404).json({message:"User not found"})
           }
           const otp=Math.floor(100000+Math.random()*900000)
           console.log("forgot password OTP:",otp)
           const otpExpiry=new Date()
           otpExpiry.setMinutes(otpExpiry.getMinutes()+1)//otp expires in 1 minute

           user.otp=otp
           user.otpExpiry=otpExpiry
           await user.save()
   // Setup Nodemailer transporter
          const transporter=nodemailer.createTransport({
            service:"gmail",
            auth:{
                user:process.env.GMAIL_USER,
                pass:process.env.GMAIL_PASS,
            }
          })
          const mailOptions={
            from:process.env.GMAIL_USER,
            to:email,
            subject:"OTP for Reset Password",
            text:`Your otp for Reset password is ${otp}`
          }
        //   console.log(mailOptions.email)
          const info=await transporter.sendMail(mailOptions)

          console.log(info.response)
          return res.status(200).json({message:"Otp sent to Your Mail"})
     }catch(error){
          console.log(error)
     }
   },
   resetPassword:async (req,res)=>{
    try{
        const {email,otp,newPassword,confirmPassword}=req.body
        console.log(req.body)
        
        if(!email|| !otp|| !newPassword|| !confirmPassword ){
            return res.status(500).json({message:"All field required"})
        }
        if(newPassword!==confirmPassword){
            return res.status(400).json({message:"Password do not match"})
        }
        const user=await User.findOne({email:req.body.email})
        console.log(user)
       
        if(user.otp!==otp){
            return res.status(400).json({message:"Invalid OTp"})
        }
        if(user.otpExpiry<new Date()){
            return res.status(400).json({message:"OTP Expired"})
        }
        const hashedpassword= await bcryptjs.hash(newPassword,10)
        user.password=hashedpassword;
        user.otp=null;
        user.otpExpiry=null
        await user.save();
        return res.status(200).json({message:"Password updated successfully"})
    }catch(error){
        console.log(error)
        return res.status(500).json({message:"Servor error"})
    }
   }

}

module.exports=userController