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



const userViews = {
    productDetails: async (req, res) => {
        try {
            const token = req.cookies.token
            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            const userId = decoded.id
            const user=await User.findById(userId)
            const productId = req.params.id
            const cart= await Cart.findOne({user:userId})
            const cartItemCount=cart? cart.products.length:0
            const product = await Product.findById(req.params.id)
            .populate("category")
            // console.log(product)
            if (!product) {
                return res.status(404).send("Product not found")
            }
            const reviews = await Review.find({ product: productId })
                .populate("user", "name")
                const category=await Category.findById(product.category)
                const categoryDiscount=category? category.discount:0

                const highestDiscount=Math.max(product.discount,categoryDiscount)

            //FETCH RELEATED FIELDS
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
        const limit = 4
        const skip = (page - 1) * limit;
        let query = {}
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
             
            const cart=await Cart.findOne({user:decoded.id})
            const cartItemCount=cart? cart.products.length : 0
            

            res.render("user/shop", {
                user, products,cartItemCount,
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
            // const addresses=await address.findOne(user)
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
            if(!wallet){
                wallet= new Wallet({
                    userId,
                    // walletBalance: 0,

                    transactions:[]
                })
                await wallet.save();
            }
            // Process orders to handle null/undefined products
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
            //     if(!address||!wishlist){
            //         res.render("user/profile",{user,
            //             addresses:null,
            //             wishlist:null,
            //             orders:null,
            //     })
            //         }else{
            //             res.render("user/profile",{user,addresses:address,
            //                  wishlist:wishlists,
            //                 orders:safeOrders,
            //                 wallet: wallet || { walletBalance: 0, transactions: [] }

            //             })
            //         }   
           const cart=await Cart.findOne({user:userId})
           const cartItemCount=cart? cart.products.length : 0
            res.render("user/profile", {
                user,
                cartItemCount,
                addresses: address || [],
                wishlist: wishlist ? wishlist.wishlist : [],
                orders: safeOrders,
                wallet
               // wallet: wallet || { walletBalance: 0, transactions: [] }
            });

        } catch (error) {
            console.log(error)
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
            console.log("product.stock",product.stock)
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
                console.log(existingProduct)
                // if (existingProduct) {
                //     if (existingProduct.quantity >= 5 || existingProduct.quantity > product.stock) {
                //         return res.status(400).json({ success: false,
                //              message:existingProduct.quantity >= 5 
                //              ? "Maximum items per product is limited to 5" 
                //              : `Only ${product.stock} units available in stock` })
                //     }
                //     existingProduct.quantity += 1
                // } else {
                //     cart.products.push({
                //         product: productId,
                //         quantity: 1
                //     })
                // }
                if (existingProduct) {
                    // Check if NEW quantity (current + 1) exceeds limits
                    const newQuantity = existingProduct.quantity + 1;
                    
                    // Check stock and maximum quantity constraints
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
            // const product=await Product.findById(productId)
            // console.log("product",product)
            const user = await User.findById(decoded.id)
            // console.log("addtocart user:",user)
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            if (user.isActive == false) {
                return res.status(401).json({ message: "User is Blocked Contact support team" });
            }
            let cart = await Cart.findOne({ user: decoded.id }).populate('products.product')
            // console.log(user,cart)
            // console.log(user)
            if(!cart){
                cart=new Cart({
                    user:user._id,
                    products:[]
                })
                await cart.save();
                // console.log("Cart created",cart);
            }
            // if(!cart){
            //   return  res.render("user/addtocart",{user,cartItems:cart,totalItems,totalPrice})

            // }
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
    // updateCart: async (req, res) => {
    //     try {
    //         const productId = req.params.id
    //         const { quantity } = req.body
    //         const token = req.cookies.token
    //         if (!token) {
    //             return res.status(401).json({ success: false, message: "User not found" })
    //         }
    //         // console.log("reachged")
    //         const Products=await Product.findById(productId)
    //         // console.log("Product.stock",Products.stock)
    //         const decoded = jwt.verify(token, process.env.JWT_SECRET)
    //         const userId = decoded.id
    //         const cart = await Cart.findOne({ user: userId })
    //         if (!cart) {
    //             return res.status(404).json({success: false, message: "Cart not found" })
    //         }
    //         const product = cart.products.find(item => item.product.toString() === productId)
    //         if (!product) {
    //             return res.status(404).json({success: false, message: "Product not found" })
    //         }
    //         if(quantity>Products.stock){
    //             return res.status(200).json({success: false, message:`only ${Products.stock} left`})
    //         }
    //         if (quantity > 5) {
    //             return res.status(400).json({ success: false, message: "you can add only 5 units of this product" })
    //         }
    //         product.quantity = quantity
    //         await cart.save();
    //         res.json({ success: true })
    //     } catch (error) {
    //         console.log(error)
    //         res.status(500).json({success: false, message: "Internal Server Error" });
    //     }
    // },
    
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
    
            // Fetch the product to check stock
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ success: false, message: "Product not found" });
            }
    
            // Fetch the user's cart
            const cart = await Cart.findOne({ user: userId });
            if (!cart) {
                return res.status(404).json({ success: false, message: "Cart not found" });
            }
    
            // Find the product in the cart
            const cartProduct = cart.products.find(item => item.product.toString() === productId);
            if (!cartProduct) {
                return res.status(404).json({ success: false, message: "Product not found in cart" });
            }
    
            // Check if the new quantity exceeds the stock
            if (quantity > product.stock) {
                return res.status(200).json({ success: false, message: `Only ${product.stock} units left in stock` });
            }
    
            // Check if the new quantity exceeds the maximum allowed (5)
            if (quantity > 5) {
                return res.status(200).json({ success: false, message: "You can add only 5 units of this product" });
            }
    
            // Update the quantity
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
            const cart = await Cart.findOne({ user: userId });
            if (!cart) {
                return res.status(404).json({ message: "Cart not found" });
            }

            cart.products = cart.products.filter(item => item.product.toString() !== productId);
            await cart.save();
            res.json({ success: true , message:"Item removed "});
            

        } catch (error) {
            console.log(error)
            console.error(error);
            res.status(500).json({ message: "Internal Server Error" })
        }
    }
}
module.exports = userViews