const User = require("../../model/user")
const Address = require("../../model/address")
const Product = require("../../model/addproduct")
const jwt = require("jsonwebtoken")
const Order = require("../../model/order")
const Wallet = require("../../model/wallet")
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Coupon = require("../../model/coupon")
const Admin = require("../../model/admin")
const Cart = require("../../model/cart")




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


    doc.fontSize(20).text('Invoice', { align: 'center' });
    doc.moveDown();


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




const orderController = {


    placeOrder: async (req, res) => {
        try {
            const { userId, products, shippingAddress, paymentMethod, totalAmount, discount, finalAmount, couponApplied } = req.body;
            // console.log("couponApplied",req.body)

            if (paymentMethod === "cash_on_delivery") {
                if (totalAmount >= 1000) {
                    return res.status(400).json({ success: false, message: "orders below RS:1000 is eligible for COD" })
                }
            }
            const cart = await Cart.findOne({ user: userId })
            if (!cart || cart.products.length === 0) {
                return res.status(400).json({ success: false, message: "Cart is empty" })
            }

            if (!products || products.length === 0) {
                return res.status(400).json({ success: false, message: "Cart is empty" })
            }


            for (const item of products) {
                const product = await Product.findById(item.product);
                if (!product) {
                    return res.status(404).json({ success: false, message: `Product not found: ${item.product}` });
                }
                if (product.stock < item.quantity) {
                    return res.status(400).json({ success: false, message: `Insufficient stock for product: ${product.name}, Only ${product.stock} left` });
                }

            }
            if (couponApplied && couponApplied.code) {
                await Coupon.findOneAndUpdate(
                    { code: couponApplied.code },
                    {
                        $addToSet: { usersUsed: userId },
                        $inc: { usedCount: 1 }
                    },
                    { new: true }
                );

            }

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
                couponApplied: couponApplied ? {
                    code: couponApplied.code,
                    discountAmount: couponApplied.discountAmount
                } : null,
                orderStatus: 'Pending'
            });

            await newOrder.save();


            for (const item of products) {
                await Product.findByIdAndUpdate(
                    item.product,
                    { $inc: { stock: -item.quantity } },
                    { new: true }
                );
            }


            await User.findByIdAndUpdate(userId, { $push: { orders: newOrder._id } });

            const admin = await Admin.find()
            console.log("admin", admin)
            if (!admin) {
                console.log("No admin found");
                return res.status(500).json({ success: false, message: 'Admin not found' });
            }
            const adminId = admin[0]._id
            console.log(adminId)

            if (paymentMethod !== "cash_on_delivery") {
                let adminWallet = await Wallet.findOne({ userId: adminId })
                console.log("adminWallet", adminWallet)

                adminWallet.transactions.push({
                    orderId: newOrder._id,
                    transactionType: "credit",
                    transactionAmount: newOrder.finalAmount,
                    transactionDescription: `Payment for order ${newOrder.orderId}`,
                })
                await adminWallet.save()

            }


            const user = await User.findById(userId);
            const address = await Address.findById(shippingAddress);

            const invoicePath = await generateInvoice(newOrder, user, address);
            newOrder.invoice = `/invoices/invoice_${newOrder.orderId}.pdf`;
            await newOrder.save();


            res.status(200).json({
                success: true,
                orderId: newOrder._id,
                message: 'Order placed successfully'
            });
        } catch (error) {
            console.log(error);
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    },
    cancelIndividualProduct: async (req, res) => {
        try {
            const { orderId, productId } = req.params;
            const { quantity } = req.body;

            const order = await Order.findById(orderId);
            if (!order) {
                return res.status(404).json({ message: "Order not found" });
            }


            const productIndex = order.products.findIndex(item => item.product.toString() === productId);
            if (productIndex === -1) {
                return res.status(404).json({ message: "Product not found in the order" });
            }

            const product = order.products[productIndex];

            let refundAmount = (quantity || product.quantity) * product.price

            if (order.paymentMethod === 'cash_on_delivery' && order.paymentStatus === 'pending') {

                order.cancelledProducts.push({
                    product: product.product,
                    quantity: quantity || product.quantity,
                    price: product.price
                });

                await Product.findByIdAndUpdate(
                    product.product,
                    { $inc: { stock: quantity || product.quantity } },
                    { new: true }
                );

                if (quantity && quantity < product.quantity) {
                    order.products[productIndex].quantity -= quantity;
                } else {
                    order.products[productIndex].status = "Cancelled";
                }

                const allCancelled = order.products.every(item => item.status === "Cancelled" || (item.quantity === 0));

                if (allCancelled) {
                    order.orderStatus = "Cancelled";
                }

                await order.save();

                return res.status(200).json({ message: "Product cancelled successfully" });
            }

            if (order.paymentMethod === 'razor-pay' && order.paymentStatus === 'completed') {
                if (order.couponApplied && order.couponApplied.code) {
                    const coupon = await Coupon.findOne({ code: order.couponApplied.code })

                    if (coupon) {
                        const newTotalAmount = order.totalAmount - refundAmount
                        if (newTotalAmount < coupon.minOrderAmount) {
                            const adjustedRefundAmount = refundAmount - order.couponApplied.discountAmount

                            refundAmount = Math.max(adjustedRefundAmount, 0)
                        }

                    }

                }
            }
            const wallet = await Wallet.findOne({ userId: order.user })
            // console.log(wallet)
            if (!wallet) {
                return res.status(404).json({ message: "Wallet not found" });
            }

            wallet.transactions.push({
                orderId: order._id,
                transactionType: 'credit',
                transactionAmount: refundAmount,
                transactionDescription: `Refund for cancelled product ${product.product.name}
                in order${order.orderId}`
            })
            await wallet.save()

            const admin = await Admin.find()
            const adminId = admin[0]._id;
            let adminWallet = await Wallet.findOne({ userId: adminId })
            if (!adminWallet) {
                return res.status(400).json({ success: false, message: "Wallet not found" })
            }
            adminWallet.transactions.push({
                orderId: order._id,
                transactionType: "debit",
                transactionAmount: refundAmount,
                transactionDescription: `Refund for cancelled product in order ${order.orderId}`
            })
            await adminWallet.save()

            order.cancelledProducts.push({
                product: product.product,
                quantity: quantity || product.quantity,
                price: product.price
            });

            await Product.findByIdAndUpdate(
                product.product,
                { $inc: { stock: quantity || product.quantity } },
                { new: true }
            );

            if (quantity && quantity < product.quantity) {
                order.products[productIndex].quantity -= quantity;


            } else {
                order.products[productIndex].status = "Cancelled";
            }

            if (order.products.length === 0) {
                order.orderStatus = "Cancelled";
            }
            const allCancelled = order.products.every(item => item.status === "Cancelled" || (item.quantity === 0))

            if (allCancelled) {
                order.orderStatus = "Cancelled"
            }

            await order.save();

            res.status(200).json({ message: "Product cancelled successfully" });
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    },



    getOrderConfirmationPage: async (req, res) => {
        try {
            // console.log("confirmation Page");
            const token = req.cookies.token;
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;
            // console.log(userId);
            const orderId = req.params.id;
            // console.log(orderId);
            const order = await Order.findById(orderId)
                .populate("user")
                .populate("products.product")
                .populate("shippingAddress");
            console.log(order);
            res.render("user/orderconfirmation", { order });
        } catch (error) {
            console.log(error);
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    },

    cancelOrder: async (req, res) => {
        try {
            const orderId = req.params.id;
            // console.log("cancel request", orderId)
            const order = await Order.findByIdAndUpdate(orderId)
                .populate("products.product");
            // console.log("order",order)

            if (!order) {
                return res.status(404).json({ message: "Order not found" });
            }

            if (order.paymentMethod === 'razor-pay' && order.paymentStatus === 'completed' || order.paymentMethod === 'cash_on_delivery' && order.paymentStatus === "completed") {

                const totalRefundAmount = order.products.reduce((total, item) => {
                    return total + (item.quantity * item.price);
                }, 0);
                console.log("totalRefundAmount", totalRefundAmount)


                const wallet = await Wallet.findOne({ userId: order.user });
                if (!wallet) {
                    return res.status(404).json({ message: "Wallet not found" });
                }

                wallet.transactions.push({
                    orderId: order._id,
                    transactionType: 'credit',
                    transactionAmount: totalRefundAmount,
                    transactionDescription: `Refund for cancelled order ${order.orderId}`,
                });

                await wallet.save();
            }

            for (const item of order.products) {
                const productId = item.product._id;
                const quantity = item.quantity;

                await Product.findByIdAndUpdate(
                    productId,
                    { $inc: { stock: quantity } },
                    { new: true }
                );
            }

            // console.log("order details", order)
            res.status(200).json({ message: "Order cancelled successfully" });
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    },

    returnOrder: async (req, res) => {
        try {
            const orderId = req.params.id;
            // console.log("return orderid :", orderId);
            const order = await Order.findById(orderId)
                .populate('products.product');

            if (!order) {
                return res.status(404).json({ success: false, message: "Order not found" });
            }
            const returnedProducts = order.products.filter(item => item.status === "Delivered")
            if (returnedProducts.length === 0) {
                return res.status(400).json({ success: false, message: "No delivered products is in your Order" })
            }


            const totalRefundAmount = returnedProducts.reduce((total, item) => {
                return total + (item.quantity * item.price);
            }, 0);
            returnedProducts.forEach(item => item.status = "Return Request")
            const allReturned = order.products.every(item => item.status === "Returned")


            await order.save()
            res.status(200).json({ success: true, message: "Return Request Submitted Successfully. Awaiting Admin Approval." })

        } catch (error) {
            console.log(error);
            res.status(500).json({ success: false, message: "Internal Server Error" });
        }
    },


    downloadInvoice: async (req, res) => {
        try {
            const orderId = req.params.id;
            console.log("Order ID:", orderId);

            let order = await Order.findOne({ orderId: orderId });
            console.log("Order found by orderId:", order);


            if (!order && orderId.match(/^[0-9a-fA-F]{24}$/)) {
                order = await Order.findById(orderId);
                console.log("Order found by _id:", order);
            }

            if (!order || !order.invoice) {
                return res.status(404).json({ success: false, message: "Invoice not found" });
            }

            const invoicePath = path.join(__dirname, "../../public", order.invoice);
            console.log("Invoice Path:", invoicePath);


            if (!fs.existsSync(invoicePath)) {
                return res.status(404).json({ success: false, message: "Invoice file not found" });
            }


            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=invoice_${order.orderId}.pdf`);
            fs.createReadStream(invoicePath).pipe(res);
        } catch (error) {
            console.error('Error downloading invoice:', error);
            res.status(500).json({ success: false, message: "Internal Server Error" });
        }
    }
};

module.exports = orderController;