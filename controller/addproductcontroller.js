
const Product = require("../model/addproduct")
const fs = require("fs");
const path = require("path");
const { cloudinary } = require("../multer/allmulter");
const Brands = require("../model/brandschema")
const Category = require("../model/createcategory")
const statusCode=require("../utils/statuscode")

const addproducts = {
  addProduct: async (req, res) => {
    try {
      const { name, description, price, stock, isActive, brand, croppedImages, category, discount, availability, deliveryTime, tags } = req.body
      if (!croppedImages) {
        return res.status(statusCode.BAD_REQUEST).json({ success: false, message: "Product adding Failed, Add At Least 3 images" });
      }

      const croppedImagesArray = JSON.parse(croppedImages);
      if (croppedImagesArray.length < 3) {
        return res.status(statusCode.BAD_REQUEST).json({ success: false, message: "Product adding Failed, Add At Least 3 images" });
      }

      let imagePaths = [];

      for (let i = 0; i < croppedImagesArray.length; i++) {
        let base64Data = croppedImagesArray[i];
        if (!base64Data || base64Data.trim() === "") {
          return res.status(statusCode.BAD_REQUEST).json({ success: false, message: "Invalid image files Add only jpg/png" });
        }

        // Ensure data URI prefix for Cloudinary
        if (!base64Data.startsWith("data:")) {
          base64Data = `data:image/jpeg;base64,${base64Data}`;
        }

        // Upload base64 image directly to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(base64Data, {
          folder: "m-phone/products",
          transformation: [{ width: 500, height: 500, crop: "limit", quality: "auto" }],
        });

        imagePaths.push(uploadResult.secure_url);
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
      console.log("Error adding product:", error);
      res.status(statusCode.BAD_REQUEST).json({ success: false, message: error.message || "Product adding Failed" });
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

      res.render("admin/page-products-list", {
        products,
        search,
        categories,
        currentPage: page,
        totalPages: Math.ceil(totalProducts / productsPerPage)
      })
    } catch (error) {
      console.log(error)
      res.status(statusCode.INTERNAL_SERVER_ERROR).send("error fectching products")
    }
  },
  blockProduct: async (req, res) => {
    try {
      const blockProduct = await Product.findById(req.params.id)
      // console.log(blockProduct)
      if (!blockProduct) {
        return res.status(statusCode.NOT_FOUND).json({ message: "Product not Found" })
      }
      blockProduct.isActive = !blockProduct.isActive;
      await blockProduct.save();

      res.status(statusCode.OK).json({
        message: `Product ${blockProduct.isActive ? "unblocked" : "blocked"} successfully`,
        isActive: blockProduct.isActive
      })

    } catch (error) {
      console.log(error)
      res.status(statusCode.INTERNAL_SERVER_ERROR).json({ message: "Internal server error" })
    }
  },
  editProduct: async (req, res) => {
    const product = await Product.findById(req.params.id)
    const Brand = await Brands.find()
    const category = await Category.find()
    if (!product) {
      return res.status(statusCode.BAD_REQUEST).send("Product not found")
    }
    res.render("admin/editproducts", { Brand, category, product })
  },



  updateEditProduct: async (req, res) => {
    try {
      const { name, description, price, stock, category, brand, tags, isActive } = req.body;

      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(statusCode.NOT_FOUND).send("Product not found");
      }
      const categoryDoc = await Category.findOne({ parent: category })

      if (!categoryDoc) {
        return res.status(statusCode.BAD_REQUEST).send("Category not found");
      }

      product.name = name;
      product.description = description;
      product.price = Number(price);
      product.stock = Number(stock);
      product.category = categoryDoc._id;
      product.brand = brand;
      product.tags = tags ? tags.split(",") : [];
      product.isActive = isActive === "on";

      let currentImages = req.body.existingImages;
      if (!Array.isArray(currentImages)) {
        currentImages = [currentImages];
      }

      let finalImages = [];

      for (let i = 0; i < currentImages.length; i++) {
        const fieldName = "replacementImage" + i;
        const file = req.files ? req.files.find(file => file.fieldname === fieldName) : null;

        if (file) {
          // File was uploaded via multer → Cloudinary, use the Cloudinary URL
          finalImages.push(file.path); // multer-storage-cloudinary stores URL in file.path
        } else {
          // Keep existing image (could be Cloudinary URL or old local path)
          finalImages.push(currentImages[i]);
        }
      }

      if (finalImages.length < 3) {
        return res.status(statusCode.BAD_REQUEST).send("A product must have at least 3 images");
      }

      product.image = finalImages;
      await product.save();

      res.redirect("/admin/dashboard/productlist");
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(statusCode.INTERNAL_SERVER_ERROR).send("Error updating product");
    }
  },
  loadAddProductForm: async (req, res) => {
    try {
      const categories = await Category.find({ isActive: true })
      res.render("admin/page-form-product-1", { categories })

    } catch (error) {
      console.log(error)
    }
  },
  addOffer: async (req, res) => {
    try {
      const productId = req.params.id

      const { offerPercentage } = req.body

      const product = await Product.findById(productId)
      if (!product) {
        return res.status(statusCode.NOT_FOUND).json({ success: false, message: "Product not found" })
      }
      product.discount = offerPercentage
      await product.save()
      res.status(statusCode.OK).json({ success: true, message: "Offer added successfully" })


    } catch (error) {
      console.log(error)
      res.status(statusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to add offer" })

    }
  },
  removeOffer: async (req, res) => {
    try {
      const productId = req.params.id
      const product = await Product.findById(productId)
      if (!product) {
        return res.status(statusCode.NOT_FOUND).json({ success: false, message: "Product not found" })
      }
      product.discount = 0
      await product.save()
      res.status(statusCode.OK).json({ success: true, message: "Offer removed successfully" })
    } catch (error) {
      console.log(error)
      res.status(statusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to remove offer" })

    }

  }



}

module.exports = addproducts