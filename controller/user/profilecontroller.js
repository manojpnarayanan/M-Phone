const jwt = require("jsonwebtoken")
const User = require("../../model/user")
const Address = require("../../model/address")
const mongoose = require("mongoose");
const multer = require("multer")
const path = require("path")
const bcryptjs = require("bcryptjs")

const profilecontroller = {
  loadAddressPage: async (req, res) => {
    try {
      const userId = req.params.id
      // console.log("Params:", userId);
      const token = req.cookies.token
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      // console.log(decoded)
      const user = await User.findById(userId)
      //  console.log("User:", user);
      const address = await Address.find({ user: userId })
      //    console.log("Addresses:", address);

      res.render("user/addaddress", { user, addresses: null })

    } catch (error) {
      console.log(error)
      res.status(500).json({ message: "Internal server error" });
    }

  },
  saveAddress: async (req, res) => {
    try {
      console.log(req.body)
      const { name, mobilenumber, housename, city, pincode, state, country, addresstype } = req.body
      if (!name || !mobilenumber || !housename || !city || !pincode || !state || !country || !addresstype) {

        return res.status(400).json({ message: "All fields are required" });
      }
      const userId = req.params.id
      // console.log("userid",userId)
      if (!mongoose.isValidObjectId(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      // console.log(req.user)
      const token = req.cookies.token
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      // console.log("decoded",decoded.id)
      const user = await User.findById(userId)
      // console.log("user address save:",user)
      if (!user || !token) {
        return res.status(401).json({ message: "User not found" })
      }
      const nameRegex = /^[A-Za-z\s\-]+$/;
      if (!nameRegex.test(name)) {
        return res.status(400).json({ message: "Name should only contain letters, spaces, and hyphens" });
      }
      const pincodeRegex = /^\d{6}$/;
      if (!pincodeRegex.test(pincode)) {
        return res.status(400).json({ message: "Pincode must be exactly 6 digits" });
      }
      const phoneRegex = /^\d{10}$/; // Exactly 10 digits
      if (!phoneRegex.test(mobilenumber)) {
        return res.status(400).json({ message: "Phone number must be exactly 10 digits" });
      }

      const address = new Address({
        user: user._id,
        name,
        mobilenumber,
        housename,
        city,
        pincode,
        state,
        country,
        addresstype,
      });
      // console.log(address)
      await address.save()

      res.status(200).json({ message: "Address saved successfully" });
    } catch (error) {
      console.log(error)
      res.status(500).json({ message: "Internal server error" });
    }
  },
  loadEditAddress: async (req, res) => {
    try {
      const addressId = req.params.id
      const address = await Address.findById(addressId)
      res.render("user/editaddress", { address })
    } catch (error) {
      console.log(error)
    }
  },

  updateAddress: async (req, res) => {
    try {
      const token = req.cookies.token
      const { name, mobilenumber, housename, city, pincode, state, country, addresstype } = req.body
      console.log("update address:", req.body)
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const addressId = req.params.id
      // console.log("addressId:",addressId)
      const updateAddress = await Address.findByIdAndUpdate(addressId, {
        name,
        mobilenumber,
        housename,
        city,
        pincode,
        state,
        country,
        addresstype,
        user: decoded.id

      }, { new: true })
      // console.log("address of user:",updateAddress)


      res.status(200).json({ message: 'Address updated successfully' });
    } catch (error) {
      console.log(error)
      res.status(500).json({ message: 'Internal server error' });
    }
  },
  deleteAddress: async (req, res) => {
    try {
      const addressId = req.params.id;
      console.log(addressId)
      const deletedAddress = await Address.findByIdAndDelete(addressId);

      if (!deletedAddress) {
        return res.status(404).json({ message: 'Address not found' });
      }

      res.status(200).json({ message: 'Address deleted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
  userProfileUpdate: async (req, res) => {
    console.log(req.body)
    const { fullName, currentEmail, changedEmail, phone } = req.body;
    const token = req.cookies.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    // console.log(req.file)
    try {
      const updateData = {
        name: fullName,
        // email:changedEmail || currentEmail,
        // phone:phone
      };
      if (req.file) {
        updateData.photo = `/uploads/profile-pictures/${req.file.filename}`;
      }
      const updateUser = await User.findByIdAndUpdate(decoded.id, updateData, { new: true })

      req.flash("success", "Photo added successfully")
      res.redirect(`/user/myprofile/${decoded.id}`)

    } catch (error) {
      res.status(500).json({ success: false, message: error.message });


    }

  },
  changePassword: async (req, res) => {
    try {
      console.log("changepassword:", req.body)
      const { currentPassword, newPassword, confirmPassword } = req.body
      const hashedpassword = await bcryptjs.hash(newPassword, 10)
      console.log("hashedpassword", hashedpassword)
      const token = req.cookies.token
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findByIdAndUpdate(decoded.id,
        { password: hashedpassword },
        { new: true }
      )
      console.log("user", user)
      req.flash("success", "Password changed successfully");
      res.redirect(`/user/myprofile/${decoded.id}`)
    } catch (error) {
      console.log(error)
    }

  }

}
module.exports = profilecontroller