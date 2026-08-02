const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  getDashboardStats,
  getStorageUsage,
  getActivityHeatmap,
} = require("../controllers/statsController");

// All routes are protected
router.use(protect);

// Get comprehensive dashboard stats
router.get("/dashboard", getDashboardStats);

// Get storage usage details
router.get("/storage", getStorageUsage);

// Get activity heatmap
router.get("/activity", getActivityHeatmap);

module.exports = router;
