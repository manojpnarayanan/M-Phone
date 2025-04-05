const Product = require("../../model/addproduct")
const Category = require("../../model/createcategory")
const User = require("../../model/user")
const jwt = require("jsonwebtoken")
const Cart = require("../../model/cart")
const Address = require("../../model/address")
const Wishlist = require("../../model/wishlist")
const Order = require("../../model/order")
const Wallet = require("../../model/wallet")
const Review = require("../../model/review")
const Referral = require("../../model/referral")
const nodemailer = require("nodemailer")



const userViews = {
    loadLandingpage:async(req,res)=>{
        try{

            // const token = req.user?.token || req.session?.token; // Ensure token exists
            // if (!token) {
            //     return res.status(401).json({ message: "Unauthorized access" });
            // }
        
            // if(token){
            //     try{
            //         const decoded=jwt.verify(token,process.env.JWT_SECRET)
            //         const userId=decoded.id
            //         const user=await User.findById(userId)
            //         if(user && user.isActive){
            //             return res.redirect("/user/dashboard")
            //         }
            //     }catch(tokenError){
            //         res.clearCookie('token')
            //     }
            // }
            const products=await Product.find({isActive:true})
            .sort({createdAt:-1})
            .limit(8)
          
            const user=null;
            const searchQuery = req.query.search || '';

            const categories=await Category.find({isActive:true})
            res.render("user/landingpage",{
                products,
                categories,
                user,
                searchQuery
            })
            
            


        }catch(error){
            console.log(error)
            res.status(500).send({ message: "Something went wrong" });

        }
    },
    productDetails: async (req, res) => {
        try {
            const token = req.cookies.token
            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            const userId = decoded.id
            const user = await User.findById(userId)
            const productId = req.params.id
            const cart = await Cart.findOne({ user: userId })
            const cartItemCount = cart ? cart.products.length : 0
            const product = await Product.findById(req.params.id)
                .populate("category")
            // console.log(product)
            if (!product) {
                return res.status(404).send("Product not found")
            }
            const reviews = await Review.find({ product: productId })
                .populate("user", "name")
            const category = await Category.findById(product.category)
            const categoryDiscount = category ? category.discount : 0

            const highestDiscount = Math.max(product.discount, categoryDiscount)


            const relatedProducts = await Product.find({
                brand: product.brand,
                _id: { $ne: product._id }
            }
            )
            // console.log( relatedProducts)

            res.render("user/product-details", {
                product,
                user,
                cartItemCount,
                relatedProducts,
                reviews,
                highestDiscount
            })

        } catch (error) {
            console.log(error)
            res.status(500).send("server error")
        }
    },
    loadShoppingPage: async (req, res) => {
        let { page, search } = req.query
        const { category, brand, price } = req.query
        // console.log("loadshopping page",req.query)
        page = parseInt(page) || 1
        const limit = 8
        const skip = (page - 1) * limit;
        let query = { isActive: true }
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
            ]
        }
        if (category && category !== "all") {
            const categoryDoc = await Category.findOne({ parent: new RegExp(req.query.category, 'i') });
            // console.log("categoryDoc", categoryDoc)
            if (categoryDoc) {
                query.category = categoryDoc._id;
            } else {
                // If the category is not found, return an empty result
                query.category = null;
            }

        }
        if (brand && brand !== "all") {
            query.brand = brand
        }
        if (price && price !== "0") {
            query.price = { $lte: Number(price) }
        }

        const sort = req.query.sort;
        let sortOption = { createdAt: -1 }
        if (sort === "price_high_to_low") {
            sortOption = { price: -1 }

        } else if (sort === "price_low_to_high") {
            sortOption = { price: 1 }

        }

        try {
            const token = req.cookies.token
            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            const user = await User.findById(decoded.id)
            const products = await Product.find(query)
                .sort(sortOption)
                .skip(skip)
                .limit(limit)

            const totalProducts = await Product.countDocuments(query)
            const totalPages = Math.ceil(totalProducts / limit)

            const cart = await Cart.findOne({ user: decoded.id })
            const cartItemCount = cart ? cart.products.length : 0

            res.render("user/shop", {
                user, products, cartItemCount,
                sort,
                totalPages,
                search,
                currentPage: page,
                category,
                brand,
                price
            });

        } catch (error) {
            console.log(error)
        }
    },
    loadMyProfile: async (req, res) => {
        try {
            const userId = req.params.id
            // console.log("User ID in loadMyProfile:",userId)
            const user = await User.findById(userId)
            // console.log("userId in profile",user)
            const address = await Address.find({ user: userId })
            //    console.log("Addresses:", address);
            const wishlist = await Wishlist.findOne({ user: userId }).populate("wishlist")
            // console.log("wishlist from loadprofile",wishlist)     
            const wishlists = wishlist ? wishlist.wishlist : [];


            const orders = await Order.find({ user: userId })
                .populate("products.product")
                .populate("shippingAddress")
                .sort({ createdAt: -1 })
            // console.log("loadprofile", orders)

            let wallet = await Wallet.findOne({ userId })
            if (!wallet) {
                wallet = new Wallet({
                    userId,
                    transactions: []
                })
                await wallet.save();
            }

            const users = await User.findById(userId).populate({
                path: 'referralDetails.userId',
                select: 'name email createdAt'
            });
            const referrals = users.referralDetails.map(detail => ({
                name: detail.name,
                email: detail.email,
                createdAt: detail.joinedAt || (detail.userId ? detail.userId.createdAt : new Date()),
                referralRewards: detail.status === 'active' ? 200 : 0
            })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));


            const referralRewards = {
                total: users.referralRewards || 0,
                history: referrals.map(ref => ({
                    description: `Reward for referring ${ref.name}`,
                    amount: 200,
                    date: ref.createdAt,
                    status: ref.status === 'active' ? 'Credited' : 'Pending'
                }))
            };

            const processedOrders = orders.map(order => {
                order.products = order.products.map(item => {
                    if (!item.product) {
                        item.product = { name: 'Product Not Available', image: [] }; // Default product data
                    }
                    return item;
                });
                return order;
            });
            const safeOrders = processedOrders || [];

            const cart = await Cart.findOne({ user: userId })
            const cartItemCount = cart ? cart.products.length : 0
            res.render("user/profile", {
                user,
                cartItemCount,
                addresses: address || [],
                wishlist: wishlist ? wishlist.wishlist : [],
                orders: safeOrders,
                wallet,
                referrals,
                referralRewards
            })

        } catch (error) {
            console.log(error)
            res.status(500)
        }
    },
    addToCart: async (req, res) => {
        try {
            const token = req.cookies.token
            if (!token) {
                return res.status(401).json({ message: "User not found" });
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            // console.log("add to cart",decoded)
            const userId = decoded.id
            // console.log(userId)
            const productId = req.params.id
            //  console.log(productId)
            const user = await User.findById(userId)
            // console.log(user)
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            const product = await Product.findById(productId)
            // console.log("product.stock",product.stock)
            if (!product) {
                res.status(404).json({ message: "Product not found" });
            }
            let cart = await Cart.findOne({ user: userId })
            // console.log("cart:",cart)
            if (!cart) {
                cart = new Cart({
                    user: userId,
                    products: [{
                        product: productId,
                        quantity: 1
                    }]
                })
            } else {

                const existingProduct = cart.products.find(item => item.product.toString() === productId.toString())

                if (existingProduct) {
                    const newQuantity = existingProduct.quantity + 1;
                    if (newQuantity > 5) {
                        return res.status(400).json({
                            success: false,
                            message: "Maximum items per product is limited to 5"
                        });
                    }

                    if (newQuantity > product.stock) {
                        return res.status(400).json({
                            success: false,
                            message: `Only ${product.stock} units available in stock`
                        });
                    }

                    existingProduct.quantity = newQuantity;
                } else {
                    cart.products.push({
                        product: productId,
                        quantity: 1
                    });
                }
            }
            await cart.save();

            res.status(200).json({ success: true, message: "Product added successfully" })
        } catch (error) {
            console.log(error)
            res.status(500).json({ message: "Internal Server Error" });
        }
    },
    loadAddToCart: async (req, res) => {
        try {
            const token = req.cookies.token
            if (!token) {
                return res.status(401).json({ message: "User not found" });
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            // const productId=req.params.id

            // console.log("product",product)
            const user = await User.findById(decoded.id)

            if (!user) {
                return res.status(400).json({ message: "User not found" });
            }

            if (user.isActive == false) {
                return res.status(401).json({ message: "User is Blocked Contact support team" });
            }
            let cart = await Cart.findOne({ user: decoded.id }).populate('products.product')


            if (!cart) {
                cart = new Cart({
                    user: user._id,
                    products: []
                })
                await cart.save();

            }

            let cartItems = [];
            let totalItems = 0;
            let totalPrice = 0;

            if (cart) {
                cart.products.forEach(item => {
                    totalItems += item.quantity;
                    totalPrice += item.quantity * item.product.price;

                })
                cartItems = cart.products;
            }
            res.render("user/addtocart", { user, cartItems, totalItems, totalPrice });
        } catch (error) {
            console.error(error);
            res.status(500).send(" load add to cart Internal Server Error");
        }

    },


    updateCart: async (req, res) => {
        try {
            const productId = req.params.id;
            const { quantity } = req.body;
            const token = req.cookies.token;

            if (!token) {
                return res.status(401).json({ success: false, message: "User not found" });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;


            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ success: false, message: "Product not found" });
            }


            const cart = await Cart.findOne({ user: userId });
            if (!cart) {
                return res.status(404).json({ success: false, message: "Cart not found" });
            }


            const cartProduct = cart.products.find(item => item.product.toString() === productId);
            if (!cartProduct) {
                return res.status(404).json({ success: false, message: "Product not found in cart" });
            }


            if (quantity > product.stock) {
                return res.status(200).json({ success: false, message: `Only ${product.stock} units left in stock` });
            }


            if (quantity > 5) {
                return res.status(200).json({ success: false, message: "You can add only 5 units of this product" });
            }


            cartProduct.quantity = quantity;
            await cart.save();

            res.json({ success: true });
        } catch (error) {
            console.log(error);
            res.status(500).json({ success: false, message: "Internal Server Error" });
        }
    },


    removeFromCart: async (req, res) => {
        try {
            const productId = req.params.id
            const token = req.cookies.token;
            if (!token) {
                return res.status(401).json({ message: "User not found" });
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;
            const cart = await Cart.findOneAndUpdate({ user: userId },
                { $pull: { products: { product: productId } } },
                { new: true }
            );
            if (!cart) {
                return res.status(404).json({ message: "Cart not found" });
            }

            return res.json({ success: true, message: "Item removed successfully" })


        } catch (error) {
            console.log(error)
            console.error(error);

            return res.status(500).json({ success: false, message: "Internal server error" });
        }
    },
    sendInvite: async (req, res) => {
        try {
            const { email, referralCode } = req.body
            console.log(email, referralCode)
            if (!email) {
                return res.status(400).json({ success: false, message: "email not found" })
            }
            let transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: process.env.GMAIL_USER,
                    pass: process.env.GMAIL_PASS
                }
            })
            let mailOptions = {
                from: process.env.GMAIL_USER,
                to: email,
                subject: "Join our referral Program",
                text: `Hey! Use my referral code  ${referralCode} and get ₹250 off! Visit:http://localhost:3000/user/signup`
            }
            await transporter.sendMail(mailOptions);
            res.status(200).json({ success: true, message: "Invitation sent successfully" })

        } catch (error) {
            console.log(error)
            res.json({ message: 'Error sending invitation.' });


        }
    }



}
module.exports = userViews