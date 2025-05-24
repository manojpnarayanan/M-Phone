const jwt = require("jsonwebtoken");
const User = require("../model/user");

const verifyUser = {
  existUser: async (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      return res.redirect("/user/login");
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;
      const activeUser = await User.findById(userId);
      
      if (!activeUser) {
        req.flash("error", "Please login to continue");
        return res.redirect("/user/login");
      }
      
      req.user = activeUser; // Set user data for route handlers
      next();
    } catch (error) {
      console.log("JWT verification error:", error.message);
      res.clearCookie("token");
      req.flash("error", "Session expired. Please login again");
      return res.redirect("/user/login");
    }
  },
  
  preventLoginpage: async (req, res, next) => {
    const token = req.cookies.token;
    
    if (!token) {
      return next();
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;
      const activeUser = await User.findById(userId);
      
      if (activeUser) {
        // If an authenticated user tries to access login or signup pages
        if (req.path === "/login" || req.path === "/signup" || 
            req.originalUrl.includes("/login") || req.originalUrl.includes("/signup")) {
          return res.redirect("/user/dashboard");
        }
      }
      
      next();
    } catch (error) {
      console.log("Token error in preventLoginpage:", error.message);
      res.clearCookie("token");
      next();
    }
  },
  
  isVerifiedtrue: async (req, res, next) => {
    try {
      const token = req.cookies.token;
      
      if (!token) {
        req.flash("error", "Please login to continue");
        return res.redirect("/user/login");
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user) {
        res.clearCookie("token");
        req.flash("error", "User not found");
        return res.redirect("/user/login");
      }
      
      if (!user.isActive) {
        res.clearCookie("token");
        req.flash("error", "Your account has been deactivated");
        return res.redirect("/user/login");
      }
      
      if (!user.isVerified) {
        res.clearCookie("token");
        req.flash("error", "Please verify your email to continue");
        return res.redirect("/user/login");
      }
      
      req.user = user; // Set user data for route handlers
      next();
    } catch (error) {
      console.log("Verification error:", error.message);
      
      if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
        res.clearCookie("token");
        req.flash("error", "Session expired. Please login again");
        return res.redirect("/user/login");
      }
      
      // Handle other errors
      res.clearCookie("token");
      req.flash("error", "Authentication error");
      return res.redirect("/user/login");
    }
  }
};

module.exports = verifyUser;