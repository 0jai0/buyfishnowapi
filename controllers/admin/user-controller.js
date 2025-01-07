const User = require('../../models/User'); // Assuming you have a User model
const asyncHandler = require('express-async-handler'); // For error handling

// Get all users (for admin)
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find(); // Fetch all users from the database
  res.status(200).json(users); // Return the list of users
});

const getUserById = async (req, res) => {
  const { userId } = req.params;

  try {
    // Fetch user details from database using userId
    const user = await User.findById(userId);

    // If user not found, send 404 response
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Send user details as response
    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
module.exports = { getAllUsers,getUserById };
