const jwt=require("jsonwebtoken")
const User=require("../model/user")

const verifyUser={
    existUser:async (req,res,next)=>{
      const token=req.cookies.token || req.headers.authorization?.split(" ")[1];
      // console.log("middleware usertoken:",token)

      if(!token){
        return res.redirect("/user/login")      // Redirect if no token
      }
      try{
        const decoded=jwt.verify(token,process.env.JWT_SECRET);  
        // console.log("Decoded Token:",decoded)    
        // req.user=decoded
        const userId = decoded.id
        // console.log(userId)
        const activeUser=await User.findById(userId)
        // console.log("Active User:",activeUser)
        if(!activeUser){
          return res.redirect("/user/login")
        }
      
        next();
    }catch(error){
        console.log(error)
        res.clearCookie("token")
         return res.redirect("/user/login")
    }
  },
  preventLoginpage:async (req,res,next)=>{
    const token=req.cookies.token
    console.log("prevent Login:",token)
    console.log(req.path)
    if(token){
      try{
        const decoded=jwt.verify(token,process.env.JWT_SECRET);
        const userId=decoded.id
        console.log(decoded)
        const activeUser=await User.findById(userId)
        if(req.path=="/login"|| req.path=="/signup"){
          return res.redirect("/user/dashboard")
        }
        
        next()
      }catch (error){
        res.clearCookie("token");
        next()
      }
    }else{
      next()
    }
    

  }
  
}
module.exports=verifyUser