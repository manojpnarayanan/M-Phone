const express=require("express")
const router=express.Router()
const passport=require("passport")
const otpUpdate=require("../../controller/user/otpgenerator")
const signupController=require("../../controller/user/signupController")
const userController=require("../../controller/user/userController")
const userDashboard=require("./userdashboard")

router.get("/login",(req,res)=>{res.render("user/login")})
router.get("/signup",(req,res)=>{res.render("user/signup")})
router.post("/signup",signupController.signup)

router.get("/otp",(req,res)=>{res.render("user/otp-page")})
router.post("/otp/generate",otpUpdate.otpGenerate)
router.post("/otp/validate",otpUpdate.otpValidate)
router.post("/login",userController.login)
router.get("/dashboard",userController.loadDashboard)
router.use("/dashboard",userDashboard)


router.get("/logout",(req,res)=>{res.clearCookie("token"),res.redirect("/user/login")})
router.get("/google",passport.authenticate("google",{
    scope:["profile","email"]
}));

router.get("/google/callback",passport.authenticate("google",{
    failureRedirect:"/login"}),
    (req,res)=>{res.redirect("/login")}
)





module.exports=router