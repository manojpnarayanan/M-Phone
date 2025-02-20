const express=require("express")
const router=express.Router()
const productRoute=require("../router/productRoutes")
const productController=require("../controller/productcontroller")
const Brands=require("../router/brands")
const brandController=require("../controller/brandscontroller")
const addproductController=require("../controller/addproductcontroller")
const admincontroller=require("../controller/admincontroller")
const userList=require("../router/userlist")
const clientController=require("../controller/clientController")
const upload=require("../multer/allmulter")


router.get("/productlist",addproductController.getProduct)
router.patch("/productlist/:id",addproductController.blockProduct)
router.get("/products/edit/:id",addproductController.editProduct)
router.post("/products/edit/:id", upload.any(), addproductController.updateEditProduct)

router.get("/productgrid",(req,res)=>{res.render("admin/page-products-grid")})
router.get("/brands",brandController.getBrands,)
router.get("/categories",productController.getCategory,(req,res)=>{res.render("admin/page-categories")})
router.post("/categories/:id",productController.blockCategory)

router.get("/orders",clientController.loadUserList)
router.get("/orderdetails",(req,res)=>{res.render("admin/page-orders-detail")})
router.use("/products",productRoute)
router.use("/brands",Brands)
router.use("/orders",userList)

module.exports=router