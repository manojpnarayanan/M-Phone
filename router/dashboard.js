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
const orderController=require("../controller/ordercontroller")
const ordermanage=require("../router/ordermanage")
const salesController=require("../controller/salescontroller")
const couponController=require("../controller/couponcontroller")
const copounrouter=require("../router/coupon")

router.get("/productlist",addproductController.getProduct)
router.patch("/productlist/:id",addproductController.blockProduct)
router.get("/products/edit/:id",addproductController.editProduct)
router.post("/products/edit/:id", upload.any(), addproductController.updateEditProduct)
router.put("/products/add-offer/:id",addproductController.addOffer)
router.put("/products/remove-offer/:id",addproductController.removeOffer)


router.get("/productgrid",(req,res)=>{res.render("admin/page-products-grid")})
router.get("/brands",brandController.getBrands,)
router.get("/categories",productController.getCategory,(req,res)=>{res.render("admin/page-categories")})
router.post("/categories/:id",productController.blockCategory)
router.put("/categories/add-offer/:id",productController.addOffer)
router.put("/categories/remove-offer/:id",productController.removeOffer)

router.get("/orders",clientController.loadUserList)
router.get("/ordermanage",orderController.loadOrderDetails)
router.get("/orderdetails",(req,res)=>{res.render("admin/page-orders-detail")})

router.get("/sales-report",salesController.loadsalesreport)
router.get("/sales-report/download-invoice", salesController.downloadInvoice);

router.get("/coupons",couponController.loadCoupon)
router.post("/coupons",couponController.createCoupon)

router.use("/coupons",copounrouter)
router.use("/products",productRoute)
router.use("/brands",Brands)
router.use("/orders",userList)
router.use("/ordermanage",ordermanage)

module.exports=router