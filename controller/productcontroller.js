const { default: mongoose } = require("mongoose")
const Category=require("../model/createcategory")



const productupdates={
addCategory: async(req,res)=>{
    try{
     let {name,slug,parent,description,isActive}=req.body
     const existingCategory=await Category.findOne({slug})
     if(existingCategory){
         return res.status(400).send("Already Exists...")
     }
     parent=parent&&mongoose.Types.ObjectId.isValid(parent)? new mongoose.Types.ObjectId(parent):null;
     console.log(parent)
     const category= new Category({
         name,
         slug,
         parent:parent||null,
         description,
         isActive
     })
     
     await category.save()
     res.redirect("/admin/dashboard/products/categories")
    }catch(error){
     console.log(error)
    }
 },
 getCategory: async (req,res)=>{
    try{
        const searchQuery=req.query.search || "";
        const categories=await Category.find({
            $or:[
                {name:{$regex:searchQuery, $options:"i"}},
                {slug:{$regex:searchQuery, $options:"i"}},
                // {"parent.name":{$regex:searchQuery, $options:"i"}}
            ]
        })
        .populate("parent","name")
        .sort({createdAt:-1})
        .lean();
        // console.log(categories)
        res.render("admin/page-categories",{categories,searchQuery})
    }catch(error){
        console.log(error)
        res.status(500).send("error fetching categories")
    }
 },
editCategory:async (req,res)=>{
                    try {
                        const category = await Category.findById(req.params.id);
                        const categories = await Category.find(); // Fetch all categories for dropdown
                                  
                        if (!category) {
                            return res.status(404).send("Category not found");
                        }
                
                        res.render("admin/admin-edit-category", { category, categories });
                    } catch (err) {
                        console.error(err);
                        res.status(500).send("Server Error");
                    }
 },
 updateCategory:async (req,res)=>{
    try{
        const {name,slug,parent,description}=req.body;
        // console.log(req.body)
       const updatedCategory= await Category.findByIdAndUpdate(req.params.id,{
            name,
            slug,
            parent:parent||null,
            description
        },
        {new :true}  //returns the updated document
    )
          if(!updatedCategory){
            return res.status(404).send({error:"Category not found"})
          }

        res.json(updatedCategory)
    }catch(error){
        console.log(error)
        res.status(500).send("Failed to update Category")
    }
 },
 toggleStatus:async (req,res)=>{
     try{
        const {listed}=req.body;
        const updatedCategory=await Category.findByIdAndUpdate(
            req.params.id,
            {listed:listed},
            {new:true}
        );
        if(!updatedCategory){
            return res.status(404).json({error:"Category not Found"})
        }
        res.json({message:"Category status updated",updatedCategory})
     }catch(error){
        console.log(error)
     }
 },

}

module.exports=productupdates