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
            // return res.redirect("/admin/dashboard")
            return res.status(200).json({ message: "Login successful" })

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
                    {
                        $match: {
                            createdAt: { $gte: startDate, $lte: endDate },
                            orderStatus: { $nin: ['Cancelled', 'Returned'] }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalOrders: { $sum: 1 },
                            revenue: { $sum: '$finalAmount' }
                        }
                    }
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
        case 'monthly':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date();
            break;
        default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date();
    }

    return { startDate, endDate };
}


async function getTopProducts(startDate, endDate) {
    return await Order.aggregate([
        {
            $match: {
                createdAt: { $gte: startDate, $lte: endDate },
                orderStatus: { $nin: ['Cancelled', 'Returned'] }
            }
        },
        { $unwind: '$products' },
        {
            $group: {
                _id: '$products.product',
                totalQuantity: { $sum: '$products.quantity' },
                totalRevenue: { $sum: { $multiply: ['$products.quantity', '$products.price'] } }
            }
        },
        {
            $lookup: {
                from: 'products',
                localField: '_id',
                foreignField: '_id',
                as: 'productDetails'
            }
        },
        { $unwind: '$productDetails' },
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 },
        {
            $project: {
                name: '$productDetails.name',
                brand: '$productDetails.brand',
                totalQuantity: 1,
                totalRevenue: 1
            }
        }
    ]);
}


async function getTopCategories(startDate, endDate) {
    return await Order.aggregate([
        {
            $match: {
                createdAt: { $gte: startDate, $lte: endDate },
                orderStatus: { $nin: ['Cancelled', 'Returned'] }
            }
        },
        { $unwind: '$products' },
        {
            $lookup: {
                from: 'products',
                localField: 'products.product',
                foreignField: '_id',
                as: 'productDetails'
            }
        },
        { $unwind: '$productDetails' },
        {
            $group: {
                _id: '$productDetails.category',
                totalQuantity: { $sum: '$products.quantity' },
                totalRevenue: { $sum: { $multiply: ['$products.quantity', '$products.price'] } }
            }
        },
        {
            $lookup: {
                from: 'categories',
                localField: '_id',
                foreignField: '_id',
                as: 'categoryDetails'
            }
        },
        { $unwind: '$categoryDetails' },
        { $sort: { totalQuantity: -1 } },
        { $limit: 3 },
        {
            $project: {
                name: '$categoryDetails.parent',
                totalQuantity: 1,
                totalRevenue: 1
            }
        }
    ]);
}


async function getTopBrands(startDate, endDate) {
    return await Order.aggregate([
        {
            $match: {
                createdAt: { $gte: startDate, $lte: endDate },
                orderStatus: { $nin: ['Cancelled', 'Returned'] }
            }
        },
        { $unwind: '$products' },
        {
            $lookup: {
                from: 'products',
                localField: 'products.product',
                foreignField: '_id',
                as: 'productDetails'
            }
        },
        { $unwind: '$productDetails' },
        {
            $group: {
                _id: '$productDetails.brand',
                totalQuantity: { $sum: '$products.quantity' },
                totalRevenue: { $sum: { $multiply: ['$products.quantity', '$products.price'] } }
            }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 5 },
        {
            $project: {
                name: '$_id',
                totalQuantity: 1,
                totalRevenue: 1
            }
        }
    ]);
}



async function getOrdersData(timeFilter, startDate, endDate) {
    const groupBy = timeFilter === 'daily' ? { $dayOfMonth: '$createdAt' }
        : timeFilter === 'weekly' ? { $week: '$createdAt' }
            : timeFilter === 'yearly' ? { $month: '$createdAt' }
                : { $month: '$createdAt' };

    const result = await Order.aggregate([
        {
            $match: {
                createdAt: { $gte: startDate, $lte: endDate },
                orderStatus: { $nin: ['Cancelled', 'Returned'] }
            }
        },
        {
            $group: {
                _id: groupBy,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: '$finalAmount' }
            }
        },
        { $sort: { '_id': 1 } },

        {
            $project: {
                _id: { $toString: "$_id" },
                totalOrders: 1,
                totalRevenue: 1
            }
        }
    ]);

    console.log('Orders data:', result);
    return result;
}

module.exports = admincontroller