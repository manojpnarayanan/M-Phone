const express=require("express")
const router=express.Router()
const orderController=require("../controller/ordercontroller")


router.get("/downloadinvoice",orderController.downloadInvoice)
router.post("/:id",orderController.updateOrderStatus)
router.post("/:orderId/:productId",orderController.updateProductStatus)

module.exports=router