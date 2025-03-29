const mongoose = require("mongoose")
const mongoosePaginate = require('mongoose-paginate-v2');
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: false
    },
    googleId: {
        type: String
    },
    otp: {
        type: String
    },
    otpExpiry: {
        type: Date
    },
    phonenumber: {
        type: Number,
        required: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    otp: {
        type: String,
        default: null
    },
    otpExpiry: {
        type: Date,
        default: null
    },
    photo: {
        type: String,
        default: "/uploads/profile-pictures/default.png"
    },
    referralCode: {
        type: String,
        unique: true,
        sparse:true
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    referrals: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    referralDetails: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        name: String,
        email: String,
        joinedAt: Date,
        status: {
            type: String,
            enum: ['pending', 'active', 'inactive'],
            default: 'pending'
        }
    }],
    referralRewards: {
        type: Number,
        default: 0
    }

}, { timestamps: true });

userSchema.pre('save', async function(next) {
    if (!this.referralCode) {
        // Generate referral code using first 3 chars of name + random alphanumeric string
        const namePrefix = this.name.slice(0, 3).toUpperCase();
        const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.referralCode = `${namePrefix}-${randomString}`;
    }
    next();
});

userSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("User", userSchema)