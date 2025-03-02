const User=require("../model/user")
const product=require("../model/addproduct")
const Order=require("../model/order")
const { generateInvoice } = require("../utils/invoiceGenerator"); // Assume you have a utility to generate invoices


const ordermanagement={
    loadOrderDetails:async(req,res)=>{
        try{
            
            const orders=await Order.find()
            .populate("user","name price phone")
            .populate("products.product","name price image")
            .populate('shippingAddress', 'city address zipCode');
            if (!orders || orders.lengthv=== 0) {
                return res.status(404).json({ message: 'Order not found' });
            }
            const order = await Order.find();
            res.render("admin/ordermanagement",{orders,order})

        }catch(error){
            console.log(error)
            res.status(500).json({ message: 'Error fetching order details'});
        }
    },
    updateOrderStatus:async(req,res)=>{
        try{
            const {orderStatus}=req.body
            const orderId=req.params.id;
            console.log("update status",orderId)
            console.log("updatestatus",req.body)
            const order = await Order.findByIdAndUpdate(orderId,
                {orderStatus},
                {new:true}
            );
            res.status(200).json({ message: "Order status updated successfully", order});
            

        }catch(error){
            console.log(error)
            res.status(500).json({ message: "Internal Server Error" });
        }
    },
    downloadInvoice:async(req,res)=>{
        try{
            const { period, date } = req.query;

            if (!period || !date) {
                return res.status(400).json({ message: "Period and date are required" });
            }
    
            // Calculate start and end dates based on the selected period
            const startDate = new Date(date);
            const endDate = new Date(date);
    
            if (period === "daily") {
                endDate.setDate(startDate.getDate() + 1);
            } else if (period === "monthly") {
                endDate.setMonth(startDate.getMonth() + 1);
            } else if (period === "yearly") {
                endDate.setFullYear(startDate.getFullYear() + 1);
            }
    
            // Fetch orders within the selected period
            const orders = await Order.find({
                createdAt: { $gte: startDate, $lt: endDate },
            }).populate("user", "name email phone")
              .populate("products.product", "name price image");
    
            if (!orders || orders.length === 0) {
                return res.status(404).json({ message: "No orders found for the selected period" });
            }
    
            // Generate the invoice (PDF or Excel)
            const invoicePath = await generateInvoice(orders, period, date);
    
            // Send the invoice file as a response
            res.download(invoicePath, `invoice-${period}-${date}.pdf`, (err) => {
                if (err) {
                    console.error("Error downloading invoice:", err);
                    res.status(500).json({ message: "Failed to download invoice" });
                }
            });
        }catch(error){
            console.log(error)
            res.status(500).json({ message: "Internal Server Error" });
        }
    }

}
module.exports=ordermanagement