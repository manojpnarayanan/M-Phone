const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        default: () => uuidv4(), // Automatically generate a unique order ID using UUID
        unique: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    products: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price: {
            type: Number,
            required: true
        },
        status: {
            type: String,
            required: true,
            enum: ['Pending', 'Processing', 'Paid', 'Shipped', 'Delivered', 'Cancelled', 'Return Request', 'Returned'],
            default: 'Pending'
        }
    }],
    cancelledProducts: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price: {
            type: Number,
            required: true
        }
    }],
    shippingAddress: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Address',
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['credit_card', 'debit_card', 'razor-pay', 'cash_on_delivery'],
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    totalAmount: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    finalAmount: {
        type: Number,
        required: true
    },
    orderStatus: {
        type: String,
        enum: ['failed','Paid','Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Return Request', 'Returned'],
        default: 'Pending'
    },
    transactionId: {
        type: String,
        required: false
    },
    invoiceDate: {
        type: Date,
        default: Date.now // Automatically set the invoice date to the current date
    },
    deliveredAt: {
        type: Date,
        required: false
    },
    couponApplied: {
        code: { type: String },
        discountAmount: { type: Number },
        minOrderAmount: {type: Number}
    },
    invoice: {
        type: String, // Path or URL to the invoice file
        default: null, // Default value is null
    }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);