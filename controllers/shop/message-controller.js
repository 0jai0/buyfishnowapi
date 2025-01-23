const Message = require("../../models/Message");

const sendMessage = async (req, res) => {
    try {
      const { message, link } = req.body;
      
      // Validate the input
      if (!message || !link) {
        return res.status(400).json({ error: 'Message and link are required.' });
      }
  
      // Create and save the message
      const newMessage = new Message({ message, link });
      await newMessage.save();
  
      res.status(201).json({ success: true, message: newMessage });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error.' });
    }
  };
  
  // Controller to get all messages
  const getMessages = async (req, res) => {
    try {
      const messages = await Message.find();
      res.status(200).json(messages);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error.' });
    }
  };
  
  module.exports = {
    sendMessage,
    getMessages,
  };