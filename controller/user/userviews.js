const Product=require("../../model/addproduct")
const Category=require("../../model/createcategory")
const User=require("../../model/user")
const jwt=require("jsonwebtoken")
const Cart=require("../../model/cart")
const Address=require("../../model/address")
const Wishlist=require("../../model/wishlist")
const Order=require("../../model/order")



const userViews={
    productDetails:async (req,res)=>{
        try{
        const product=await Product.findById(req.params.id)
        // console.log(product)
        if(!product){
            return res.status(404).send("Product not found")
        }

        //FETCH RELEATED FIELDS
        const relatedProducts= await Product.find({
            brand:product.brand,
            _id:{$ne:product._id}}
        )
        // console.log( relatedProducts)
        res.render("user/product-details",{product,relatedProducts})
    }catch(error){
        console.log(error)
        res.status(500).send("server error")
    }
    },
    loadShoppingPage:async (req,res)=>{
        let {page,search}=req.query
        const{category,brand,price}=req.query
         page=parseInt(page)||1
        const limit=3
        const skip=(page-1)*limit;
        let query={}
        if(search){
            query.$or=[
                {name:{$regex:search,$options:"i"}},
            ]
        }
        if (category && category !== "all") {
            const categoryDoc = await Category.findOne({ name: new RegExp(req.query.category, 'i') });
  if (categoryDoc) {
    query.category = categoryDoc._id;
  }
            // query.category = category;
        }
        if(brand && brand!=="all"){
            query.brand=brand
        }
        if (price && price !== "0") {
            query.price = { $lte: Number(price) }
        }

        const sort=req.query.sort;
        let sortOption={}
        if(sort==="price_high_to_low"){
            sortOption={price:-1}
           
        }else if(sort==="price_low_to_high"){
            sortOption={price:1}
           
        }
       
        try{
             const token=req.cookies.token
             const decoded=jwt.verify(token,process.env.JWT_SECRET)
              const user=await User.findById(decoded.id)
            const products=await Product.find(query)
            .sort(sortOption)
            .skip(skip)
            .limit(limit)
            
            const totalProducts=await Product.countDocuments(query)
            const totalPages=Math.ceil(totalProducts/limit)
            
            res.render("user/shop", {user, products,
                sort,
                totalPages,
                search,
                currentPage:page,
                category,
                brand,
                price
             });

        }catch(error){
            console.log(error)
        }
    },
    loadMyProfile:async(req,res)=>{
        try{
            const userId=req.params.id
            console.log("User ID in loadMyProfile:",userId)
            const user=await User.findById(userId)
            // console.log("userId in profile",user)
            // const addresses=await address.findOne(user)
        const address=await Address.find({user:userId})
            //    console.log("Addresses:", address);
        const wishlist=await Wishlist.findOne({user:userId}).populate("wishlist")
        console.log("wishlist from loadprofile",wishlist)     
        const wishlists = wishlist ? wishlist.wishlist: [];
        const orders=await Order.find({user:userId})
        .populate("products.product")
        .populate("shippingAddress")
        console.log("loadprofile",orders)
        if(!address||!wishlist){
            res.render("user/profile",{user,
                addresses:null,
                wishlist:null,
            orders:null
        })
            }else{
                res.render("user/profile",{user,addresses:address,
                     wishlist:wishlists,
                    orders
                })
            }         
                
        }catch(error){
               console.log(error)
        }
    },
    addToCart:async (req,res)=>{
        try{
            const token=req.cookies.token
            if(!token){
             return   res.status(401).json({ message: "User not found" });
            }
            const decoded=jwt.verify(token,process.env.JWT_SECRET) 
            console.log("add to cart",decoded)
            const userId=decoded.id
            console.log(userId)
            const productId=req.params.id
             console.log(productId)
            const user=await User.findById(userId)
            console.log(user)
            if(!user){
                return res.status(404).json({ message: "User not found" });
            }
            const product=await Product.findById(productId)
            console.log(product)
            if(!product){
                res.status(404).json({ message: "Product not found" });
            }
            let cart=await Cart.findOne({user:userId})
            console.log("cart:",cart)
            if(!cart){
                cart=new Cart({
                    user:userId,
                    products:[{product:productId,
                        quantity:1
                    }]
                })
            }else{
                const existingProduct=cart.products.find(item=>item.product.toString()===productId)
                if(existingProduct){
                    existingProduct.quantity+=1
                }else{
                    cart.products.push({product:productId,
                        quantity:1
                    })
                }
            }
            await cart.save();
            res.redirect("/user/dashboard/addtocart")

        }catch(error){
            console.log(error)
            res.status(500).json({ message: "Internal Server Error" });
        }
    },
    loadAddToCart:async (req,res)=>{
        try{
            const token=req.cookies.token
            if(!token){
                return res.status(401).json({ message: "User not found" });            }
            const decoded=jwt.verify(token,process.env.JWT_SECRET)
            // const productId=req.params.id
            // const product=await Product.findById(productId)
            // console.log("product",product)
            const user=await User.findById(decoded.id)
            console.log("addtocart user:",user)
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            if(user.isActive==false){
                return res.status(401).json({ message: "User is Blocked Contact support team" });
            }
            const cart=await Cart.findOne({user:decoded.id}).populate('products.product')
            // console.log(user,cart)
            // console.log(user)
            if(!cart){
              return  res.render("user/addtocart",{user,cartItems:cart,totalItems,totalPrice})

            }
            let totalItems=0;
            let totalPrice=0;
        
            cart.products.forEach(item=>{
                totalItems+=item.quantity;
                totalPrice+=item.quantity*item.product.price;
              
            })
            res.render("user/addtocart", { user, cartItems: cart.products, totalItems, totalPrice });
        }catch(error){
            console.error(error);
            res.status(500).send(" load add to cart Internal Server Error");
        }
        
    },
    updateCart:async (req,res)=>{
        try{
           const productId=req.params.id
           const{quantity}=req.body
           const token=req.cookies.token
           if(!token){
            return res.status(401).json({message:"User not found"})
           }
           const decoded=jwt.verify(token,process.env.JWT_SECRET)
           const userId=decoded.id
           const cart=await Cart.findOne({user:userId})
           if(!cart){
            return res.status(404).json({message:"Cart not found"})
        }
        const product=cart.products.find(item=>item.product.toString()===productId)
        if(!product){
            return res.status(404).json({message:"Product not found"})
        }
        product.quantity=quantity
        await cart.save();
        res.json({success:true})
        }catch(error){
            console.log(error)
            res.status(500).json({ message: "Internal Server Error" });
        }
    },
    removeFromCart:async(req,res)=>{
        try{
            const productId=req.params.id
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
        res.json({ success: true });

        }catch(error){
            console.log(error)
            console.error(error);
            res.status(500).json({ message: "Internal Server Error" })
        }
    }
}
module.exports=userViews