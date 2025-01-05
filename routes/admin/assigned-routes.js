const express = require('express');
const router = express.Router();
const {
    assignOrder,
    deleteAssignedOrder,
    updateOrderStatus,
    getAssignedOrders,
  } = require("../../controllers/admin/assigned-controller");
  


router.post('/assign-order', assignOrder); // Assign a new order
router.delete('/delete-assigned-order', deleteAssignedOrder); // Delete an assigned order

// Delivery Boy Routes
router.put('/update-order-status', updateOrderStatus); // Update order status
router.get('/assigned-orders/:userId', getAssignedOrders); // Get assigned orders for a user

module.exports = router;