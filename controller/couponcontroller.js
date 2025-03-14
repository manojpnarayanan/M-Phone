const Coupon=require("../model/coupon")


const couponController={
    loadCoupon:async (req,res)=>{
        try{
            const coupons=await Coupon.find()
            res.render("admin/coupon",{coupons})

        }catch(error){
            console.log(error)
        }
    },
    createCoupon:async (req,res)=>{
        try{
            console.log(req.body)

            const coupon =new Coupon({
                name:req.body.name,
                code:req.body.code,
                discountType: req.body.discountType,
                discountValue: req.body.discountValue,
                minOrderAmount: req.body.minOrderAmount,
                maxDiscountAmount: req.body.maxDiscountAmount,
                validFrom: req.body.validFrom,
                validUntil: req.body.validUntil,
                usageLimit: req.body.usageLimit
            })
            console.log(coupon)
            await coupon.save()
            res.status(200).json({success:true, message:"coupon added suceesfully"})

        }catch(error){
            console.log(error)
            res.status(500).json({success:false, message:"Failed to add coupon"})
        }
    },
    loadeditcoupon:async(req,res)=>{
        try{
            const couponId=req.params.id
            console.log(couponId)
            const coupon=await Coupon.findById(couponId)

            res.render("admin/edit-coupon",{coupon})

        }catch(error){

        }
    },
    blockCoupon:async(req,res)=>{
        try{
            const couponId=req.params.id
            
            if(!couponId){
              return  res.status(400).json({success:false, message:"coupon required"})
            }
            const coupon=await Coupon.findById(couponId)

            if(!coupon){
               return res.status(400).json({success:false, message:"Coupon not found"})
            }
            coupon.isActive = !coupon.isActive;

        await coupon.save()

        return res.status(200).json({ 
            success: true, 
            message: `Coupon ${coupon.isActive ? 'activated' : 'deactivated'} successfully`,
            isActive: coupon.isActive 
        });

        }catch(error){
            console.log(error)
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }
}
module.exports=couponController