const User = require("../../model/user")
const Address = require("../../model/address")
const Product = require("../../model/addproduct")
const jwt = require("jsonwebtoken")
const Order = require("../../model/order")
const Wallet = require("../../model/wallet")
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Helper function to generate invoice
// const generateInvoice = async (order, user, shippingAddress) => {
//     const doc = new PDFDocument({ size: 'A4', margin: 50 });
//     const invoicePath = path.join(__dirname, "../public/invoices", `invoice_${order.orderId}.pdf`);
    
//     // Ensure directory exists
//     const dir = path.dirname(invoicePath);
//     if (!fs.existsSync(dir)) {
//         fs.mkdirSync(dir, { recursive: true });
//     }
    
//     const writeStream = fs.createWriteStream(invoicePath);
//     doc.pipe(writeStream);
    
//     // Add invoice header
//     doc.fontSize(20).text('Invoice', { align: 'center' });
//     doc.moveDown();
    
//     // Add order details
//     doc.fontSize(14).text(`Order ID: ${order.orderId}`);
//     doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`);
//     doc.text(`User: ${user.name}`);
//     doc.text(`Email: ${user.email}`);
//     doc.moveDown();
    
//     // Add shipping address
//     doc.fontSize(14).text('Shipping Address:', { underline: true });
//     doc.text(`${shippingAddress.housename}, ${shippingAddress.city}, ${shippingAddress.state}, ${shippingAddress.pincode}, ${shippingAddress.country}`);
//     doc.moveDown();
    
//     // Add product details
//     doc.fontSize(14).text('Products:', { underline: true });
//     order.products.forEach(async (item, index) => {
//         const product = await Product.findById(item.product);
//         doc.text(`${index + 1}. ${product.name} - ${item.quantity} x $${item.price.toFixed(2)}`);
//     });
//     doc.moveDown();
    
//     // Add payment details
//     doc.fontSize(14).text('Payment Details:', { underline: true });
//     doc.text(`Payment Method: ${order.paymentMethod}`);
//     doc.text(`Total Amount: $${order.totalAmount.toFixed(2)}`);
//     doc.text(`Discount: $${order.discount.toFixed(2)}`);
//     doc.text(`Final Amount: $${order.finalAmount.toFixed(2)}`);
//     doc.moveDown();
    
//     // Add footer
//     doc.fontSize(12).text('Thank you for shopping with us!', { align: 'center' });
//     doc.end();
    
//     return new Promise((resolve, reject) => {
//         writeStream.on('finish', () => resolve(invoicePath));
//         writeStream.on('error', reject);
//     });
// };

// const generateInvoice = async (order, user, shippingAddress) => {
//     const doc = new PDFDocument({ size: 'A4', margin: 50 });
//     const invoicePath = path.join(__dirname, "../../public/invoices", `invoice_${order.orderId}.pdf`);
//     console.log("generate Invoice",invoicePath)
//     // Ensure directory exists
//     const dir = path.dirname(invoicePath);
//     if (!fs.existsSync(dir)) {
//         fs.mkdirSync(dir, { recursive: true });
//     }
    
//     const writeStream = fs.createWriteStream(invoicePath);
//     doc.pipe(writeStream);
    
//     // Add invoice header
//     doc.fontSize(20).text('Invoice', { align: 'center' });
//     doc.moveDown();
    
//     // Add order details
//     doc.fontSize(14).text(`Order ID: ${order.orderId}`);
//     doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`);
//     doc.text(`User: ${user.name}`);
//     doc.text(`Email: ${user.email}`);
//     doc.moveDown();
    
//     // Add shipping address
//     doc.fontSize(14).text('Shipping Address:', { underline: true });
//     doc.text(`${shippingAddress.housename}, ${shippingAddress.city}, ${shippingAddress.state}, ${shippingAddress.pincode}, ${shippingAddress.country}`);
//     doc.moveDown();
    
