import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/api";

const Profile = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
    setMessage("");
  };

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
    setError("");
    setMessage("");
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const result = await authService.updateDetails(formData);
      updateUser(result.user);
      setMessage("Profile updated successfully!");
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
    }
    setLoading(false);
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await authService.updatePassword(passwordData);
      setMessage("Password updated successfully!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update password");
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Profile</h2>

        {message && <div style={styles.successAlert}>{message}</div>}
        {error && <div style={styles.errorAlert}>{error}</div>}

        {/* Profile Information */}
        <div style={styles.section}>
          <h3>Personal Information</h3>
          {isEditing ? (
            <form onSubmit={handleUpdateProfile} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  style={styles.input}
                />
              </div>
              <div style={styles.buttonGroup}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ ...styles.button, backgroundColor: "#28a745" }}
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      name: user?.name || "",
                      email: user?.email || "",
                    });
                  }}
                  style={{ ...styles.button, backgroundColor: "#6c757d" }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div style={styles.infoDisplay}>
              <p>
                <strong>Name:</strong> {user?.name}
              </p>
              <p>
                <strong>Email:</strong> {user?.email}
              </p>
              <p>
                <strong>Role:</strong> {user?.role}
              </p>
              <button
                onClick={() => setIsEditing(true)}
                style={{ ...styles.button, backgroundColor: "#17a2b8" }}
              >
                Edit Profile
              </button>
            </div>
          )}
        </div>

        {/* Change Password */}
        <div style={styles.section}>
          <h3>Change Password</h3>
          <form onSubmit={handleUpdatePassword} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Current Password</label>
              <input
                type="password"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                required
                style={styles.input}
                placeholder="Enter current password"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>New Password</label>
              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                required
                style={styles.input}
                placeholder="Enter new password (min 6 characters)"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{ ...styles.button, backgroundColor: "#007bff" }}
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>

        <button
          onClick={() => navigate("/dashboard")}
          style={{
            ...styles.button,
            backgroundColor: "#6c757d",
            marginTop: "1rem",
          }}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    backgroundColor: "#f5f5f5",
  },
  card: {
    backgroundColor: "white",
    padding: "2rem",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    width: "100%",
    maxWidth: "600px",
  },
  title: {
    textAlign: "center",
    marginBottom: "2rem",
    color: "#333",
  },
  section: {
    marginBottom: "2rem",
    padding: "1rem",
    border: "1px solid #eee",
    borderRadius: "4px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
  },
  label: {
    marginBottom: "0.5rem",
    fontWeight: "500",
    color: "#555",
  },
  input: {
    padding: "0.75rem",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "1rem",
  },
  button: {
    padding: "0.75rem 1.5rem",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "1rem",
    cursor: "pointer",
    transition: "background-color 0.3s",
  },
  buttonGroup: {
    display: "flex",
    gap: "1rem",
  },
  infoDisplay: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  errorAlert: {
    backgroundColor: "#f8d7da",
    color: "#721c24",
    padding: "0.75rem",
    borderRadius: "4px",
    marginBottom: "1rem",
  },
  successAlert: {
    backgroundColor: "#d4edda",
    color: "#155724",
    padding: "0.75rem",
    borderRadius: "4px",
    marginBottom: "1rem",
  },
};

export default Profile;
