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
  const { title, body, triggerTime } = req.body;

  if (!title || !body || !triggerTime) {
    return res.status(400).json({ error: "Title, Body, and Trigger Time are required" });
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

    // Send notifications
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }

    res.status(200).json({ message: "Notifications sent successfully", tickets });
  } catch (error) {
    res.status(500).json({ error: "Error sending notifications" });
  }
};

module.exports = { storeToken, sendNotification };
