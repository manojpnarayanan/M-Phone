const Admin = require("../model/admin")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")
const User = require("../model/user")
const moment = require("moment")
const Product = require("../model/addproduct") 
const Order = require("../model/order")     
const Category = require("../model/createcategory")

const admincontroller = {
    login: async (req, res) => {
        const { email, password } = req.body
        try {
            const admin = await Admin.findOne({ email })
            if (!admin) {
                return res.status(400).json({ message: "Admin not found" })
            }
            const ismatch = await bcrypt.compare(password, admin.password)
            if (!ismatch) {
                return res.status(400).json({ message: "Invalid credentials" })
            }
            const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: "1d" })
            console.log(token);

            res.cookie("token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                maxAge: 3600000
            })
            return res.redirect("/admin/dashboard")

        } catch (error) {
            console.error(error)
            res.status(500).json({ message: "Server error during login" })
        }
    },
    loadDashboard: async (req, res) => {
        try {
            const timeFilter = req.query.timeFilter || 'monthly';
        const { startDate, endDate } = getDateRange(timeFilter);

        const [
            ordersData, 
            topProducts, 
            topCategories, 
            topBrands, 
            ordersStats,
            totalUsers
        ] = await Promise.all([
            getOrdersData(timeFilter, startDate, endDate),
            getTopProducts(startDate, endDate),
            getTopCategories(startDate, endDate),
            getTopBrands(startDate, endDate),
            Order.aggregate([
                { $match: { 
                    createdAt: { $gte: startDate, $lte: endDate },
                    orderStatus: { $nin: ['Cancelled', 'Returned'] } 
                }},
                { $group: { 
                    _id: null, 
                    totalOrders: { $sum: 1 }, 
                    revenue: { $sum: '$finalAmount' } 
                }}
            ]),
            User.countDocuments()
        ]);

        const totalOrders = ordersStats[0]?.totalOrders || 0;
        const revenue = ordersStats[0]?.revenue || 0;
        const avgOrderValue = totalOrders > 0 ? Math.round(revenue / totalOrders) : 0;

            

            res.render("admin/index", {
                title: 'Admin Dashboard',
            timeFilter,
            totalOrders,
            revenue,
            avgOrderValue,
            totalUsers,
            ordersData,
            topProducts,
            topCategories,
            topBrands
            })
        } catch (error) {
            console.error('Dashboard loading error:', error)
            res.status(500).render('error', { 
                message: 'Error loading dashboard', 
                error: process.env.NODE_ENV === 'development' ? error : {} 
            })
        }
    }

}

// async function fetchLatestOverviewData(dateFilter = {}) {
//     const [revenue, orders, products] = await Promise.all([
//         Order.aggregate([
//             { $match: { 
//                 status: { $ne: 'cancelled' },
//                 createdAt: dateFilter 
//             } },
//             { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
//         ]),
//         Order.countDocuments({ 
//             status: { $ne: 'cancelled' },
//             createdAt: dateFilter 
//         }),
//         Product.countDocuments({ isActive: true })
//     ])

//     return {
//         revenue: revenue[0]?.totalRevenue || 0,
//         orders: orders || 0,
//         products: products || 0
//     }
// }

// // Updated to accept dateFilter
// async function fetchTopProducts(dateFilter = {}) {
//     return await Order.aggregate([
//         { $match: { 
//             status: { $ne: 'cancelled' },
//             createdAt: dateFilter 
//         }},
//         { $unwind: '$items' },
//         { $group: {
//             _id: '$items.product',
//             totalQuantity: { $sum: '$items.quantity' },
//             totalRevenue: { $sum: '$items.price' }
//         }},
//         { $lookup: {
//             from: 'products',
//             localField: '_id',
//             foreignField: '_id',
//             as: 'productDetails'
//         }},
//         { $unwind: '$productDetails' },
//         { $lookup: {
//             from: 'categories',
//             localField: 'productDetails.category',
//             foreignField: '_id',
//             as: 'categoryDetails'
//         }},
//         { $unwind: '$categoryDetails' },
//         { $sort: { totalQuantity: -1 } },
//         { $limit: 3 },
//         { $project: {
//             name: '$productDetails.name',
//             brand: '$productDetails.brand',
//             price: '$productDetails.price',
//             category: '$categoryDetails.parent', // Changed to parent category
//             totalQuantity: 1,
//             totalRevenue: 1,
//             averagePrice: { $divide: ['$totalRevenue', '$totalQuantity'] }
//         }}
//     ])
// }

