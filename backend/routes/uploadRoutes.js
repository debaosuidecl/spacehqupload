const express = require("express");
const router = express.Router();
const {
  uploadFile,
  getUploads,
  getUpload,
  downloadFile,
  deleteUpload,
  updateUpload,
  getStats,
} = require("../controllers/uploadController");
const { upload, handleUploadError } = require("../middleware/upload");
const { protect } = require("../middleware/auth");

// All routes are protected (require authentication)

// Download file
router.get("/download/:id", downloadFile);

router.use(protect);

// Upload file
router.post("/upload", upload.single("file"), handleUploadError, uploadFile);

// Get all uploads with pagination and filters
router.get("/", getUploads);

// Get upload statistics
router.get("/stats", getStats);

// Get single upload
router.get("/:id", getUpload);

// Download file
// router.get("/:id/download", downloadFile);

// Update upload metadata
router.put("/:id", updateUpload);

// Delete upload
router.delete("/:id", deleteUpload);

module.exports = router;
