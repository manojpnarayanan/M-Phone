const jwt = require("jsonwebtoken")
const User = require("../../model/user")
const Address = require("../../model/address")
const product = require("../../model/addproduct")
const Cart = require("../../model/cart")

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
                totalDiscount += item.quantity * item.product.discount;
            });
            const gst = totalPrice * 0.18;
            const deliveryCharges = totalPrice > 50000 ? 0 : 100;

            res.render("user/checkout", {
                user,
                product: cart.products,
                addresses,
                totalItems,
                totalDiscount,
                totalPrice,
                gst,
                deliveryCharges


            })
        } catch (error) {
            console.log(error)
            res.status(500).send("Internal Server Error");
        }


    }

}
module.exports = checkoutcontroller