const order = require("../model/order")
const Wallet = require("../model/wallet")
const jwt = require("jsonwebtoken")
const Order = require("../model/order")


const walletController = {

    loadWallet: async (req, res) => {
        try {
            const token = req.cookies.token
            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            const adminId = decoded.id

            const page = parseInt(req.query.page) || 1
            const limit = 10
            const skip = (page - 1) * limit

            const searchTerm = req.query.search || ''
            console.log("Search term:", searchTerm);


            let wallet = await Wallet.findOne({ userId: adminId })
                .populate({
                    path: 'transactions.orderId',
                    populate: {
                        path: 'user',
                        model: 'User',
                        select: 'name email'
                    }
                });

            if (!wallet) {
                wallet = new Wallet({
                    userId: adminId,
                    walletBalance: 0,
                    transactions: []
                })
                await wallet.save()
            }


            const validTransactions = wallet.transactions.filter(transaction =>
                transaction.orderId && typeof transaction.orderId === 'object'
            )
            validTransactions.sort((a, b) => {
                return new Date(b.transactionDate) - new Date(a.transactionDate);
            });


            const getTransactionSummary = (transactions) => {
                const summary = {
                    totalCredits: 0,
                    totalDebits: 0
                }
                if (transactions && transactions.length > 0) {
                    transactions.forEach(transaction => {
                        if (transaction.transactionType && transaction.transactionType.toLowerCase() === 'credit') {
                            summary.totalCredits += transaction.transactionAmount
                        } else if (transaction.transactionType && transaction.transactionType.toLowerCase() === 'debit') {
                            summary.totalDebits += transaction.transactionAmount
                        }
                    })
                }
                return summary
            }

            const transactionSummary = getTransactionSummary(validTransactions)


            let filteredTransactions = [...validTransactions]

            if (searchTerm) {
                console.log("Filtering transactions with search term:", searchTerm);
                filteredTransactions = validTransactions.filter(transaction => {
                    const transIdMatch = transaction.transactionId &&
                        transaction.transactionId.toLowerCase().includes(searchTerm.toLowerCase());

                    const descMatch = transaction.transactionDescription &&
                        transaction.transactionDescription.toLowerCase().includes(searchTerm.toLowerCase());

                    const nameMatch = transaction.orderId && transaction.orderId.user &&
                        transaction.orderId.user.name &&
                        transaction.orderId.user.name.toLowerCase().includes(searchTerm.toLowerCase());

                    return transIdMatch || descMatch || nameMatch;
                });
                console.log(`Found ${filteredTransactions.length} matching transactions`);
            }


            const totalItems = filteredTransactions.length
            const totalPages = Math.max(Math.ceil(totalItems / limit), 1)


            const validPage = Math.min(Math.max(page, 1), totalPages)


            const paginatedTransactions = filteredTransactions.slice((validPage - 1) * limit, validPage * limit)


            const paginatedWallet = {
                ...wallet.toObject(),
                transactions: paginatedTransactions
            }

            // console.log(`Page ${validPage}, showing ${paginatedTransactions.length} of ${totalItems} transactions`);
            // console.log(`Total pages: ${totalPages}`);


            const hasPrevPage = validPage > 1
            const hasNextPage = validPage < totalPages


            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({
                    wallet: paginatedWallet,
                    transactionSummary: transactionSummary,
                    currentPage: validPage,
                    totalPages: totalPages,
                    hasPrevPage: hasPrevPage,
                    hasNextPage: hasNextPage,
                    searchTerm: searchTerm,
                    success: req.query.success,
                    error: req.query.error
                });
            }


            res.render("admin/wallet", {
                wallet: paginatedWallet,
                transactionSummary: transactionSummary,
                currentPage: validPage,
                totalPages: totalPages,
                hasPrevPage: hasPrevPage,
                hasNextPage: hasNextPage,
                searchTerm: searchTerm,

                messages: { success: '', error: '' }
            });

        } catch (error) {
            console.log("Error in loadWallet:", error);

            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(500).json({
                    success: false,
                    error: 'An error occurred while loading wallet data'
                });
            }
            res.redirect('/admin/dashboard?error=An+error+occurred+while+loading+wallet+data');
        }
    },


    viewOrderdetailPage: async (req, res) => {
        try {
            const orderId = req.params.id
            console.log(orderId)

            const order = await Order.findById(orderId)
                .populate('user')
                .populate('products.product')
                .populate("shippingAddress")
                .lean();

            if (!order) {
                return res.status(400).json({ success: false, message: "Order not found" })
            }
            const subtotal = order.products ?
                order.products.reduce((total, item) => {
                    return total + ((item.product ? item.product.price : 0) * (item.quantity || 0));
                }, 0) : 0;

            const processedOrder = {
                ...order,
                orderId: order.orderId || orderId,
                createdOn: order.createdOn || new Date(),
                status: order.status || 'Pending',
                paymentMethod: order.paymentMethod || 'Not specified',
                subtotal: subtotal,
                discount: order.discount || 0,
                total: order.total || subtotal,
                items: order.products || [],
                shippingAddress: order.shippingAddress
            };
            res.render("admin/orderdetail", {
                order: processedOrder,
                user: order.user,
                products: order.products,
                shippingAddress: order.shippingAddress

            })

        } catch {
            console.log(error)
            res.status(500).json({
                success: false,
                message: "Internal server error",
                error: error.message
            });
        }
    }
}
module.exports = walletController