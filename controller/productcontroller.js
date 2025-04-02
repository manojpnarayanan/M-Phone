const { default: mongoose } = require("mongoose")
const Category = require("../model/createcategory")



const productupdates = {
    addCategory: async (req, res) => {
        try {
            let { name, slug, parent, description, isActive } = req.body
            //  console.log("Categories from :",req.body)

            if (!name || name.trim().length < 3) {
                req.flash("error", "Category name must be at least 3 characters long.");
                return res.redirect("/admin/dashboard/products/categories");
            }
            name = name.trim();

            const existingCategoryByName = await Category.findOne({ name: { $regex: new RegExp("^" + name + "$", "i") } });
            if (existingCategoryByName) {
                req.flash("error", "Category name already exists.");
                return res.redirect("/admin/dashboard/products/categories");
            }

            const existingCategory = await Category.findOne({ slug })
            if (existingCategory) {

                req.flash('error', 'Category already exists');
                return res.redirect("/admin/dashboard/products/categories");

            }

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
            console.log(req.body)
            const updatedCategory = await Category.findByIdAndUpdate(req.params.id, {
                name,
                slug,
                parent: parent || null,
                description
            },
                { new: true }
            )

            if (!updatedCategory) {
                return res.status(404).json({ success: false, message: "Category not found" })
            }

            res.status(200).json({ success: true, message: "Category updated successfully" })
        } catch (error) {
            console.log(error)
            res.status(500).json({ success: false, message: "Failed to update Category" })
        }
    },
    blockCategory: async (req, res) => {
        try {
            const categoryId = req.params.id

            const categories = await Category.findById(categoryId)

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
            const page = parseInt(req.query.page) || 1;
            const limit = 3;
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
    },
    addOffer: async (req, res) => {
        try {
            const categoryId = req.params.id
            // console.log(categoryId)
            const { offerPercentage } = req.body
            // console.log(offerPercentage)
            const category = await Category.findById(categoryId)
            if (!category) {
                return res.status(400).json({ success: false, message: "Category not found" })
            }
            category.discount = offerPercentage
            await category.save();

            res.json({ success: true, message: "Offer added successfully" })



        } catch (error) {
            console.log(error)
            res.status(500).json({ success: false, message: "Internal server error" });

        }
    },
    removeOffer: async (req, res) => {
        try {
            const categoryId = req.params.id

            const category = await Category.findById(categoryId)
            if (!category) {
                return res.status(400).json({ success: false, message: "Category not found" })
            }
            category.discount = 0
            await category.save();

            res.json({ success: true, message: "Offer removed successfully" })

        } catch (error) {

        }
    }

}

module.exports = productupdates