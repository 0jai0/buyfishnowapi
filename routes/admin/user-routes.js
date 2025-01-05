const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const { getAllUsers } = require('../../controllers/admin/user-controller');


  
router.get('/user',  async (req, res, next) => {
  
  next(); // Proceed to the controller
}, getAllUsers); // Call the controller function to return all users

module.exports = router;
