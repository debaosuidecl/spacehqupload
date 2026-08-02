import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import GLOBAL from "../GLOBAL/domains";
const Uploads = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [uploads, setUploads] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);

  useEffect(() => {
    fetchUploads();
  }, [searchTerm, filter, pagination.page]);

  const fetchUploads = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (searchTerm) params.search = searchTerm;
      if (filter !== "all") params.status = filter;

      const response = await api.get("/uploads", { params });

      setUploads(response.data.data.uploads || []);
      setPagination({
        ...pagination,
        total: response.data.data.pagination.total,
        pages: response.data.data.pagination.pages,
      });
    } catch (err) {
      console.error("Error fetching uploads:", err);
      setError("Failed to load uploads");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPagination({ ...pagination, page: 1 });
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setPagination({ ...pagination, page: 1 });
  };

  const handlePageChange = (newPage) => {
    setPagination({ ...pagination, page: newPage });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDownload = async (id) => {
    try {
      const link = document.createElement("a");
      link.href = `${GLOBAL.domain}/api/uploads/download/${id}?user=${user.id}`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Download error:", err);
      setError("Failed to download file");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/uploads/${id}`);
      fetchUploads();
      setFileToDelete(null);
      setShowDeleteModal(false);
    } catch (err) {
      console.error("Delete error:", err);
      setError("Failed to delete file");
    }
  };

  const confirmDelete = (id) => {
    setFileToDelete(id);
    setShowDeleteModal(true);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "#10b981";
      case "processing":
        return "#f59e0b";
      case "failed":
        return "#ef4444";
      case "deleted":
        return "#64748b";
      default:
        return "#64748b";
    }
  };

  const getStatusBadgeStyle = (status) => {
    return {
      ...styles.statusBadge,
      backgroundColor: getStatusColor(status) + "20",
      color: getStatusColor(status),
      border: `1px solid ${getStatusColor(status)}30`,
    };
  };

  return (
    <div style={styles.container}>
      <Sidebar />

      <div style={styles.mainContent}>
        <div style={styles.topBar}>
          <div>
            <h1 style={styles.pageTitle}>Uploads</h1>
            <p style={styles.pageSubtitle}>Manage your files</p>
          </div>
          <button
            onClick={() => navigate("/upload")}
            style={styles.newUploadButton}
          >
            + New
          </button>
        </div>

        {error && (
          <div style={styles.errorAlert}>
            {error}
            <button onClick={() => setError("")} style={styles.errorClose}>
              ×
            </button>
          </div>
        )}

        <div style={styles.filterBar}>
          <div style={styles.searchWrapper}>
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={handleSearch}
              style={styles.searchInput}
            />
          </div>
          <div style={styles.filterButtons}>
            <button
              onClick={() => handleFilterChange("all")}
              style={{
                ...styles.filterButton,
                ...(filter === "all" ? styles.filterButtonActive : {}),
              }}
            >
              All
            </button>
            <button
              onClick={() => handleFilterChange("completed")}
              style={{
                ...styles.filterButton,
                ...(filter === "completed" ? styles.filterButtonActive : {}),
              }}
            >
              Complete
            </button>
            <button
              onClick={() => handleFilterChange("processing")}
              style={{
                ...styles.filterButton,
                ...(filter === "processing" ? styles.filterButtonActive : {}),
              }}
            >
              Processing
            </button>
            <button
              onClick={() => handleFilterChange("failed")}
              style={{
                ...styles.filterButton,
                ...(filter === "failed" ? styles.filterButtonActive : {}),
              }}
            >
              Failed
            </button>
          </div>
        </div>

        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.loadingSpinner} />
            <p style={styles.loadingText}>Loading...</p>
          </div>
        ) : (
          <div style={styles.tableCard}>
            <div style={styles.tableHeader}>
              <div style={styles.tableStats}>
                {pagination.total > 0 ? (
                  <span>
                    {uploads.length} of {pagination.total} files
                  </span>
                ) : (
                  <span>No files</span>
                )}
              </div>
              <div style={styles.tableActions}>
                <button onClick={fetchUploads} style={styles.tableActionButton}>
                  Refresh
                </button>
              </div>
            </div>

            {uploads.length > 0 ? (
              <>
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>File</th>
                        <th style={styles.th}>Size</th>
                        <th style={styles.th}>Date</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Downloads</th>
                        <th style={styles.th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploads.map((file) => (
                        <tr key={file._id} style={styles.tr}>
                          <td style={styles.td}>
                            {file.isLatestDeployment && (
                              <span style={styles.fileIcon}>LIVE</span>
                            )}
                            <span
                              onClick={() => navigate(`/upload/${file._id}`)}
                              style={styles.fileNameText}
                            >
                              {file.originalName}
                            </span>
                          </td>
                          <td style={styles.td}>
                            {formatBytes(file.fileSize)}
                          </td>
                          <td style={styles.td}>
                            {formatDate(file.createdAt)}
                          </td>
                          <td style={styles.td}>
                            <span style={getStatusBadgeStyle(file.status)}>
                              {file.status.charAt(0).toUpperCase() +
                                file.status.slice(1)}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <span style={styles.downloadCount}>
                              {file.downloadCount || 0}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <div style={styles.actionButtons}>
                              <button
                                onClick={() => handleDownload(file._id)}
                                style={styles.actionButton}
                                title="Download"
                              >
                                ⬇
                              </button>
                              <button
                                onClick={() => navigate(`/upload/${file._id}`)}
                                style={styles.actionButton}
                                title="View"
                              >
                                👁
                              </button>
                              <button
                                onClick={() => confirmDelete(file._id)}
                                style={{
                                  ...styles.actionButton,
                                  color: "#ef4444",
                                }}
                                title="Delete"
                              >
                                ✕
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {pagination.pages > 1 && (
                  <div style={styles.pagination}>
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      style={{
                        ...styles.paginationButton,
                        opacity: pagination.page === 1 ? 0.5 : 1,
                        cursor:
                          pagination.page === 1 ? "not-allowed" : "pointer",
                      }}
                    >
                      Previous
                    </button>
                    <div style={styles.paginationInfo}>
                      <span style={styles.paginationPage}>
                        {pagination.page} of {pagination.pages}
                      </span>
                    </div>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.pages}
                      style={{
                        ...styles.paginationButton,
                        opacity: pagination.page === pagination.pages ? 0.5 : 1,
                        cursor:
                          pagination.page === pagination.pages
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>📭</div>
                <h3 style={styles.emptyTitle}>No files</h3>
                <p style={styles.emptyText}>
                  {searchTerm || filter !== "all"
                    ? "Try adjusting your search"
                    : "Upload your first file"}
                </p>
                {!searchTerm && filter === "all" && (
                  <button
                    onClick={() => navigate("/upload")}
                    style={styles.emptyButton}
                  >
                    Upload
                  </button>
                )}
                {(searchTerm || filter !== "all") && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setFilter("all");
                      setPagination({ ...pagination, page: 1 });
                    }}
                    style={styles.emptyButtonSecondary}
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showDeleteModal && (
        <div
          style={styles.modalOverlay}
          onClick={() => setShowDeleteModal(false)}
        >
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Delete file?</h3>
            <p style={styles.modalText}>This action cannot be undone.</p>
            <div style={styles.modalButtons}>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={styles.modalCancelButton}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(fileToDelete)}
                style={styles.modalDeleteButton}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
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
    marginLeft: "220px",
    flex: 1,
    padding: "32px 40px",
    minHeight: "100vh",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  pageTitle: {
    fontSize: "20px",
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
  newUploadButton: {
    padding: "8px 16px",
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
    marginBottom: "20px",
    border: "1px solid #fecaca",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  errorClose: {
    background: "none",
    border: "none",
    fontSize: "18px",
    cursor: "pointer",
    color: "#991b1b",
    padding: "0 4px",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 0",
  },
  loadingSpinner: {
    width: "28px",
    height: "28px",
    border: "2px solid #e5e5e5",
    borderTopColor: "#1a1a1a",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: {
    marginTop: "12px",
    fontSize: "14px",
    color: "#888888",
  },
  filterBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "12px",
  },
  searchWrapper: {
    flex: 1,
    maxWidth: "300px",
  },
  searchInput: {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid #e5e5e5",
    borderRadius: "6px",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.15s ease",
    backgroundColor: "#fafafa",
  },
  filterButtons: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
  },
  filterButton: {
    padding: "6px 14px",
    background: "transparent",
    border: "1px solid #e5e5e5",
    borderRadius: "4px",
    fontSize: "13px",
    cursor: "pointer",
    transition: "all 0.15s ease",
    color: "#666666",
  },
  filterButtonActive: {
    backgroundColor: "#1a1a1a",
    color: "#ffffff",
    borderColor: "#1a1a1a",
  },
  tableCard: {
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    border: "1px solid #eaeaea",
    overflow: "hidden",
  },
  tableHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 20px",
    borderBottom: "1px solid #eaeaea",
    backgroundColor: "#fafafa",
  },
  tableStats: {
    fontSize: "13px",
    color: "#888888",
  },
  tableActions: {
    display: "flex",
    gap: "8px",
  },
  tableActionButton: {
    padding: "4px 12px",
    backgroundColor: "transparent",
    border: "1px solid #e5e5e5",
    borderRadius: "4px",
    fontSize: "13px",
    cursor: "pointer",
    transition: "all 0.15s ease",
    color: "#666666",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "600px",
  },
  th: {
    textAlign: "left",
    padding: "12px 16px",
    fontSize: "11px",
    fontWeight: "600",
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    borderBottom: "1px solid #eaeaea",
  },
  td: {
    padding: "14px 16px",
    fontSize: "14px",
    color: "#1a1a1a",
    borderBottom: "1px solid #f5f5f5",
    verticalAlign: "middle",
    position: "relative",
  },
  fileIcon: {
    marginRight: "8px",
    backgroundColor: "#10b981",
    padding: "1px 8px",
    borderRadius: "3px",
    color: "white",
    fontSize: "9px",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  fileNameText: {
    fontWeight: "500",
    cursor: "pointer",
  },
  statusBadge: {
    display: "inline-block",
    padding: "2px 12px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "500",
  },
  downloadCount: {
    display: "inline-block",
    padding: "2px 10px",
    backgroundColor: "#f5f5f5",
    borderRadius: "4px",
    fontSize: "13px",
    fontWeight: "500",
    color: "#666666",
  },
  actionButtons: {
    display: "flex",
    gap: "6px",
  },
  actionButton: {
    background: "transparent",
    border: "none",
    fontSize: "16px",
    cursor: "pointer",
    padding: "4px 6px",
    borderRadius: "4px",
    transition: "background-color 0.15s ease",
    color: "#666666",
  },
  pagination: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "16px",
    padding: "16px",
    borderTop: "1px solid #eaeaea",
  },
  paginationButton: {
    padding: "6px 16px",
    backgroundColor: "transparent",
    border: "1px solid #e5e5e5",
    borderRadius: "4px",
    fontSize: "13px",
    cursor: "pointer",
    transition: "all 0.15s ease",
    color: "#666666",
  },
  paginationInfo: {
    fontSize: "13px",
    color: "#888888",
  },
  paginationPage: {
    fontWeight: "500",
    color: "#1a1a1a",
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
  },
  emptyIcon: {
    fontSize: "48px",
    marginBottom: "12px",
    opacity: 0.4,
  },
  emptyTitle: {
    fontSize: "18px",
    fontWeight: "500",
    color: "#1a1a1a",
    margin: "0 0 4px 0",
  },
  emptyText: {
    fontSize: "14px",
    color: "#888888",
    margin: "0 0 16px 0",
  },
  emptyButton: {
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
  emptyButtonSecondary: {
    padding: "8px 20px",
    backgroundColor: "transparent",
    color: "#666666",
    border: "1px solid #e5e5e5",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.15s ease",
    marginLeft: "8px",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "#ffffff",
    padding: "32px",
    borderRadius: "8px",
    maxWidth: "380px",
    width: "90%",
    textAlign: "center",
    border: "1px solid #eaeaea",
  },
  modalTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#1a1a1a",
    margin: "0 0 8px 0",
  },
  modalText: {
    fontSize: "14px",
    color: "#888888",
    margin: "0 0 24px 0",
  },
  modalButtons: {
    display: "flex",
    gap: "10px",
    justifyContent: "center",
  },
  modalCancelButton: {
    padding: "8px 20px",
    backgroundColor: "transparent",
    color: "#666666",
    border: "1px solid #e5e5e5",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  modalDeleteButton: {
    padding: "8px 20px",
    backgroundColor: "#ef4444",
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
  
  .searchInput:focus { 
    border-color: #1a1a1a !important; 
    background-color: #ffffff !important;
  }
  
  .newUploadButton:hover { 
    background-color: #333333 !important; 
  }
  
  .filterButton:hover:not(.filterButtonActive) { 
    border-color: #1a1a1a; 
    background: #f5f5f5; 
  }
  
  .actionButton:hover { 
    background: #f5f5f5; 
  }
  
  .tr:hover { 
    background: #f8f8f8; 
  }
  
  .paginationButton:hover:not(:disabled) { 
    background: #f5f5f5; 
    border-color: #1a1a1a; 
  }
  
  .paginationButton:disabled { 
    opacity: 0.4; 
    cursor: not-allowed; 
  }
  
  .tableActionButton:hover { 
    background: #f5f5f5; 
  }
  
  .modalCancelButton:hover { 
    background: #f5f5f5; 
  }
  
  .modalDeleteButton:hover { 
    background: #dc2626; 
  }
  
  .emptyButton:hover { 
    background-color: #333333 !important; 
  }
  
  .emptyButtonSecondary:hover { 
    background: #f5f5f5; 
    border-color: #1a1a1a; 
  }
  
  .errorClose:hover { 
    transform: scale(1.2); 
  }
  
  .fileNameText:hover { 
    text-decoration: underline; 
  }
`;
document.head.appendChild(styleSheet);

export default Uploads;
