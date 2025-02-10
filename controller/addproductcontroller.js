
const Product=require("../model/addproduct")
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const addproducts={
    addProduct:async (req,res)=>{
        try{
            // console.log(req.body)
            // console.log(req.files)
              const {name, description,price,stock,isActive,brand,croppedImages}=req.body
              // const productImage=req.files
            //   console.log(isActive)
            if (!croppedImages) {
              return res.status(400).send("Product adding Failed, Add At Least 3 images");
          }
            // if(!productImage || productImage.length<3){
            //     return res.status(400).send("Product adding Failed , Add Atleast 3 images")
            // }
            // const imagePath=productImage.map(file=>file.path.replace(/\\/g, "/").replace("public/",""))
            //   console.log(imagePath)   
            const croppedImagesArray = JSON.parse(croppedImages);
            if (croppedImagesArray.length < 3) {
                return res.status(400).send("Product adding Failed, Add At Least 3 images");
            }
            let imagePaths = [];
            const uploadDir = "public/uploads/product-images/";
            for (let i = 0; i < croppedImagesArray.length; i++) {
              const base64Data = croppedImagesArray[i].replace(/^data:image\/\w+;base64,/, "");
              const imageName = `image-${Date.now()}-${i}.jpg`;
              const imagePath = `${uploadDir}${imageName}`;
              fs.writeFileSync(imagePath, Buffer.from(base64Data, "base64"));

              // Optimize image using sharp
              await sharp(imagePath)
                  .resize(500, 500) // Resize to 500x500px
                  .toFile(`${uploadDir}optimized-${imageName}`);

              imagePaths.push(`uploads/product-images/optimized-${imageName}`);
          }
            const product=new Product({
                    name,
                    description,
                    price,
                    brand,
                    isActive:isActive? true:false,
                    image:imagePaths,
                    stock,
                 })
                //  console.log(product)
                 await product.save();
                  // console.log(product)
                 res.redirect("/admin/dashboard/productlist")

           }catch(error){
            console.log(error)
            res.status(400).send("Failed to add products")
           }
    },

    getProduct:async(req,res)=>{
        const products= await Product.find()
        
        res.render("admin/page-products-list",{products})

    }
}

module.exports=addproducts