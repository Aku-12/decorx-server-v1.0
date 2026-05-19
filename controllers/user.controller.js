const User = require("../models/user.model");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// ADMIN: Get all users with filtering and pagination
exports.getAllUsers = catchAsync(async (req, res, next) => {
    const {
        page = 1,
        limit = 20,
        role,
        isActive,
        search,
        sort = "-createdAt",
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter = { deletedAt: null };

    if (role) {
        filter.role = role;
    }

    if (isActive !== undefined) {
        filter.isActive = isActive === "true";
    }

    if (search) {
        filter.$or = [
            { firstName: new RegExp(search, "i") },
            { lastName: new RegExp(search, "i") },
            { email: new RegExp(search, "i") },
        ];
    }

    const [users, total] = await Promise.all([
        User.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limitNum),
        User.countDocuments(filter),
    ]);

    res.status(200).json({
        status: "success",
        results: users.length,
        data: {
            users,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
            },
        },
    });
});

// ADMIN: Get single user
exports.getUser = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.params.id);

    if (!user || user.deletedAt) {
        return next(new AppError("User not found", 404));
    }

    res.status(200).json({
        status: "success",
        data: {
            user,
        },
    });
});

// ADMIN: Update user status (activate/deactivate)
exports.updateUserStatus = catchAsync(async (req, res, next) => {
    const { isActive, reason } = req.body;

    if (isActive === undefined) {
        return next(new AppError("Please provide isActive status", 400));
    }

    const user = await User.findById(req.params.id);

    if (!user || user.deletedAt) {
        return next(new AppError("User not found", 404));
    }

    // Prevent admin from deactivating themselves
    if (req.user.id === user.id && !isActive) {
        return next(new AppError("You cannot deactivate your own account", 400));
    }

    user.isActive = isActive;

    if (!isActive) {
        user.deactivatedAt = Date.now();
        user.deactivationReason = reason || "No reason provided";
    } else {
        user.deactivatedAt = null;
        user.deactivationReason = null;
    }

    await user.save({ validateBeforeSave: false });

    res.status(200).json({
        status: "success",
        message: `User ${isActive ? "activated" : "deactivated"} successfully`,
        data: {
            user,
        },
    });
});

// ADMIN: Delete user (soft delete)
exports.deleteUser = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.params.id);

    if (!user || user.deletedAt) {
        return next(new AppError("User not found", 404));
    }

    if (req.user.id === user.id) {
        return next(new AppError("You cannot delete your own account", 400));
    }

    user.deletedAt = Date.now();
    user.isActive = false;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
        status: "success",
        message: "User deleted successfully",
        data: null,
    });
});

// ADMIN: Reset user password
exports.adminResetPassword = catchAsync(async (req, res, next) => {
    const { password } = req.body;

    if (!password || password.length < 8) {
        return next(new AppError("Please provide a password with at least 8 characters", 400));
    }

    const user = await User.findById(req.params.id);

    if (!user || user.deletedAt) {
        return next(new AppError("User not found", 404));
    }

    user.password = password;
    await user.save();

    res.status(200).json({
        status: "success",
        message: "User password has been reset successfully",
    });
});
