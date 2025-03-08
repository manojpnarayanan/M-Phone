
const Product = require("../model/addproduct")
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const Brands = require("../model/brandschema")
const Category = require("../model/createcategory")

const addproducts = {
  addProduct: async (req, res) => {
    try {
      const { name, description, price, stock, isActive, brand, croppedImages, category, discount, availability, deliveryTime, tags } = req.body
      // console.log(req.body)
      if (!croppedImages) {
        return res.status(400).send("Product adding Failed, Add At Least 3 images");
      }

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
      const product = new Product({
        name,
        description,
        price,
        brand,
        category,
        isActive: isActive ? true : false,
        image: imagePaths,
        stock, discount, availability, deliveryTime, tags
      })

      await product.save();

      res.redirect("/admin/dashboard/productlist")

    } catch (error) {
      console.log(error)
      res.status(400).send("Failed to add products")
    }
  },

  getProduct: async (req, res) => {
    try {
      const productsPerPage = 3
      const search = req.query.search || ""
      const page = parseInt(req.query.page) || 1
      const query = search ? { name: { $regex: search, $options: "i" } } : {};


      const totalProducts = await Product.countDocuments(query)
      const products = await Product.find(query)
        .skip((page - 1) * productsPerPage)
        .limit(productsPerPage)
        .sort({ createdAt: -1 })
        .lean()
      const categories = await Category.find({ isActive: true })
      // console.log(categories)
      res.render("admin/page-products-list", {
        products,
        search,
        categories,
        currentPage: page,
        totalPages: Math.ceil(totalProducts / productsPerPage)
      })
    } catch (error) {
      console.log(error)
      res.status(500).send("error fectching products")
    }
  },
  blockProduct: async (req, res) => {
    try {
      const blockProduct = await Product.findById(req.params.id)
      // console.log(blockProduct)
      if (!blockProduct) {
        return res.status(404).json({ message: "Product not Found" })
      }
      blockProduct.isActive = !blockProduct.isActive;  // Toggle the boolean value
      await blockProduct.save();

      res.status(200).json({
        message: `Product ${blockProduct.isActive ? "unblocked" : "blocked"} successfully`,
        isActive: blockProduct.isActive
      })

    } catch (error) {
      console.log(error)
      res.status(500).json({ message: "Internal server error" })
    }
  },
  editProduct: async (req, res) => {
    const product = await Product.findById(req.params.id)
    const Brand = await Brands.find()
    const category = await Category.find()
    if (!product) {
      return res.status(400).send("Product not found")
    }
    res.render("admin/editproducts", { Brand, category, product })
  },



  updateEditProduct: async (req, res) => {
    try {
      // Destructure fields from the form body
      const { name, description, price, stock, category, brand, tags, isActive } = req.body;
      // console.log("updateEditProduct req.body:", req.body);

      // Find the product in the database
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).send("Product not found");
      }
      const categoryDoc = await Category.findOne({ parent: category })
      // console.log("categoryDoc",categoryDoc)
      if (!categoryDoc) {
        return res.status(400).send("Category not found");
      }
      // Update text/numeric/boolean fields
      product.name = name;
      product.description = description;
      product.price = Number(price);
      product.stock = Number(stock);
      product.category = categoryDoc._id;
      product.brand = brand;
      product.tags = tags ? tags.split(",") : [];
      product.isActive = isActive === "on";

      // Get the existing images from the hidden inputs (as an array)
      // They come as req.body.existingImages[] automatically
      let currentImages = req.body.existingImages;
      if (!Array.isArray(currentImages)) {
        // In case there's only one image, convert to array
        currentImages = [currentImages];
      }

      // Prepare an array to store final image paths after replacements
      let finalImages = [];

      // For each existing image, check if a replacement file was uploaded
      for (let i = 0; i < currentImages.length; i++) {
        // Build the expected field name for this replacement file
        const fieldName = "replacementImage" + i;
        // Find the file in req.files (if any)
        const file = req.files.find(file => file.fieldname === fieldName);
        if (file) {
          // Define the path for the optimized image
          const optimizedPath = path.join(__dirname, "../public/uploads/product-images/optimized-" + file.filename);
          // Resize the image to 500x500 and save the optimized version
          await sharp(file.path)
            .resize(500, 500)
            .toFile(optimizedPath);
          // Push the relative path to the finalImages array
          finalImages.push("uploads/product-images/optimized-" + file.filename);
          // Remove the original uploaded file
          await fs.promises.unlink(file.path);
          // Also, delete the old image file from the server if it exists
          const oldImagePath = path.join(__dirname, "../public", currentImages[i]);
          if (fs.existsSync(oldImagePath)) {
            await fs.promises.unlink(oldImagePath);
          }
        } else {
          // No replacement file provided for this image; keep the original
          finalImages.push(currentImages[i]);
        }
      }

      // Ensure at least 3 images remain
      if (finalImages.length < 3) {
        return res.status(400).send("A product must have at least 3 images");
      }

      // Delete any images that were in the product previously but are no longer in finalImages
      for (let img of product.image) {
        if (!finalImages.includes(img)) {
          const imagePath = path.join(__dirname, "../public", img);
          if (fs.existsSync(imagePath)) {
            await fs.promises.unlink(imagePath);
          }
        }
      }

      // Update the product's image array
      product.image = finalImages;

      // Save the updated product
      await product.save();

      res.redirect("/admin/dashboard/productlist");
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).send("Error updating product");
    }
  },
  loadAddProductForm: async (req, res) => {
    try {
      const categories = await Category.find({ isActive: true })
      res.render("admin/page-form-product-1", { categories })

    } catch (error) {
      console.log(error)
    }
  }
  //   updateEditProduct: async (req, res) => {
  //     try {
  //         const productId = req.params.id;
  //         const { name, description, price, category, brand, stock } = req.body;
  //         console.log(req.body);


  //         // Find product and update
  //         const updatedProduct = await Product.findByIdAndUpdate(
  //             productId,
  //             { name, description, price, category, brand, stock },
  //             { new: true }
  //         );

  //         if (!updatedProduct) {
  //             return res.status(404).json({ success: false, message: "Product not found" });
  //         }

  //         res.redirect("/admin/dashboard/productlist"); // Redirect after successful update
  //     } catch (error) {
  //         console.error("Error updating product:", error);
  //         res.status(500).json({ success: false, message: "Internal server error" });
  //     }
  // }

}

module.exports = addproducts