const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath;
    // Adjust destination based on URL if needed; here we assume product images
    if (req.originalUrl.includes('admin/dashboard/brands/addbrands')) {
      uploadPath = "public/uploads";
    } else {
      uploadPath = "public/uploads/product-images";
    }
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB limit
});

module.exports = upload;
