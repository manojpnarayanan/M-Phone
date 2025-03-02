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
        const brandsPerPage=5
        const page=parseInt(req.query.page)||1
        const search=req.query.search||""
        const query=search?  { name: { $regex: search, $options: "i" } } : {};
        const totalBrands=await Brands.countDocuments(query)
        //  console.log(search)
        //  console.log('Page:', page, 'Search:', search)
    const brand=await Brands.find(query)
    .skip((page-1)*brandsPerPage)
    .limit(brandsPerPage)
    .sort({createdAt:-1})
    // console.log(brand)
    res.render("admin/page-brands",{
        brand,
        search,
        currentPage:page,
        totalPages:Math.ceil(totalBrands / brandsPerPage)
    })
}catch(error){
    console.error("Error in getBrands:", error);
    res.status(500).send("Server error")
}
}



}

module.exports=brandscontroller