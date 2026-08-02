const ZipUploaded = require("../models/ZipUploaded");

/**
 * Get comprehensive statistics for a user
 * @route   GET /api/stats/dashboard
 * @access  Private
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Run all stat calculations in parallel for better performance
    const [
      totalUploads,
      storageUsed,
      recentFiles,
      totalDownloads,
      uploadsByStatus,
      storageTrend,
      fileTypeDistribution,
      monthlyStats,
    ] = await Promise.all([
      getTotalUploads(userId),
      getStorageUsed(userId),
      getRecentFiles(userId, 5),
      getTotalDownloads(userId),
      getUploadsByStatus(userId),
      getStorageTrend(userId, 7),
      getFileTypeDistribution(userId),
      getMonthlyStats(userId, 6),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalUploads,
        storageUsed: {
          bytes: storageUsed,
          formatted: formatBytes(storageUsed),
        },
        recentFiles,
        totalDownloads,
        uploadsByStatus,
        storageTrend,
        fileTypeDistribution,
        monthlyStats,
      },
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
      error: error.message,
    });
  }
};

/**
 * Get storage usage details
 * @route   GET /api/stats/storage
 * @access  Private
 */
exports.getStorageUsage = async (req, res) => {
  try {
    const userId = req.user.id;
    const storageLimit = 1073741824; // 1GB default
    const used = await getStorageUsed(userId);

    const usageData = {
      used: used,
      limit: storageLimit,
      formattedUsed: formatBytes(used),
      formattedLimit: formatBytes(storageLimit),
      percentage: Math.min((used / storageLimit) * 100, 100),
      remaining: Math.max(storageLimit - used, 0),
      formattedRemaining: formatBytes(Math.max(storageLimit - used, 0)),
    };

    res.status(200).json({
      success: true,
      data: usageData,
    });
  } catch (error) {
    console.error("Storage usage error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch storage usage",
      error: error.message,
    });
  }
};

/**
 * Get activity heatmap data
 * @route   GET /api/stats/activity
 * @access  Private
 */
