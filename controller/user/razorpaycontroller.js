const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../../model/order');
const User = require('../../model/user');
const Address = require("../../model/address")
const Product = require("../../model/addproduct")
const Cart = require('../../model/cart');
const env = require("dotenv")
const jwt = require("jsonwebtoken")
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Coupon = require("../../model/coupon");
const Wallet = require('../../model/wallet');
const Admin = require("../../model/admin")

env.config()

const generateInvoice = async (order, user, shippingAddress) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const invoicePath = path.join(__dirname, "../../public/invoices", `invoice_${order.orderId}.pdf`);
    console.log("Invoice Path:", invoicePath);


    const dir = path.dirname(invoicePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const writeStream = fs.createWriteStream(invoicePath);
    doc.pipe(writeStream);

    // Add invoice header
    doc.fontSize(20).text('Invoice', { align: 'center' });
    doc.moveDown();

    // Add order details
    doc.fontSize(14).text(`Order ID: ${order.orderId}`);
    doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`);
    doc.text(`User: ${user.name}`);
    doc.text(`Email: ${user.email}`);
    doc.moveDown();


    doc.fontSize(14).text('Shipping Address:', { underline: true });
    doc.text(`${shippingAddress.housename}, ${shippingAddress.city}, ${shippingAddress.state}, ${shippingAddress.pincode}, ${shippingAddress.country}`);
    doc.moveDown();


    doc.fontSize(14).text('Products:', { underline: true });
    order.products.forEach(async (item, index) => {
        const product = await Product.findById(item.product);
        doc.text(`${index + 1}. ${product.name} - ${item.quantity} x $${item.price.toFixed(2)}`);
    });
    doc.moveDown();


    doc.fontSize(14).text('Payment Details:', { underline: true });
    doc.text(`Payment Method: ${order.paymentMethod}`);
    doc.text(`Total Amount: $${order.totalAmount.toFixed(2)}`);
    doc.text(`Discount: $${order.discount.toFixed(2)}`);
    doc.text(`Final Amount: $${order.finalAmount.toFixed(2)}`);
    doc.moveDown();


    doc.fontSize(12).text('Thank you for shopping with us!', { align: 'center' });
    doc.end();

    return new Promise((resolve, reject) => {
        writeStream.on('finish', () => resolve(invoicePath));
        writeStream.on('error', reject);
    });
};

const updateProductQuantities = async (products) => {
    try {
        for (const item of products) {

            const product = await Product.findById(item.product);

            if (!product) {
                console.error(`Product with ID ${item.product} not found`);
                continue;
            }

            if (product.stock < item.quantity) {
                console.error(`Insufficient stock for product ${product.name}. Required: ${item.quantity}, Available: ${product.stock}`);
                continue;
            }


            await Product.findByIdAndUpdate(
                item.product,
                { $inc: { stock: -item.quantity } },
                { new: true }
            );

            if (product.stock - item.quantity <= 0) {
                await Product.findByIdAndUpdate(
                    item.product,
                    { availability: 'out_of_stock' },
                    { new: true }
                );
            }
        }
        console.log("Product stock updated successfully");
    } catch (error) {
        console.error("Error updating product stock:", error);
        throw error;
    }
};

const razorpay = new Razorpay({
    key_id: process.env.KEY_ID,
    key_secret: process.env.KEY_SECRET
})
const razorpayController = {

    razorpayOrder: async (req, res) => {
        try {
            const { amount, email, currency, receipt, orderData } = req.body
            console.log("req.body",req.body)

            if (!amount || !currency || !receipt) {
                return res.status(400).json({ success: false, message: "Missing required fields" })
            }
            const token = req.cookies.token
            const decoded = jwt.verify(token, process.env.JWT_SECRET)

            const cart = await Cart.findOne({ user: decoded.id })

            if (!cart || cart.products.length === 0) {
                return res.status(400).json({ success: false, message: "Cart is empty" })
            }

            for (const item of cart.products){
                const product=await Product.findById(item.product)
                console.log(product)
                if(!product){
                    return res.status(404).json({success:false, message:"Product not found"})
                }
                if(product.stock<item.quantity){
                    return res.status(400).json({success:false, message:"Insufficient stock"})
                }
            }

            const options = {
                amount: Math.round(amount),
                currency,
                receipt,
                payment_capture: 1
            }
            const razorpayOrder = await razorpay.orders.create(options);

            return res.status(200).json({
                success: true,
                orderId: razorpayOrder.id,
                message: 'Razorpay order created successfully'
            });


        } catch (error) {
            console.log(error)
            console.error("Error creating Razorpay order:", error);
            return res.status(500).json({
                success: false,
                message: 'Failed to create payment order. Please try again.',
                error: error.message
            });
        }
    },
    createFailedOrder: async (req, res) => {
        try {
            const orderData = req.body;
            // console.log("orderData",orderData)

            const newOrder = new Order({
                user: orderData.userId,
                shippingAddress: orderData.shippingAddress,
                totalAmount: orderData.totalAmount,
                discount: orderData.discount,
                couponDiscount: orderData.couponDiscount || 0,
                finalAmount: orderData.finalAmount,
                products: orderData.products,
                couponApplied: orderData.couponApplied ? {
                    code: orderData.couponApplied.code,
                    discountAmount: orderData.couponApplied.discountAmount
                } : null,
                paymentMethod: 'razor-pay',
                paymentStatus: 'failed',
                orderStatus: 'failed'
            })
            await newOrder.save();


            res.json({
                success: true,
                orderId: newOrder._id
            });

        } catch (error) {
            console.error('Error creating failed order:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create order record'
            });
        }

    },
    verifyRazorpayOrder: async (req, res) => {
        try {
            const {
                razorpay_payment_id,
                razorpay_order_id,
                razorpay_signature,
                orderData,
                orderId
            } = req.body;
            const generatedSignature = crypto
                .createHmac('sha256', process.env.KEY_SECRET)
                .update(razorpay_order_id + '|' + razorpay_payment_id)
                .digest('hex');
            //   console.log("reached razorpay verify")

            if (generatedSignature !== razorpay_signature) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid payment signature. Possible payment tampering detected.'
                });
            }

            const creditAdminWallet = async (order) => {
                const admin = await Admin.find();
                if (!admin || admin.length === 0) {
                    console.log("no admin fou nd")
                    return
                }
                const adminId = admin[0]._id;
                let adminWallet = await Wallet.findOne({ userId: adminId })
                console.log("adminWallet", adminWallet)

                if (!adminWallet) {
                    return res.status(400).json({ success: false, message: "Wallet not found" })
                }
                adminWallet.transactions.push({
                    orderId: order._id,
                    transactionType: "credit",
                    transactionAmount: order.finalAmount,
                    transactionDescription: `Payment for order ${order.orderId}`,
                })
                await adminWallet.save()

            }

            if (orderId) {
                const order = await Order.findById(orderId);
                if (!order) {
                    return res.status(404).json({ success: false, message: 'Order not found' });

                }
                order.paymentStatus = 'completed';
                order.orderStatus = 'Paid';
                order.paymentDetails = {
                    paymentId: razorpay_payment_id,
                    orderId: razorpay_order_id
                };
                const token = req.cookies.token
                const decoded = jwt.verify(token, process.env.JWT_SECRET)
                const couponApplied = await Coupon.findOne({ code: order.couponApplied.code })
                if (order.couponApplied && order.couponApplied.code) {
                    await Coupon.findOneAndUpdate(
                        { code: order.couponApplied.code },
                        {
                            $addToSet: { usersUsed: decoded.Id },
                            $inc: { usedCount: 1 }
                        },
                        { new: true }
                    );

                }
                await order.save();
                await updateProductQuantities(order.products);
                await Cart.deleteMany({ user: order.user });

                await creditAdminWallet(order)   //credit to admin wallet


                const user = await User.findById(order.user);
                const address = await Address.findById(order.shippingAddress);
                const invoicePath = await generateInvoice(order, user, address);
                // console.log("Invoice Path (Retry Payment):", invoicePath);
                order.invoice = `/invoices/invoice_${order.orderId}.pdf`;
                await order.save();
                return res.json({
                    success: true,
                    message: 'Payment successful',
                    orderId: order._id
                });
            } else {
                const payment = await razorpay.payments.fetch(razorpay_payment_id);

                if (payment.status !== 'captured') {
                    return res.status(400).json({
                        success: false,
                        message: 'Payment not captured. Status: ' + payment.status
                    });
                }

                const newOrder = new Order({
                    user: orderData.userId,
                    shippingAddress: orderData.shippingAddress,
                    products: orderData.products,
                    totalAmount: orderData.totalAmount,
                    discount: orderData.discount,
                    couponDiscount: orderData.couponDiscount,
                    finalAmount: orderData.finalAmount,
                    paymentMethod: 'razor-pay',
                    paymentId: razorpay_payment_id,
                    paymentOrderId: razorpay_order_id,
                    orderstatus: 'Placed',
                    paymentStatus: 'completed',
                    couponApplied: orderData.couponApplied


                });
                const savedOrder = await newOrder.save();
                if (orderData.couponApplied && orderData.couponApplied.code) {
                    await Coupon.findOneAndUpdate(
                        { code: orderData.couponApplied.code },
                        {
                            $addToSet: { usersUsed: orderData.userId },
                            $inc: { usedCount: 1 }
                        },
                        { new: true }
                    );
                }
                await updateProductQuantities(orderData.products);
                await User.findByIdAndUpdate(orderData.userId, { $push: { orders: savedOrder._id } });
                await creditAdminWallet(savedOrder);


                const user = await User.findById(orderData.userId);
                const address = await Address.findById(orderData.shippingAddress);

                const invoicePath = await generateInvoice(savedOrder, user, address);
                // console.log("Invoice Path (New Order):", invoicePath);

                // Update the order with the invoice path
                savedOrder.invoice = `/invoices/invoice_${savedOrder.orderId}.pdf`;
                await savedOrder.save();


                await Cart.deleteMany({ user: orderData.userId });
                return res.status(200).json({
                    success: true,
                    message: 'Payment verified and order placed successfully',
                    orderId: savedOrder._id
                });

            }


        } catch (error) {
            console.log(error)
            return res.status(500).json({
                success: false,
                message: 'Failed to verify payment. Please contact support.',
                error: error.message
            });
        }
    },
    loadFailedpaymentPage: async (req, res) => {
        try {
            const orderId = req.params.orderId
            // console.log("order",orderId)
            const token = req.cookies.token
            const decoded = jwt.verify(token, process.env.JWT_SECRET)

            const order = await Order.findById(orderId).populate('products.product');
            if (!order) {
                return res.status(404).render('error', { message: 'Order not found' });
            }


            res.render("user/retrypayment", {
                user: decoded.id,
                order: order,
                razorpayKeyId: process.env.KEY_ID

            })

        } catch (error) {
            console.log(error)
            res.status(500).json({ message: 'An error occurred while loading the page' });

        }
    },
    retryPayment: async (req, res) => {
        try {
            const { orderId } = req.body;
            // console.log("req.body",req.body)

            // Fetch the order from database
            const order = await Order.findById(orderId);
            // console.log("order",order)
            if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }

            // Create a new Razorpay order
            const razorpayOrder = await razorpay.orders.create({
                amount: Math.round(order.finalAmount * 100), // Razorpay expects amount in paise
                currency: 'INR',
                receipt: 'retry_' + orderId,
                notes: {
                    orderId: orderId
                }
            });
            // console.log("reached")


            res.json({
                success: true,
                orderId: razorpayOrder.id,
                amount: order.finalAmount
            });
            // console.log("reached")

        } catch (error) {
            console.error('Error creating Razorpay order for retry:', error);
            res.status(500).json({
                success: false,
                message: 'An error occurred while processing your request'
            });
        }
    }
}

module.exports = razorpayController
