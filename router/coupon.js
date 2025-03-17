const express=require("express")
const router=express.Router()
const couponController=require("../controller/couponcontroller")


router.get("/edit/:id",couponController.loadeditcoupon)
router.post("/toggle/:id",couponController.blockCoupon)
router.post("/edit/:id",couponController.updateEditCoupon)
module.exports=router