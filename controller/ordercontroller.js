const User = require("../model/user")
const product = require("../model/addproduct")
const Order = require("../model/order")
const { generateInvoice } = require("../utils/invoicegenerator");
const fs = require('fs');
const PDFDocument = require('pdfkit');
const path = require('path');
const Wallet = require("../model/wallet");
const Admin = require("../model/admin")
const Address = require("../model/address")
const Coupon=require("../model/coupon")




const ordermanagement = {
    loadOrderDetails: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const itemsPerPage = 10;
            const searchTerm = req.query.search || "";
            console.log("searchTerm", searchTerm)
            let searchQuery = { paymentStatus: "completed" };

            if (searchTerm) {
                const matchingUsers = await User.find({
                    $or: [
                        { name: { $regex: searchTerm, $options: "i" } },
                        { email: { $regex: searchTerm, $options: 'i' } },
                        { phone: { $regex: searchTerm, $options: 'i' } }

                    ]
                }).select('_id');
                const userIds = matchingUsers.map(user => user._id);

                const matchingAddresses = await Address.find({
                    $or: [
                        { city: { $regex: searchTerm, $options: 'i' } },
                        { state: { $regex: searchTerm, $options: 'i' } },
                        { housename: { $regex: searchTerm, $options: 'i' } },
                        { pincode: { $regex: searchTerm, $options: 'i' } }
                    ]
                }).select('_id');

                const addressIds = matchingAddresses.map(address => address._id);
                const matchingProducts = await product.find({
                    name: { $regex: searchTerm, $options: 'i' }
                }).select('_id');
                const productIds = matchingProducts.map(product => product._id);


                searchQuery = {
                    $or: [
                        { user: { $in: userIds } },
                        { shippingAddress: { $in: addressIds } },
                        { 'products.product': { $in: productIds } }
                    ]
                };

            }

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
            const totalOrders = await Order.countDocuments(searchQuery);
            const totalPages = Math.ceil(totalOrders / itemsPerPage)
            if (page > totalPages && totalPages > 0) {
                return res.redirect(`?page=${totalPages}`);
            }

            const orders = await Order.find(searchQuery)
                .sort({ createdAt: -1 })
                .skip((page - 1) * itemsPerPage)
                .limit(itemsPerPage)
                .populate("user", "name price phone email")
                .populate("products.product", "name price image")
                .populate('shippingAddress')


            const order = await Order.find();
            res.render("admin/ordermanagement", {
                orders,
                order,
                currentPage: page,
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

            const index = parseInt(productIndex, 10);

            const order = await Order.findById(orderId).populate("user")
                .populate("products.product");

            if (!order) {
                console.error("Order not found:", orderId);
                return res.status(404).json({ message: "Order not found" });
            }

            if (!order.products || order.products.length <= index) {
                console.error("Invalid product index:", index, "Total products:", order.products.length);
                return res.status(400).json({ message: "Invalid product index" });
            }

            const currentProduct = order.products[index];

            if (currentProduct.product._id.toString() !== productId) {
                console.error("Product ID mismatch", {
                    currentProductId: currentProduct.product._id.toString(),
                    expectedProductId: productId
                });
                return res.status(400).json({ message: "Product ID mismatch" });
            }

            // Handle refunds for Cancelled or Returned status
            if (productStatus === "Cancelled" || productStatus === "Returned") {
                // Calculate refund amount properly with GST
                let refundAmount = 0;

                if (order.products.length === 1) {
                    // If this is the only product, refund the final amount
                    refundAmount = order.finalAmount;
                } else {
                    // Calculate refund with GST for this specific product
                    refundAmount = currentProduct.quantity * currentProduct.price * 1.18; // Adding 18% GST
                }

                console.log("Initial refundAmount:", refundAmount);

                // Handle coupon adjustments for online payments
                if (order.paymentMethod === 'razor-pay' && order.paymentStatus === 'completed') {
                    if (order.couponApplied && order.couponApplied.code) {
                        const coupon = await Coupon.findOne({ code: order.couponApplied.code });

                        if (coupon) {
                            const newTotalAmount = order.totalAmount - refundAmount;
                            console.log("newTotalAmount:", newTotalAmount);

                            if (newTotalAmount < coupon.minOrderAmount) {
                                const adjustedRefundAmount = refundAmount - order.couponApplied.discountAmount;
                                console.log("adjustedRefundAmount:", adjustedRefundAmount);

                                refundAmount = Math.max(adjustedRefundAmount, 0);
                                console.log("Final refundAmount:", refundAmount);
                            }
                        }
                    }
                }

                // Process the wallet refund
                const wallet = await Wallet.findOne({ userId: order.user });
                console.log("wallet", wallet);
                if (!wallet) {
                    return res.status(404).json({ success: false, message: "Wallet not found" });
                }

                wallet.transactions.push({
                    orderId: order._id,
                    transactionType: 'credit',
                    transactionAmount: refundAmount,
                    transactionDescription: `Refund for ${productStatus} product in order ${order.orderId}`
                });

                await wallet.save();

                // Update admin wallet
                const admin = await Admin.find();
                const adminId = admin[0]._id;
                let adminWallet = await Wallet.findOne({ userId: adminId });
                if (!adminWallet) {
                    return res.status(400).json({ success: false, message: "Wallet not found" });
                }

                adminWallet.transactions.push({
                    orderId: order._id,
                    transactionType: "debit",
                    transactionAmount: refundAmount,
                    transactionDescription: `Refund for ${productStatus} in order ${order.orderId}`
                });
                await adminWallet.save();

                // Add to cancelled products array
                order.cancelledProducts.push({
                    product: currentProduct.product._id,
                    quantity: currentProduct.quantity,
                    price: currentProduct.price
                });

                // Update product stock
                await product.findByIdAndUpdate(
                    currentProduct.product._id,
                    { $inc: { stock: currentProduct.quantity } },
                    { new: true }
                );
            }

            // Update product status
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


            const startDate = new Date(date);
            const endDate = new Date(date);

            if (period === "daily") {
                endDate.setDate(startDate.getDate() + 1);
            } else if (period === "monthly") {
                endDate.setMonth(startDate.getMonth() + 1);
            } else if (period === "yearly") {
                endDate.setFullYear(startDate.getFullYear() + 1);
            }


            const orders = await Order.find({
                createdAt: { $gte: startDate, $lt: endDate },
            }).populate("user", "name email phone")
                .populate("products.product", "name price image");

            if (!orders || orders.length === 0) {
                return res.status(404).json({ message: "No orders found for the selected period" });
            }


            const invoicePath = await generateInvoice(orders, period, date);


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
    generateInvoice: async (orders, period, date) => {

        const doc = new PDFDocument();
        const invoicePath = `./invoices/invoice-${period}-${date}.pdf`;
        doc.pipe(fs.createWriteStream(invoicePath));
        doc.fontSize(25).text(`Invoice for ${period} - ${date}`, 100, 80);
        let y = 150;
        orders.forEach((order, index) => {
            doc.fontSize(12)
                .text(`Order ID: ${order._id}`, 100, y)
                .text(`Customer: ${order.user.name}`, 100, y + 20)
                .text(`Total Amount: $${order.totalAmount.toFixed(2)}`, 100, y + 40)
                .moveDown();
            y += 80;
        });
        doc.end();
        return invoicePath;
    }


}
module.exports = ordermanagement