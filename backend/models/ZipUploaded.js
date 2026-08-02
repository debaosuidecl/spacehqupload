const mongoose = require("mongoose");

const zipUploadedSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    isLatestDeployment: {
      type: Boolean,
      default: false,
    },
    fileName: {
      type: String,
      required: [true, "File name is required"],
      trim: true,
    },
    originalName: {
      type: String,
      required: [true, "Original file name is required"],
      trim: true,
    },
    logs: [
      {
        type: String,
        trim: true,
      },
    ],
    fileSize: {
      type: Number,
      required: [true, "File size is required"],
      min: [0, "File size cannot be negative"],
    },
    filePath: {
      type: String,
      required: [true, "File path is required"],
    },
    fileUrl: {
      type: String,
      required: [true, "File URL is required"],
    },
    fileType: {
      type: String,
      default: "application/zip",
    },
    mimeType: {
      type: String,
      default: "application/zip",
    },
    fileExtension: {
      type: String,
      default: ".zip",
    },
    status: {
      type: String,
      enum: ["uploading", "processing", "completed", "failed", "deleted"],
      default: "uploading",
    },
    isProcessed: {
      type: Boolean,
      default: false,
    },
    processingStartedAt: {
      type: Date,
    },
    processingCompletedAt: {
      type: Date,
    },
    uploadIP: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    checksum: {
      type: String,
      trim: true,
    },
    downloadCount: {
      type: Number,
      default: 0,
      min: [0, "Download count cannot be negative"],
    },
    lastDownloadedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      default: function () {
        // Files expire after 30 days by default
        const date = new Date();
        date.setDate(date.getDate() + 30);
        return date;
      },
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    version: {
      type: String,
      default: "1.0",
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual for formatted file size
zipUploadedSchema.virtual("formattedSize").get(function () {
  const bytes = this.fileSize;
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
});

// Virtual for file age (in days)
zipUploadedSchema.virtual("ageInDays").get(function () {
  const now = new Date();
  const diffTime = Math.abs(now - this.createdAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for isExpired
zipUploadedSchema.virtual("isExpired").get(function () {
  return new Date() > this.expiresAt;
});

// Pre-save middleware
zipUploadedSchema.pre("save", function (next) {
  // Update status if processing
  if (this.isModified("isProcessed") && this.isProcessed) {
    this.processingCompletedAt = new Date();
    if (this.status === "processing") {
      this.status = "completed";
    }
  }

  // Set processing started at
  if (
    this.isModified("isProcessed") &&
    !this.isProcessed &&
    this.status === "uploading"
  ) {
    this.processingStartedAt = new Date();
  }

  next();
});

// Pre-remove middleware
zipUploadedSchema.pre("remove", function (next) {
  this.deletedAt = new Date();
  this.status = "deleted";
  next();
});

// Static method to get user's upload stats
zipUploadedSchema.statics.getUserStats = async function (userId) {
  const stats = await this.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        status: { $ne: "deleted" },
      },
    },
    {
      $group: {
        _id: null,
        totalUploads: { $sum: 1 },
        totalSize: { $sum: "$fileSize" },
        avgSize: { $avg: "$fileSize" },
        downloadCount: { $sum: "$downloadCount" },
      },
    },
  ]);

  console.log("Stats aggregation result:", { stats });
  return (
    stats[0] || { totalUploads: 0, totalSize: 0, avgSize: 0, downloadCount: 0 }
  );
};

// Instance method to increment download count
zipUploadedSchema.methods.incrementDownload = async function () {
  this.downloadCount += 1;
  this.lastDownloadedAt = new Date();
  await this.save();
};

// Indexes for better performance
zipUploadedSchema.index({ user: 1, createdAt: -1 });
zipUploadedSchema.index({ status: 1 });
zipUploadedSchema.index({ expiresAt: 1 });
zipUploadedSchema.index({ "metadata.project": 1 });

module.exports = mongoose.model("ZipUploadedJENNI", zipUploadedSchema);
