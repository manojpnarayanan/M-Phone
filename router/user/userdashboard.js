const express=require("express")

const router=express.Router()
const Product=require("../../model/addproduct")
const userController=require("../../controller/user/userController")
const userViews=require("../../controller/user/userviews")


router.get("/products",userController.loadDashboard)
router.get("/products/:id",userViews.productDetails)
router.get("/shopping",userViews.loadShoppingPage)

 


module.exports=router