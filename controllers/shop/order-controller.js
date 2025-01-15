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
    const orderOtp = Math.floor(1000 + Math.random() * 9000);
    const newOrder = new Order({
      userId,
      cartId,
      cartItems,
      addressInfo,
      orderStatus,
      paymentMethod,
      paymentStatus: "pending",
      totalAmount,
      orderOtp,
      orderDate,
      orderUpdateDate,
    });

    await newOrder.save();

    const orderId = newOrder._id.toString();
    newOrder.paymentId = orderId;
    await newOrder.save();

    // Step 2: Prepare transaction body for PhonePe
    const transactionBody = {
      merchantId: MERCHANT_ID,
      merchantUserId: userId,
      amount: totalAmount * 100, // Amount in paise
      merchantTransactionId: orderId,
      redirectMode: "SDK", // Use SDK mode
      paymentInstrument: { type: "PAY_PAGE" },
    };

    const payloadBase64 = Buffer.from(JSON.stringify(transactionBody)).toString("base64");
    const keyIndex = 1;
    const checksumString = payloadBase64 + "/pg/v1/pay" + MERCHANT_KEY;
    const checksumHash = crypto.createHash("sha256").update(checksumString).digest("hex");
    const checksum = `${checksumHash}###${keyIndex}`;

    // Return deeplinkUrl for the PhonePe app
    const deeplinkUrl = `phonepe://upi/pay?payload=${payloadBase64}&checksum=${checksum}`;

    res.status(201).json({
      success: true,
      deeplinkUrl,
      orderId,
    });
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
};
