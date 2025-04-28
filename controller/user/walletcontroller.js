
const User = require("../../model/user")
const jwt = require("jsonwebtoken")
const Wallet = require("../../model/wallet")
const statusCode = require("../../utils/statuscode")


const walletController = {

    createWallet: async (req, res) => {
        try {
            const token = req.cookies.token
            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            const userId = decoded.id
            if (!userId) {
                return res.status(statusCode.NOT_FOUND).json({ message: "user not found" })
            }
            let wallet = await Wallet.findOne({ userId })
            if (!wallet) {
                wallet = new Wallet({
                    userId,
                    walletBalance: 0,
                    transactions: []
                })
                await wallet.save()
                res.status(statusCode.OK).json({ message: "Wallet added Successfully" })
            }
            const transactions = wallet.transactions
                .sort((a, b) => b.transactionDate - a.transactionDate)

        } catch (error) {
            console.log(error)
            res.status(statusCode.INTERNAL_SERVER_ERROR).json({ message: "Error creating/fetching wallet" });
        }
    },
    getWallet: async (req, res) => {
        try {
            const token = req.cookies.token
            const decoded = jwt.verify(token, process.env > JWT_SECRET)
            const userId = decoded.id
            if (!userId) {
                return res.status(statusCode.INTERNAL_SERVER_ERROR).json({ message: "User not Found" })
            }
            const wallet = await Wallet.findOne({ userId })
            if (!wallet) {
                return res.status(statusCode.NOT_FOUND).json({ message: "Wallet not Found" })
            }
            const transactions = wallet.transactions.sort((a, b => b.transactionDate - a.transactionDate))
            res.status(statusCode.OK).json({ wallet, transactions });
        } catch (error) {
            console.log(error)
            res.status(statusCode.INTERNAL_SERVER_ERROR).json({ message: "Error fetching wallet details", error });
        }
    },
    addFunds: async (req, res) => {
        try {
            const token = req.cookies.token
            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            const userId = decoded.id
            const { amount } = req.body
            console.log("amountof fund", amount)
            if (!userId || !amount || amount <= 0) {
                return res.status(statusCode.BAD_REQUEST).json({ message: "Invalid request data" })
            }

            const wallet = await Wallet.findOneAndUpdate(
                { userId },
                {
                    $inc: { walletBalance: amount },
                    $push: {
                        transactions: {
                            transactionType: 'credit',
                            transactionAmount: amount,
                            transactionDescription: 'Funds added to wallet',
                            transactionStatus: 'completed',
                            transactionDate: new Date(),
                        },
                    },
                },
                { upsert: true, new: true }
            );
            res.status(statusCode.OK).json({ message: 'Funds added successfully', wallet });

        } catch (error) {
            console.log(error)
            res.status(statusCode.INTERNAL_SERVER_ERROR).json({ message: 'Error adding funds' });
        }
    }
}
module.exports = walletController