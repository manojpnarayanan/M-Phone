const User=require("../../model/user")
const Address=require("../../model/address")
const product=require("../../model/addproduct")
const jwt=require("jsonwebtoken")
const Order=require("../../model/order")


const orderController={
    placeOrder:async(req,res)=>{
        try{
            const {userId, products, shippingAddress, paymentMethod, totalAmount, discount, finalAmount}=req.body
            console.log("PlaceOredr:",req.body)
             // Create a new order
        const newOrder = new Order({
            user: userId,
            products: products.map(item => ({
                product: item.product,
                quantity: item.quantity,
                price: item.price
            })),
            shippingAddress,
            paymentMethod,
            totalAmount,
            discount,
            finalAmount,
            orderStatus: 'Pending' // Default status
        });

        // Save the order to the database
        await newOrder.save();
        // Add the order to the user's order history
        await User.findByIdAndUpdate(userId, { $push: { orders: newOrder._id } });
         // Send a success response
         res.status(200).json({
            success: true,
            orderId: newOrder._id,
            message: 'Order placed successfully'
        });

            
        }catch(error){
            console.log(error)
        }
    },
    getOrderConfirmationPage:async (req,res)=>{
       try{
        console.log("confirmation Page")
        const token=req.cookies.token
        const decoded=jwt.verify(token,process.env.JWT_SECRET)
        const userId=decoded.id
        console.log(userId)
        const orderId=req.params.id
        console.log(orderId)
        const order=await Order.findById(orderId)
        .populate("user")
        .populate("products.product")
        .populate("shippingAddress")
        console.log(order)
          res.render("user/orderconfirmation",{order})
       }catch(error){
        console.log(error)
       }
    },
    cancelOrder:async(req,res)=>{
        try{
             const orderId=req.params.id

        }catch(error){
           console.log(error)
        }
    }
}
module.exports=orderController