exports.getActivityHeatmap = async (req, res) => {
  try {
    const userId = req.user.id;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const result = await ZipUploaded.aggregate([
      {
        $match: {
          user: userId,
          status: { $ne: "deleted" },
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const heatmap = {};
    result.forEach((item) => {
      const key = `${item._id.year}-${String(item._id.month).padStart(2, "0")}-${String(item._id.day).padStart(2, "0")}`;
      heatmap[key] = item.count;
    });

    res.status(200).json({
      success: true,
      data: heatmap,
    });
  } catch (error) {
    console.error("Activity heatmap error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch activity data",
      error: error.message,
    });
  }
};

// ============= HELPER FUNCTIONS =============

/**
 * Get total uploads count
 */
async function getTotalUploads(userId) {
  try {
    const count = await ZipUploaded.countDocuments({
      user: userId,
      status: { $ne: "deleted" },
    });
    return count;
  } catch (error) {
    console.error("Error getting total uploads:", error);
    return 0;
  }
}

/**
 * Get total storage used in bytes
 */
async function getStorageUsed(userId) {
  try {
    const result = await ZipUploaded.aggregate([
      {
        $match: {
          user: userId,
          status: { $ne: "deleted" },
        },
      },
      {
        $group: {
          _id: null,
          totalSize: { $sum: "$fileSize" },
        },
      },
    ]);

    return result.length > 0 ? result[0].totalSize : 0;
  } catch (error) {
    console.error("Error calculating storage used:", error);
    return 0;
  }
}

/**
 * Get recent files with details
 */
async function getRecentFiles(userId, limit = 5) {
  try {
    const files = await ZipUploaded.find({
      user: userId,
      status: { $ne: "deleted" },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("originalName fileSize createdAt status downloadCount");

    return files.map((file) => ({
      id: file._id,
      name: file.originalName,
      size: file.fileSize,
      formattedSize: formatBytes(file.fileSize),
      date: file.createdAt,
      status: file.status,
      downloads: file.downloadCount || 0,
    }));
  } catch (error) {
    console.error("Error getting recent files:", error);
    return [];
  }
}

/**
 * Get total downloads count
 */
async function getTotalDownloads(userId) {
  try {
    const result = await ZipUploaded.aggregate([
      {
        $match: {
          user: userId,
          status: { $ne: "deleted" },
        },
      },
      {
        $group: {
          _id: null,
          totalDownloads: { $sum: "$downloadCount" },
        },
      },
    ]);

    return result.length > 0 ? result[0].totalDownloads : 0;
  } catch (error) {
    console.error("Error getting total downloads:", error);
    return 0;
  }
}

/**
 * Get uploads grouped by status
 */
async function getUploadsByStatus(userId) {
  try {
    const result = await ZipUploaded.aggregate([
      {
        $match: {
          user: userId,
          status: { $ne: "deleted" },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const statusMap = {};
    result.forEach((item) => {
      statusMap[item._id] = item.count;
    });

    return {
      completed: statusMap.completed || 0,
      processing: statusMap.processing || 0,
      failed: statusMap.failed || 0,
      total: Object.values(statusMap).reduce((a, b) => a + b, 0),
    };
  } catch (error) {
    console.error("Error getting uploads by status:", error);
    return { completed: 0, processing: 0, failed: 0, total: 0 };
  }
}

/**
 * Get storage trend for the last X days
 */
async function getStorageTrend(userId, days = 7) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await ZipUploaded.aggregate([
      {
        $match: {
          user: userId,
          status: { $ne: "deleted" },
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          totalSize: { $sum: "$fileSize" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
      },
    ]);

    // Format the trend data
    const trend = result.map((item) => ({
      date: `${item._id.year}-${String(item._id.month).padStart(2, "0")}-${String(item._id.day).padStart(2, "0")}`,
      size: item.totalSize,
      formattedSize: formatBytes(item.totalSize),
      count: item.count,
    }));

    return trend;
  } catch (error) {
    console.error("Error getting storage trend:", error);
    return [];
  }
}

/**
 * Get file type distribution
 */
async function getFileTypeDistribution(userId) {
  try {
    const result = await ZipUploaded.aggregate([
      {
        $match: {
          user: userId,
          status: { $ne: "deleted" },
        },
      },
      {
        $group: {
          _id: "$fileExtension",
          count: { $sum: 1 },
          totalSize: { $sum: "$fileSize" },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 10, // Top 10 file types
      },
    ]);

    return result.map((item) => ({
      extension: item._id || "unknown",
      count: item.count,
      totalSize: item.totalSize,
      formattedSize: formatBytes(item.totalSize),
    }));
  } catch (error) {
    console.error("Error getting file type distribution:", error);
    return [];
  }
}

/**
 * Get monthly statistics
 */
async function getMonthlyStats(userId, months = 6) {
  try {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const result = await ZipUploaded.aggregate([
      {
        $match: {
          user: userId,
          status: { $ne: "deleted" },
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          totalUploads: { $sum: 1 },
          totalSize: { $sum: "$fileSize" },
          totalDownloads: { $sum: "$downloadCount" },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ]);

    const monthsData = [];
    const currentDate = new Date(startDate);

    for (let i = 0; i < months; i++) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      const found = result.find(
        (item) => item._id.year === year && item._id.month === month,
      );

      monthsData.push({
        month: `${year}-${String(month).padStart(2, "0")}`,
        monthName: currentDate.toLocaleString("default", { month: "short" }),
        year: year,
        totalUploads: found ? found.totalUploads : 0,
        totalSize: found ? found.totalSize : 0,
        formattedSize: found ? formatBytes(found.totalSize) : "0 Bytes",
        totalDownloads: found ? found.totalDownloads : 0,
      });

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return monthsData;
  } catch (error) {
    console.error("Error getting monthly stats:", error);
    return [];
  }
}

/**
 * Helper function to format bytes
 */
function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
