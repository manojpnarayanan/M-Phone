const User = require("../model/user")
const product = require("../model/addproduct")
const Order = require("../model/order")
const { generateInvoice } = require("../utils/invoiceGenerator"); // Assume you have a utility to generate invoices
const fs = require('fs');
const PDFDocument = require('pdfkit');
const path = require('path');
const Wallet = require("../model/wallet");
const Admin=require("../model/admin")




const ordermanagement = {
    loadOrderDetails: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const itemsPerPage = 6;
            const searchTerm=req.query.search|| "";
            console.log("searchTerm",searchTerm)

            const searchQuery=searchTerm?{
                $or:[
                    { 'user': { $elemMatch: { name: { $regex: searchTerm, $options: 'i' } } } },
                    {"shippingAddress.city":{$regex:searchTerm,$options:"i"}},
                    { 'user': { $elemMatch: { email: { $regex: searchTerm, $options: 'i' } } } },
                ]

            }:{};
            console.log(searchQuery)

            if (isNaN(page) || page < 1) {
                return res.status(400).render("admin/ordermanagement", { 
                    orders: [], 
                    currentPage: 1,
                    totalPages: 0,
                    totalOrders: 0,
                    searchTerm: searchTerm,
                    error: "Invalid page number"
                });
            }
            const totalOrders=await Order.countDocuments(searchQuery);
            const totalPages=Math.ceil(totalOrders/itemsPerPage)
            if (page > totalPages && totalPages > 0) {
                return res.redirect(`?page=${totalPages}`);
            }

            const orders = await Order.find(searchQuery)
                 .sort({createdAt:-1})
                 .skip((page -1)*itemsPerPage )
                 .limit(itemsPerPage)
                .populate("user", "name price phone")
                .populate("products.product", "name price image")
                .populate('shippingAddress')
                
                
            // if (!orders || orders.length === 0) {
            //     return res.status(404).render("admin/ordermanagement", { 
            //         orders: [], 
            //         currentPage: page,
            //         totalPages: 0,
            //         totalOrders: 0 
            //     });
            // }
            console.log("reached",orders.length)
            const order = await Order.find();
            res.render("admin/ordermanagement", { orders,
                order,
                currentPage:page,
                totalPages,
                totalOrders,
                searchTerm: searchTerm,
            })

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
    // updateProductStatus:async(req,res)=>{
    //     try{
    //         const orderId = req.params.orderId;
    //         const productId = req.params.productId;
    //         const { productStatus, productIndex } = req.body;
    //         // console.log("productStatus",productStatus,productIndex)
    //         console.log("Received Update Request:", {
    //             orderId, 
    //             productId, 
    //             productStatus, 
    //             productIndex
    //         });

    //         const order = await Order.findById(orderId).populate("user")
    //         .populate("products.product")
    //         // console.log("order",order)

    //         if (!order) {
    //             return res.status(404).json({ message: "Order not found" });
    //         }
    //         if (order.products[productIndex] && 
    //             order.products[productIndex].product.toString() === productId) {


    //                 if( order.products[productIndex].status==="Cancelled" ||  order.products[productIndex].status==="Returned"){
    //                     const wallet=await Wallet.findOne({userId:order.user})
    //                     if(!wallet){
    //                         return res.status(404).json({succcess:false, message:"Wallet not found"})
    //                 }
    //                 const productToRefund=order.products[productIndex]
    //                 const refundAmount= productToRefund.quantity * productToRefund.price
                    
    //                 wallet.transactions.push({
    //                     orderId: order._id,
    //                     transactionType: 'credit',
    //                     transactionAmount: refundAmount,
    //                     transactionDescription: `Refund for ${productStatus} product in order ${order.orderId}`
    //                 });
    
    //                 await wallet.save(); 
                

    //                 await product.findByIdAndUpdate(
    //                     productToRefund.product._id,
    //                     { $inc: { stock: productToRefund.quantity } },
    //                     { new: true }
    //                 );
    //             }
    //             console.log("reached")

    //             order.products[productIndex].status = productStatus;
    //             const allSameStatus = order.products.every(item => item.status === productStatus);
    //             if (allSameStatus) {
    //                 order.orderStatus = productStatus;
    //             } else {
    //                 // If products have different statuses, set a mixed status
    //                 order.orderStatus = "Processing";
    //             } 
    //             await order.save();
                
    //             return res.status(200).json({ 
    //                 message: "Product status updated successfully", 
    //                 order 
    //             });
    //         } else {
    //             return res.status(404).json({ message: "Product not found in order" });
    //         }

    //     }catch(error){
    //         console.log(error)
    //         res.status(500).json({ message: "Internal Server Error" });

    //     }
    // },
    
    updateProductStatus: async (req, res) => {
        try {
            const orderId = req.params.orderId;
            const productId = req.params.productId;
            const { productStatus, productIndex } = req.body;
            
            console.log("Received Update Request:", {
                orderId, 
                productId, 
                productStatus, 
                productIndex
            });

            // Convert productIndex to a number
            const index = parseInt(productIndex, 10);

            const order = await Order.findById(orderId).populate("user")
                .populate("products.product");

            if (!order) {
                console.error("Order not found:", orderId);
                return res.status(404).json({ message: "Order not found" });
            }

            // Additional validation
            if (!order.products || order.products.length <= index) {
                console.error("Invalid product index:", index, "Total products:", order.products.length);
                return res.status(400).json({ message: "Invalid product index" });
            }

            const currentProduct = order.products[index];
            
            console.log("Current Product:", {
                productId: currentProduct.product._id.toString(),
                expectedProductId: productId
            });

            if (currentProduct.product._id.toString() !== productId) {
                console.error("Product ID mismatch", {
                    currentProductId: currentProduct.product._id.toString(),
                    expectedProductId: productId
                });
                return res.status(400).json({ message: "Product ID mismatch" });
            }

            // Rest of the existing logic remains the same
            if (productStatus === "Cancelled" || productStatus === "Returned") {
                const wallet = await Wallet.findOne({userId: order.user});
                console.log("wallet",wallet)
                if (!wallet) {
                    return res.status(404).json({success: false, message: "Wallet not found"});
                }
                const refundAmount = currentProduct.quantity * currentProduct.price;
                
                wallet.transactions.push({
                    orderId: order._id,
                    transactionType: 'credit',
                    transactionAmount: refundAmount,
                    transactionDescription: `Refund for ${productStatus} product in order ${order.orderId}`
                });

                await wallet.save();

                const admin=await Admin.find()
                const adminId=admin[0]._id
                let adminWallet=await Wallet.findOne({userId:adminId})
                if(!adminWallet){
                    return res.status(400).json({success:false, message:"Wallet not found"})
                }
                adminWallet.transactions.push({
                    orderId:order._id,
                    transactionType:"debit",
                    transactionAmount:refundAmount,
                    transactionDescription:`Refund for ${productStatus} in order ${order.orderId}`
                })
                await adminWallet.save()
                
                

                await product.findByIdAndUpdate(
                    currentProduct.product._id,
                    { $inc: { stock: currentProduct.quantity } },
                    { new: true }
                );
            }

            currentProduct.status = productStatus;
            const allSameStatus = order.products.every(item => item.status === productStatus);
            
            if (allSameStatus) {
                order.orderStatus = productStatus;
            } else {
                order.orderStatus = "Processing";
            } 
            
            await order.save();
            
            return res.status(200).json({ 
                message: "Product status updated successfully", 
                order 
            });

        } catch (error) {
            console.error("Full error in updateProductStatus:", error);
            res.status(500).json({ 
                message: "Internal Server Error", 
                error: error.message 
            });
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