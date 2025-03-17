const jwt = require("jsonwebtoken")
const User = require("../../model/user")
const Address = require("../../model/address")
const Product = require("../../model/addproduct")
const Cart = require("../../model/cart")
const Coupon=require("../../model/coupon")


const checkoutcontroller = {
    getCheckOutPage: async (req, res) => {
        try {
            const userId = req.params.id
            const user = await User.findById(userId)
            const addresses = await Address.find({ user: userId })
            console.log("checkout address:", addresses)
            console.log("Chekout page", userId)
            const cart = await Cart.findOne({ user: userId }).populate({
                path: 'products.product',
                model: 'Product'
            })
            console.log(cart)
            if (!cart) {
                return res.status(404).send("Cart not found");
            }
            let totalPrice = 0;
            let totalDiscount = 0;
            let totalItems = 0
            cart.products.forEach(item => {
                totalItems += item.quantity;
                totalPrice += item.quantity * item.product.price;
                // totalDiscount += item.quantity * item.product.discount;
                totalDiscount += item.quantity * (item.product.price * (item.product.discount / 100));

            });
            const gst = totalPrice * 0.18;
            const deliveryCharges = totalPrice > 50000 ? 0 : 100;
            let couponDiscount = 0;
            let appliedCouponCode = '';

            if (cart.appliedCoupon && cart.appliedCoupon.discountAmount) {
                couponDiscount = cart.appliedCoupon.discountAmount;
                appliedCouponCode = cart.appliedCoupon.code;

            }

             console.log("couponDiscount",couponDiscount)
            const activeCoupon=await Coupon.find({
                isActive:true,
                validFrom:{$lte:new Date()},
                validUntil:{$gte: new Date()},
            }).sort({createdAt:-1})

            if(cart.products.length===0){
                // return res.status(400).json({success:false, message:"cart is empty"})
                req.flash("error",'Cart is empty')
                res.redirect("/user/dashboard/addtocart")
            }

            res.render("user/checkout", {
                coupons:activeCoupon,
                user,
                product: cart.products,
                addresses,
                totalItems,
                totalDiscount,
                totalPrice,
                gst,
                deliveryCharges,
                couponDiscount,
                appliedCouponCode


            })
        } catch (error) {
            console.log(error)
            res.status(500).send("Internal Server Error");
        }


    },
    applyCoupon:async(req,res)=>{
        try{
            const {couponId,userId}=req.body
            console.log(couponId,userId)

            if(!couponId || !userId){
                return res.status(500).json({success:false, message:"Missing required Parameters"})
            }
            console.log("1")

            const coupon=await Coupon.findById(couponId)

            if(!coupon){
                return res.status(500).json({success:false, message:"Coupon not found"})
            }
            if(!coupon.isActive){
                return res.status(400).json({success:false, message:"This coupon is no longer active"})
            }
            const now=new Date()
            if(now<coupon.validFrom || now>coupon.validUntil){
                return res.status(400).json({success:false, message:"coupon is expired"})
            }
            console.log("2")
            const cart=await Cart.findOne({user:userId})
            .populate("products.product")
            console.log("reached")

            if(!cart){
                return res.status(400).json({success:false, message:"Cart not found"})
            }
            console.log("reached")
            let cartTotal = 0;
            cart.products.forEach(item => {
                console.log("Product:", item.product); // Debugging
                console.log("Price:", item.product.price); // Debugging
                console.log("Discount:", item.product.discount);
                cartTotal += item.quantity * (item.product.price - item.product.discount);
            });
            console.log("reached",cartTotal)

            if ( cartTotal < coupon.minOrderAmount) {
                console.log("Cart total:", cartTotal); // Debugging
    console.log("Minimum order amount:", coupon.minOrderAmount);
                return res.status(400).json({ 
                    success: false, 
                    message: `Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon` 
                });
            }
            console.log("reached herere")
            console.log("3")
            let discountAmount = 0;
        if (coupon.discountType === 'percentage') {
            discountAmount = (cartTotal * coupon.discountValue) / 100;
            // Apply max discount cap if present
            if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
                discountAmount = coupon.maxDiscountAmount;
            }
        } else {
            // Fixed amount discount
            discountAmount = coupon.discountValue;
        }
        console.log("4")
        discountAmount = Math.round(discountAmount * 100) / 100;

        cart.appliedCoupon = {
            coupon: coupon._id,
            code: coupon.code,
            discountAmount: discountAmount
        };

        await cart.save();
        console.log("5")

        return res.status(200).json({ 
            success: true, 
            message: `Coupon applied successfully! You saved ₹${discountAmount}`,
            discountAmount
        });


        }catch(error){
            console.log(error)
            return res.status(500).json({ success: false, message: 'Internal server error' });

        }

    }


}
module.exports = checkoutcontroller