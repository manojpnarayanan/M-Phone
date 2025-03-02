const jwt=require("jsonwebtoken")
const admins=require("../model/admin")
const User=require("../model/user")

const middleware = {
     verifyAdmin:async (req,res,next)=>{
      try{
        const token=req.cookies.token
        if(!token){
           return res.status(401).redirect("/admin/login")
        }
        const decoded=jwt.verify(token,process.env.JWT_SECRET)
        
        const admin=await admins.findById(decoded.id)
            if(!admin){
               return res.status(403).redirect("/admin/login")
            }
            req.adminId=decoded.id
            next()
        
      }catch(error){
         console.log(error)
      }
    },
    preventUserAccess: async (req,res,next)=>{
      try{
           const token=req.cookies.token
           if(token){
            const decoded=jwt.verify(token,process.env.JWT_SECRET)
            const user=await User.findById(decoded.id)
            if(user){
               return res.redirect("/user/dashboard")
            }
           }
           next()
      }catch(error){
         console.log(error)
         res.clearCookie("token")
         next()
      }
    }
}



module.exports=middleware








