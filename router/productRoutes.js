const express=require("express")
const router=express.Router()
const productupdates=require("../controller/productcontroller")
const Category = require("../model/createcategory")
const addproductController=require("../controller/addproductcontroller")
const upload=require("../multer/allmulter")


router.post("/createcategory",productupdates.addCategory)
router.get("/categories",productupdates.getCategory)
router.get("/addproduct",(req,res)=>{res.render("admin/page-form-product-1")})
router.post("/addproduct",upload.array("images",5),addproductController.addProduct)

router.get("/editcategory/:id",productupdates.editCategory)
router.put("/editcategory/:id",productupdates.updateCategory)
router.post("/toggle-category/:id",productupdates.toggleStatus)







module.exports=router