// async function fetchTopCategories(dateFilter = {}) {
//     return await Order.aggregate([
//         { $match: { 
//             status: { $ne: 'cancelled' },
//             createdAt: dateFilter 
//         }},
//         { $unwind: '$items' },
//         { $group: {
//             _id: '$items.category',
//             totalQuantity: { $sum: '$items.quantity' },
//             totalRevenue: { $sum: '$items.price' }
//         }},
//         { $lookup: {
//             from: 'categories',
//             localField: '_id',
//             foreignField: '_id',
//             as: 'categoryDetails'
//         }},
//         { $unwind: '$categoryDetails' },
//         { $sort: { totalQuantity: -1 } },
//         { $limit: 3 },
//         { $project: {
//             name: '$categoryDetails.parent', // Changed to parent category
//             totalQuantity: 1,
//             totalRevenue: 1
//         }}
//     ])
// }

// async function fetchTopBrands(dateFilter = {}) {
//     return await Order.aggregate([
//         { $match: { 
//             status: { $ne: 'cancelled' },
//             createdAt: dateFilter 
//         }},
//         { $unwind: '$items' },
//         { $lookup: {
//             from: 'products',
//             localField: 'items.product',
//             foreignField: '_id',
//             as: 'productDetails'
//         }},
//         { $unwind: '$productDetails' },
//         { $group: {
//             _id: '$productDetails.brand',
//             totalQuantity: { $sum: 'items.quantity' },
//             totalRevenue: { $sum: 'items.price' }
//         }},
//         { $sort: { totalQuantity: -1 } },
//         { $limit: 3 },
//         { $project: {
//             name: '$_id',
//             totalQuantity: 1,
//             totalRevenue: 1
//         }}
//     ])
// }

// // Updated to accept dateFilter
// async function fetchMonthlySalesData(year, dateFilter = {}) {
//     return await Order.aggregate([
//         { $match: { 
//             status: { $ne: 'cancelled' },
//             createdAt: {
//                 ...dateFilter,
//                 $lte: new Date(`${year}-12-31`)
//             }
//         }},
//         { $group: {
//             _id: { $month: '$createdAt' },
//             revenue: { $sum: '$totalAmount' },
//             orders: { $sum: 1 }
//         }},
//         { $sort: { '_id': 1 } },
//         { $project: {
//             name: {
//                 $switch: {
//                     branches: [
//                         { case: { $eq: ['$_id', 1] }, then: 'Jan' },
//                         { case: { $eq: ['$_id', 2] }, then: 'Feb' },
//                         { case: { $eq: ['$_id', 3] }, then: 'Mar' },
//                         { case: { $eq: ['$_id', 4] }, then: 'Apr' },
//                         { case: { $eq: ['$_id', 5] }, then: 'May' },
//                         { case: { $eq: ['$_id', 6] }, then: 'Jun' },
//                         { case: { $eq: ['$_id', 7] }, then: 'Jul' },
//                         { case: { $eq: ['$_id', 8] }, then: 'Aug' },
//                         { case: { $eq: ['$_id', 9] }, then: 'Sep' },
//                         { case: { $eq: ['$_id', 10] }, then: 'Oct' },
//                         { case: { $eq: ['$_id', 11] }, then: 'Nov' },
//                         { case: { $eq: ['$_id', 12] }, then: 'Dec' }
//                     ],
//                     default: 'Unknown'
//                 }
//             },
//             revenue: 1,
//             orders: 1
//         }}
//     ])
// }
function getDateRange(timeFilter) {
    const now = new Date();
    let startDate, endDate;

    switch (timeFilter) {
        case 'daily':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endDate = new Date();
            break;
        case 'weekly':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
            endDate = new Date();
            break;
        case 'yearly':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date();
            break;
        default: // monthly
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date();
    }

    return { startDate, endDate };
}

