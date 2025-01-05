const axios = require("axios");
const crypto = require("crypto");
const Order = require("../../models/Order");
const Cart = require("../../models/Cart");
const Product = require("../../models/Product");
const { Buffer } = require("buffer");

// Constants
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
const createOrder = async (req, res) => {
  try {
    const {
      userId,
      cartItems,
      addressInfo,
      orderStatus,
      paymentMethod,
      totalAmount,
      orderDate,
      orderUpdateDate,
      cartId,
    } = req.body;

    // Step 1: Save the order in the database
    const newOrder = new Order({
      userId,
      cartId,
      cartItems,
      addressInfo,
      orderStatus,
      paymentMethod,
      paymentStatus: "pending",
      totalAmount,
      orderDate,
      orderUpdateDate,
    });

    await newOrder.save();

    // Use the database-generated _id as the paymentId
    const orderId = newOrder._id.toString();
    newOrder.paymentId = orderId;
    await newOrder.save();

    // Step 2: Prepare the payment payload for PhonePe
    const transactionBody = {
      merchantId: MERCHANT_ID,
      merchantUserId: userId,
      amount: totalAmount * 100, // Convert to paise
      merchantTransactionId: orderId, // Unique transaction ID
      redirectUrl: `${REDIRECT_URL}/?id=${orderId}`,
      redirectMode: "POST",
      paymentInstrument: {
        type: "PAY_PAGE",
      },
    };

    const payloadBase64 = Buffer.from(JSON.stringify(transactionBody)).toString("base64");
    const keyIndex = 1;
    const checksumString = payloadBase64 + "/pg/v1/pay" + MERCHANT_KEY;
    const checksumHash = crypto.createHash("sha256").update(checksumString).digest("hex");
    const checksum = `${checksumHash}###${keyIndex}`;

    // Step 3: Make a request to PhonePe's API
    const options = {
      method: "POST",
      url: MERCHANT_BASE_URL,
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        "X-VERIFY": checksum, // Add checksum in headers
      },
      data: { request: payloadBase64 },
    };

    const response = await axios.request(options);

    if (response.data.success) {
      const redirectUrl = response.data.data.instrumentResponse.redirectInfo.url;

      res.status(201).json({
        success: true,
        approvalURL: redirectUrl, // URL to redirect for payment
        transactionBody, // Include transactionBody in response
        checksum, // Include checksum in response
        orderId, // Include orderId for reference
      });
    } else {
      throw new Error(response.data.message || "Failed to initiate payment");
    }
  } catch (error) {
    console.error("Error in createOrder:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error while creating order",
    });
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

    // Step 1: Prepare checksum for status check
    const merchantTransactionId = order.paymentId;
    const keyIndex = 1;
    const checksumString =
      `/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}` + MERCHANT_KEY;
    const checksumHash = crypto.createHash("sha256").update(checksumString).digest("hex");
    const checksum = `${checksumHash}###${keyIndex}`;

    // Step 2: Make a request to check payment status
    const options = {
      method: "GET",
      url: `${MERCHANT_STATUS_URL}/${MERCHANT_ID}/${merchantTransactionId}`,
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        "X-VERIFY": checksum, // Add checksum in headers
        "X-MERCHANT-ID": MERCHANT_ID, // Merchant ID header
      },
    };

    const response = await axios.request(options);

    if (response.data.success) {
      // Update the order status and stock on successful payment
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

        product.totalStock -= item.quantity; // Deduct stock
        await product.save();
      }

      await Cart.findByIdAndDelete(order.cartId); // Clear the cart after successful purchase
      await order.save();

      res.redirect(`${SUCCESS_URL}/?id=${orderId}`); // Redirect to success page
    } else {
      res.redirect(`${FAILURE_URL}/?id=${orderId}`); // Redirect to failure page
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
};
