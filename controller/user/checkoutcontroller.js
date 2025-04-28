const jwt = require("jsonwebtoken")
const User = require("../../model/user")
const Address = require("../../model/address")
const Product = require("../../model/addproduct")
const Cart = require("../../model/cart")
const Coupon = require("../../model/coupon")
const statusCode = require("../../utils/statuscode")


const checkoutcontroller = {
    getCheckOutPage: async (req, res) => {
        try {
            const userId = req.params.id
            const user = await User.findById(userId)
            const addresses = await Address.find({ user: userId })
            // console.log("checkout address:", addresses)
            // console.log("Chekout page", userId)
            const cart = await Cart.findOne({ user: userId }).populate({
                path: 'products.product',
                model: 'Product'
            })
            // console.log(cart)
            if (!cart) {
                return res.status(statusCode.NOT_FOUND).send("Cart not found");
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
            const regularCouponQuery = {
                isActive: true,
                validUntil: { $gte: new Date() },

            };

            const referrablecoupon = user.referredBy || (user.referralDetails && user.referralDetails.length > 0)
            if (!referrablecoupon) {
                regularCouponQuery.name = { $ne: "Reward Coupon" };
                regularCouponQuery.code = { $ne: "reward" };

            }

            let activeCoupon = await Coupon.find(regularCouponQuery).sort({ createdAt: -1 })
            // console.log("activeCoupon",activeCoupon)
            activeCoupon = activeCoupon.filter((coupon) => {
                return !coupon.usersUsed.includes(userId)
            })

            if (cart.products.length === 0) {
                req.flash("error", 'Cart is empty')
                res.redirect("/user/dashboard/addtocart")
            }

            res.render("user/checkout", {
                coupons: activeCoupon,
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
            res.status(statusCode.INTERNAL_SERVER_ERROR).send("Internal Server Error");
        }


    },
    applyCoupon: async (req, res) => {
        try {
            const { couponId, userId } = req.body
            // console.log(couponId,userId)

            if (!couponId || !userId) {
                return res.status(statusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: "Missing required Parameters" })
            }
            // console.log("1")

            const coupon = await Coupon.findById(couponId)

            if (!coupon) {
                return res.status(statusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: "Coupon not found" })
            }
            if (!coupon.isActive) {
                return res.status(statusCode.BAD_REQUEST).json({ success: false, message: "This coupon is no longer active" })
            }
            const now = new Date()
            if (now < coupon.validFrom || now > coupon.validUntil) {
                return res.status(statusCode.BAD_REQUEST).json({ success: false, message: "coupon is expired" })
            }
            // console.log("2")
            if (coupon.usersUsed && coupon.usersUsed.includes(userId)) {
                return res.status(statusCode.BAD_REQUEST).json({ success: false, message: "coupon usage limited to one per User" })
            }
            const cart = await Cart.findOne({ user: userId })
                .populate("products.product")
            // console.log("reached")

            if (!cart) {
                return res.status(statusCode.BAD_REQUEST).json({ success: false, message: "Cart not found" })
            }
            // console.log("reached")
            let cartTotal = 0;
            cart.products.forEach(item => {
                // console.log("Product:", item.product); 
                // console.log("Price:", item.product.price); 
                // console.log("Discount:", item.product.discount);
                cartTotal += item.quantity * (item.product.price - item.product.discount);
            });
            // console.log("reached",cartTotal)

            if (cartTotal < coupon.minOrderAmount) {
                // console.log("Cart total:", cartTotal);
                // console.log("Minimum order amount:", coupon.minOrderAmount);
                return res.status(statusCode.BAD_REQUEST).json({
                    success: false,
                    message: `Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon`
                });
            }
            // console.log("reached herere")
            // console.log("3")
            let discountAmount = 0;
            if (coupon.discountType === 'percentage') {
                discountAmount = (cartTotal * coupon.discountValue) / 100;

                if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
                    discountAmount = coupon.maxDiscountAmount;
                }
            } else {

                discountAmount = coupon.discountValue;
            }
            // console.log("4")
            discountAmount = Math.round(discountAmount * 100) / 100;

            cart.appliedCoupon = {
                coupon: coupon._id,
                code: coupon.code,
                discountAmount: discountAmount
            };

            await cart.save();
            // console.log("5")

            return res.status(statusCode.OK).json({
                success: true,
                message: `Coupon applied successfully! You saved ₹${discountAmount}`,
                discountAmount
            });


        } catch (error) {
            console.log(error)
            return res.status(statusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Internal server error' });

        }

    }


}
module.exports = checkoutcontroller