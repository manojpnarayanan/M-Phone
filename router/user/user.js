const express=require("express")
const router=express.Router()
const passport=require("passport")
const otpUpdate=require("../../controller/user/otpgenerator")
const signupController=require("../../controller/user/signupController")
const userController=require("../../controller/user/userController")
const userDashboard=require("./userdashboard")
const middleware=require("../../middleware/user")
const jwt=require("jsonwebtoken")

router.get("/login",middleware.preventLoginpage,(req,res)=>{res.render("user/login")})
router.get("/signup",middleware.preventLoginpage,(req,res)=>{res.render("user/signup")})
router.post("/signup",signupController.signup)
router.get("/otp",(req,res)=>{res.render("user/otp-page")})

// router.post("/otp/generate",.otpGenerate)
// router.post("/otp/resend",otpUpdate.resendOtp)
router.post("/resend-otp",otpUpdate.resendOtp);
router.post("/otp/validate/:email",otpUpdate.otpValidate)
router.post("/login",userController.login)

router.get("/forgot-password",(req,res)=>{res.render("user/forgotpassword")})
router.post("/forgot-password",userController.forgotPassword)
router.get("/reset-password",(req,res)=>{res.render("user/resetpassword")})
router.post("/reset-password", userController.resetPassword);

router.get("/dashboard",middleware.existUser,userController.loadDashboard)
router.use("/dashboard",userDashboard)


router.post("/logout",(req,res)=>{res.clearCookie("token"),res.redirect("/user/login")})
router.get("/google",passport.authenticate("google",{
    scope:["profile","email"]
}));

router.get("/google/callback",passport.authenticate("google",{
    failureRedirect:"/login",session:false}),
   async (req,res)=>{
    const token= jwt.sign({
        id:req.user._id,
        email:req.user.email},
        process.env.JWT_SECRET,
        {expiresIn:"1h"},
    )
    res.cookie("token",token,{httpOnly:true})
    res.redirect("/user/dashboard")
}
)





module.exports=router