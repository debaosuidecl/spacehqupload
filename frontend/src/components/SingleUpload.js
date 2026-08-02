import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import GLOBAL from "../GLOBAL/domains";

const SingleUpload = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    description: "",
    tags: "",
    isPublic: false,
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetchFileDetails();
  }, [id]);

  const fetchFileDetails = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/uploads/${id}`);
      setFile(response.data.data);
      setEditData({
        description: response.data.data.description || "",
        tags: response.data.data.tags ? response.data.data.tags.join(", ") : "",
        isPublic: response.data.data.isPublic || false,
      });
    } catch (err) {
      console.error("Error fetching file details:", err);
      setError(err.response?.data?.message || "Failed to load file details");
      if (err.response?.status === 404) {
        setTimeout(() => navigate("/uploads"), 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
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

  const handleDelete = async () => {
    try {
      await api.delete(`/uploads/${id}`);
      navigate("/uploads");
    } catch (err) {
      console.error("Delete error:", err);
      setError("Failed to delete file");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await api.put(`/uploads/${id}`, {
        description: editData.description,
        tags: editData.tags,
        isPublic: editData.isPublic,
      });
      setFile(response.data.data);
      setIsEditing(false);
    } catch (err) {
      console.error("Update error:", err);
      setError("Failed to update file details");
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return "✅";
      case "processing":
        return "⏳";
      case "failed":
        return "❌";
      case "deleted":
        return "🗑️";
      default:
        return "📄";
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner} />
        <p style={styles.loadingText}>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <Sidebar />
        <div style={styles.mainContent}>
          <div style={styles.errorContainer}>
            <div style={styles.errorIcon}>📄</div>
            <h2 style={styles.errorTitle}>File not found</h2>
            <p style={styles.errorText}>{error}</p>
            <button
              onClick={() => navigate("/uploads")}
              style={styles.errorButton}
            >
              Back to uploads
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Sidebar />

      <div style={styles.mainContent}>
        <div style={styles.topBar}>
          <div>
            <h1 style={styles.pageTitle}>File Details</h1>
            <p style={styles.pageSubtitle}>View and manage your file</p>
          </div>
          <button
            onClick={() => navigate("/uploads")}
            style={styles.backButton}
          >
            ← Back
          </button>
        </div>

        <div style={styles.fileCard}>
          <div style={styles.fileHeader}>
            <div style={styles.fileIconLarge}>📦</div>
            <div style={styles.fileHeaderInfo}>
              <h2 style={styles.fileName}>{file.originalName}</h2>
              <div style={styles.fileMeta}>
                <span style={styles.fileMetaItem}>
                  Uploaded {formatDate(file.createdAt)}
                </span>
                <span style={styles.fileMetaItem}>
                  {formatBytes(file.fileSize)}
                </span>
                <span style={styles.fileMetaItem}>
                  {file.downloadCount || 0} downloads
                </span>
              </div>
            </div>
            <div style={styles.fileActions}>
              <button onClick={handleDownload} style={styles.downloadButton}>
                Download
              </button>
              <button
                onClick={() => setIsEditing(!isEditing)}
                style={styles.editButton}
              >
                Edit
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                style={styles.deleteButton}
              >
                Delete
              </button>
            </div>
          </div>

          <div style={styles.statusSection}>
            <span
              style={{
                ...styles.statusBadgeLarge,
                backgroundColor: getStatusColor(file.status) + "20",
                color: getStatusColor(file.status),
              }}
            >
              {getStatusIcon(file.status)}{" "}
              {file.status.charAt(0).toUpperCase() + file.status.slice(1)}
            </span>
            {file.isLatestDeployment && (
              <span style={styles.publicBadge}>LIVE</span>
            )}
          </div>

          <div style={styles.detailsGrid}>
            <div style={styles.detailCard}>
              <div style={styles.detailLabel}>Name</div>
              <div style={styles.detailValue}>{file.originalName}</div>
            </div>
            <div style={styles.detailCard}>
              <div style={styles.detailLabel}>Size</div>
              <div style={styles.detailValue}>{formatBytes(file.fileSize)}</div>
            </div>
            <div style={styles.detailCard}>
              <div style={styles.detailLabel}>Type</div>
              <div style={styles.detailValue}>
                {file.fileType || "ZIP Archive"}
              </div>
            </div>
            <div style={styles.detailCard}>
              <div style={styles.detailLabel}>Uploaded</div>
              <div style={styles.detailValue}>{formatDate(file.createdAt)}</div>
            </div>
            <div style={styles.detailCard}>
              <div style={styles.detailLabel}>Modified</div>
              <div style={styles.detailValue}>{formatDate(file.updatedAt)}</div>
            </div>
            <div style={styles.detailCard}>
              <div style={styles.detailLabel}>Downloads</div>
              <div style={styles.detailValue}>{file.downloadCount || 0}</div>
            </div>
          </div>

          <div style={styles.metadataSection}>
            <div style={styles.metadataCard}>
              <div style={styles.metadataLabel}>Description</div>
              <div style={styles.metadataValue}>
                {file.description || "No description"}
              </div>
            </div>
          </div>

          {isEditing && (
            <div style={styles.editSection}>
              <h3 style={styles.editTitle}>Edit description</h3>
              <form onSubmit={handleUpdate} style={styles.editForm}>
                <div style={styles.editField}>
                  <textarea
                    value={editData.description}
                    onChange={(e) =>
                      setEditData({ ...editData, description: e.target.value })
                    }
                    style={styles.editTextarea}
                    placeholder="Add a description..."
                    rows="3"
                  />
                </div>
                <div style={styles.editActions}>
                  <button
                    type="submit"
                    style={styles.saveEditButton}
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditData({
                        description: file.description || "",
                        tags: file.tags ? file.tags.join(", ") : "",
                        isPublic: file.isPublic || false,
                      });
                    }}
                    style={styles.cancelEditButton}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div style={styles.pathSection}>
            <div style={styles.pathLabel}>Location</div>
            <div style={styles.pathValue}>{file.fileUrl}</div>
          </div>

          <div style={styles.logsSection}>
            <h3 style={styles.logsTitle}>Logs</h3>
            {file.logs ? (
              <div style={styles.logsCard}>
                {file.logs && file.logs.length > 0 && (
                  <ul style={styles.extractedFilesList}>
                    {file.logs.map((log, index) => (
                      <li key={index} style={styles.logItemA}>
                        {log}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : file.status === "processing" ? (
              <div style={styles.processingState}>
                <span style={styles.processingSpinner} />
                <p style={styles.processingText}>Processing...</p>
              </div>
            ) : file.status === "failed" ? (
              <div style={styles.failedState}>
                <span style={styles.failedIcon}>❌</span>
                <div>
                  <p style={styles.failedText}>Failed</p>
                  {file.metadata?.extractionError && (
                    <p style={styles.failedError}>
                      {file.metadata.extractionError}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p style={styles.noLogs}>No logs available</p>
            )}
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div
          style={styles.modalOverlay}
          onClick={() => setShowDeleteModal(false)}
        >
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Delete file?</h3>
            <p style={styles.modalText}>
              Are you sure you want to delete "{file?.originalName}"?
              <br />
              <span style={styles.modalFileWarning}>
                This cannot be undone.
              </span>
            </p>
            <div style={styles.modalButtons}>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={styles.modalCancelButton}
              >
                Cancel
              </button>
              <button onClick={handleDelete} style={styles.modalDeleteButton}>
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
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    backgroundColor: "#f8f9fa",
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
    padding: "16px 0",
    borderBottom: "1px solid #eaeaea",
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
  backButton: {
    padding: "6px 14px",
    backgroundColor: "transparent",
    color: "#666666",
    border: "1px solid #e5e5e5",
    borderRadius: "4px",
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  fileCard: {
    backgroundColor: "#ffffff",
    padding: "24px",
    borderRadius: "8px",
    border: "1px solid #eaeaea",
  },
  fileHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: "16px",
    marginBottom: "20px",
    paddingBottom: "20px",
    borderBottom: "1px solid #eaeaea",
  },
  fileIconLarge: {
    fontSize: "40px",
    flexShrink: 0,
  },
  fileHeaderInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#1a1a1a",
    margin: "0 0 6px 0",
  },
  fileMeta: {
    display: "flex",
    gap: "16px",
    flexWrap: "wrap",
    fontSize: "13px",
    color: "#888888",
  },
  fileMetaItem: {
    fontSize: "13px",
    color: "#888888",
  },
  fileActions: {
    display: "flex",
    gap: "6px",
    flexShrink: 0,
  },
  downloadButton: {
    padding: "6px 14px",
    backgroundColor: "#1a1a1a",
    color: "#ffffff",
    border: "none",
    borderRadius: "4px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  editButton: {
    padding: "6px 14px",
    backgroundColor: "transparent",
    color: "#666666",
    border: "1px solid #e5e5e5",
    borderRadius: "4px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  deleteButton: {
    padding: "6px 14px",
    backgroundColor: "transparent",
    color: "#ef4444",
    border: "1px solid #ef4444",
    borderRadius: "4px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  statusSection: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
  },
  statusBadgeLarge: {
    display: "inline-block",
    padding: "4px 14px",
    borderRadius: "12px",
    fontSize: "13px",
    fontWeight: "500",
  },
  publicBadge: {
    // display: "inline-block",
    padding: "4px 14px",
    backgroundColor: "#003874ff",
    border: "1px solid #024d9cff",
    color: "#1a1a1a",
    display: "flex",
    color: "white",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
    marginBottom: "20px",
  },
  detailCard: {
    padding: "12px 16px",
    backgroundColor: "#f8f8f8",
    borderRadius: "6px",
    border: "1px solid #eaeaea",
  },
  detailLabel: {
    fontSize: "10px",
    fontWeight: "600",
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "2px",
  },
  detailValue: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#1a1a1a",
    wordBreak: "break-all",
  },
  metadataSection: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "12px",
    marginBottom: "20px",
  },
  metadataCard: {
    padding: "12px 16px",
    backgroundColor: "#f8f8f8",
    borderRadius: "6px",
    border: "1px solid #eaeaea",
  },
  metadataLabel: {
    fontSize: "10px",
    fontWeight: "600",
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "2px",
  },
  metadataValue: {
    fontSize: "14px",
    color: "#1a1a1a",
    lineHeight: "1.5",
  },
  pathSection: {
    padding: "12px 16px",
    backgroundColor: "#f8f8f8",
    borderRadius: "6px",
    border: "1px solid #eaeaea",
    marginBottom: "20px",
  },
  pathLabel: {
    fontSize: "10px",
    fontWeight: "600",
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "2px",
  },
  pathValue: {
    fontSize: "13px",
    color: "#666666",
    fontFamily: "monospace",
    wordBreak: "break-all",
  },
  editSection: {
    marginTop: "16px",
    padding: "16px",
    backgroundColor: "#f8f8f8",
    borderRadius: "6px",
    border: "1px solid #eaeaea",
  },
  editTitle: {
    fontSize: "15px",
    fontWeight: "500",
    color: "#1a1a1a",
    margin: "0 0 12px 0",
  },
  editForm: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  editField: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  editTextarea: {
    padding: "8px 12px",
    border: "1px solid #e5e5e5",
    borderRadius: "4px",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.15s ease",
    backgroundColor: "#ffffff",
    resize: "vertical",
    fontFamily: "inherit",
  },
  editActions: {
    display: "flex",
    gap: "8px",
    marginTop: "4px",
  },
  saveEditButton: {
    padding: "6px 16px",
    backgroundColor: "#1a1a1a",
    color: "#ffffff",
    border: "none",
    borderRadius: "4px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  cancelEditButton: {
    padding: "6px 16px",
    backgroundColor: "transparent",
    color: "#666666",
    border: "1px solid #e5e5e5",
    borderRadius: "4px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  errorContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "50vh",
  },
  errorIcon: { fontSize: "48px", marginBottom: "12px" },
  errorTitle: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#1a1a1a",
    margin: "0 0 4px 0",
  },
  errorText: { fontSize: "14px", color: "#888888", margin: "0 0 16px 0" },
  errorButton: {
    padding: "8px 20px",
    backgroundColor: "#1a1a1a",
    color: "#ffffff",
    border: "none",
    borderRadius: "4px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  logsSection: {
    marginTop: "16px",
  },
  logsTitle: {
    fontSize: "15px",
    fontWeight: "500",
    color: "#1a1a1a",
    margin: "0 0 8px 0",
  },
  logsCard: {
    padding: "12px 16px",
    backgroundColor: "#f8f8f8",
    borderRadius: "6px",
    border: "1px solid #eaeaea",
  },
  extractedFilesList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    maxHeight: "150px",
    overflowY: "auto",
  },
  logItemA: {
    padding: "4px 0",
    fontSize: "13px",
    color: "#666666",
    borderBottom: "1px solid #f0f0f0",
    lineHeight: "1.5",
  },
  processingState: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 16px",
    backgroundColor: "#fff8f0",
    borderRadius: "6px",
    border: "1px solid #f0e6d3",
  },
  processingSpinner: {
    width: "20px",
    height: "20px",
    border: "2px solid #f0e6d3",
    borderTopColor: "#8a7a3a",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    flexShrink: 0,
  },
  processingText: {
    fontSize: "14px",
    color: "#8a7a3a",
    margin: 0,
  },
  failedState: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    padding: "12px 16px",
    backgroundColor: "#fef2f2",
    borderRadius: "6px",
    border: "1px solid #fecaca",
  },
  failedIcon: {
    fontSize: "18px",
  },
  failedText: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#991b1b",
    margin: 0,
  },
  failedError: {
    fontSize: "13px",
    color: "#991b1b",
    margin: "4px 0 0 0",
    opacity: 0.8,
  },
  noLogs: {
    fontSize: "14px",
    color: "#888888",
    padding: "12px 0",
    textAlign: "center",
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
    padding: "28px",
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
    margin: "0 0 4px 0",
  },
  modalText: {
    fontSize: "14px",
    color: "#888888",
    margin: "0 0 20px 0",
    lineHeight: "1.6",
  },
  modalFileWarning: {
    color: "#ef4444",
    fontWeight: "500",
    fontSize: "13px",
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
    borderRadius: "4px",
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
    borderRadius: "4px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
};

// Inject styles
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .backButton:hover { 
    background: #f5f5f5; 
  }
  
  .downloadButton:hover { 
    background-color: #333333 !important; 
  }
  
  .editButton:hover { 
    background: #f5f5f5; 
    border-color: #1a1a1a; 
  }
  
  .deleteButton:hover { 
    background: #fef2f2; 
    border-color: #dc2626; 
  }
  
  .saveEditButton:hover:not(:disabled) { 
    background-color: #333333 !important; 
  }
  
  .cancelEditButton:hover { 
    background: #f5f5f5; 
  }
  
  .modalCancelButton:hover { 
    background: #f5f5f5; 
  }
  
  .modalDeleteButton:hover { 
    background: #dc2626; 
  }
  
  .errorButton:hover { 
    background-color: #333333 !important; 
  }
  
  .editTextarea:focus { 
    border-color: #1a1a1a !important; 
  }
  
  .logItemA:hover { 
    background: #f5f5f5; 
  }
  
  .logList::-webkit-scrollbar {
    width: 4px;
  }
  
  .logList::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .logList::-webkit-scrollbar-thumb {
    background: #d5d5d5;
    border-radius: 2px;
  }
`;
document.head.appendChild(styleSheet);

export default SingleUpload;
