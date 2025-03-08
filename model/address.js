const mongoose = require("mongoose")

const addressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    name: {
        type: String,
        required: true,
    },
    mobilenumber: {
        type: String,
        required: true,
    },
    housename: {
        type: String,
        required: true,
    },
    city: {
        type: String,
        required: true,
    },
    pincode: {
        type: String,
        required: true,
    },
    state: {
        type: String,
        required: true,
    },
    country: {
        type: String,
        required: true,
    },
    addresstype: {
        type: String,
        enum: ["home", "work", "other"],
        default: "home"
    }

})

module.exports = mongoose.model("Address", addressSchema)