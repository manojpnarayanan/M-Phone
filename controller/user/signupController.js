const User=require("../../model/user")
const bcryptjs=require("bcryptjs")
const generator=require("./otpgenerator")



const signupController={
  signup:async (req,res)=>{
    console.log(req.body)
    
    const{name,email,password,confirmPassword,phonenumber}=req.body

    // console.log(name,email,password,confirmPassword,phonenumber)
    if(password !== confirmPassword){
        return res.status(400).send("Password not match")
    }

     const findUser=await User.findOne({email})
     if(findUser){
        return res.render("user/signup",{message: "User already exists"})
     }

     return await generator.otpGenerate(req,res)
    
  }
  
}


module.exports=signupController