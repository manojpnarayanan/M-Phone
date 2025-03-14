const { default: mongoose } = require("mongoose")
const Category = require("../model/createcategory")



const productupdates = {
    addCategory: async (req, res) => {
        try {
            let { name, slug, parent, description, isActive } = req.body
             console.log("Categories from :",req.body)
            const existingCategory = await Category.findOne({ slug })
            if (existingCategory) {
                // return res.status(400).send("Already Exists...")
                req.flash('error', 'Category already exists');
                return res.redirect("/admin/dashboard/products/categories");

            }
            //  parent=parent&&mongoose.Types.ObjectId.isValid(parent)? new mongoose.Types.ObjectId(parent):null;
            //  console.log(parent)
            const category = new Category({
                name,
                slug,
                parent: parent || null,
                description,
                isActive
            })

            await category.save()
            req.flash('success', 'Category created successfully');
            res.redirect("/admin/dashboard/products/categories")
        } catch (error) {
            console.log(error)
            req.flash('error', 'An error occurred while creating the category');
        }
    },
    //  getCategory: async (req,res)=>{
    //     try{
    //         const searchQuery=req.query.search || "";
    //         const categories=await Category.find({
    //             $or:[
    //                 {name:{$regex:searchQuery, $options:"i"}},
    //                 {slug:{$regex:searchQuery, $options:"i"}},
    //                 // {"parent.name":{$regex:searchQuery, $options:"i"}}
    //             ]
    //         })
    //         .populate("parent","name")
    //         .sort({createdAt:-1})
    //         .lean();
    //         // console.log(categories)
    //         res.render("admin/page-categories",{categories,searchQuery})
    //     }catch(error){
    //         console.log(error)
    //         res.status(500).send("error fetching categories")
    //     }
    //  },
    editCategory: async (req, res) => {
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
    updateCategory: async (req, res) => {
        try {
            const { name, slug, parent, description } = req.body;
            // console.log(req.body)
            const updatedCategory = await Category.findByIdAndUpdate(req.params.id, {
                name,
                slug,
                parent: parent || null,
                description
            },
                { new: true }  //returns the updated document
            )

            if (!updatedCategory) {
                return res.status(404).send({ error: "Category not found" })
            }

            res.json(updatedCategory)
        } catch (error) {
            console.log(error)
            res.status(500).send("Failed to update Category")
        }
    },
    blockCategory: async (req, res) => {
        try {
            const categoryId = req.params.id
            // console.log(" blockCategory",categoryId)
            const categories = await Category.findById(categoryId)
            // console.log(categories)

            if (!categories) {
                res.status(400).send("Category not Found")
            }
            categories.isActive = !categories.isActive
            await categories.save()
            res.json({
                success: true,
                isActive: categories.isActive
            })
        } catch (error) {
            console.log(error)
        }

    },
    getCategory: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;  // Current page
            const limit = 3;  // Categories per page
            const searchQuery = req.query.search || "";

            const filter = searchQuery
                ? { $or: [{ name: { $regex: searchQuery, $options: "i" } }, { slug: { $regex: searchQuery, $options: "i" } }] }
                : {};

            const totalCategories = await Category.countDocuments(filter);
            const totalPages = Math.ceil(totalCategories / limit);

            const categories = await Category.find(filter)
                .populate("parent", "name")
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean();

            res.render("admin/page-categories", {
                categories,
                searchQuery,
                currentPage: page,
                totalPages
            });
        } catch (error) {
            console.log(error);
            res.status(500).send("Error fetching categories");
        }
    }

}

module.exports = productupdates