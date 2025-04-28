const Product = require("../../model/addproduct")
const User = require("../../model/user")
const jwt = require("jsonwebtoken")
const Wishlist = require("../../model/wishlist")
const Cart = require("../../model/cart")
const statusCode=require("../../utils/statuscode")

const wishlistcontroller = {
  loadWishlist: async (req, res) => {
    try {
      const token = req.cookies.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const userId = decoded.id
      const wishlist = await Wishlist.findOne({ user: userId }).populate("wishlist");
      if (!wishlist) {
        return res.status(statusCode.OK).json({
          success: true,
          wishlist: [],
        });
      }

      res.status(statusCode.OK).json({
        success: true,
        wishlist: wishlist.wishlist,
      });
    } catch (error) {
      console.log(error)
      res.status(statusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  },
  addtoWishlist: async (req, res) => {
    try {
      const productId = req.params.id

      const token = req.cookies.token

      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      const userId = decoded.id

      let wishlist = await Wishlist.findOne({ user: userId })
      if (!wishlist) {

        wishlist = new Wishlist({
          user: userId,
          wishlist: [],
        });
      }

      const isInWishlist = wishlist.wishlist.includes(productId)
      if (isInWishlist) {

        wishlist.wishlist = wishlist.wishlist.filter(id => id.toString() !== productId);
      } else {

        wishlist.wishlist.push(productId);
      }
      await wishlist.save()
      res.status(statusCode.OK).json({
        success: true,
        message: isInWishlist
          ? "Product removed from wishlist"
          : "Product added to wishlist",
      });
    } catch (error) {
      console.log(error)
      res.status(statusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Internal Server Error",
      });
    }


  },
  deleteWishlistItems: async (req, res) => {
    try {
      const productId = req.params.id;

      const token = req.cookies.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;
      const wishlist = await Wishlist.findOne({ user: userId });

      if (!wishlist) {
        return res.status(statusCode.NOT_FOUND).json({
          success: false,
          message: 'Wishlist not found',
        });
      }

      wishlist.wishlist = wishlist.wishlist.filter(
        (item) => item.toString() !== productId
      );
      await wishlist.save();

      res.status(statusCode.OK).json({
        success: true,
        message: 'Product removed from wishlist',
      })
    } catch (error) {
      console.log(error)
    }
  },
  addToCartFromWishlist: async (req, res) => {
    try {
      const productId = req.params.id

      const token = req.cookies.token
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const userId = decoded.id

      const product = await Product.findById(productId)

      if (!product) {
        res.status(statusCode.NOT_FOUND).json({ message: "Product not found" });
      }
      let cart = await Cart.findOne({ user: userId })
      if (!cart) {
        cart = new Cart({
          user: userId,
          products: [{
            product: productId,
            quantity: 1
          }]
        })
      } else {
        const existingProduct = cart.products.find(item => item.product.toString() === productId)
        if (existingProduct) {
          existingProduct.quantity += 1
        } else {
          cart.products.push({
            product: productId,
            quantity: 1
          })
        }
      }
      await cart.save()
      await Wishlist.findOneAndUpdate(
        { user: userId },
        { $pull: { wishlist: productId } }
      );
      res.status(statusCode.OK).json({
        success: true,
        message: "Product added to cart from wishlist",
      });

    } catch (error) {
      console.error(error);
      res.status(statusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to add product to cart: " + error.message,
      });
    }

  }
}

module.exports = wishlistcontroller