const express = require("express");
const { storeToken, sendNotification,sendNotificationToUser } = require("../../controllers/admin/notification-controller");
const router = express.Router();

// Route to store push token
router.post("/store-token", storeToken);

// Route to send notifications
router.post("/send", sendNotification);
router.post("/send-notification", sendNotification);

module.exports = router;
