const order = require("../model/order")
const Wallet=require("../model/wallet")
const jwt=require("jsonwebtoken")
const Order=require("../model/order")


const walletController={
    loadWallet:async(req,res)=>{
        try{

            const token=req.cookies.token
            
            const decoded=jwt.verify(token,process.env.JWT_SECRET)
            const adminId=decoded.id
            console.log(adminId)

            let wallet=await Wallet.findOne({userId:adminId})
            .populate({
                path: 'transactions.orderId',
                match: { orderId: { $ne: null } }, // Only populate non-null orderIds
                populate: {
                    path: 'user',
                    model: 'User',
                    select: 'name email'
                }
            });
            console.log("Wallet Transactions:", wallet.transactions.map(t => ({
                transactionId: t.transactionId,
                userName: t.orderId?.user?.name,
                transactionAmount: t.transactionAmount
            })));
            if(!wallet){
                wallet=new Wallet({
                    userId:adminId,
                    walletBalance:0,
                    transactions:[]
                })
                await wallet.save()

            }
            // console.log("wallet",wallet)

            wallet.transactions = wallet.transactions.filter(transaction => 
                transaction.orderId && typeof transaction.orderId === 'object'
            );
            const getTransactionSummary=(transactions)=>{
                const summary={
                    totalCredits:0,
                    totalDebits:0
                }
                if (transactions && transactions.length > 0) {
                    transactions.forEach(transaction => {
                        if (transaction.transactionType === 'credit') {
                            summary.totalCredits += transaction.transactionAmount
                        } else if (transaction.transactionType === 'debit') {
                            summary.totalDebits += transaction.transactionAmount
                        }
                    })
                }

                return summary
            }
            const itemsPerPage = 10
            const totalPages = Math.ceil(wallet.transactions.length / itemsPerPage)
            const currentPage = req.query.page ? parseInt(req.query.page) : 1

            const paginatedTransactions = wallet.transactions.slice(
                (currentPage - 1) * itemsPerPage, 
                currentPage * itemsPerPage
            )
            wallet.transactions = paginatedTransactions

            const transactionSummary = getTransactionSummary(wallet.transactions)


            res.render("admin/wallet",{
                wallet:wallet,
                totalPages: totalPages,
                currentPage: currentPage,
                transactionSummary: transactionSummary 
            })

        }catch(error){
            console.log(error)
        }
    },
    
   
    
    viewOrderdetailPage:async(req,res)=>{
        try{
            const orderId=req.params.id
            console.log(orderId)

            const order=await Order.findById(orderId)
            .populate('user')
            .populate('products.product')
            .populate("shippingAddress")
            .lean();

            if(!order){
                return res.status(400).json({success:false, message:"Order not found"})
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
            res.render("admin/orderdetail",{
                order: processedOrder,
                user:order.user,
                products:order.products,
                shippingAddress:order.shippingAddress

            })

        }catch{
            console.log(error)
            res.status(500).json({
                success: false,
                message: "Internal server error",
                error: error.message
            });
        }
    }
}
module.exports=walletController