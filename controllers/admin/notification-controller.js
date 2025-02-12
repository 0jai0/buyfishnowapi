const Token = require("../../models/Token");
const { Expo } = require("expo-server-sdk");

// Store push token
const storeToken = async (req, res) => {
  const { userId, pushToken } = req.body;

  if (!userId || !pushToken) {
    return res.status(400).json({ error: "User ID and Push Token are required" });
  }

  try {
    // Save or update token
    await Token.findOneAndUpdate(
      { userId },
      { pushToken },
      { upsert: true, new: true }
    );
    res.status(200).json({ message: "Token stored successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error storing token" });
  }
};

// Send notifications
const sendNotification = async (req, res) => {
    const { title, body } = req.body;
  
    if (!title || !body) {
      return res.status(400).json({ error: "Title and Body are required" });
    }
  
    try {
      const expo = new Expo();
      const tokens = await Token.find();
  
      // Prepare messages
      const messages = tokens.map(({ pushToken }) => ({
        to: pushToken,
        sound: "default",
        title,
        body,
        data: { withSome: "data" },
      }));
  
      // Send notifications immediately
      const chunks = expo.chunkPushNotifications(messages);
      const tickets = [];
      for (const chunk of chunks) {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      }
  
      res.status(200).json({ message: "Notifications sent successfully", tickets });
    } catch (error) {
      console.error("Error sending notifications:", error);
      res.status(500).json({ error: "Error sending notifications" });
    }
  };
  
  const sendNotificationToUser = async (req, res) => {
    const { userId, title, body } = req.body;
  
    if (!userId || !title || !body) {
      return res.status(400).json({ error: "User ID, Title, and Body are required" });
    }
  
    try {
      const userToken = await Token.findOne({ userId });
  
      if (!userToken) {
        return res.status(404).json({ error: "User not found" });
      }
  
      const expo = new Expo();
  
      const message = {
        to: userToken.pushToken,
        sound: "default",
        title,
        body,
        data: { withSome: "data" },
      };
  
      const ticket = await expo.sendPushNotificationsAsync([message]);
  
      res.status(200).json({ message: "Notification sent successfully", ticket });
    } catch (error) {
      console.error("Error sending notification:", error);
      res.status(500).json({ error: "Error sending notification" });
    }
  };
module.exports = { storeToken, sendNotification,sendNotificationToUser };
