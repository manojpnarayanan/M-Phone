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
    try {
        console.log("Starting invoice generation for order:", order.orderId);
        console.log("Products in order:", JSON.stringify(order.products, null, 2));

        // Create PDF document
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const invoicePath = path.join(__dirname, "../../public/invoices", `invoice_${order.orderId}.pdf`);

        // Create directory if it doesn't exist
        const dir = path.dirname(invoicePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Setup write stream
        const writeStream = fs.createWriteStream(invoicePath);
        doc.pipe(writeStream);

        // Start adding content to PDF
        doc.fontSize(20).text('Invoice', { align: 'center' });
        doc.moveDown();

        // Add order details
        doc.fontSize(14).text(`Order ID: ${order.orderId}`);
        doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`);
        doc.text(`User: ${user.name}`);
        doc.text(`Email: ${user.email}`);
        doc.moveDown();

        // Add shipping address
        doc.fontSize(14).text('Shipping Address:', { underline: true });
        doc.text(`${shippingAddress.housename}, ${shippingAddress.city}, ${shippingAddress.state}, ${shippingAddress.pincode}, ${shippingAddress.country}`);
        doc.moveDown();

        // Add product details header
        doc.fontSize(14).text('Products:', { underline: true });

        // First ensure we have actual product entries
        if (!order.products || order.products.length === 0) {
            doc.text('No products in this order');
        } else {
            // CRITICAL FIX: Need to ensure we wait for all product data to load before closing the PDF
            const productIds = order.products.map(item => item.product);
            console.log("Product IDs:", productIds);

            // Use the find() method instead of findById() for each product
            const products = await Product.find({ _id: { $in: productIds } });
            console.log(`Found ${products.length} products in database`);

            // Create a map of product IDs to product objects for quick lookup
            const productMap = {};
            products.forEach(product => {
                productMap[product._id.toString()] = product;
            });

            // Now add all products to the PDF using our map
            let added = 0;
            for (let i = 0; i < order.products.length; i++) {
                const item = order.products[i];
                const productId = item.product.toString();
                const product = productMap[productId];

                if (product) {
                    doc.text(`${i + 1}. ${product.name} - ${item.quantity} x $${item.price.toFixed(2)}`);
                    console.log(`Added product to invoice: ${product.name}`);
                    added++;
                } else {
                    doc.text(`${i + 1}. Unknown Product (ID: ${productId}) - ${item.quantity} x $${item.price.toFixed(2)}`);
                    console.log(`Product not found in database: ${productId}`);
                }
            }
            console.log(`Added ${added} products to the invoice`);
        }

        doc.moveDown();

        // Add payment details
        doc.fontSize(14).text('Payment Details:', { underline: true });
        doc.text(`Payment Method: ${order.paymentMethod}`);
        doc.text(`Total Amount: $${order.totalAmount.toFixed(2)}`);
        doc.text(`Discount: $${order.discount.toFixed(2)}`);
        doc.text(`Final Amount: $${order.finalAmount.toFixed(2)}`);
        doc.moveDown();

        // Add footer
        doc.fontSize(12).text('Thank you for shopping with us!', { align: 'center' });

        // Return a promise that resolves when PDF is completely written
        return new Promise((resolve, reject) => {
            writeStream.on('finish', () => {
                console.log("Invoice creation completed successfully:", invoicePath);
                resolve(invoicePath);
            });

            writeStream.on('error', (error) => {
                console.error("Error writing invoice to file:", error);
                reject(error);
            });

            // End the document to finalize PDF
            doc.end();
        });
    } catch (error) {
        console.error("Critical error generating invoice:", error);
        throw error;
    }
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
                if (!product.isActive) {
                    return res.status(400).json({ success: false, message: "Product is blocked by admin" })
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
            const completeOrder = await Order.findById(newOrder._id);


            const invoicePath = await generateInvoice(completeOrder, user, address);
            completeOrder.invoice = `/invoices/invoice_${completeOrder.orderId}.pdf`;
            await completeOrder.save();


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
            const cancelQuantity = quantity || product.quantity
            let refundAmount = 0;

            if (order.products.length === 1) {
                refundAmount = order.finalAmount;
            } else {

                refundAmount = cancelQuantity * product.price * 1.18;
            }
            // console.log("Initial refundAmount:", refundAmount);



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
                        console.log("newTotalAmount :2", newTotalAmount)
                        if (newTotalAmount < coupon.minOrderAmount) {
                            const adjustedRefundAmount = refundAmount - order.couponApplied.discountAmount
                            console.log("adjustedRefundAmount :3", adjustedRefundAmount)


                            refundAmount = Math.max(adjustedRefundAmount, 0)
                            console.log("refundAmount:4", refundAmount)
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
            const { orderId, productId } = req.params
            const { returnReason } = req.body

            console.log("return orderid :", orderId, productId);
            const order = await Order.findById(orderId)

            if (!order) {
                return res.status(404).json({ success: false, message: "Order not found" });
            }


            const productIndex = order.products.findIndex(item => item.product.toString() === productId);
            if (productIndex === -1) {
                return res.status(404).json({ message: "Product not found in the order" });
            }

            const product = order.products[productIndex];

            if (product.status !== 'Delivered') {
                return res.status(400).json({ message: "Only delivered products can be returned" });
            }



            order.products[productIndex].status = "Return Request";
            order.products[productIndex].returnReason = returnReason;


            const allReturned = order.products.every(item => item.status === "Returned" || item.quantity === 0);
            if (allReturned) {
                order.orderStatus = 'Returned';
            }



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