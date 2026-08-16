const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folder = "m-phone/products";

    if (req.originalUrl.includes("admin/dashboard/brands/addbrands")) {
      folder = "m-phone/brands";
    } else if (req.originalUrl.includes("/user/myprofile/update-email")) {
      folder = "m-phone/profiles";
    }

    return {
      folder: folder,
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      transformation: [{ width: 500, height: 500, crop: "limit", quality: "auto" }],
    };
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

module.exports = { upload, cloudinary };
