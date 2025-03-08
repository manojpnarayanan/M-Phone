
const User=require("../../model/user")
const jwt=require("jsonwebtoken")
const Wallet = require("../../model/wallet")


const walletController={
    
   createWallet:async(req,res)=>{
    try{
        const token=req.cookies.token
    const decoded=jwt.verify(token,process.env.JWT_SECRET)
    const userId=decoded.id
    if(!userId){
       return res.status(404).json({message:"user not found"})
    }
    let wallet=await Wallet.findOne({userId})
    if(!wallet){
        wallet=new Wallet({
            userId,
            walletBalance:0,
            transactions:[]
        })
        await wallet.save()
        res.status(200).json({message:"Wallet added Successfully"})
    }
    const transactions = wallet.transactions
    .sort((a, b) => b.transactionDate - a.transactionDate)

    }catch(error){
        console.log(error)
        res.status(500).json({ message: "Error creating/fetching wallet"});
    }
   },
   getWallet:async(req,res)=>{
    try{
        const token=req.cookies.token
        const decoded=jwt.verify(token,process.env>JWT_SECRET)
        const userId=decoded.id
        if(!userId){
            return res.status(500).json({message:"User not Found"})
        }
        const wallet=await Wallet.findOne({userId})
        if(!wallet){
            return res.status(404).json({message:"Wallet not Found"})
        }
        const transactions=wallet.transactions.sort((a,b=>b.transactionDate-a.transactionDate))
        res.status(200).json({ wallet, transactions });
    }catch(error){
        console.log(error)
        res.status(500).json({ message: "Error fetching wallet details", error });
    }
   },
   addFunds:async(req,res)=>{
    try{
        const token=req.cookies.token
        const decoded=jwt.verify(token,process.env.JWT_SECRET)
        const userId=decoded.id
        const{amount}=req.body
        console.log("amountof fund",amount)
        if( !userId || !amount || amount<=0){
            return res.status(400).json({message:"Invalid request data"})
        }
        // let wallet= await Wallet.findOne({userId})
        // if(!wallet){
        //     wallet=new Wallet({
        //         userId,
        //         walletBalance:0,
        //         transactions:[],
        //     })
        // }        console.log("Current wallet balance:", wallet.walletBalance);

        //  // Add a credit transaction
        //  wallet.transactions.push({
        //     transactionType: 'credit',
        //     transactionAmount: amount,
        //     transactionDescription: 'Funds added to wallet',
        //     transactionStatus: 'completed',
        //     transactionDate: new Date()
        // });
        // wallet.walletBalance += amount;
        // console.log("Updated wallet balance:", wallet.walletBalance);
        // await wallet.save();
        // res.status(200).json({ message: 'Funds added successfully'})
        const wallet = await Wallet.findOneAndUpdate(
            { userId },
            {
                $inc: { walletBalance: amount }, // Atomically increment balance
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
            { upsert: true, new: true } // Create wallet if it doesn't exist
        );
        res.status(200).json({ message: 'Funds added successfully', wallet });

    }catch(error){
        console.log(error)
        res.status(500).json({ message: 'Error adding funds'});
    }
   }
}
module.exports=walletController