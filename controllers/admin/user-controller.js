const User = require('../../models/User'); // Assuming you have a User model
const asyncHandler = require('express-async-handler'); // For error handling

// Get all users (for admin)
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find(); // Fetch all users from the database
  res.status(200).json(users); // Return the list of users
});

module.exports = { getAllUsers };
