const User = require("../model/user")
const product = require("../model/addproduct")
const Order = require("../model/order")
const { generateInvoice } = require("../utils/invoiceGenerator"); // Assume you have a utility to generate invoices
const fs = require('fs');
const PDFDocument = require('pdfkit');
const path = require('path');




const ordermanagement = {
    loadOrderDetails: async (req, res) => {
        try {

            const orders = await Order.find()
                 .sort({createdAt:-1})
                .populate("user", "name price phone")
                .populate("products.product", "name price image")
                .populate('shippingAddress')
                
                
            if (!orders || orders.lengthv === 0) {
                return res.status(404).json({ message: 'Order not found' });
            }
            const order = await Order.find();
            res.render("admin/ordermanagement", { orders, order })

        } catch (error) {
            console.log(error)
            res.status(500).json({ message: 'Error fetching order details' });
        }
    },
    updateOrderStatus: async (req, res) => {
        try {
            const { orderStatus } = req.body
            const orderId = req.params.id;
            // console.log("update status",orderId)
            // console.log("updatestatus",req.body)
            const order = await Order.findByIdAndUpdate(orderId,
                { orderStatus },
                { new: true }
            );
            res.status(200).json({ message: "Order status updated successfully", order });


        } catch (error) {
            console.log(error)
            res.status(500).json({ message: "Internal Server Error" });
        }
    },
    updateProductStatus:async(req,res)=>{
        try{
            const orderId = req.params.orderId;
            const productId = req.params.productId;
            const { productStatus, productIndex } = req.body;

            const order = await Order.findById(orderId);
            
            if (!order) {
                return res.status(404).json({ message: "Order not found" });
            }
            if (order.products[productIndex] && 
                order.products[productIndex].product.toString() === productId) {
                order.products[productIndex].status = productStatus;
                const allSameStatus = order.products.every(item => item.status === productStatus);
                if (allSameStatus) {
                    order.orderStatus = productStatus;
                } else {
                    // If products have different statuses, set a mixed status
                    order.orderStatus = "Processing";
                } 
                await order.save();
                
                return res.status(200).json({ 
                    message: "Product status updated successfully", 
                    order 
                });
            } else {
                return res.status(404).json({ message: "Product not found in order" });
            }

        }catch(error){
            console.log(error)
        }
    },
    downloadInvoice: async (req, res) => {
        try {
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
        } catch (error) {
            console.log(error)
            res.status(500).json({ message: "Internal Server Error" });
        }
    },
    generateInvoice : async (orders, period, date) => {
        // Create a new PDF document
        const doc = new PDFDocument();
    
        // Set the file path for the generated PDF
        const invoicePath = `./invoices/invoice-${period}-${date}.pdf`;
    
        // Pipe the PDF to a writable stream (save to file)
        doc.pipe(fs.createWriteStream(invoicePath));
    
        // Add content to the PDF
        doc.fontSize(25).text(`Invoice for ${period} - ${date}`, 100, 80);
    
        // Add order details
        let y = 150;
        orders.forEach((order, index) => {
            doc.fontSize(12)
                .text(`Order ID: ${order._id}`, 100, y)
                .text(`Customer: ${order.user.name}`, 100, y + 20)
                .text(`Total Amount: $${order.totalAmount.toFixed(2)}`, 100, y + 40)
                .moveDown();
            y += 80; // Move down for the next order
        });
    
        // Finalize the PDF
        doc.end();
    
        // Return the path to the generated PDF
        return invoicePath;
    }
    

}
module.exports = ordermanagement