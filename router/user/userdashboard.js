const express=require("express")

const router=express.Router()
const Product=require("../../model/addproduct")
const userController=require("../../controller/user/userController")
const userViews=require("../../controller/user/userviews")
const middleware=require("../../middleware/user")
const wishlistController=require("../../controller/user/wishcontroller")

router.get("/products",middleware.existUser,userController.loadDashboard)
router.get("/products/:id",userViews.productDetails)
router.get("/shopping",userViews.loadShoppingPage)
router.get("/shopping/:id",wishlistController.loadWishlist)
router.post("/shopping/:id",wishlistController.addtoWishlist)
router.get("/addtocart", userViews.loadAddToCart);
router.post("/addtocart/:id",userViews.addToCart)
router.post("/addtocart/update/:id",userViews.updateCart)
router.post("/addtocart/remove/:id",userViews.removeFromCart)


module.exports=router