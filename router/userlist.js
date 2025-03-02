const express=require("express")
const router=express.Router()
const User=require("../model/user")
const clientController=require("../controller/clientController")



router.post("/:id",clientController.blockUser)









module.exports=router