const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Blog title is required"],
      trim: true,
      maxlength: [300, "Title cannot exceed 300 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    excerpt: {
      type: String,
      trim: true,
      maxlength: [1000, "Excerpt cannot exceed 1000 characters"],
    },
    content: {
      type: String,
    },
    featuredImage: {
      type: String,
    },
    category: {
      type: String,
      enum: [
        "design-tips",
        "styling",
        "sustainability",
        "small-spaces",
        "trends",
        "guides",
        "news",
        "inspiration",
      ],
      default: "inspiration",
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    // RSS Feed source information
    source: {
      name: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
      feedUrl: {
        type: String,
      },
      logo: {
        type: String,
      },
    },
    // Original article link
    originalUrl: {
      type: String,
      required: true,
      unique: true,
    },
    // Author from RSS feed
    author: {
      name: {
        type: String,
        default: "Editorial Team",
      },
      avatar: {
        type: String,
      },
    },
    readTime: {
      type: Number,
      default: 5,
    },
    views: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
blogSchema.index({ category: 1 });
blogSchema.index({ publishedAt: -1 });
blogSchema.index({ isFeatured: 1, publishedAt: -1 });
blogSchema.index({ "source.name": 1 });
blogSchema.index({ tags: 1 });
blogSchema.index({ "$**": "text" });

// Generate slug from title
blogSchema.pre("save", function () {
  if (this.isModified("title") || !this.slug) {
    const baseSlug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .substring(0, 100);

    // Add timestamp to ensure uniqueness
    this.slug = `${baseSlug}-${Date.now().toString(36)}`;
  }

  // Calculate read time based on content length (avg 200 words per minute)
  if (this.isModified("content") && this.content) {
    const wordCount = this.content.replace(/<[^>]*>/g, "").split(/\s+/).length;
    this.readTime = Math.max(1, Math.ceil(wordCount / 200));
  }
});

// Virtual for formatted category name
blogSchema.virtual("categoryName").get(function () {
  const categoryNames = {
    "design-tips": "Design Tips",
    styling: "Styling",
    sustainability: "Sustainability",
    "small-spaces": "Small Spaces",
    trends: "Trends",
    guides: "Guides",
    news: "News",
    inspiration: "Inspiration",
  };
  return categoryNames[this.category] || this.category;
});

// Static method to get popular blogs
blogSchema.statics.getPopular = async function (limit = 5) {
  return this.find()
    .sort({ views: -1, likes: -1, publishedAt: -1 })
    .limit(limit);
};

// Static method to get featured blogs
blogSchema.statics.getFeatured = async function (limit = 3) {
  return this.find({ isFeatured: true }).sort({ publishedAt: -1 }).limit(limit);
};

// Instance method to increment views
blogSchema.methods.incrementViews = async function () {
  this.views += 1;
  return this.save({ validateBeforeSave: false });
};

const Blog = mongoose.model("Blog", blogSchema);

module.exports = Blog;
