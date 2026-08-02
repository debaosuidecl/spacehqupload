const ZipUploaded = require("../models/ZipUploaded");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// @desc    Upload a ZIP file
// @route   POST /api/uploads
// @access  Private
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const file = req.file;
    const user = req.user;

    // Calculate file checksum (optional)
    const checksum = await calculateFileChecksum(file.path);

    // Create upload record in database
    const upload = await ZipUploaded.create({
      user: user.id,
      fileName: file.filename,
      originalName: file.originalname,
      fileSize: file.size,
      filePath: file.path,
      fileUrl: `/zips/${user.id}/${file.filename}`,
      fileType: file.mimetype || "application/zip",
      mimeType: file.mimetype || "application/zip",
      fileExtension: path.extname(file.originalname),
      status: "processing",
      isProcessed: false,
      processingCompletedAt: null,
      uploadIP: req.ip || req.connection.remoteAddress,
      userAgent: req.headers["user-agent"],
      checksum: checksum,
      metadata: {
        uploadDate: new Date().toISOString(),
        originalName: file.originalname,
        size: file.size,
      },
      // Allow tags from request body
      tags: req.body.tags
        ? req.body.tags.split(",").map((tag) => tag.trim())
        : [],
      description: req.body.description || "",
      isPublic: req.body.isPublic === "true" || false,
    });

    res.status(201).json({
      success: true,
      message: "File uploaded successfully",
      data: {
        id: upload._id,
        fileName: upload.originalName,
        size: upload.formattedSize,
        url: upload.fileUrl,
        uploadDate: upload.createdAt,
        status: upload.status,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    // Clean up file if database save fails
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error("Error deleting file:", err);
      }
    }
    res.status(500).json({
      success: false,
      message: "Server error during upload",
    });
  }
};

// @desc    Get all uploads for current user
// @route   GET /api/uploads
// @access  Private
exports.getUploads = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = {
      user: req.user.id,
      status: { $ne: "deleted" },
    };

    // Add status filter
    if (status && status !== "all") {
      query.status = status;
    }

    // Add search filter
    if (search) {
      query.$or = [
        { originalName: { $regex: search, $options: "i" } },
        { fileName: { $regex: search, $options: "i" } },
      ];
    }

    // Get total count
    const total = await ZipUploaded.countDocuments(query);

    // Get uploads with pagination
    const uploads = await ZipUploaded.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select("-__v");

    // Get user stats
    const stats = await ZipUploaded.getUserStats(req.user.id);

    res.status(200).json({
      success: true,
      data: {
        uploads,
        stats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Get uploads error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Get single upload by ID
// @route   GET /api/uploads/:id
// @access  Private
exports.getUpload = async (req, res) => {
  try {
    const upload = await ZipUploaded.findOne({
      _id: req.params.id,
      user: req.user.id,
      status: { $ne: "deleted" },
    });

    if (!upload) {
      return res.status(404).json({
        success: false,
        message: "Upload not found",
      });
    }

    res.status(200).json({
      success: true,
      data: upload,
    });
  } catch (error) {
    console.error("Get upload error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Download file
// @route   GET /api/uploads/:id/download
// @access  Private
exports.downloadFile = async (req, res) => {
  console.log(req.query);
  try {
    const upload = await ZipUploaded.findOne({
      _id: req.params.id,
      user: req.query.user,
      status: { $ne: "deleted" },
    });

    if (!upload) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    // Check if file exists on disk
    if (!fs.existsSync(upload.filePath)) {
      return res.status(404).json({
        success: false,
        message: "File not found on server",
      });
    }

    // Increment download count
    await upload.incrementDownload();

    // Send file for download
    res.download(upload.filePath, upload.originalName, (err) => {
      if (err) {
        console.error("Download error:", err);
        res.status(500).json({
          success: false,
          message: "Error downloading file",
        });
      }
    });
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Delete upload
// @route   DELETE /api/uploads/:id
// @access  Private
exports.deleteUpload = async (req, res) => {
  try {
    const upload = await ZipUploaded.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!upload) {
      return res.status(404).json({
        success: false,
        message: "Upload not found",
      });
    }

    // Delete file from disk
    if (fs.existsSync(upload.filePath)) {
      try {
        fs.unlinkSync(upload.filePath);
      } catch (err) {
        console.error("Error deleting file:", err);
      }
    }

    // Soft delete from database
    upload.status = "deleted";
    upload.deletedAt = new Date();
    await upload.save();

    res.status(200).json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Update upload metadata
// @route   PUT /api/uploads/:id
// @access  Private
exports.updateUpload = async (req, res) => {
  try {
    const { description, tags, isPublic } = req.body;

    const upload = await ZipUploaded.findOne({
      _id: req.params.id,
      user: req.user.id,
      status: { $ne: "deleted" },
    });

    if (!upload) {
      return res.status(404).json({
        success: false,
        message: "Upload not found",
      });
    }

    // Update fields
    if (description !== undefined) upload.description = description;
    if (tags !== undefined) {
      upload.tags = tags.split(",").map((tag) => tag.trim());
    }
    if (isPublic !== undefined) upload.isPublic = isPublic === "true";

    await upload.save();

    res.status(200).json({
      success: true,
      data: upload,
    });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Get upload statistics
// @route   GET /api/uploads/stats
// @access  Private
exports.getStats = async (req, res) => {
  try {
    const stats = await ZipUploaded.getUserStats(req.user.id);

    // console.log("Stats retrieved:", stats);
    // Get recent uploads count (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentUploads = await ZipUploaded.countDocuments({
      user: req.user.id,
      createdAt: { $gte: sevenDaysAgo },
      status: { $ne: "deleted" },
    });

    res.status(200).json({
      success: true,
      data: {
        ...stats,
        recentUploads,
      },
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Helper function to calculate file checksum
async function calculateFileChecksum(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);

    stream.on("data", (data) => hash.update(data));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", (err) => reject(err));
  });
}
