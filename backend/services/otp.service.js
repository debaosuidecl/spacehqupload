const axios = require("axios");
const User = require("../models/User");
const OTPUser = require("../models/OTPUser");

const dotenv = require("dotenv");

dotenv.config();

class OTPService {
  constructor() {
    this.apiUrl = "https://api.emailjs.com/api/v1.0/email/send";
    this.serviceId = process.env.EMAILJS_SERVICE_ID;
    this.otpTemplateId = process.env.EMAILJS_OTP_TEMPLATE_ID;
    this.publicKey = process.env.EMAILJS_PUBLIC_KEY;
    this.privateKey = process.env.EMAILJS_PRIVATE_KEY;
  }

  /**
   * Send OTP for sign-in authentication
   * Uses template_760isgj
   */

  generateOTP() {
    // Generate a random number between 100000 and 999999
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate expiry time 15 minutes from now
   * @param {number} minutes - Minutes to add (default: 15)
   * @returns {Date} Expiry date object
   */
  generateExpiryTime(minutes = 15) {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + minutes);
    return expiry;
  }

  async sendOTP(toEmail, user_id) {
    console.log({ toEmail, user_id });
    try {
      // Calculate expiry time (15 minutes from now)
      const passcode = this.generateOTP();
      const expiryTime = new Date();
      expiryTime.setMinutes(expiryTime.getMinutes() + 15);

      // Format time for the template (e.g., "3:45 PM")
      const formattedTime = expiryTime.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      const payload = {
        service_id: this.serviceId,
        template_id: this.otpTemplateId,
        user_id: this.publicKey,
        accessToken: this.privateKey,
        template_params: {
          passcode: passcode,
          time: formattedTime,
          email: toEmail,
        },
      };

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log({
        response,
        emailjsresponse: "yes",
      });

      this.saveOTPTODB(passcode, user_id, expiryTime);
      return {
        success: true,
        status: response.status,
        data: response.data,
      };
    } catch (error) {
      console.error(
        "EmailJS API Error:",
        error.response?.data || error.message,
      );

      return {
        success: false,
        error: error.response?.data || error.message || "Failed to send OTP",
      };
    }
  }

  async saveOTPTODB(passcode, user_id, expiryTime) {
    const newotp = await new OTPUser({
      user_id,
      expiresAt: expiryTime,
      code: passcode,
    }).save();
    console.log({
      newotp,
    });

    return newotp;
  }

  async verifyOTP(code, user_id) {
    console.log({
      code,
      user_id,
      user_id_string: user_id.toString(),
    });
    const foundOTP = await OTPUser.findOne({
      isUsed: false,
      code: code,
      user_id: user_id.toString(),
    }).sort("-createdAt");

    if (!foundOTP) {
      return {
        success: false,
        message: "OTP is invalid or expired",
      };
    }

    console.log({
      foundOTP,
    });

    const now = new Date();

    if (now > foundOTP.expiresAt) {
      console.log("expired here", foundOTP);
      return {
        success: false,
        message: "OTP is expired. Please generate another",
      };
    }

    const updatedOTPResult = await OTPUser.findOneAndUpdate(
      {
        _id: foundOTP._id,
      },
      {
        isUsed: true,
      },
    );

    console.log("success", updatedOTPResult);
    return {
      success: true,
      message: "Successfully validated OTP",
      data: updatedOTPResult,
    };
  }
}

module.exports = new OTPService();
