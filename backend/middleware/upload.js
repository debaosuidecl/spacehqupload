const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "../zips");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create user-specific subdirectory
    const userId = req.user ? req.user.id : "anonymous";
    const userDir = path.join(uploadDir, userId.toString());
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and random string
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString("hex");
    const originalName = file.originalname.replace(/\s+/g, "_");
    const fileName = `${timestamp}-${randomString}-${originalName}`;
    cb(null, fileName);
  },
});

// File filter - only accept zip files
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "application/zip",
    "application/x-zip-compressed",
    "application/octet-stream",
  ];
  const allowedExtensions = [".zip"];

  const fileExtension = path.extname(file.originalname).toLowerCase();
  const isAllowedMimeType = allowedMimeTypes.includes(file.mimetype);
  const isAllowedExtension = allowedExtensions.includes(fileExtension);

  if (isAllowedMimeType || isAllowedExtension) {
    cb(null, true);
  } else {
    cb(new Error("Only ZIP files are allowed"), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1, // Only allow single file upload
  },
});

// Middleware for handling upload errors
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "FILE_TOO_LARGE") {
      return res.status(400).json({
        success: false,
        message: "File size exceeds 50MB limit",
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Only one file can be uploaded at a time",
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  next();
};

module.exports = {
  upload,
  handleUploadError,
};
