const path=require("path")
const Brands=require("../model/brandschema")


const brandscontroller={
    addBrand:async (req,res)=>{
        try{
            // console.log(req.body)
            // console.log(req.file)
        const brandName=req.body.name;
        const brandImage=req.file ? req.file.path.replace(/\\/g, "/").replace(/^public\//, ""): null;
        // console.log(brandImage)
           
if(!brandName || !brandImage){
   return res.status(400).send("Brand name and Image required")
}
     const newBrand=new Brands({
        name:brandName,
        image:brandImage
     })

    await newBrand.save()
     res.redirect("/admin/dashboard/brands")
    }
catch(error){
    console.log(error)
     }
},
getBrands:async(req,res)=>{
    try{
    const brand=await Brands.find();
    // console.log(brand)
    res.render("admin/page-brands",{brand})
}catch(error){
    res.status(500).send("Server error")
}
}



}

module.exports=brandscontroller