
const Admin=require("../model/admin")
const jwt = require("jsonwebtoken")
const bcrypt=require("bcryptjs")
const User=require("../model/user")


const admincontroller={
 login: async(req,res)=>{    
    const {email,password}=req.body
    try{
        const admin=await Admin.findOne({email})
        if(!admin){
           return res.status(400,{message:"Admin not found"})
        }
        const ismatch=await bcrypt.compare(password,admin.password)
        if(!ismatch){
            return  res.status(400,{message:"Invalid credentials"})
        }
        const token=jwt.sign({id:admin._id},process.env.JWT_SECRET,{expiresIn:"1d"})
        console.log(token);
        
         res.cookie("token",token,{
            httpOnly:true,
            secure:process.env.NODE_ENV==="production",
            maxAge:3600000
        })    
        return res.redirect("/admin/dashboard")
        
    }catch(error){
        console.log(error)
    }
},
 loadDashboard: async (req,res)=>{
  return  res.render("admin/index")
},




}
module.exports=admincontroller