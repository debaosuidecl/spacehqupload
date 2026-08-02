import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import socketIOClient from "socket.io-client";
import GLOBAL from "../GLOBAL/domains";

const Upload = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [latestUploadId, setLatestUploadId] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadHistory, setUploadHistory] = useState([]);
  const [error, setError] = useState("");
  const [socket, setSocket] = useState(null);
  const [updateLogs, setUpdateLogs] = useState([]);

  const [metadata, setMetadata] = useState({
    description: "",
    tags: "",
    isPublic: false,
  });

  useEffect(() => {
    setSocket(
      socketIOClient(`${GLOBAL.domain}`, {
        // transports: ["websocket"],
      }),
    );
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on("upload_update", (data) => {
        console.log("upload update", data);

        let latestUpload = data.data;

        if (latestUpload?.status === "completed") {
          setUploadStatus("completed");
        }
        let message = data.message;

        setUpdateLogs((prevLogs) => latestUpload.logs || []);
        setLatestUploadId(latestUpload._id);
      });
    }
  }, [socket]);

  const validateFile = (file) => {
    const isValidType =
      file.type === "application/zip" || file.name.endsWith(".zip");
    const isValidSize = file.size <= 50 * 1024 * 1024;

    if (!isValidType) {
      setError("Please upload a valid ZIP file (.zip)");
      return false;
    }
    if (!isValidSize) {
      setError("File size exceeds 50MB limit");
      return false;
    }
    return true;
  };

  const handleFile = (file) => {
    setError("");
    if (!validateFile(file)) {
      setUploadedFile(null);
      return;
    }
    setUploadedFile(file);
    setUploadStatus("ready");
    setUploadProgress(0);
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!uploadedFile) return;

    setIsUploading(true);
    setUploadStatus("uploading");
    setError("");

    const formData = new FormData();
    formData.append("file", uploadedFile);
    formData.append("description", metadata.description);
    formData.append("tags", metadata.tags);
    formData.append("isPublic", metadata.isPublic.toString());

    try {
      const response = await api.post("/uploads/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          setUploadProgress(progress);
        },
      });

      if (response.data.success) {
        setUploadStatus("processing");
        setUploadHistory([
          {
            id: response.data.data.id,
            name: response.data.data.fileName,
            size: response.data.data.size,
            date: new Date().toISOString(),
            status: "Complete",
          },
          ...uploadHistory,
        ]);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.response?.data?.message || "Failed to upload file");
      setUploadStatus("error");
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setUploadStatus("");
    setUploadProgress(0);
    setIsUploading(false);
    setError("");
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div style={styles.container}>
      <Sidebar />

      <div style={styles.mainContent}>
        <div style={styles.topBar}>
          <h1 style={styles.pageTitle}>Upload Deployment</h1>
        </div>

        {error && <div style={styles.errorAlert}>{error}</div>}

        <div style={styles.uploadCard}>
          <div
            style={{
              ...styles.dropZone,
              borderColor: isDragging ? "#1a1a1a" : "#e5e5e5",
              backgroundColor: isDragging ? "#f8f8f8" : "#fafafa",
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById("fileInput").click()}
          >
            {!uploadedFile ? (
              <div style={styles.dropContent}>
                <div style={styles.uploadIcon}>📁</div>
                <h3 style={styles.dropTitle}>Drop your ZIP file here</h3>
                <p style={styles.dropSubtitle}>or click to browse</p>
                <div style={styles.fileTypes}>
                  <span style={styles.fileTypeBadge}>.zip</span>
                  <span style={styles.fileTypeBadge}>50MB max</span>
                </div>
              </div>
            ) : (
              <div style={styles.fileInfo}>
                <div style={styles.fileIcon}>📦</div>
                <div style={styles.fileDetails}>
                  <div style={styles.fileName}>{uploadedFile.name}</div>
                  <div style={styles.fileSize}>
                    {formatFileSize(uploadedFile.size)}
                  </div>
                </div>
                {!isUploading && uploadStatus !== "processing" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile();
                    }}
                    style={styles.removeButton}
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
            <input
              id="fileInput"
              type="file"
              accept=".zip,application/zip"
              onChange={handleFileSelect}
              style={styles.hiddenInput}
            />
          </div>

          {uploadedFile &&
            uploadStatus !== "processing" &&
            uploadStatus !== "completed" && (
              <div style={styles.metadataSection}>
                <textarea
                  placeholder="Add a description (optional)"
                  value={metadata.description}
                  onChange={(e) =>
                    setMetadata({ ...metadata, description: e.target.value })
                  }
                  style={styles.metadataInput}
                  rows="3"
                />
              </div>
            )}

          {uploadStatus === "uploading" && (
            <div style={styles.progressContainer}>
              <div style={styles.progressBar}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${uploadProgress}%`,
                  }}
                />
              </div>
              <div style={styles.progressText}>
                {Math.round(uploadProgress)}%
              </div>
            </div>
          )}

          {uploadStatus &&
            uploadStatus !== "uploading" &&
            uploadStatus !== "completed" &&
            uploadStatus !== "ready" && (
              <div
                style={{
                  ...styles.statusMessage,
                  backgroundColor:
                    uploadStatus === "processing" ? "#fff8f0" : "#fef2f2",
                  borderColor:
                    uploadStatus === "processing" ? "#f0e6d3" : "#fecaca",
                  color: uploadStatus === "processing" ? "#8a7a3a" : "#991b1b",
                }}
              >
                <span style={styles.statusIcon}>
                  {uploadStatus === "processing" ? "⏳" : "❌"}
                </span>
                <span>
                  {uploadStatus === "processing" &&
                    `Deploying ${uploadedFile?.name}...`}
                  {uploadStatus === "error" &&
                    "Upload failed. Please try again."}
                </span>
              </div>
            )}

          {uploadStatus === "completed" && (
            <div style={styles.successMessage}>
              <span>✅</span>
              <span>Deployment complete</span>
            </div>
          )}

          {uploadedFile &&
            uploadStatus !== "processing" &&
            uploadedFile &&
            uploadStatus !== "completed" &&
            !isUploading && (
              <button onClick={handleUpload} style={styles.uploadButton}>
                Upload
              </button>
            )}
        </div>

        {uploadHistory.length > 0 && (
          <div style={styles.historyCard}>
            <h3 style={styles.historyTitle}>Logs</h3>
            <div style={styles.logList}>
              {updateLogs.map((log, index) => (
                <div key={index} style={styles.logItem}>
                  {log.split("\n").join(" ")}
                </div>
              ))}
            </div>
          </div>
        )}

        {uploadStatus === "completed" && (
          <button
            onClick={() => navigate(`/upload/${latestUploadId}`)}
            style={styles.viewButton}
          >
            View deployment
          </button>
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
    marginLeft: "220px",
    flex: 1,
    padding: "32px 40px",
    minHeight: "100vh",
  },
  topBar: {
    marginBottom: "28px",
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
  errorAlert: {
    padding: "10px 16px",
    backgroundColor: "#fef2f2",
    color: "#991b1b",
    borderRadius: "6px",
    fontSize: "14px",
    marginBottom: "20px",
    border: "1px solid #fecaca",
  },
  uploadCard: {
    backgroundColor: "#ffffff",
    padding: "24px",
    borderRadius: "8px",
    border: "1px solid #eaeaea",
    marginBottom: "20px",
  },
  dropZone: {
    border: `2px dashed #e5e5e5`,
    borderRadius: "8px",
    padding: "48px 20px",
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.15s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  dropContent: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    zIndex: 1,
  },
  uploadIcon: {
    fontSize: "48px",
    marginBottom: "4px",
  },
  dropTitle: {
    fontSize: "16px",
    fontWeight: "500",
    color: "#1a1a1a",
    margin: 0,
  },
  dropSubtitle: {
    fontSize: "14px",
    color: "#888888",
    margin: 0,
  },
  fileTypes: {
    display: "flex",
    gap: "8px",
    marginTop: "8px",
  },
  fileTypeBadge: {
    fontSize: "11px",
    backgroundColor: "#f5f5f5",
    color: "#666666",
    padding: "2px 12px",
    borderRadius: "12px",
    fontWeight: "500",
  },
  fileInfo: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    width: "100%",
    padding: "12px 16px",
    backgroundColor: "#f8f8f8",
    borderRadius: "6px",
    border: "1px solid #eaeaea",
  },
  fileIcon: { fontSize: "32px" },
  fileDetails: { flex: 1, textAlign: "left" },
  fileName: { fontSize: "14px", fontWeight: "500", color: "#1a1a1a" },
  fileSize: { fontSize: "12px", color: "#888888", marginTop: "2px" },
  removeButton: {
    backgroundColor: "#fef2f2",
    color: "#991b1b",
    border: "none",
    borderRadius: "50%",
    width: "28px",
    height: "28px",
    fontSize: "14px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.15s ease",
  },
  hiddenInput: { display: "none" },
  metadataSection: {
    marginTop: "16px",
    padding: "12px 0",
  },
  metadataInput: {
    width: "100%",
    outline: "none",
    resize: "vertical",
    padding: "10px 14px",
    boxSizing: "border-box",
    minHeight: "60px",
    border: "1px solid #e5e5e5",
    borderRadius: "6px",
    fontSize: "14px",
    fontFamily: "inherit",
    backgroundColor: "#fafafa",
    transition: "border-color 0.15s ease",
  },
  progressContainer: { marginTop: "16px" },
  progressBar: {
    width: "100%",
    height: "4px",
    backgroundColor: "#eaeaea",
    borderRadius: "2px",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#1a1a1a",
    transition: "width 0.3s ease",
    borderRadius: "2px",
  },
  progressText: {
    textAlign: "center",
    fontSize: "13px",
    color: "#888888",
    marginTop: "6px",
  },
  statusMessage: {
    padding: "10px 16px",
    borderRadius: "6px",
    fontSize: "14px",
    border: "1px solid",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginTop: "16px",
  },
  statusIcon: { fontSize: "18px" },
  successMessage: {
    padding: "10px 16px",
    backgroundColor: "#f0fdf0",
    color: "#166534",
    borderRadius: "6px",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginTop: "16px",
    border: "1px solid #bbf7d0",
  },
  uploadButton: {
    width: "100%",
    padding: "10px",
    backgroundColor: "#1a1a1a",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
    marginTop: "16px",
  },
  historyCard: {
    backgroundColor: "#ffffff",
    padding: "20px 24px",
    borderRadius: "8px",
    border: "1px solid #eaeaea",
  },
  historyTitle: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#1a1a1a",
    margin: "0 0 12px 0",
  },
  logList: {
    maxHeight: "200px",
    overflowY: "auto",
  },
  logItem: {
    fontSize: "13px",
    color: "#666666",
    padding: "6px 0",
    borderBottom: "1px solid #f5f5f5",
    lineHeight: "1.5",
  },
  viewButton: {
    width: "100%",
    padding: "10px",
    backgroundColor: "#1a1a1a",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
    marginTop: "16px",
  },
};

// Inject styles
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  .dropZone:hover { 
    border-color: #1a1a1a !important; 
    background: #f8f8f8 !important; 
  }
  
  .uploadButton:hover { 
    background-color: #333333 !important; 
  }
  
  .viewButton:hover { 
    background-color: #333333 !important; 
  }
  
  .removeButton:hover { 
    background-color: #fecaca !important; 
  }
  
  .metadataInput:focus { 
    border-color: #1a1a1a !important; 
    background-color: #ffffff !important;
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

export default Upload;
