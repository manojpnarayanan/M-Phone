const jwt=require("jsonwebtoken")

const middleware = {
     verifyAdmin:(req,res,next)=>{
        const token=req.cookies.token
        if(!token){
           return res.status(401).redirect("/admin/login")
        }
        jwt.verify(token,process.env.JWT_SECRET,(err,decoded)=>{
            if(err){
               return res.status(403).redirect("/admin/login")
            }
            req.adminId=decoded.id
            next()
        })
    }
}



module.exports=middleware




