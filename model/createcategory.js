const mongoose = require("mongoose")


const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    slug: {
        type: String,
        required: true,
        unique: true
    },
    parent: {
        type: String,
        required: true,
    },
    description: {
        type: String
    },
    listed: {
        type: Boolean,
        deafault: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    discount:{
        type:Number,
        min:0,
        max:100,
        default:0
    }

}, { timestamps: true })
module.exports = mongoose.model("Category", categorySchema)