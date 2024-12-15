const axios = require("axios");
const crypto = require("crypto");
const Order = require("../../models/Order");
const Cart = require("../../models/Cart");
const Product = require("../../models/Product");
const config = require('./config.json');

const MERCHANT_KEY = config.MERCHANT_KEY;
const MERCHANT_ID = config.MERCHANT_ID;

const MERCHANT_BASE_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay";
const MERCHANT_STATUS_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/status";
const REDIRECT_URL = "http://localhost:5000/api/shop/order/status";
const SUCCESS_URL = "http://localhost:5173/payment-success";
const FAILURE_URL = "http://localhost:5173/payment-failure";

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

    // Use the database-generated _id as the paymentId
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

    // Extract the automatically generated _id to use as paymentId
    const orderId = newOrder._id.toString();
    newOrder.paymentId = orderId; // Assign _id to paymentId
    await newOrder.save(); // Save the updated order with the paymentId

    const paymentPayload = {
      merchantId: MERCHANT_ID,
      merchantUserId: userId,
      amount: totalAmount * 100, // Amount in paise
      merchantTransactionId: orderId, // Use the orderId as the transactionId
      redirectUrl: `${REDIRECT_URL}/?id=${orderId}`,
      redirectMode: "POST",
      paymentInstrument: {
        type: "PAY_PAGE",
      },
    };

    const payload = Buffer.from(JSON.stringify(paymentPayload)).toString("base64");
    const keyIndex = 1;
    const string = payload + "/pg/v1/pay" + MERCHANT_KEY;
    const sha256 = crypto.createHash("sha256").update(string).digest("hex");
    const checksum = sha256 + "###" + keyIndex;

    const options = {
      method: "POST",
      url: MERCHANT_BASE_URL,
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        "X-VERIFY": checksum,
      },
      data: { request: payload },
    };

    const response = await axios.request(options);

    const redirectUrl = response.data.data.instrumentResponse.redirectInfo.url;

    res.status(201).json({
      success: true,
      approvalURL: redirectUrl,
      orderId: orderId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error while creating order",
    });
  }
};

const capturePayment = async (req, res) => {
  const { id: orderId } = req.query; 
  console.log(orderId, "dtykt");
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
    const string = `/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}` + MERCHANT_KEY;
    const sha256 = crypto.createHash("sha256").update(string).digest("hex");
    const checksum = sha256 + "###" + keyIndex;

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

    if (response.data.success === true) {
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

        product.totalStock = product.totalStock;
        await product.save();
      }

      await Cart.findByIdAndDelete(order.cartId);
      await order.save();

      // Redirect to success page
      res.redirect(`${SUCCESS_URL}/?id=${orderId}`);
    } else {
      // Redirect to failure page
      res.redirect(`${FAILURE_URL}/?id=${orderId}`);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error while capturing payment",
    });
  }
};



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
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "Some error occured!",
    });
  }
};

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
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "Some error occured!",
    });
  }
};

module.exports = {
  createOrder,
  capturePayment,
  getAllOrdersByUser,
  getOrderDetails,
};
