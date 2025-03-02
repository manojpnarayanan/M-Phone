const express=require("express")
const router=express.Router()
const orderController=require("../controller/ordercontroller")


router.get("/downloadinvoice",orderController.downloadInvoice)
router.post("/:id",orderController.updateOrderStatus)

module.exports=router