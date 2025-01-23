const express = require("express");

const {
    sendMessage, getMessages
} = require("../../controllers/shop/message-controller");

const router = express.Router();
router.post('/send', sendMessage);

// Route to get all messages
router.get('/get', getMessages);

module.exports = router;