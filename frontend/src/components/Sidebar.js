import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { path: "/dashboard", label: "Dashboard" },
    { path: "/uploads", label: "Uploads" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div style={styles.sidebar}>
      <div style={styles.logo}>Spacehqupload_</div>

      <div style={styles.nav}>
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              ...styles.navItem,
              ...(isActive(item.path) ? styles.navItemActive : {}),
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div style={styles.footer}>
        <div style={styles.user}>
          <div style={styles.avatar}>
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div>
            <div style={styles.name}>{user?.name}</div>
            <div style={styles.role}>{user?.role || "User"}</div>
          </div>
        </div>
        <button onClick={handleLogout} style={styles.logout}>
          Sign out
        </button>
      </div>
    </div>
  );
};

const styles = {
  sidebar: {
    width: "160px",
    backgroundColor: "#ffffff",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    padding: "20px 14px",
    position: "fixed",
    height: "100vh",
    left: 0,
    top: 0,
    borderRight: "1px solid #eaeaea",
    zIndex: 100,
  },
  logo: {
    fontSize: "15px",
    fontWeight: "600",
    fontFamily: "monospace",
    color: "#1a1a1a",
    padding: "0 6px 14px 6px",
    borderBottom: "1px solid #eaeaea",
    marginBottom: "14px",
  },
  nav: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  navItem: {
    padding: "6px 10px",
    borderRadius: "4px",
    background: "transparent",
    border: "none",
    color: "#888888",
    fontSize: "13px",
    cursor: "pointer",
    width: "100%",
    textAlign: "left",
    transition: "all 0.15s ease",
  },
  navItemActive: {
    backgroundColor: "#f5f5f5",
    color: "#1a1a1a",
    fontWeight: "500",
  },
  footer: {
    paddingTop: "14px",
    borderTop: "1px solid #eaeaea",
  },
  user: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 6px 10px 6px",
  },
  avatar: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    backgroundColor: "#1a1a1a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "600",
    color: "#ffffff",
    flexShrink: 0,
  },
  name: {
    fontSize: "12px",
    fontWeight: "500",
    color: "#1a1a1a",
    lineHeight: "1.3",
  },
  role: {
    fontSize: "10px",
    color: "#888888",
    lineHeight: "1.3",
  },
  logout: {
    width: "100%",
    padding: "6px 10px",
    background: "transparent",
    border: "none",
    color: "#888888",
    fontSize: "12px",
    cursor: "pointer",
    textAlign: "left",
    borderRadius: "4px",
    transition: "all 0.15s ease",
  },
};

const styleSheet = document.createElement("style");
styleSheet.textContent = `
  .navItem:hover { 
    background: #f5f5f5; 
    color: #1a1a1a; 
  }
  
  .logout:hover { 
    background: #fef2f2; 
    color: #dc2626; 
  }
`;
document.head.appendChild(styleSheet);

export default Sidebar;