//     // Add product details
//     doc.fontSize(14).text('Products:', { underline: true });
//     order.products.forEach(async (item, index) => {
//         const product = await Product.findById(item.product);
//         doc.text(`${index + 1}. ${product.name} - ${item.quantity} x $${item.price.toFixed(2)}`);
//     });
//     doc.moveDown();
    
//     // Add payment details
//     doc.fontSize(14).text('Payment Details:', { underline: true });
//     doc.text(`Payment Method: ${order.paymentMethod}`);
//     doc.text(`Total Amount: $${order.totalAmount.toFixed(2)}`);
//     doc.text(`Discount: $${order.discount.toFixed(2)}`);
//     doc.text(`Final Amount: $${order.finalAmount.toFixed(2)}`);
//     doc.moveDown();
    
//     // doc.on('error', (err) => {
//     //     console.error('Error generating PDF:', err);
//     //     reject(err);
//     // });
//     // Add footer
//     doc.fontSize(12).text('Thank you for shopping with us!', { align: 'center' });
//     doc.end();
    
//     return new Promise((resolve, reject) => {
//         writeStream.on('finish', () => resolve(invoicePath));
//         writeStream.on('error', reject);
//     });
// };

const generateInvoice = async (order, user, shippingAddress) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const invoicePath = path.join(__dirname, "../../public/invoices", `invoice_${order.orderId}.pdf`);
    console.log("Invoice Path:", invoicePath); // Debugging

    // Ensure the directory exists
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

    // Add shipping address
    doc.fontSize(14).text('Shipping Address:', { underline: true });
    doc.text(`${shippingAddress.housename}, ${shippingAddress.city}, ${shippingAddress.state}, ${shippingAddress.pincode}, ${shippingAddress.country}`);
    doc.moveDown();

    // Add product details
    doc.fontSize(14).text('Products:', { underline: true });
    order.products.forEach(async (item, index) => {
        const product = await Product.findById(item.product);
        doc.text(`${index + 1}. ${product.name} - ${item.quantity} x $${item.price.toFixed(2)}`);
    });
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
    doc.end();

    return new Promise((resolve, reject) => {
        writeStream.on('finish', () => resolve(invoicePath));
        writeStream.on('error', reject);
    });
};




