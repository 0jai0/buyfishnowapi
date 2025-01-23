const express = require("express");

const {
    sendMessage, getMessages
} = require("../../controllers/shop/message-controller");

router.post('/send', sendMessage);

// Route to get all messages
router.get('/', getMessages);

module.exports = router;