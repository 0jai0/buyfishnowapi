const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});

const OtpModel = mongoose.model("Otp", otpSchema); // Correct model creation

module.exports = OtpModel; // Export the model properly
