const mongoose = require("mongoose");
const { Schema } = mongoose;
const crypto = require("crypto");

// Function to generate a random alphanumeric code
const generateReferralCode = (length = 8) => {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length)
    .toUpperCase();
};

const referralTransactionSchema = new Schema({
    referrer: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    referred: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: false 
    },
    referralCode: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function(v) {
                // Validate the format: alphanumeric, uppercase, 8 characters
                return /^[A-Z0-9]{8}$/.test(v);
            },
            message: props => `${props.value} is not a valid referral code! Must be 8 alphanumeric characters.`
        }
    },
    reward: { 
        type: Number, 
        required: true 
    },
    orderId: { 
        type: Schema.Types.ObjectId, 
        ref: 'Order', 
        required: false 
    },
    status: { 
        type: String, 
        enum: ['pending', 'completed', 'rejected'], 
        default: 'pending' 
    },
    reason: { 
        type: String, 
        required: false 
    },
    expiresAt: {
        type: Date,
        required: false,
        index: true // Add index for expiration queries
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { 
    timestamps: true 
});

// Pre-save hook to generate referral code if not provided
referralTransactionSchema.pre('save', async function(next) {
    try {
        // Generate referral code if new document and code not provided
        if (this.isNew && !this.referralCode) {
            let isUnique = false;
            let newCode;
            
            // Keep generating codes until we find a unique one
            while (!isUnique) {
                newCode = generateReferralCode();
                
                // Check if code already exists
                const existingCode = await mongoose.models.ReferralTransaction.findOne({ 
                    referralCode: newCode 
                });
                
                if (!existingCode) {
                    isUnique = true;
                    this.referralCode = newCode;
                }
            }
        }
        
        // Set expiration date if not already set (default 30 days)
        if (this.isNew && !this.expiresAt) {
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            this.expiresAt = thirtyDaysFromNow;
        }
        
        next();
    } catch (error) {
        next(error);
    }
});

// Method to check if a referral code has expired
referralTransactionSchema.methods.isExpired = function() {
    return this.expiresAt && this.expiresAt < new Date();
};

// Method to validate a referral for use
referralTransactionSchema.methods.isValidForUse = function() {
    return this.isActive && !this.isExpired() && this.status === 'pending';
};

// Static method to find valid referral by code
referralTransactionSchema.statics.findValidReferralByCode = async function(code) {
    const currentDate = new Date();
    return this.findOne({
        referralCode: code,
        isActive: true,
        expiresAt: { $gt: currentDate },
        status: 'pending'
    });
};

// Add scheduled task to deactivate expired referrals
referralTransactionSchema.statics.deactivateExpiredReferrals = async function() {
    const currentDate = new Date();
    const result = await this.updateMany(
        { 
            expiresAt: { $lt: currentDate },
            isActive: true 
        },
        { 
            isActive: false,
            status: 'rejected',
            reason: 'Expired'
        }
    );
    return result;
};

// Existing indexes
referralTransactionSchema.index({ referrer: 1 });
referralTransactionSchema.index({ referred: 1 });
referralTransactionSchema.index({ status: 1 });
referralTransactionSchema.index({ referralCode: 1 }, { unique: true });

const ReferralTransaction = mongoose.model("ReferralTransaction", referralTransactionSchema);
module.exports = ReferralTransaction;