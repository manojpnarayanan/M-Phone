const express=require("express")
const app=express()
const router=express.Router()
const admincontroller=require("../controller/admincontroller")
const middleware=require("../middleware/admin")
const dashBoard=require("../router/dashboard")



router.get("/login",(req,res)=>{
    res.render("admin/login",{message:null})
})
router.post("/login",admincontroller.login)
router.get("/dashboard",middleware.verifyAdmin,admincontroller.loadDashboard)
router.use("/dashboard",middleware.verifyAdmin,dashBoard);
router.get("/logout",(req,res)=>{
    res.clearCookie("token");
    res.redirect("/admin/login"); 
})







module.exports=router