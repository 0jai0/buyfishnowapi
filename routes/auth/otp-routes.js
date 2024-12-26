const express = require("express");
const { sendOtp, verifyOtp } = require("../../controllers/auth/otp-controller");

const router = express.Router();

// Route for sending OTP
router.post("/send-otp", sendOtp);

// Route for verifying OTP
router.post("/verify-otp", verifyOtp);

module.exports = router;
