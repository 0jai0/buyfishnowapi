const mongoose = require('mongoose');

const assignedOrderSchema = new mongoose.Schema({
  userId: String,
  orders: [
    {
      orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order', // Reference to the Order collection
        required: true
      },
      routes: [
        {
          // Each route could have data like polyline or other details depending on the structure of your fetched routes
          startLocation: { type: mongoose.Schema.Types.Mixed },
          endLocation: { type: mongoose.Schema.Types.Mixed },
          polyline: String,  // Assuming polyline data is stored as a string
        }
      ],
      status: {
        type: String,
        enum: ['Assigned', 'Picked Up', 'In Transit', 'Delivered', 'Cancelled'],
        default: 'Assigned'
      },
      assignedAt: {
        type: Date,
        default: Date.now
      },
      deliveredAt: {
        type: Date
      }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware to automatically update the `updatedAt` field
assignedOrderSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const AssignedOrder = mongoose.model('AssignedOrder', assignedOrderSchema);

module.exports = AssignedOrder;
