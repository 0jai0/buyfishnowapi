const express = require('express');
const AssignedOrder = require('../../models/AssignedOrders'); // Import the model

const router = express.Router();

/**
 * Controller Functions
 */

// Admin: Assign a new order to a delivery boy
const assignOrder = async (req, res) => {
  try {
    const { deliveryUserId, orders } = req.body;

    if (!deliveryUserId || !orders || !Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({ message: 'deliveryUserId and valid orders are required' });
    }

    // Find if an assigned order record already exists for the user
    let assignedOrder = await AssignedOrder.findOne({ userId: deliveryUserId });

    // If not, create a new assigned order record
    if (!assignedOrder) {
      assignedOrder = new AssignedOrder({ userId: deliveryUserId, orders: [] });
    }

    // Iterate through the orders array and add them
    orders.forEach((order) => {
      if (order.orderId) {
        assignedOrder.orders.push({
          orderId: order.orderId,
          status: order.status || 'Assigned',
          assignedAt: new Date()
        });
      }
    });

    // Save the updated or newly created assigned order
    await assignedOrder.save();

    res.status(201).json({ message: 'Orders assigned successfully', data: assignedOrder });
  } catch (error) {
    res.status(500).json({ message: 'Error assigning orders', error: error.message });
  }
};



// Delivery Boy: Update the status of an order
const updateOrderStatus = async (req, res) => {
  try {
    const { userId, orderId, status } = req.body;

    if (!userId || !orderId || !status) {
      return res.status(400).json({ message: 'userId, orderId, and status are required' });
    }

    const allowedStatuses = ['Assigned', 'Picked Up', 'In Transit', 'Delivered', 'Cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const assignedOrder = await AssignedOrder.findOne({ userId });

    if (!assignedOrder) {
      return res.status(404).json({ message: 'Assigned order not found for this user' });
    }

    const order = assignedOrder.orders.find(order => order.orderId.toString() === orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found in assigned orders' });
    }

    order.status = status;
    if (status === 'Delivered') {
      order.deliveredAt = Date.now();
    }

    await assignedOrder.save();

    res.status(200).json({ message: 'Order status updated successfully', data: assignedOrder });
  } catch (error) {
    res.status(500).json({ message: 'Error updating order status', error: error.message });
  }
};

// Delivery Boy/Admin: Get assigned orders for a user
const getAssignedOrders = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const assignedOrder = await AssignedOrder.findOne({ userId }).populate('orders.orderId');

    if (!assignedOrder) {
      return res.status(404).json({ message: 'No assigned orders found for this user' });
    }

    res.status(200).json({ message: 'Assigned orders fetched successfully', data: assignedOrder });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching assigned orders', error: error.message });
  }
};

// Admin: Delete an assigned order for a user
const deleteAssignedOrder = async (req, res) => {
  try {
    const { userId, orderId } = req.body;

    if (!userId || !orderId) {
      return res.status(400).json({ message: 'userId and orderId are required' });
    }

    const assignedOrder = await AssignedOrder.findOne({ userId });

    if (!assignedOrder) {
      return res.status(404).json({ message: 'No assigned orders found for this user' });
    }

    assignedOrder.orders = assignedOrder.orders.filter(order => order.orderId.toString() !== orderId);

    await assignedOrder.save();

    res.status(200).json({ message: 'Assigned order deleted successfully', data: assignedOrder });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting assigned order', error: error.message });
  }
};


module.exports = {
    getAssignedOrders,
    assignOrder,
    deleteAssignedOrder,
    updateOrderStatus,
  };
/**
 * Routes
 */

