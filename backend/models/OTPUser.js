const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const OTPSHEA = new mongoose.Schema(
  {
    code: {
      type: String,
    },
    expiresAt: {
      type: Date,
    },
    user_id: {
      type: String,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("OTPJENNI", OTPSHEA);
