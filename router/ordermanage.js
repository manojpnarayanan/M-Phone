const express=require("express")
const router=express.Router()
const orderController=require("../controller/ordercontroller")
const walletController=require("../controller/walletcontroller")

router.get("/view-detail/:id",walletController.viewOrderdetailPage)
router.get("/downloadinvoice",orderController.downloadInvoice)
router.post("/:id",orderController.updateOrderStatus)
router.post("/:orderId/:productId",orderController.updateProductStatus)

module.exports=router