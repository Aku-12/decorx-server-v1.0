const Order = require("../models/order.model");
const Product = require("../models/product.model");
const User = require("../models/user.model");
const catchAsync = require("../utils/catchAsync");

// 1. Dashboard Stats (Cards)
exports.getDashboardStats = catchAsync(async (req, res, next) => {
    const revenueStats = await Order.aggregate([
        {
            $match: {
                paymentStatus: { $in: ["paid"] },
                orderStatus: { $nin: ["cancelled", "refunded"] },
            },
        },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: "$total" },
            },
        },
    ]);

    const totalOrders = await Order.countDocuments();
    const totalProducts = await Product.countDocuments({
        status: { $ne: "discontinued" },
        deletedAt: null,
    });
    const totalUsers = await User.countDocuments({ deletedAt: null });

    res.status(200).json({
        status: "success",
        data: {
            totalRevenue: revenueStats[0]?.totalRevenue || 0,
            totalOrders,
            totalProducts,
            totalUsers,
        },
    });
});

// 2. Revenue Analytics (Area Chart)
exports.getRevenueAnalytics = catchAsync(async (req, res, next) => {
    const days = req.query.days ? parseInt(req.query.days) : 30;
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    const revenueChart = await Order.aggregate([
        {
            $match: {
                createdAt: { $gte: dateFrom },
                paymentStatus: { $in: ["paid"] },
                orderStatus: { $nin: ["cancelled", "refunded"] },
            },
        },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                revenue: { $sum: "$total" },
                orders: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
        status: "success",
        data: {
            chartData: revenueChart.map((item) => ({
                date: item._id,
                revenue: item.revenue,
                orders: item.orders,
            })),
        },
    });
});

// 3. Sales by Category (Pie Chart)
exports.getCategorySales = catchAsync(async (req, res, next) => {
    const categorySales = await Order.aggregate([
        { $match: { orderStatus: { $nin: ["cancelled", "refunded"] } } },
        { $unwind: "$items" },
        {
            $lookup: {
                from: "products",
                localField: "items.product",
                foreignField: "_id",
                as: "product",
            },
        },
        { $unwind: "$product" },
        {
            $lookup: {
                from: "categories",
                localField: "product.category",
                foreignField: "_id",
                as: "category",
            },
        },
        { $unwind: "$category" },
        {
            $group: {
                _id: "$category.name",
                value: { $sum: "$items.quantity" },
                revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
            },
        },
        { $sort: { value: -1 } },
        { $limit: 6 }, // Top 6 categories
    ]);

    res.status(200).json({
        status: "success",
        data: {
            salesByCategory: categorySales.map((item) => ({
                name: item._id,
                value: item.value,
                revenue: item.revenue,
            })),
        },
    });
});

// 4. Top Selling Products (Table)
exports.getTopProducts = catchAsync(async (req, res, next) => {
    const topProducts = await Order.aggregate([
        { $match: { orderStatus: { $nin: ["cancelled", "refunded"] } } },
        { $unwind: "$items" },
        {
            $group: {
                _id: "$items.product",
                name: { $first: "$items.name" },
                image: { $first: "$items.image" },
                sales: { $sum: "$items.quantity" },
                revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
            },
        },
        {
            $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "_id",
                as: "productDoc",
            },
        },
        { $unwind: { path: "$productDoc", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                name: 1,
                image: 1,
                sales: 1,
                revenue: 1,
                category: "$productDoc.category", // Need another lookup if we want category name here
                price: "$productDoc.price",
                stock: "$productDoc.stock",
            },
        },
        { $sort: { sales: -1 } },
        { $limit: 5 },
    ]);

    res.status(200).json({
        status: "success",
        data: {
            topProducts,
        },
    });
});
