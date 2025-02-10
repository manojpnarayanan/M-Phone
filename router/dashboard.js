const express=require("express")
const router=express.Router()
const productRoute=require("../router/productRoutes")
const productController=require("../controller/productcontroller")
const Brands=require("../router/brands")
const brandController=require("../controller/brandscontroller")
const addproductController=require("../controller/addproductcontroller")
const admincontroller=require("../controller/admincontroller")

router.get("/productlist",addproductController.getProduct)
router.get("/productgrid",(req,res)=>{res.render("admin/page-products-grid")})
router.get("/brands",brandController.getBrands,)
router.get("/categories",productController.getCategory,(req,res)=>{res.render("admin/page-categories")})
router.get("/orders",admincontroller.loadUserList)
router.get("/orderdetails",(req,res)=>{res.render("admin/page-orders-detail")})
router.use("/products",productRoute)
router.use("/brands",Brands)

module.exports=router