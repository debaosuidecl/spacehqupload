import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { login, error, setError } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(formData);

    if (result.success) {
      navigate("/otp");
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo}>◆</div>
          <h1 style={styles.title}>Sign in</h1>
          <p style={styles.subtitle}>Enter your credentials to continue</p>
        </div>

        {error && <div style={styles.errorAlert}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              style={styles.input}
              placeholder="you@example.com"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              style={styles.input}
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
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
    backgroundColor: "#fafafa",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: "20px",
  },
  card: {
    backgroundColor: "#ffffff",
    padding: "48px 40px",
    borderRadius: "16px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    width: "100%",
    maxWidth: "380px",
    border: "1px solid #eaeaea",
  },
  header: {
    textAlign: "center",
    marginBottom: "32px",
  },
  logo: {
    fontSize: "24px",
    color: "#1a1a1a",
    marginBottom: "16px",
    display: "block",
    fontWeight: "300",
  },
  title: {
    fontSize: "22px",
    fontWeight: "600",
    color: "#1a1a1a",
    margin: "0 0 6px 0",
    letterSpacing: "-0.3px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#888888",
    margin: 0,
  },
  errorAlert: {
    backgroundColor: "#fef2f2",
    color: "#991b1b",
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "13px",
    marginBottom: "24px",
    border: "1px solid #fecaca",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  label: {
    fontSize: "13px",
    fontWeight: "500",
    color: "#333333",
  },
  input: {
    padding: "10px 14px",
    border: "1.5px solid #e5e5e5",
    borderRadius: "8px",
    fontSize: "14px",
    transition: "border-color 0.15s ease",
    outline: "none",
    backgroundColor: "#fafafa",
    color: "#1a1a1a",
  },
  button: {
    padding: "11px",
    backgroundColor: "#1a1a1a",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    transition: "all 0.15s ease",
    marginTop: "4px",
    cursor: "pointer",
  },
};

// Add global input focus styles
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  input:focus {
    border-color: #1a1a1a !important;
    background-color: white !important;
    box-shadow: none !important;
  }
  
  button:hover:not(:disabled) {
    background-color: #333333 !important;
    transform: none !important;
    box-shadow: none !important;
  }
`;
document.head.appendChild(styleSheet);

export default Login;
