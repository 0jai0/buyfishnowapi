const paypal = require("paypal-rest-sdk");

paypal.configure({
  mode: "sandbox",
  client_id: "AbisElM6NFAp8-tzLM66f7ja_zZnpvu7eH0dQaTJQO3qdv70YO2zWVdRiOAQOT8DR-Wkm9mIf9k0opJc",
  client_secret: "EJWJcE4IVH7_TGal7yevak04ljg-hL-1YTAUgPVbSWmd8VmcA1sWOJQc-ioMjv25wgN-mXiDBofanBo9",
});

module.exports = paypal;
