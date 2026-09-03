
const Product = require("../model/addproduct")
const fs = require("fs");
const path = require("path");
const { cloudinary } = require("../multer/allmulter");
const Brands = require("../model/brandschema");
const Category = require("../model/createcategory");
const statusCode = require("../utils/statuscode");
const MESSAGES = require("../utils/messages");

const addproducts = {
  addProduct: async (req, res) => {
    try {
      const { name, description, price, stock, isActive, brand, croppedImages, category, discount, availability, deliveryTime, tags } = req.body;

      if (!name || name.trim().length < 3) {
        return res.status(statusCode.BAD_REQUEST).json({ success: false, message: MESSAGES.PRODUCT.TITLE_REQUIRED });
      }

      if (!description || description.trim().length < 10) {
        return res.status(statusCode.BAD_REQUEST).json({ success: false, message: MESSAGES.PRODUCT.DESC_REQUIRED });
      }

      const numPrice = Number(price);
      if (isNaN(numPrice) || numPrice <= 0) {
        return res.status(statusCode.BAD_REQUEST).json({ success: false, message: MESSAGES.PRODUCT.PRICE_INVALID });
      }

      const numStock = Number(stock);
      if (isNaN(numStock) || numStock < 0) {
        return res.status(statusCode.BAD_REQUEST).json({ success: false, message: MESSAGES.PRODUCT.STOCK_INVALID });
      }

      if (discount !== undefined && discount !== "") {
        const numDiscount = Number(discount);
        if (isNaN(numDiscount) || numDiscount < 0 || numDiscount > 100) {
          return res.status(statusCode.BAD_REQUEST).json({ success: false, message: MESSAGES.PRODUCT.DISCOUNT_INVALID });
        }
      }

      if (!category) {
        return res.status(statusCode.BAD_REQUEST).json({ success: false, message: MESSAGES.PRODUCT.CATEGORY_REQUIRED });
      }

      if (!brand) {
        return res.status(statusCode.BAD_REQUEST).json({ success: false, message: MESSAGES.PRODUCT.BRAND_REQUIRED });
      }

      console.log("addProduct req.body received:", { name, price, stock, brand, category, croppedImagesLength: croppedImages ? croppedImages.length : "missing" });

      if (!croppedImages) {
        return res.status(statusCode.BAD_REQUEST).json({ success: false, message: MESSAGES.PRODUCT.NO_IMAGES });
      }

      let croppedImagesArray;
      try {
        croppedImagesArray = JSON.parse(croppedImages);
      } catch (e) {
        return res.status(statusCode.BAD_REQUEST).json({ success: false, message: MESSAGES.PRODUCT.CORRUPTED_IMAGES });
      }

      if (!Array.isArray(croppedImagesArray) || croppedImagesArray.length < 3) {
        return res.status(statusCode.BAD_REQUEST).json({ success: false, message: MESSAGES.PRODUCT.MIN_IMAGES_REQUIRED });
      }

      let imagePaths = [];

      for (let i = 0; i < croppedImagesArray.length; i++) {
        let base64Data = croppedImagesArray[i];
        if (!base64Data || base64Data.trim() === "") {
          return res.status(statusCode.BAD_REQUEST).json({ success: false, message: "Invalid image files Add only jpg/png" });
        }


        if (!base64Data.startsWith("data:")) {
          base64Data = `data:image/jpeg;base64,${base64Data}`;
        }


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

      if (!name || name.trim().length < 3) {
        return res.status(statusCode.BAD_REQUEST).send(MESSAGES.PRODUCT.TITLE_REQUIRED);
      }

      if (isNaN(Number(price)) || Number(price) <= 0) {
        return res.status(statusCode.BAD_REQUEST).send(MESSAGES.PRODUCT.PRICE_INVALID);
      }

      if (isNaN(Number(stock)) || Number(stock) < 0) {
        return res.status(statusCode.BAD_REQUEST).send(MESSAGES.PRODUCT.STOCK_INVALID);
      }

      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(statusCode.NOT_FOUND).send(MESSAGES.PRODUCT.NOT_FOUND);
      }
      const categoryDoc = await Category.findOne({ parent: category });

      if (!categoryDoc) {
        return res.status(statusCode.BAD_REQUEST).send(MESSAGES.CATEGORY.NOT_FOUND);
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
          finalImages.push(file.path);
        } else {

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