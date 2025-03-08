const express=require("express")
const router=express.Router()
const upload = require("../../multer/allmulter"); // Import multer middleware

const orderController=require("../../controller/user/ordercontroller")
const profileController=require("../../controller/user/profilecontroller")
const userViews=require("../../controller/user/userviews")
const profilecontroller = require("../../controller/user/profilecontroller")
const checkOutController=require("../../controller/user/checkoutcontroller")
const wishlistController=require("../../controller/user/wishcontroller")
const walletController=require("../../controller/user/walletcontroller")

router.get("/addaddress/:id",profileController.loadAddressPage)
router.post("/addaddress/:id",profileController.saveAddress)

router.get("/editaddress/:id",profileController.loadEditAddress)
router.post("/editaddress/:id",profilecontroller.updateAddress)
router.post("/change-password",profileController.changePassword)
router.delete("/deleteaddress/:id",profilecontroller.deleteAddress)
router.get("/wishlist",wishlistController.loadWishlist)
router.delete("/deletewishlist/:id",wishlistController.deleteWishlistItems)
router.get("/checkout/:id",checkOutController.getCheckOutPage)
router.post("/update-email",upload.single("photo"),profileController.userProfileUpdate)
router.post("/order-placed",orderController.placeOrder)
router.get("/order-confirmed/:id",orderController.getOrderConfirmationPage)
router.post("/cancel-order/:id",orderController.cancelOrder)
router.post("/return-order/:id",orderController.returnOrder)

router.post("/create-wallet",walletController.createWallet)
router.get("/wallet",walletController.getWallet)
router.post("/wallet/add-funds",walletController.addFunds)
router.get("/:id/download-invoice",orderController.downloadInvoice)

router.post("/:id",wishlistController.addToCartFromWishlist)
router.get("/:id",userViews.loadMyProfile)
module.exports=router