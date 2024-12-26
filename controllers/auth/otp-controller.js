require("dotenv").config();
const nodemailer = require("nodemailer");
const { setOtp, verifyOtp, deleteOtp } = require("./otpStore");

// Setup Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Generate a random 6-digit OTP
const generateOtp = () => Math.floor(100000 + Math.random() * 900000);

// Controller for sending OTP
exports.sendOtp = async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: "Email is required" });

  const otp = generateOtp();

  try {
    // Save OTP in MongoDB
    await setOtp(email, otp);

    // Send OTP via email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP is ${otp}. It will expire in 5 minutes.`,
    });

    return res.status(200).json({success: true,  message: "OTP sent successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to send OTP" });
  }
};

// Controller for verifying OTP
exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required" });
  }

  try {
    const isValid = await verifyOtp(email, otp);

    if (isValid) {
      await deleteOtp(email); // Delete OTP after successful verification
      return res.status(200).json({success: true, message: "OTP verified successfully" });
    } else {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to verify OTP" });
  }
};
