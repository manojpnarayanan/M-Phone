const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
        unique:true
    },
    code: {
        type: String,
        required: true,
        unique: true,
    },
    discountType: {
        type: String,
        enum: ["percentage", "fixed"],
        required: true,
    },
    discountValue: {
        type: Number,
        required: true,
    },
    minOrderAmount: {
        type: Number,
        required: true,
    },
    maxDiscountAmount: {
        type: Number,
        required: function () {
            return this.discountType === "percentage";
        },
    },
    validFrom: {
        type: Date,
        required: true,
    },
    validUntil: {
        type: Date,
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    usageLimit: {
        type: Number,
        default: null, // Null means unlimited usage
    },
    usedCount: {
        type: Number,
        default: 0,
    },
    usersUsed: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],
},{timestamps:true});

module.exports = mongoose.model("Coupon", couponSchema);