const Newsletter = require('../models/newsletter.model');
const { sendWelcomeEmail, sendTrendEmail } = require('../services/email.service');

/**
 * Subscribe to newsletter
 * @route POST /api/newsletter/subscribe
 * @access Public
 */
exports.subscribe = async (req, res) => {
    try {
        const { email, source = 'footer' } = req.body;

        // Check if email already exists
        let subscriber = await Newsletter.findOne({ email });

        if (subscriber) {
            if (subscriber.isActive) {
                return res.status(200).json({
                    success: true,
                    message: 'This email is already subscribed to our newsletter',
                });
            } else {
                // Reactivate subscription
                subscriber.isActive = true;
                subscriber.source = source;
                subscriber.subscribedAt = Date.now();
                subscriber.unsubscribedAt = undefined;
                await subscriber.save();

                // Send welcome email in background
                sendWelcomeEmail(email).catch(err =>
                    console.error('Failed to send welcome email (background):', err)
                );

                return res.status(200).json({
                    success: true,
                    message: 'Welcome back! Your subscription has been reactivated',
                });
            }
        }

        // Create new subscriber
        subscriber = await Newsletter.create({
            email,
            source,
        });

        // Send welcome email in background
        sendWelcomeEmail(email).catch(err =>
            console.error('Failed to send welcome email (background):', err)
        );

        res.status(201).json({
            success: true,
            message: 'Successfully subscribed! Check your email for a welcome message',
            data: {
                email: subscriber.email,
                subscribedAt: subscriber.subscribedAt,
            },
        });
    } catch (error) {
        console.error('Newsletter subscription error:', error);

        if (error.code === 11000) {
            return res.status(200).json({
                success: true,
                message: 'This email is already subscribed',
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to subscribe to newsletter',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

/**
 * Get all subscribers (Admin only)
 * @route GET /api/newsletter/subscribers
 * @access Private/Admin
 */
exports.getSubscribers = async (req, res) => {
    try {
        const { page = 1, limit = 50, isActive } = req.query;

        const query = {};
        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        const subscribers = await Newsletter.find(query)
            .sort({ subscribedAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .select('-__v');

        const total = await Newsletter.countDocuments(query);

        res.status(200).json({
            success: true,
            data: {
                subscribers,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalSubscribers: total,
                    limit: parseInt(limit),
                },
            },
        });
    } catch (error) {
        console.error('Get subscribers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subscribers',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

/**
 * Send trend email to all active subscribers (Admin only)
 * @route POST /api/newsletter/send-trend
 * @access Private/Admin
 */
exports.sendTrend = async (req, res) => {
    try {
        const { subject, htmlContent, textContent } = req.body;

        if (!subject || !htmlContent || !textContent) {
            return res.status(400).json({
                success: false,
                message: 'Subject, htmlContent, and textContent are required',
            });
        }

        // Get all active subscribers
        const subscribers = await Newsletter.find({ isActive: true }).select('email');

        if (subscribers.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No active subscribers found',
            });
        }

        // Send emails
        const result = await sendTrendEmail(subscribers, subject, htmlContent, textContent);

        res.status(200).json({
            success: true,
            message: 'Trend emails sent successfully',
            data: result,
        });
    } catch (error) {
        console.error('Send trend email error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send trend emails',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

/**
 * Unsubscribe from newsletter
 * @route POST /api/newsletter/unsubscribe
 * @access Public
 */
exports.unsubscribe = async (req, res) => {
    try {
        const { email } = req.body;

        const subscriber = await Newsletter.findOne({ email });

        if (!subscriber) {
            return res.status(404).json({
                success: false,
                message: 'Email not found in our newsletter list',
            });
        }

        if (!subscriber.isActive) {
            return res.status(400).json({
                success: false,
                message: 'This email is already unsubscribed',
            });
        }

        subscriber.isActive = false;
        subscriber.unsubscribedAt = Date.now();
        await subscriber.save();

        res.status(200).json({
            success: true,
            message: 'Successfully unsubscribed from newsletter',
        });
    } catch (error) {
        console.error('Unsubscribe error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to unsubscribe',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

/**
 * Get newsletter statistics (Admin only)
 * @route GET /api/newsletter/stats
 * @access Private/Admin
 */
exports.getStats = async (req, res) => {
    try {
        const totalSubscribers = await Newsletter.countDocuments();
        const activeSubscribers = await Newsletter.countDocuments({ isActive: true });
        const inactiveSubscribers = await Newsletter.countDocuments({ isActive: false });

        const sourceStats = await Newsletter.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: '$source', count: { $sum: 1 } } },
        ]);

        // Get recent subscribers (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentSubscribers = await Newsletter.countDocuments({
            subscribedAt: { $gte: thirtyDaysAgo },
            isActive: true,
        });

        res.status(200).json({
            success: true,
            data: {
                total: totalSubscribers,
                active: activeSubscribers,
                inactive: inactiveSubscribers,
                bySource: sourceStats,
                recentSubscribers,
            },
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};