const orderController = {
    // placeOrder: async (req, res) => {
    //     try {
    //         const { userId, products, shippingAddress, paymentMethod, totalAmount, discount, finalAmount } = req.body;
    //         // console.log("PlaceOrder:", req.body)
            
    //         for (const item of products) {
    //             const product = await Product.findById(item.product);
    //             if (!product) {
    //                 return res.status(404).json({ success: false, message: `Product not found: ${item.product}` });
    //             }
    //             if (product.stock < item.quantity) {
    //                 return res.status(400).json({ success: false, message: `Insufficient stock for product: ${product.name}, Only ${product.stock}, Left` });
    //             }
    //         }
            
    //         // Create a new order
    //         const newOrder = new Order({
    //             user: userId,
    //             products: products.map(item => ({
    //                 product: item.product,
    //                 quantity: item.quantity,
    //                 price: item.price
    //             })),
    //             shippingAddress,
    //             paymentMethod,
    //             totalAmount,
    //             discount,
    //             finalAmount,
    //             orderStatus: 'Pending'
    //         });
            
    //         await newOrder.save();
            
    //         // Update stock quantities for each product
    //         for (const item of products) {
    //             await Product.findByIdAndUpdate(
    //                 item.product,
    //                 { $inc: { stock: -item.quantity } },
    //                 { new: true }
    //             );
    //         }
            
    //         // Add the order to the user's order history
    //         await User.findByIdAndUpdate(userId, { $push: { orders: newOrder._id } });
            
    //         const user = await User.findById(userId);
    //         const address = await Address.findById(shippingAddress);
            
    //         const invoicePath = await generateInvoice(newOrder, user, address);
    //         console.log("placeOrder",invoicePath)
            
    //         // Update the order with the invoice path
    //         newOrder.invoice = `/invoices/invoice_${newOrder.orderId}.pdf`;
    //         await newOrder.save();
            
    //         // Send a success response
    //         res.status(200).json({
    //             success: true,
    //             orderId: newOrder._id,
    //             message: 'Order placed successfully'
    //         });
    //     } catch (error) {
    //         console.log(error);
    //         res.status(500).json({ success: false, message: 'Internal Server Error' });
    //     }
    // },
  
     placeOrder : async (req, res) => {
        try {
            const { userId, products, shippingAddress, paymentMethod, totalAmount, discount, finalAmount } = req.body;
    
            // Validate products and stock
            for (const item of products) {
                const product = await Product.findById(item.product);
                if (!product) {
                    return res.status(404).json({ success: false, message: `Product not found: ${item.product}` });
                }
                if (product.stock < item.quantity) {
                    return res.status(400).json({ success: false, message: `Insufficient stock for product: ${product.name}, Only ${product.stock} left` });
                }
            }
    
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
                orderStatus: 'Pending'
            });
    
            await newOrder.save();
    
            // Update stock quantities for each product
            for (const item of products) {
                await Product.findByIdAndUpdate(
                    item.product,
                    { $inc: { stock: -item.quantity } },
                    { new: true }
                );
            }
    
            // Add the order to the user's order history
            await User.findByIdAndUpdate(userId, { $push: { orders: newOrder._id } });
    
            // Generate and save the invoice
            const user = await User.findById(userId);
            const address = await Address.findById(shippingAddress);
    
            const invoicePath = await generateInvoice(newOrder, user, address);
            console.log("Invoice Path:", invoicePath); // Debugging
    
            // Update the order with the invoice path
            newOrder.invoice = `/invoices/invoice_${newOrder.orderId}.pdf`;
            await newOrder.save();
    
            // Send a success response
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
    


    getOrderConfirmationPage: async (req, res) => {
        try {
            console.log("confirmation Page");
            const token = req.cookies.token;
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;
            console.log(userId);
            const orderId = req.params.id;
            console.log(orderId);
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
            const order = await Order.findByIdAndUpdate(
                orderId,
                { orderStatus: "Cancelled" },
                { new: true }
            )
            .populate("products.product");
            
            if (!order) {
                return res.status(404).json({ message: "Order not found" });
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
            console.log("return orderid :", orderId);
            const order = await Order.findByIdAndUpdate(
                orderId,
                { orderStatus: "Returned" },
                { new: true }
            )
            .populate('products.product');
            
            if (!order) {
                return res.status(404).json({ success: false, message: "Order not found" });
            }
            
            const totalRefundAmount = order.products.reduce((total, item) => {
                return total + (item.quantity * item.price);
            }, 0);
            
            const wallet = await Wallet.findOne({ userId: order.user });
            if (!wallet) {
                return res.status(404).json({ success: false, message: "Wallet not found" });
            }
            
            wallet.transactions.push({
                orderId: order._id,
                transactionType: 'credit',
                transactionAmount: totalRefundAmount,
                transactionDescription: `Refund for returned order ${order.orderId}`,
            });
            
            await wallet.save();
            
            for (const item of order.products) {
                const productId = item.product._id;
                const quantity = item.quantity;

                await Product.findByIdAndUpdate(
                    productId,
                    { $inc: { stock: quantity } },
                    { new: true }
                );
            }

            res.status(200).json({ success: true, message: "Order Returned Successfully" });
        } catch (error) {
            console.log(error);
            res.status(500).json({ success: false, message: "Internal Server Error" });
        }
    },
    
    // downloadInvoice: async (req, res) => {
    //     try {
    //         const orderId = req.params.id;
    //         console.log(orderId)

    //         if (!mongoose.Types.ObjectId.isValid(orderId)) {
    //             const orderByOrderId = await Order.findOne({ orderId: orderId });

    //             if (!orderByOrderId || !orderByOrderId.invoice) {
    //                 return res.status(404).json({ success: false, message: "Invoice not found" });
    //             }
    //             const invoicePath = path.join(__dirname, `../public${orderByOrderId.invoice}`);
    //              return res.download(invoicePath);
    //         }

    //         const order = await Order.findById(orderId);

    //         if (!order || !order.invoice) {
    //             return res.status(404).json({ success: false, message: "Invoice not found" });
    //         }

    //         const invoicePath = path.join(__dirname, `../public${order.invoice}`);
    //         res.download(invoicePath);
    //     } catch (error) {
    //         console.log(error);
    //         res.status(500).json({ success: false, message: "Internal Server Error" });
    //     }
    // }
    // downloadInvoice: async (req, res) => {
    //     try {
    //         const orderId = req.params.id;
    //         console.log(orderId)
    //         // First try to find the order by UUID (orderId field)
    //         let order = await Order.findOne({ orderId: orderId });
    //         console.log(order)
    //         // If not found by orderId, check if it's a valid ObjectId and try finding by _id
    //         if (!order && orderId.match(/^[0-9a-fA-F]{24}$/)) {
    //             order = await Order.findById(orderId);
    //         }
    
    //         if (!order || !order.invoice) {
    //             return res.status(404).json({ success: false, message: "Invoice not found" });
    //         }
    
    //         const invoicePath = path.join(__dirname, `../../public${order.invoice}`);
            
    //         // Check if file exists
    //         if (!fs.existsSync(invoicePath)) {
    //             return res.status(404).json({ success: false, message: "Invoice file not found" });
    //         }
            
    //         res.download(invoicePath);
    //     } catch (error) {
    //         console.log(error);
    //         res.status(500).json({ success: false, message: "Internal Server Error" });
    //     }
    // }
    //  downloadInvoice : async (req, res) => {
    //     try {
    //         const orderId = req.params.id;
    //          console.log("orderId",req.params.id)
    //         // First, try to find the order by UUID (orderId field)
    //         let order = await Order.findOne({ orderId: orderId });
    //         console.log("reached",order)
    //         // If not found by orderId, check if it's a valid ObjectId and try finding by _id
    //         if (!order && orderId.match(/^[0-9a-fA-F]{24}$/)) {
    //             order = await Order.findById(orderId);
    //             console.log("Order found by _id:", order);
    //         }
    
    //         if (!order || !order.invoice ) {
    //             return res.status(404).json({ success: false, message: "Invoice not found" });
    //         }
    
    //         const invoicePath = path.join(__dirname, `../../public${order.invoice}`);
    //          console.log(invoicePath)
    //         // Check if the file exists
    //         if (!fs.existsSync(invoicePath)) {
    //             return res.status(404).json({ success: false, message: "Invoice file not found" });
    //         }
    
    //         // Send the file for download
    //         // res.download(invoicePath);
    //         // Send the file for download
    //     res.setHeader('Content-Type', 'application/pdf');
    //     res.setHeader('Content-Disposition', `attachment; filename=invoice_${order.orderId}.pdf`);
    //     fs.createReadStream(invoicePath).pipe(res);
    //     } catch (error) {
    //         console.log(error);
    //         res.status(500).json({ success: false, message: "Internal Server Error" });
    //     }
    // }
     downloadInvoice : async (req, res) => {
        try {
            const orderId = req.params.id;
            console.log("Order ID:", orderId); // Debugging
    
            // First, try to find the order by UUID (orderId field)
            let order = await Order.findOne({ orderId: orderId });
            console.log("Order found by orderId:", order); // Debugging
    
            // If not found by orderId, check if it's a valid ObjectId and try finding by _id
            if (!order && orderId.match(/^[0-9a-fA-F]{24}$/)) {
                order = await Order.findById(orderId);
                console.log("Order found by _id:", order); // Debugging
            }
    
            if (!order || !order.invoice) {
                return res.status(404).json({ success: false, message: "Invoice not found" });
            }
    
            const invoicePath = path.join(__dirname, "../../public", order.invoice);
            console.log("Invoice Path:", invoicePath); // Debugging
    
            // Check if the file exists
            if (!fs.existsSync(invoicePath)) {
                return res.status(404).json({ success: false, message: "Invoice file not found" });
            }
    
            // Send the file for download
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