import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const OTPVerification = () => {
  const navigate = useNavigate();
  const { user, verifyOTP, resendOTP, error, setError } = useAuth();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [canResend, setCanResend] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRefs = useRef([]);

  // Get user email from context or localStorage
  const userEmail =
    user?.email || JSON.parse(localStorage.getItem("user"))?.email || "";

  useEffect(() => {
    // Start countdown timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }

    return () => clearInterval(timer);
  }, []);

  const handleChange = (index, value) => {
    // Only allow numbers
    if (value && !/^[0-9]$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError(null);

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setFocusedIndex(index - 1);
    }

    // Handle paste
    if (e.key === "v" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then((text) => {
        const digits = text.replace(/\D/g, "").slice(0, 6);
        if (digits.length > 0) {
          const newOtp = [...otp];
          digits.split("").forEach((digit, i) => {
            if (i < 6) newOtp[i] = digit;
          });
          setOtp(newOtp);
          // Focus the next empty input or the last one
          const nextIndex = Math.min(digits.length, 5);
          inputRefs.current[nextIndex]?.focus();
          setFocusedIndex(nextIndex);
        }
      });
    }

    // Handle arrow keys
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setFocusedIndex(index - 1);
    }
    if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    }
  };

  const handleFocus = (index) => {
    setFocusedIndex(index);
  };

  const handleSubmit = async (e) => {
    console.log("poop");
    e.preventDefault();
    const otpCode = otp.join("");

    if (otpCode.length !== 6) {
      console.log("wrong length");
      setError("Please enter all 6 digits");
      return;
    }

    console.log("hit here");
    setLoading(true);
    setError(null);

    try {
      console.log("hit here");

      const result = await verifyOTP(otpCode);
      console.log("hit 118");

      console.log({ result });

      if (result.success) {
        navigate("/dashboard");
      }
    } catch (err) {
      console.log("error", err);
      // Error handled by context
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setError(null);

    try {
      const result = await resendOTP();
      if (result.success) {
        setTimeLeft(300);
        setCanResend(false);
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        setFocusedIndex(0);
        // Show success message
        setError(null);
      }
    } catch (err) {
      // Error handled by context
    } finally {
      setResendLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  // Check if OTP is complete
  const isComplete = otp.every((digit) => digit !== "");

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Verification code</h1>
          <p style={styles.subtitle}>
            Enter the 6-digit code sent to
            <br />
            <span style={styles.email}>
              {localStorage.getItem("email_temp") || ""}
            </span>
          </p>
        </div>

        {/* Error Message */}
        {error && <div style={styles.errorAlert}>{error}</div>}

        {/* OTP Input */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onFocus={() => handleFocus(index)}
                style={{
                  ...styles.otpInput,
                  ...(digit && styles.otpInputFilled),
                  ...(focusedIndex === index && styles.otpInputFocused),
                  ...(error && styles.otpInputError),
                }}
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]"
                disabled={loading}
              />
            ))}
          </div>

          {/* Timer */}
          <div style={styles.timerContainer}>
            <span style={styles.timerText}>
              {timeLeft > 0 ? (
                <>
                  Code expires in <strong>{formatTime(timeLeft)}</strong>
                </>
              ) : (
                "Code has expired"
              )}
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isComplete || loading}
            style={{
              ...styles.submitButton,
              opacity: !isComplete || loading ? 0.5 : 1,
              cursor: !isComplete || loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Verifying..." : "Verify & sign in"}
          </button>

          {/* Resend */}
          <div style={styles.resendContainer}>
            <span style={styles.resendText}>Didn't receive the code?</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={!canResend || resendLoading}
              style={{
                ...styles.resendButton,
                opacity: !canResend || resendLoading ? 0.4 : 1,
                cursor: !canResend || resendLoading ? "not-allowed" : "pointer",
              }}
            >
              {resendLoading ? "Sending..." : "Resend code"}
            </button>
          </div>

          {/* Back to Login */}
          <button
            type="button"
            onClick={() => navigate("/login")}
            style={styles.backButton}
          >
            ← Back to login
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
    maxWidth: "400px",
    border: "1px solid #eaeaea",
  },
  header: {
    textAlign: "center",
    marginBottom: "32px",
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
    lineHeight: "1.6",
  },
  email: {
    color: "#1a1a1a",
    fontWeight: "500",
    marginTop: "4px",
    display: "inline-block",
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
    gap: "20px",
  },
  otpContainer: {
    display: "flex",
    gap: "10px",
    justifyContent: "center",
  },
  otpInput: {
    width: "48px",
    height: "56px",
    textAlign: "center",
    fontSize: "24px",
    fontWeight: "600",
    border: "1.5px solid #e5e5e5",
    borderRadius: "8px",
    outline: "none",
    transition: "border-color 0.15s ease",
    backgroundColor: "#fafafa",
    color: "#1a1a1a",
  },
  otpInputFilled: {
    borderColor: "#1a1a1a",
    backgroundColor: "#ffffff",
  },
  otpInputFocused: {
    borderColor: "#1a1a1a",
    backgroundColor: "#ffffff",
    boxShadow: "none",
  },
  otpInputError: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  timerContainer: {
    textAlign: "center",
  },
  timerText: {
    fontSize: "13px",
    color: "#888888",
  },
  submitButton: {
    padding: "12px",
    backgroundColor: "#1a1a1a",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    transition: "background-color 0.15s ease",
    cursor: "pointer",
    marginTop: "4px",
  },
  resendContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    fontSize: "13px",
    color: "#888888",
  },
  resendText: {
    color: "#888888",
  },
  resendButton: {
    background: "none",
    border: "none",
    color: "#1a1a1a",
    fontWeight: "500",
    cursor: "pointer",
    transition: "color 0.15s ease",
    fontSize: "13px",
    padding: "4px 8px",
  },
  backButton: {
    background: "none",
    border: "none",
    color: "#999999",
    fontSize: "13px",
    fontWeight: "400",
    cursor: "pointer",
    transition: "color 0.15s ease",
    padding: "8px",
    width: "fit-content",
    margin: "0 auto",
  },
};

// Add styles
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  input:focus {
    border-color: #1a1a1a !important;
    background-color: #ffffff !important;
    box-shadow: none !important;
  }
  
  button:hover:not(:disabled) {
    background-color: #333333 !important;
  }
  
  .resendButton:hover:not(:disabled) {
    color: #000000 !important;
    background: none !important;
  }
  
  .backButton:hover {
    color: #1a1a1a !important;
    background: none !important;
  }
`;
document.head.appendChild(styleSheet);

export default OTPVerification;
