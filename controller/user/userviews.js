const Product=require("../../model/addproduct")
const Category=require("../../model/createcategory")
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
        console.log( relatedProducts)
        res.render("user/product-details",{product,relatedProducts})
    }catch(error){
        console.log(error)
        res.status(500).send("server error")
    }
    },
    loadShoppingPage:async (req,res)=>{
        const sort=req.query.sort;
        let sortOption={}
        if(sort==="price_high_to_low"){
            sortOption={price:-1}
           
        }else if(sort==="price_low_to_high"){
            sortOption={price:1}
           
        }
       
        try{
            const products=await Product.find().sort(sortOption)
            res.render("user/shop", { products,sort });

            // if (req.xhr) {
            //     // Render only the product list partial for AJAX requests
            //     res.render("user/partials/product-list", { products, layout: false });
            // } else {
            //     // Render the full page for normal browser requests
            // }
        }catch(error){
            console.log(error)
        }
    }
}
module.exports=userViews