const User = require("../../model/user")
const Product = require("../../model/addproduct")
const jwt = require("jsonwebtoken")
const Order = require("../../model/order")
const Review = require("../../model/review")
const statusCode = require("../../utils/statuscode")


const reviewController = {
    loadReviewPage: async (req, res) => {
        try {
            const orderId = req.params.id
            // console.log(orderId)
            const order = await Order.findById(orderId)
                .populate("products.product")
            if (!order) {
                return res.status(statusCode.NOT_FOUND).send('Order not found');
            }

            const products = order.products;
            if (!products || products.length === 0) {
                return res.status(statusCode.NOT_FOUND).send('No products found in this order');
            }
            // console.log("Products in order:", products);

            const productInOrder = order.products[0];
            if (!productInOrder) {
                return res.status(statusCode.NOT_FOUND).send('No products found in this order');
            }
            const productId = productInOrder.product._id;
            // console.log("loadproductpage,productId", productId)
            // console.log("loadreview Page:", order)

            res.render("user/writereview", {
                orderId: order._id,
                productId,
                products: products
            })

        } catch (error) {
            console.log(error)
        }

    },
    submitReview: async (req, res) => {
        try {
            const orderId = req.params.id
            // console.log("orderId", orderId)
            const { productId, rating, comment } = req.body
            // console.log("req.body", req.body)
            if (!productId || !rating || !comment) {
                return res.status(statusCode.BAD_REQUEST).json({ success: false, message: 'All fields are required' });
            }
            const token = req.cookies.token
            const decoded = jwt.verify(token, process.env.JWT_SECRET)

            const userId = decoded.id
            console.log(userId, "userId")

            const review = new Review({
                user: userId,
                product: productId,
                order: orderId,
                rating, comment
            })
            await review.save()
            res.json({ success: true, message: 'Review submitted successfully!' });

        } catch (error) {
            console.log(error)
            res.status(statusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to submit review.' });

        }


    }
}

module.exports = reviewController