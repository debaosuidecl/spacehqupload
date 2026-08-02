import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import Profile from "./components/Profile";
import Upload from "./components/Upload";
import Uploads from "./components/Uploads";
import SingleUpload from "./components/SingleUpload";
import OTPVerification from "./components/OTPVerification";

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/otp" element={<OTPVerification />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<PrivateRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/upload/:id" element={<SingleUpload />} />
            <Route path="/uploads" element={<Uploads />} />
          </Route>
          <Route path="/" element={<Login />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
