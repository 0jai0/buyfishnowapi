const axios = require("axios");
const crypto = require("crypto");
const Order = require("../../models/Order");
const Cart = require("../../models/Cart");
const Product = require("../../models/Product");
const { Buffer } = require("buffer");
const nodemailer = require("nodemailer");
require("dotenv").config();


// Constants
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
const MERCHANT_KEY = "96434309-7796-489d-8924-ab56988a6076";
const MERCHANT_ID = "PGTESTPAYUAT86";
const MERCHANT_BASE_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay";
const MERCHANT_STATUS_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/status";
const REDIRECT_URL = "https://buyfishnowapi-264166008170.us-central1.run.app/api/shop/order/status";
const SUCCESS_URL = "http://localhost:5173/payment-success";
const FAILURE_URL = "http://localhost:5173/payment-failure";

/**
 * Create a new order and initiate payment through PhonePe
 */

const sendNotification = async (userId, paymentStatus) => {
  try {
    console.log(userId);
    const notificationData = {
      userId: userId,
      title: "New Order Placed",
      body: `New order has been "${paymentStatus}".`,
    };

    const response = await axios.post(
      "https://buyfishnowapi-264166008170.us-central1.run.app/api/admin/notifications/send-notification",
      notificationData
    );

    if (response.data.success) {
      console.log("Notification sent successfully.");
    } else {
      console.warn("Failed to send notification.");
    }
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

const createOrder = async (req, res) => {
  try {
    const {
      userId,
      cartItems,
      addressInfo,
      orderStatus = "confirmed",
      paymentMethod = "COD",
      totalAmount,
      orderDate = new Date(),
      orderUpdateDate = new Date(),
      cartId,
    } = req.body;

    // Generate a random OTP for the order
    const orderOtp = Math.floor(1000 + Math.random() * 9000);

    // Create and save the order
    const newOrder = new Order({
      userId,
      cartId,
      cartItems,
      addressInfo,
      orderStatus,
      paymentMethod,
      paymentStatus: "pending", // Default to pending
      totalAmount,
      orderOtp,
      orderDate,
      orderUpdateDate,
    });

    await newOrder.save();
    // Send email after order creation
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: "mjvkiran@gmail.com",
      subject: "New Order Created",
      text: `A new order has been placed with the following details:
      
      Order ID: ${newOrder._id}
      Total Amount: ${totalAmount}
      
      Address Info: ${JSON.stringify(addressInfo, null, 2)}
      Order Status: ${orderStatus}
      
      Thank you!`,
    };

    await transporter.sendMail(mailOptions);

    await sendNotification("67908590ff95416d976ab420", "Confirmed");

    res.status(201).json({
      success: true,
      message: "Order saved successfully",
      orderId: newOrder._id,
      orderOtp,
    });
  } catch (error) {
    console.error("Error in createOrder:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error while creating order",
    });
  }
};

const addReview = async (req, res) => {
  try {
    const { orderId, review } = req.body;

    // Validate the inputs
    if (!orderId || !review) {
      return res.status(400).json({ message: "Order ID and review are required." });
    }

    // Find the order by ID
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    // Update the review field
    order.review = review;
    order.orderUpdateDate = new Date(); // Update the order update date

    // Save the updated order
    await order.save();

    res.status(200).json({ message: "Review added successfully.", order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred while adding the review.", error: error.message });
  }
};


/**
 * Capture and verify payment status after redirection from PhonePe
 */
const capturePayment = async (req, res) => {
  const { id: orderId } = req.query;

  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const merchantTransactionId = order.paymentId;
    const keyIndex = 1;
    const checksumString =
      `/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}` + MERCHANT_KEY;
    const checksumHash = crypto.createHash("sha256").update(checksumString).digest("hex");
    const checksum = `${checksumHash}###${keyIndex}`;

    const options = {
      method: "GET",
      url: `${MERCHANT_STATUS_URL}/${MERCHANT_ID}/${merchantTransactionId}`,
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        "X-VERIFY": checksum,
        "X-MERCHANT-ID": MERCHANT_ID,
      },
    };

    const response = await axios.request(options);

    if (response.data.success) {
      // Update order status and deduct stock
      order.paymentStatus = "paid";
      order.orderStatus = "confirmed";

      for (let item of order.cartItems) {
        let product = await Product.findById(item.productId);
        if (!product || product.totalStock < item.quantity) {
          return res.status(404).json({
            success: false,
            message: `Not enough stock for product ${item.title}`,
          });
        }
        product.totalStock -= item.quantity;
        await product.save();
      }

      await Cart.findByIdAndDelete(order.cartId); // Clear cart
      await order.save();

      res.status(200).json({ success: true });
    } else {
      res.status(400).json({ success: false, message: "Payment failed" });
    }
  } catch (error) {
    console.error("Error in capturePayment:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error while capturing payment",
    });
  }
};


/**
 * Get all orders by a specific user
 */
const getAllOrdersByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const orders = await Order.find({ userId });

    if (!orders.length) {
      return res.status(404).json({
        success: false,
        message: "No orders found!",
      });
    }

    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error while fetching orders",
    });
  }
};

/**
 * Get details of a specific order by ID
 */
const getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found!",
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || "Error while fetching order details",
    });
  }
};

module.exports = {
  createOrder,
  capturePayment,
  getAllOrdersByUser,
  getOrderDetails,
  addReview,
};
