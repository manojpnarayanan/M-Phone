const express=require("express")
const router=express.Router()
const upload=require("../multer/allmulter")
const brandsController=require("../controller/brandscontroller")



router.get("/addbrands",(req,res)=>{res.render("admin/addbrands")})
router.post("/addbrands",upload.single("image"),brandsController.addBrand)



module.exports=router