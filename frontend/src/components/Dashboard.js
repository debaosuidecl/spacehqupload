import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import api from "../services/api";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUploads: 0,
    totalSize: 0,
    downloadCount: 0,
    recentUploads: [],
    storageUsed: 0,
    storageLimit: 1073741824,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const uploadsResponse = await api.get("/uploads?page=1&limit=5");
      const statsResponse = await api.get("/uploads/stats");

      setStats({
        totalUploads: statsResponse.data.data.totalUploads || 0,
        totalSize: statsResponse.data.data.totalSize || 0,
        downloadCount: statsResponse.data.data.downloadCount || 0,
        recentUploads: uploadsResponse.data.data.uploads || [],
        storageUsed: statsResponse.data.data.totalSize || 0,
        storageLimit: 1073741824,
      });
      setError("");
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 MB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getStoragePercentage = () => {
    return (stats.storageUsed / stats.storageLimit) * 100;
  };

  return (
    <div style={styles.container}>
      <Sidebar />

      <div style={styles.mainContent}>
        <div style={styles.topBar}>
          <div>
            <h1 style={styles.pageTitle}>Dashboard</h1>
            <p style={styles.pageSubtitle}>Welcome back, {user?.name}</p>
          </div>
          <button
            onClick={() => navigate("/upload")}
            style={styles.uploadButton}
          >
            + New Upload
          </button>
        </div>

        {error && <div style={styles.errorAlert}>{error}</div>}

        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.loadingSpinner} />
            <p style={styles.loadingText}>Loading your data...</p>
          </div>
        ) : (
          <>
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div>
                  <div style={styles.statValue}>{stats.totalUploads}</div>
                  <div style={styles.statLabel}>Total Uploads</div>
                </div>
              </div>
              <div style={styles.statCard}>
                <div>
                  <div style={styles.statValue}>
                    {formatBytes(stats.totalSize)}
                  </div>
                  <div style={styles.statLabel}>Storage Used</div>
                </div>
              </div>
              <div style={styles.statCard}>
                <div>
                  <div style={styles.statValue}>
                    {stats.recentUploads.length}
                  </div>
                  <div style={styles.statLabel}>Recent Files</div>
                </div>
              </div>
              <div style={styles.statCard}>
                <div>
                  <div style={styles.statValue}>{stats.downloadCount}</div>
                  <div style={styles.statLabel}>Total Downloads</div>
                </div>
              </div>
            </div>

            <div style={styles.storageCard}>
              <div style={styles.storageHeader}>
                <span style={styles.storageTitle}>Storage Usage</span>
                <span style={styles.storageText}>
                  {formatBytes(stats.storageUsed)} /{" "}
                  {formatBytes(stats.storageLimit)}
                </span>
              </div>
              <div style={styles.storageBar}>
                <div
                  style={{
                    ...styles.storageFill,
                    width: `${Math.min(getStoragePercentage(), 100)}%`,
                  }}
                />
              </div>
            </div>

            <div style={styles.recentCard}>
              <div style={styles.recentHeader}>
                <span style={styles.recentTitle}>Recent Uploads</span>
                <button
                  onClick={() => navigate("/uploads")}
                  style={styles.viewAllButton}
                >
                  View all →
                </button>
              </div>
              {stats.recentUploads.length > 0 ? (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>File</th>
                      <th style={styles.th}>Size</th>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentUploads.map((file) => (
                      <tr key={file._id} style={styles.tr}>
                        <td style={styles.td}>{file.originalName}</td>
                        <td style={styles.td}>
                          {file.formattedSize || formatBytes(file.fileSize)}
                        </td>
                        <td style={styles.td}>
                          {new Date(file.createdAt).toLocaleDateString()}
                        </td>
                        <td style={styles.td}>
                          <span
                            style={{
                              ...styles.statusBadge,
                              backgroundColor:
                                file.status === "completed"
                                  ? "#e6f7e6"
                                  : "#fff3e0",
                              color:
                                file.status === "completed"
                                  ? "#2e7d32"
                                  : "#e65100",
                            }}
                          >
                            {file.status === "completed"
                              ? "Complete"
                              : file.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={styles.emptyState}>
                  <p>No uploads yet.</p>
                  <button
                    onClick={() => navigate("/upload")}
                    style={styles.emptyButton}
                  >
                    Upload a file
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
    backgroundColor: "#f8f9fa",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  mainContent: {
    marginLeft: "260px",
    flex: 1,
    padding: "32px 40px",
    minHeight: "100vh",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "32px",
  },
  pageTitle: {
    fontSize: "24px",
    fontWeight: "600",
    color: "#1a1a1a",
    margin: 0,
    letterSpacing: "-0.3px",
  },
  pageSubtitle: {
    fontSize: "14px",
    color: "#888888",
    margin: "4px 0 0 0",
  },
  uploadButton: {
    padding: "8px 20px",
    backgroundColor: "#1a1a1a",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  errorAlert: {
    padding: "10px 16px",
    backgroundColor: "#fef2f2",
    color: "#991b1b",
    borderRadius: "6px",
    fontSize: "14px",
    marginBottom: "24px",
    border: "1px solid #fecaca",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 0",
  },
  loadingSpinner: {
    width: "32px",
    height: "32px",
    border: "2px solid #e5e5e5",
    borderTopColor: "#1a1a1a",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: {
    marginTop: "16px",
    fontSize: "14px",
    color: "#888888",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },
  statCard: {
    backgroundColor: "#ffffff",
    padding: "20px 24px",
    borderRadius: "8px",
    border: "1px solid #eaeaea",
  },
  statValue: {
    fontSize: "26px",
    fontWeight: "600",
    color: "#1a1a1a",
    letterSpacing: "-0.5px",
  },
  statLabel: {
    fontSize: "13px",
    color: "#888888",
    marginTop: "4px",
  },
  storageCard: {
    backgroundColor: "#ffffff",
    padding: "20px 24px",
    borderRadius: "8px",
    border: "1px solid #eaeaea",
    marginBottom: "24px",
  },
  storageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  storageTitle: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#1a1a1a",
  },
  storageText: {
    fontSize: "13px",
    color: "#888888",
  },
  storageBar: {
    width: "100%",
    height: "4px",
    backgroundColor: "#eaeaea",
    borderRadius: "2px",
    overflow: "hidden",
  },
  storageFill: {
    height: "100%",
    transition: "width 0.3s ease",
    backgroundColor: "#1a1a1a",
    borderRadius: "2px",
  },
  recentCard: {
    backgroundColor: "#ffffff",
    padding: "20px 24px",
    borderRadius: "8px",
    border: "1px solid #eaeaea",
  },
  recentHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  recentTitle: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#1a1a1a",
  },
  viewAllButton: {
    background: "none",
    border: "none",
    color: "#888888",
    fontSize: "13px",
    cursor: "pointer",
    transition: "color 0.15s ease",
    padding: "4px 8px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "10px 8px",
    fontSize: "11px",
    fontWeight: "600",
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    borderBottom: "1px solid #eaeaea",
  },
  td: {
    padding: "12px 8px",
    fontSize: "14px",
    color: "#1a1a1a",
    borderBottom: "1px solid #f0f0f0",
  },
  statusBadge: {
    display: "inline-block",
    padding: "2px 12px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "500",
  },
  emptyState: {
    textAlign: "center",
    padding: "32px 20px",
    color: "#888888",
  },
  emptyButton: {
    marginTop: "12px",
    padding: "8px 20px",
    backgroundColor: "#1a1a1a",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  tr: {
    transition: "background-color 0.15s ease",
  },
};

// Inject styles
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .uploadButton:hover {
    background-color: #333333 !important;
  }
  
  .viewAllButton:hover {
    color: #1a1a1a !important;
  }
  
  .emptyButton:hover {
    background-color: #333333 !important;
  }
  
  .tr:hover {
    background-color: #f8f8f8;
  }
`;
document.head.appendChild(styleSheet);

export default Dashboard;
