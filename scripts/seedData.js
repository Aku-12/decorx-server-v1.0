require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/user.model");
const Category = require("../models/category.model");
const Product = require("../models/product.model");
const Order = require("../models/order.model");

// Connect to Database
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/aura-interiors");
        console.log("MongoDB connected for seeding...");
    } catch (error) {
        console.error("MongoDB connection failed:", error);
        process.exit(1);
    }
};

// Seed Data
const seedData = async () => {
    try {
        // Clear existing data
        console.log("Clearing existing data...");
        await User.deleteMany({});
        await Category.deleteMany({});
        await Product.deleteMany({});
        await Order.deleteMany({});

        // 1. Create Users
        console.log("Creating users...");
        const adminPassword = "password123";
        const userPassword = "password123";

        const admin = await User.create({
            firstName: "Admin",
            lastName: "User",
            email: "admin@aura.com",
            password: adminPassword,
            role: "admin",
            phone: "9800000000",
            isEmailVerified: true,
            isActive: true
        });

        const customer = await User.create({
            firstName: "John",
            lastName: "Doe",
            email: "john@example.com",
            password: userPassword,
            role: "customer",
            phone: "9811111111",
            isEmailVerified: true,
            isActive: true
        });

        console.log("Users created: admin@aura.com / john@example.com (password123)");

        // 2. Create Categories
        console.log("Creating categories...");
        const categoriesData = [
            {
                name: "Living Room",
                description: "Modern and comfortable furniture for your living space",
                image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80",
                sortOrder: 1
            },
            {
                name: "Bedroom",
                description: "Relaxing bedroom sets and accessories",
                image: "https://images.unsplash.com/photo-1505693416328-ef5b299ca7cd?auto=format&fit=crop&w=800&q=80",
                sortOrder: 2
            },
            {
                name: "Dining",
                description: "Elegant dining tables and chairs",
                image: "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=800&q=80",
                sortOrder: 3
            },
            {
                name: "Lighting",
                description: "Illuminate your home with style",
                image: "https://images.unsplash.com/photo-1513506003011-3b03c94787d5?auto=format&fit=crop&w=800&q=80",
                sortOrder: 4
            },
            {
                name: "Decor",
                description: "Finishing touches for every room",
                image: "https://images.unsplash.com/photo-1581783342308-f792ca11df53?auto=format&fit=crop&w=800&q=80",
                sortOrder: 5
            }
        ];

        const createdCategories = await Category.create(categoriesData);
        // Map category names to IDs for easy access
        const catMap = {};
        createdCategories.forEach(c => catMap[c.name] = c._id);

        // 3. Create Products
        console.log("Creating products...");
        const productsData = [
            // Living Room
            {
                name: "Modern Velvet Sofa",
                description: "Luxurious green velvet sofa with gold legs. Perfect for modern living rooms.",
                price: 85000,
                originalPrice: 95000,
                stock: 15,
                category: catMap["Living Room"],
                images: [{ url: "https://images.unsplash.com/photo-1550226891-ef816aed4a98?auto=format&fit=crop&w=800&q=80", isPrimary: true }],
                colors: ["Green", "Blue", "Gray"],
                materials: ["Velvet", "Wood", "Metal"],
                style: "modern",
                isFeatured: true,
                tags: ["sofa", "velvet", "living room"],
                rating: { average: 4.8, count: 12 }
            },
            {
                name: "Minimalist Coffee Table",
                description: "Sleek wooden coffee table with storage.",
                price: 15000,
                stock: 30,
                category: catMap["Living Room"],
                images: [{ url: "https://images.unsplash.com/photo-1532372320572-cda25653a26d?auto=format&fit=crop&w=800&q=80", isPrimary: true }],
                materials: ["Oak Wood"],
                style: "minimal",
                isFeatured: true,
                tags: ["table", "coffee table", "wood"]
            },
            {
                name: "Lounge Chair",
                description: "Comfortable armchair for reading and relaxing.",
                price: 25000,
                stock: 10,
                category: catMap["Living Room"],
                images: [{ url: "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?auto=format&fit=crop&w=800&q=80", isPrimary: true }],
                colors: ["Gray"],
                style: "scandinavian"
            },
            // Bedroom
            {
                name: "King Sized Bed Frame",
                description: "Solid wood bed frame with upholstered headboard.",
                price: 65000,
                stock: 5,
                category: catMap["Bedroom"],
                images: [{ url: "https://images.unsplash.com/photo-1505693314120-0d443867891e?auto=format&fit=crop&w=800&q=80", isPrimary: true }],
                materials: ["Teak Wood", "Fabric"],
                style: "classic",
                isFeatured: true
            },
            {
                name: "Nightstand with Drawer",
                description: "Compact nightstand with ample storage.",
                price: 8000,
                stock: 25,
                category: catMap["Bedroom"],
                images: [{ url: "https://images.unsplash.com/photo-1532372550366-de816cc11663?auto=format&fit=crop&w=800&q=80", isPrimary: true }],
                colors: ["White", "Black"],
                style: "modern"
            },
            // Dining
            {
                name: "6-Seater Dining Table",
                description: "Spacious dining table for family gatherings.",
                price: 55000,
                stock: 8,
                category: catMap["Dining"],
                images: [{ url: "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=800&q=80", isPrimary: true }],
                materials: ["Wood", "Glass"],
                style: "contemporary",
                isFeatured: true
            },
            {
                name: "Upholstered Dining Chair",
                description: "Comfortable dining chair with soft fabric.",
                price: 6000,
                stock: 40,
                category: catMap["Dining"],
                images: [{ url: "https://images.unsplash.com/photo-1519965191062-811c7daabc53?auto=format&fit=crop&w=800&q=80", isPrimary: true }],
                colors: ["Cream", "Grey"],
                style: "modern"
            },
            // Lighting
            {
                name: "Industrial Pendant Light",
                description: "Metal pendant light for kitchen or dining area.",
                price: 4500,
                stock: 50,
                category: catMap["Lighting"],
                images: [{ url: "https://images.unsplash.com/photo-1513506003011-3b03c94787d5?auto=format&fit=crop&w=800&q=80", isPrimary: true }],
                colors: ["Black", "Copper"],
                style: "industrial"
            },
            {
                name: "Modern Floor Lamp",
                description: "Sleek floor lamp with adjustable head.",
                price: 7500,
                stock: 20,
                category: catMap["Lighting"],
                images: [{ url: "https://images.unsplash.com/photo-1507473888900-52e1adad8d69?auto=format&fit=crop&w=800&q=80", isPrimary: true }],
                colors: ["Gold", "Silver"],
                style: "modern"
            },
            // Decor
            {
                name: "Ceramic Vase Set",
                description: "Handcrafted ceramic vases, set of 3.",
                price: 3500,
                stock: 35,
                category: catMap["Decor"],
                images: [{ url: "https://images.unsplash.com/photo-1612196808214-b7e239e5f6b7?auto=format&fit=crop&w=800&q=80", isPrimary: true }],
                colors: ["White", "Teracotta"],
                style: "bohemian"
            },
            {
                name: "Abstract Wall Art",
                description: "Large canvas print for wall decoration.",
                price: 5000,
                stock: 10,
                category: catMap["Decor"],
                images: [{ url: "https://images.unsplash.com/photo-1582201943021-e8e644a99184?auto=format&fit=crop&w=800&q=80", isPrimary: true }],
                style: "modern",
                isFeatured: true
            },
            {
                name: "Decorative Mirror",
                description: "Round mirror with brass frame.",
                price: 6500,
                stock: 15,
                category: catMap["Decor"],
                images: [{ url: "https://images.unsplash.com/photo-1618220252344-8cb6e3e57461?auto=format&fit=crop&w=800&q=80", isPrimary: true }],
                style: "classic"
            }
        ];

        const createdProducts = await Product.create(productsData);
        console.log(`Created ${createdProducts.length} products.`);

        // 4. Create Recent Orders (for Analytics)
        console.log("Creating historical orders for analytics...");
        const orders = [];
        const numOrders = 50;
        const now = new Date();

        for (let i = 0; i < numOrders; i++) {
            // Random date in last 30 days
            const daysAgo = Math.floor(Math.random() * 30);
            const date = new Date(now);
            date.setDate(date.getDate() - daysAgo);

            // Random products (1-3 items)
            const numItems = Math.floor(Math.random() * 3) + 1;
            const orderItems = [];
            let subtotal = 0;

            for (let j = 0; j < numItems; j++) {
                const prod = createdProducts[Math.floor(Math.random() * createdProducts.length)];
                const qty = Math.floor(Math.random() * 2) + 1;
                orderItems.push({
                    product: prod._id,
                    name: prod.name,
                    price: prod.price,
                    quantity: qty,
                    image: prod.images[0].url
                });
                subtotal += prod.price * qty;
            }

            const total = subtotal; // Assuming no tax/shipping for simplicity or calculate random

            orders.push({
                user: customer._id,
                items: orderItems,
                shippingAddress: {
                    fullName: "John Doe",
                    phone: "9811111111",
                    addressLine1: "123 Kathmandu St",
                    city: "Kathmandu",
                    postalCode: "44600",
                    country: "Nepal"
                },
                subtotal,
                total,
                paymentMethod: i % 3 === 0 ? "cod" : "esewa",
                paymentStatus: "paid",
                orderStatus: i % 10 === 0 ? "cancelled" : (i % 5 === 0 ? "delivered" : "processing"),
                createdAt: date,
                orderedAt: date,
                isGuestOrder: false,
                guestInfo: {
                    email: "john@example.com",
                    firstName: "John",
                    lastName: "Doe",
                    phone: "9811111111"
                }
            });
        }

        await Order.create(orders);
        console.log(`Created ${orders.length} orders.`);

        console.log("Database seeded successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Seeding failed:");
        if (error.errors) {
            Object.keys(error.errors).forEach(key => {
                console.error(`- ${key}: ${error.errors[key].message}`);
            });
        } else {
            console.error(error);
        }
        process.exit(1);
    }
};

connectDB().then(seedData);