// Get top products based on sales
async function getTopProducts(startDate, endDate) {
    return await Order.aggregate([
        { $match: { 
            createdAt: { $gte: startDate, $lte: endDate },
            orderStatus: { $nin: ['Cancelled', 'Returned'] }
        }},
        { $unwind: '$products' },
        { $group: {
            _id: '$products.product',
            totalQuantity: { $sum: '$products.quantity' },
            totalRevenue: { $sum: { $multiply: ['$products.quantity', '$products.price'] } }
        }},
        { $lookup: {
            from: 'products', // Assumes your Product model is named 'products' in MongoDB
            localField: '_id',
            foreignField: '_id',
            as: 'productDetails'
        }},
        { $unwind: '$productDetails' },
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 },
        { $project: {
            name: '$productDetails.name',
            brand: '$productDetails.brand',
            totalQuantity: 1,
            totalRevenue: 1
        }}
    ]);
}

// Get top categories based on sales
async function getTopCategories(startDate, endDate) {
    return await Order.aggregate([
        { $match: { 
            createdAt: { $gte: startDate, $lte: endDate },
            orderStatus: { $nin: ['Cancelled', 'Returned'] }
        }},
        { $unwind: '$products' },
        { $lookup: {
            from: 'products',
            localField: 'products.product',
            foreignField: '_id',
            as: 'productDetails'
        }},
        { $unwind: '$productDetails' },
        { $group: {
            _id: '$productDetails.category',
            totalQuantity: { $sum: '$products.quantity' },
            totalRevenue: { $sum: { $multiply: ['$products.quantity', '$products.price'] } }
        }},
        { $lookup: {
            from: 'categories', // Assumes you have a categories collection
            localField: '_id',
            foreignField: '_id',
            as: 'categoryDetails'
        }},
        { $unwind: '$categoryDetails' },
        { $sort: { totalQuantity: -1 } },
        { $limit: 3 },
        { $project: {
            name: '$categoryDetails.parent',
            totalQuantity: 1,
            totalRevenue: 1
        }}
    ]);
}

// Get top brands based on sales
async function getTopBrands(startDate, endDate) {
    return await Order.aggregate([
        { $match: { 
            createdAt: { $gte: startDate, $lte: endDate },
            orderStatus: { $nin: ['Cancelled', 'Returned'] }
        }},
        { $unwind: '$products' },
        { $lookup: {
            from: 'products',
            localField: 'products.product',
            foreignField: '_id',
            as: 'productDetails'
        }},
        { $unwind: '$productDetails' },
        { $group: {
            _id: '$productDetails.brand',
            totalQuantity: { $sum: '$products.quantity' },
            totalRevenue: { $sum: { $multiply: ['$products.quantity', '$products.price'] } }
        }},
        { $sort: { totalQuantity: -1 } },
        { $limit: 5 },
        { $project: {
            name: '$_id',
            totalQuantity: 1,
            totalRevenue: 1
        }}
    ]);
}

// Get orders data for chart
// async function getOrdersData(timeFilter, startDate, endDate) {
//     const groupBy = timeFilter === 'daily' ? { $dayOfMonth: '$createdAt' } 
//         : timeFilter === 'weekly' ? { $week: '$createdAt' }
//         : timeFilter === 'yearly' ? { $month: '$createdAt' }
//         : { $month: '$createdAt' };

//     return await Order.aggregate([
//         { $match: { 
//             createdAt: { $gte: startDate, $lte: endDate },
//             orderStatus: { $nin: ['Cancelled', 'Returned'] }
//         }},
//         { $group: {
//             _id: groupBy,
//             totalOrders: { $sum: 1 },
//             totalRevenue: { $sum: '$finalAmount' }
//         }},
//         { $sort: { '_id': 1 } }
//     ]);
// }

async function getOrdersData(timeFilter, startDate, endDate) {
    const groupBy = timeFilter === 'daily' ? { $dayOfMonth: '$createdAt' } 
        : timeFilter === 'weekly' ? { $week: '$createdAt' }
        : timeFilter === 'yearly' ? { $month: '$createdAt' }
        : { $month: '$createdAt' };

    const result = await Order.aggregate([
        { $match: { 
            createdAt: { $gte: startDate, $lte: endDate },
            orderStatus: { $nin: ['Cancelled', 'Returned'] }
        }},
        { $group: {
            _id: groupBy,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$finalAmount' }
        }},
        { $sort: { '_id': 1 } },
        
        { $project: {
            _id: { $toString: "$_id" },
            totalOrders: 1,
            totalRevenue: 1
        }}
    ]);
    
    console.log('Orders data:', result);
    return result;
}

module.exports = admincontroller