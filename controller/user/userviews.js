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
    }
}
module.exports=userViews