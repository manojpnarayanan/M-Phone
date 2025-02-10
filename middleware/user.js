const jwt=require("jsonwebtoken")

const verifyUser={
    existUser:async (req,res,next)=>{
      const token=res.cookies.token;

      if(!token){
        return res.redirect("/user/login")
      }
      try{
        const decoded=jwt.verify(token,process.env.JWT_SECRET);
        req.user=decoded
        next()
    }catch(error){
        console.log(error)
        res.redirect("/user/login")
    }
  }
}
module.exports=verifyUser