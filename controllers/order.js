const Product = require('../models/product');
const User = require('../models/user');
const Feedback = require('../models/feedback');
const Order = require("../models/order");
const OrderItem = require("../models/orderItem");
const OrderEmailStat = require("../models/orderEmailStat");
const Template = require("../models/template");
const config = require("../config/main");
const moment = require("moment");
const Mail = require('./mail');

var scraper = require('../library/product-scraper');

const mws_key = config.MWS_KEY || "";
const mws_access = config.MWS_SECRET || "";
var amazonMws = require("amazon-mws")("AKIAIEGT53RIXYQUCTPQ", "VdToubCLaeVs+ngo3g7aIGCUzlqsisfCVWnKCga6");

exports.getOrder = function(req, res, next) {
  var user_id = req.query.userId
  // var user_id = "5b8d2195df84c010229fd2df";
  User.findById(user_id, (err, user) => {
    if (err) {
      res.status(400).json({ error: 'No user could be found for this ID.' });
      return next(err);
    }

    var sellerId = user.SellerId;

    SellerConfig.find({SellerId: sellerId}).exec(function(err, sellerConfig){
        var amazonMws = require('amazon-mws')(sellerConfig.tokenConfig.mws_key, sellerConfig.tokenConfig.mws_access);

        amazonMws.orders.search({
          "Version": "2013-09-01",
          "Action": "ListOrders",
          "SellerId": sellerId,
          "MWSAuthToken": sellerConfig.MWSAuthToken,
          "MarketplaceId.Id.1": sellerConfig.MarketplaceId,
          "LastUpdatedAfter": new Date(13, 12, 2017)
        }, function(error, response) {
          if (error) {
            console.log("error ", error);
            return;
          }

          return res.status(200).json(response);
          // var formData = formatOrderData(response);
          // update order table of Database as well as orderItem table

        });

      })
  });

};

exports.getOrderItem = function(req, res, next) {
  var user_id = req.query.userId
  // var user_id = "5b8d2195df84c010229fd2df";
  let orderId = req.params.id;
  User.findById(user_id, (err, user) => {
    if (err) {
      res.status(400).json({ error: 'No user could be found for this ID.' });
      return next(err);
    }

    var sellerId = user.SellerId;

    SellerConfig.find({SellerId: sellerId}).exec(function(err, sellerConfig){
        var amazonMws = require('amazon-mws')(sellerConfig.tokenConfig.mws_key, sellerConfig.tokenConfig.mws_access);

        amazonMws.orders.search({
          "Version": "2013-09-01",
          "Action": "ListOrderItems",
          "SellerId": sellerId,
          "MWSAuthToken": sellerConfig.MWSAuthToken,
          "AmazonOrderId": orderId
        }, function(error, response) {
          if (error) {
            console.log("error ", error);
            return;
          }
          if (response && Object.keys(response).length) {


            var ASIN = response.OrderItems.OrderItem.ASIN;
            scraper.init('http://www.amazon.com/gp/product/'+ASIN+'/', function(data){
              response.OrderItems.OrderItem.image_url = data.image;
              formatOrderItem(response, function(respData) {

                OrderItem.findOne({ AmazonOrderId: respData.AmazonOrderId }, (err, existingItem) => {
                  if (err) {
                    console.log(err);
                  }
                  // If order is exist
                  if (!existingItem) {
                    const orderData = new OrderItem(respData);
                    orderData.save((err, savedOrderItem) => {
                      if (err) {
                        console.log(err);
                      }
                      updateOrderForItemStatus(savedOrderItem, function(updatedOrder) {
                        return res.status(200).json({ updated: updatedOrder });
                      });
                    });
                  } else {
                    return res.status(200).json({ exist: true, item: existingItem });
                  }
                });
              });
            });
          }
        });

      })
  });

};

function updateOrderForItemStatus(respData, next) {
  Order.findOne({ AmazonOrderId: respData.AmazonOrderId }, function(err, order) {
    if (err) {
      console.log(err);
      return { status: 201, message: "something error", error: err };
    }
    order.haveItem = true;
    order.orderItem.push(respData.id);
    order.save(function(err, updatedOrder) {
      if (err) {
        console.log(err);
        return { error: err, code: 401, message: "something happened" };
      }
      next(updatedOrder);
    });
  });
}

function formatOrderItem(resp, calb) {
  let itemData = resp.OrderItems.OrderItem;
  let respOrder = {
    AmazonOrderId: resp.AmazonOrderId,
    asin: itemData.ASIN,
    qty: itemData.QuantityOrdered,
    sku: itemData.SellerSKU,
    title: itemData.Title,
    price: itemData.ItemPrice.Amount,
    currency: itemData.ItemPrice.CurrencyCode,
    image_url: itemData.image_url
  };
  calb(respOrder);
}

exports.list = function(req, res, next) {
  var user_id = req.query.userId
  // var user_id = "5b8d2195df84c010229fd2df";

  User.findById(user_id, (err, user) => {
    if (err) {
      res.status(400).json({ error: 'No user could be found for this ID.' });
      return next(err);
    }

    var sellerId = user.SellerId;
    Order.find({sellerId: sellerId}).populate("orderItem").limit(150).exec(function(err, orders) { ///7Lines-code
      if (err) {
        console.log(err);
      }
      return res.status(200).json({ orders: orders });
    });

  });
};

exports.filterList = function(req, res, next) {
  let date_start = req.body.date_start;
  let date_end = req.body.date_end;
  let filter_items = req.body.filter_items;
  console.log(date_start, date_end, filter_items);

  // var user_id = req.body.userId
  var user_id = "5b8d2195df84c010229fd2df";

  User.findById(user_id, (err, user) => {
    if (err) {
      res.status(400).json({ error: 'No user could be found for this ID.' });
      return next(err);
    }

    var sellerId = user.SellerId;

    //let query = Order.find();
    if ((date_start && date_end) && (filter_items && filter_items.length)) {
      date_start = moment(date_start, "YYYY/MM/DD").format("YYYY, M, D");
      date_end = moment(date_end, "YYYY/MM/DD").format("YYYY, M, D");
      // query.where = {PurchaseDate: {$gte: new Date(date_start), $lt: new Date(date_end)}};
      Order.find(
        {
          $and: [
            {
              PurchaseDate: {
                $gte: new Date(date_start), $lt: new Date(date_end)
              },
              sellerId: sellerId
            },
            {
              $or: [
                {
                  FulfillmentChannel: {
                    $in: filter_items
                  }
                }, {
                  OrderStatus: {
                    $in: filter_items
                  }
                },
                {
                  sent_email_status: {
                    $in: filter_items
                  }
                }
              ]
            }
          ]
        }
      ).populate("orderItem")
        .limit(150).collation( { locale: 'en', strength: 2 }).exec(function(err, orders) {
        if (err) {
          console.log(err);
        }
        return res.status(200).json({ orders: orders });
      });
    } else if (date_start && date_end) {
      date_start = moment(date_start, "YYYY/MM/DD").format("YYYY, M, D");
      date_end = moment(date_end, "YYYY/MM/DD").format("YYYY, M, D");
      Order.find({ sellerId: sellerId, PurchaseDate: { $gte: new Date(date_start), $lt: new Date(date_end) } }).populate("orderItem")
        .limit(150).exec(function(err, orders) {
        if (err) {
          console.log(err);
        }
        return res.status(200).json({ orders: orders });
      });
    } else if (filter_items && filter_items.length) {
      Order.find({
            sellerId: sellerId,
            $or: [
              {
                FulfillmentChannel:
                { $in: filter_items }
              },
              {
                OrderStatus:
                { $in: filter_items }
              },
              {
                sent_email_status: {
                  $in: filter_items
                }
              }
            ]
          }).populate("orderItem")
        .limit(150).collation( { locale: 'en', strength: 2 }).exec(function(err, orders) {
        if (err) {
          console.log(err);
        }
        return res.status(200).json({ orders: orders });
      });
    } else {
      Order.find({sellerId: sellerId}).populate("orderItem")
        .limit(150).exec(function(err, orders) {
        if (err) {
          console.log(err);
        }
        return res.status(200).json({ orders: orders });
      });
    }
  });
};


function formatOrderData(resp) {
  let orderData = { NextToken: resp.NextToken, RequestId: resp.ResponseMetadata.RequestId };
  orderData.orders = resp.Orders.Order;
  return orderData;
}

exports.getOrderAnalysis = function(req, res, next) {
  //{ $match: { mydate: { $lte: new Date( '12/01/1998' ) } } },
  // var user_id = req.body.userId
  var user_id = "5b8d2195df84c010229fd2df";

  User.findById(user_id, (err, user) => {
    if (err) {
      res.status(400).json({ error: 'No user could be found for this ID.' });
      return next(err);
    }

    var sellerId = user.SellerId;
    Order.aggregate([
        {
          $match: {
            sellerId: sellerId
          }
        },
        {
          $group: {
            _id: {$substr: ['$PurchaseDate', 0, 7]},
            totalOrder: {$sum: 1}
          }
        },
        { $sort : { _id : -1 } },
        { $limit : 12 }
    ], function (err, order) {
        if (err) {
        console.log(err);
      }
      return res.status(200).json({order_analysis: order});
    });
  });

};

exports.getOrderAnalysisFilter = function (req, res, next) {
  console.log(req.body);
  var start_date = req.body.start_date;
  var end_date = req.body.end_date;
  let filter_items = req.body.filter_items;

  // var user_id = req.body.userId
  var user_id = "5b8d2195df84c010229fd2df";

  User.findById(user_id, (err, user) => {
    if (err) {
      res.status(400).json({ error: 'No user could be found for this ID.' });
      return next(err);
    }

    var sellerId = user.SellerId;

    if((start_date && end_date) && (filter_items && filter_items.length)){
      end_date = new Date(end_date);
      end_date = new Date(new Date(end_date).setMonth(end_date.getMonth()+1));

      Order.aggregate([
          {
            $match:
            {
              $and: [
              {
                PurchaseDate: {
                  $gte: new Date(start_date),
                  $lt: new Date(end_date)
                }
              },
              {
                $and: [
                  {
                    FulfillmentChannel: {
                      $in: filter_items
                    }
                  }, {
                    OrderStatus: {
                      $in: filter_items
                    }
                  },
                  {
                    sent_email_status: {
                      $in: filter_items
                    }
                  }
                ]
              }]
            }
          },
          {
            $group: {
              _id: {
                "FulfillmentChannel": "$FulfillmentChannel",
                "month": {$substr: ['$PurchaseDate', 0, 7]},
                "sent_email_status": "$sent_email_status",
              },

              "totalOrder": { "$sum": 1},
            }
          },
          {
            "$group": {
                "_id": "$_id.FulfillmentChannel",
                "counts": {
                    "$push": {
                        "month": "$_id.month",
                        "total": "$totalOrder",
                        'totalEmail': "$_id.sent_email_status"
                    }
                }
            }
          },
          { $sort : { _id : -1 } }
      ]).collation( { locale: 'en', strength: 2 }).exec( function (err, order) {
        if (err) {
          console.log(err);
        }

        var order_val = OrderAnalyticsRearragnge(order);

        return res.status(200).json({order_analysis: order_val});

      });
    }else if(start_date && end_date){
      end_date = new Date(end_date);
      end_date = new Date(new Date(end_date).setMonth(end_date.getMonth()+1));

      Order.aggregate([
          {
            $match:
            {

              PurchaseDate: {
                $gte: new Date(start_date),
                $lt: new Date(end_date)
              }
            }

          },
          {
            $group: {
              _id: {
                "FulfillmentChannel": "$FulfillmentChannel",
                "month": {$substr: ['$PurchaseDate', 0, 7]},
                "sent_email_status": "$sent_email_status",
              },

              "totalOrder": { "$sum": 1},
            }
          },
          {
            "$group": {
                "_id": "$_id.FulfillmentChannel",
                "counts": {
                    "$push": {
                        "month": "$_id.month",
                        "total": "$totalOrder",
                        'totalEmail': "$_id.sent_email_status"
                    }
                }
            }
          },
          { $sort : { _id : -1 } }
      ]).collation( { locale: 'en', strength: 2 }).exec(function (err, order) {
        if (err) {
          console.log(err);
        }

        var order_val = OrderAnalyticsRearragnge(order);

        return res.status(200).json({order_analysis: order_val});

      });
    }else if(filter_items && filter_items.length){
      Order.aggregate([
          {
            $match:
            {
              $or: [
                {
                  FulfillmentChannel:
                  { $in: filter_items }
                },
                {
                  OrderStatus:
                  { $in: filter_items }
                },
                {
                  sent_email_status: {
                    $in: filter_items
                  }
                }
              ]
            }

          },
          {
            $group: {
              _id: {
                "FulfillmentChannel": "$FulfillmentChannel",
                "month": {$substr: ['$PurchaseDate', 0, 7]},
                "sent_email_status": "$sent_email_status",
              },

              "totalOrder": { "$sum": 1},
            }
          },
          {
            "$group": {
                "_id": "$_id.FulfillmentChannel",
                "counts": {
                    "$push": {
                        "month": "$_id.month",
                        "total": "$totalOrder",
                        'totalEmail': "$_id.sent_email_status"
                    }
                }
            }
          },
          { $sort : { _id : -1 } }
      ]).collation( { locale: 'en', strength: 2 }).exec(function (err, order) {
        if (err) {
          console.log(err);
        }

        var order_val = OrderAnalyticsRearragnge(order);

        return res.status(200).json({order_analysis: order_val});

      });
    }else{
      Order.aggregate([
          {
            $group: {
              _id: {
                "FulfillmentChannel": "$FulfillmentChannel",
                "month": {$substr: ['$PurchaseDate', 0, 7]},
                "sent_email_status": "$sent_email_status",
              },

              "totalOrder": { "$sum": 1},
            }
          },
          {
            "$group": {
                "_id": "$_id.FulfillmentChannel",
                "counts": {
                    "$push": {
                        "month": "$_id.month",
                        "total": "$totalOrder",
                        'totalEmail': "$_id.sent_email_status"
                    }
                }
            }
          },
          { $sort : { _id : -1 } },
          { $limit : 10 }
      ], function (err, order) {
        if (err) {
          console.log(err);
        }

        var order_val = OrderAnalyticsRearragnge(order);

        return res.status(200).json({order_analysis: order_val});

      });
    }
  });
}


function OrderAnalyticsRearragnge(order){

    var order_val = []
    var temp_obj = {}

    for(let i=0; i < order.length; i++){
      // var temp_obj = {}

      if(order[i]._id == 'AFN'){
        var list = order[i].counts;

        for(let j=0; j< list.length; j++){
          var temp_obj = {}
          if(order_val.length > 0){
              console.log("AFN ORDER VAL EXIST");

              var index = -1;
              for(let k=0; k<order_val.length; k++){
                if(order_val[k]._id == list[j].month ){
                  index = k;
                  break;
                }
              }

              if(index == -1){
                console.log("INDEX NOT FOUND");
                temp_obj._id = list[j].month;
                if(list[j].totalEmail && list[j].totalEmail == 'sent_status:1'){
                  temp_obj.totalSentEmail = list[j].total;
                }else{
                  temp_obj.totalAFN = list[j].total;
                }

                order_val.push(temp_obj);
              }else{
                console.log("INDEX FOUND");
                if(list[j].totalEmail && list[j].totalEmail == 'sent_status:1'){
                  order_val[index].totalSentEmail = list[j].total;
                }else{
                  order_val[index].totalAFN = list[j].total;
                }

              }

          }else{
            console.log("AFN ORDER VAL DOESN'T EXIST");
            if(list[j].totalEmail && list[j].totalEmail == 'sent_status:1'){
              temp_obj._id = list[j].month;
              temp_obj.totalSentEmail = list[j].total;
              order_val.push(temp_obj);
            }else{
              temp_obj._id = list[j].month;
              temp_obj.totalAFN = list[j].total;
              order_val.push(temp_obj);
            }

            console.log(order_val)
          }
        }

      } else if (order[i]._id == 'MFN'){
        var list = order[i].counts;

        for(let j=0; j< list.length; j++){
          var temp_obj = {}
          if(order_val.length > 0){
            console.log("MFN ORDER VAL EXIST");

                var index = -1;
                for(let k=0; k<order_val.length; k++){
                  if(order_val[k]._id == list[j].month ){
                    index = k;
                    break;
                  }
                }

                if(index == -1){
                  console.log("INDEX NOT FOUND");
                  temp_obj._id = list[j].month;
                  if(list[j].totalEmail && list[j].totalEmail == 'sent_status:1'){
                    temp_obj.totalSentEmail = list[j].totalEmail;
                  }else{
                    temp_obj.totalMFN = list[j].total;
                  }

                  order_val.push(temp_obj);
                }else{
                  console.log("INDEX FOUND");
                  if(list[j].totalEmail && list[j].totalEmail == 'sent_status:1'){
                    order_val[index].totalSentEmail = list[j].totalEmail;
                  }else{
                    order_val[index].totalMFN = list[j].total;
                  }

                }

          }else{
            console.log("AFN ORDER VAL DOESN'T EXIST");
            if(list[j].totalEmail && list[j].totalEmail == 'sent_status:1'){
              temp_obj._id = list[j].month;
              temp_obj.totalSentEmail = list[j].totalEmail;
              order_val.push(temp_obj);
            }else{
              temp_obj._id = list[j].month;
              temp_obj.totalMFN = list[j].total;
              order_val.push(temp_obj);
            }

            console.log(order_val)
          }
        }
      }

    }

    for(let i = 0; i< order_val.length; i++){
      if(order_val[i].totalSentEmail){}
      else{ order_val[i].totalSentEmail = 0; }


      if(order_val[i].totalMFN && order_val[i].totalAFN){
        order_val[i].totalOrder = order_val[i].totalMFN + order_val[i].totalAFN;
      }else if(order_val[i].totalMFN){
        order_val[i].totalOrder = order_val[i].totalMFN;
        order_val[i].totalAFN = 0;
      }else if(order_val[i].totalAFN){
        order_val[i].totalOrder = order_val[i].totalAFN;
        order_val[i].totalMFN = 0;
      }
    }

    return order_val;
}

exports.sendMailToOrderer = function (req, res, next) {

  const orderId = req.body.orderId;
  const templateId = req.body.templateId;
  const messageBody = req.body.messageBody;

  Order.findOne({AmazonOrderId: orderId}, function (err, order) {
    if (err) {
      console.log(err);
    } else {
      Template.findOne({_id: templateId}, function (error,temp) {
        if (err) {
          console.log(error);
        } else {

          if (temp !== null) {

                let obj = {
                  // email: Order.BuyerEmail,
                  email: 'shakil.shaion@gmail.com',
                  templateData: temp,
                  messageBody: messageBody,
                  hostname: 'http://' + res.req.headers.host,
                  appUrl: req.hostname
                };
                Mail.sendToOrderer(obj,function (result) {
                  //if (result) {
                    console.log("Working");
                    temp.﻿number_of_email_sent += 1;
                    temp.save(function (err, myTemp) {
                      console.log("Temp Save");
                        if (err) {
                          res.status(403).send(err);
                        } else {
                          order.sent_email_status = 'sent_status:1';
                          order.number_of_email_sent += 1;
                          order.save(function (err, ord) {
                            console.log("order Save");
                              if (err) {
                                res.status(403).send(err);
                              }
                              var tData = {};
                              tData.temp_id = templateId;
                              tData.order_id = ord._id;
                              const orderEmailStatData = new OrderEmailStat(tData);

                              orderEmailStatData.save(function (err, emailStat){
                                console.log("Working...........");
                              })

                          });

                        }
                    });
                  //}
                });

          } else {
            res.send({ success: false, message: " No template found" })
          }
        }

      });

    }

  });

}

exports.sendMailToOrdererWithTemplate = function (req, res) {
  const orderId = req.body.orderId;
  const templateId = req.body.templateId;
  const messageBody = req.body.messageBody;

  Order.findOne({AmazonOrderId: orderId}, function (err, order) {
    if (err) {
      console.log(err);
    } else {
      Template.findOne({_id: templateId}, function (error,temp) {
        if (err) {
          console.log(error);
        } else {


          if (temp !== null) {

                let obj = {
                  // email: Order.BuyerEmail,
                  email: 'shakil.shaion@gmail.com',
                  templateData: temp,
                  messageBody: messageBody,
                  hostname: 'http://' + res.req.headers.host,
                  appUrl: req.hostname
                };
                Mail.sendToOrderer(obj,function (result) {
                  //if (result) {
                    console.log("Working");
                    temp.﻿number_of_email_sent += 1;
                    temp.save(function (err, myTemp) {
                      console.log("Temp Save");
                        if (err) {
                          res.status(403).send(err);
                        } else {
                          order.sent_email_status = 'sent_status:1';
                          order.number_of_email_sent += 1;
                          order.save(function (err, ord) {
                            console.log("order Save");
                              if (err) {
                                res.status(403).send(err);
                              }
                              var tData = {};
                              tData.temp_id = templateId;
                              tData.order_id = ord._id;
                              const orderEmailStatData = new OrderEmailStat(tData);

                              orderEmailStatData.save(function (err, emailStat){
                                console.log("Working...........");
                              })

                          });

                        }
                    });
                  //}
                });

          } else {
            res.send({ success: false, message: " No template found" })
          }
        }

      });

    }

  });
}


exports.sendScheduleLetter = function (req, res) {

    Template.find({template_status: 'active'})
        .exec(function (err,Temp) {
      if (err) {
        console.log(err);
      } else {
        Temp.forEach(function (temp,index) {
            // console.log(temp);
            Order.find({AmazonOrderId: temp.order_id}).populate('orderItem').exec(function (error,Ord) {
                if (error) {
                  console.log(error);
                } else {
                    //console.log(Ord[0]);
                    Ord = Ord[0];
                    let timeNow = moment().format('kk:mm');

                    let a = timeNow.split(':'); // split it at the colons
                    let minutesNow = (+a[0]) * 60 + (+a[1]);

                    let b = temp.send_time.split(':');
                    let templateTime = (+b[0]) * 60 + (+b[1]);

                    let distance = minutesNow - templateTime;

                    if((Ord.OrderStatus === temp.send_after) && (distance<59)) {
                    // if((Ord.OrderStatus === temp.send_after) && (distance<1000)) {

                        // check include/ exclude order
                        var exclude_orders = temp.exclude_orders;

                        var exclude_negative_feedback = 0;
                        var exclude_neutral_feedback = 0;
                        var exclude_positive_feedback = 0;

                        var exclude_negative_review = 0;
                        var exclude_neutral_review = 0;
                        var exclude_positive_review = 0;

                        var exclude_promotion_item_discount = 0;
                        var exclude_promotion_shipping_discount = 0;

                        var exclude_other_with_return = 0;
                        var exclude_other_with_repeat_buyer = 0;

                        if(exclude_orders.feedback.with_feedback_1 == 1 || exclude_orders.feedback.with_feedback_2 == 1){
                          exclude_negative_feedback = 1;
                        }else if(exclude_orders.feedback.with_feedback_3 == 1){
                          exclude_neutral_feedback = 1;
                        }else if(exclude_orders.feedback.with_feedback_4 == 1 || exclude_orders.feedback.with_feedback_5 == 1){
                          exclude_positive_feedback = 1;
                        }else if(exclude_orders.review.with_review_1 == 1 || exclude_orders.review.with_review_2 == 1){
                          exclude_negative_review = 1;
                        }else if(exclude_orders.review.with_review_3 == 1){
                          exclude_neutral_review = 1;
                        }else if(exclude_orders.review.with_review_4 == 1 || exclude_orders.review.with_review_5 == 1){
                          exclude_positive_review = 1;
                        }else if(exclude_orders.promotion.item_discount == 1){
                          exclude_promotion_item_discount = 1;
                        }else if(exclude_orders.promotion.shipping_discount == 1){
                          exclude_promotion_shipping_discount = 1;
                        }else if(exclude_orders.other.with_return == 1){
                          exclude_other_with_return = 1;
                        }else if(exclude_orders.other.with_repeat_buyer == 1){
                          exclude_other_with_repeat_buyer = 1;
                        }

                        //
                        if(exclude_negative_feedback == 1 ||
                          exclude_neutral_feedback == 1 ||
                          exclude_positive_feedback == 1 ||
                          exclude_negative_review == 1 ||
                          exclude_neutral_review == 1 ||
                          exclude_positive_review == 1 ||
                          exclude_promotion_item_discount == 1 ||
                          exclude_promotion_shipping_discount == 1 ||
                          exclude_other_with_return == 1 ||
                          exclude_other_with_repeat_buyer == 1 ) {

                          // Ord.IsReplacementOrder => with_return;
                          // product info
                          Product.find({asin1: Ord.orderItem[0].asin}).exec(function(err, product){
                            product = product[0];
                            var sent_email = 1;
                            if(exclude_negative_feedback == 1 || exclude_neutral_feedback == 1 || exclude_positive_feedback){
                              Feedback.find({product_id: Ord.orderItem[0].asin}).exec(function(err, feedback){
                                if(feedback.length){
                                  var rating = 0;
                                  for(let i = 0; i < feedback.length; i++){
                                    rating += parseInt(feedback[i].rating);
                                  }
                                  var avg_rating = Math.round(rating/feedback.length);
                                  if(exclude_negative_feedback == 1 && avg_rating < 3){
                                    console.log("NEGATIVE FEEDBACK BUT RATING = "+avg_rating);
                                    sent_email = 0;
                                  }else if(exclude_neutral_feedback == 1 && avg_rating == 3){
                                    console.log("NEUTRAL FEEDBACK BUT RATING = "+avg_rating);
                                    sent_email = 0;
                                  }else if(exclude_positive_feedback == 1 && avg_rating > 3){
                                    console.log("POSITIVE FEEDBACK BUT RATING = "+avg_rating);
                                    sent_email = 0;
                                  }

                                  console.log(avg_rating);
                                }else{
                                  console.log("NO FEEDBACK FOUND");
                                }
                              });
                            }

                            if(exclude_negative_review == 1 && product.rating < 3){
                              sent_email = 0;
                            }else if(exclude_neutral_review == 1 && product.rating == 3){
                              sent_email = 0;
                            }else if(exclude_positive_review == 1 && product.rating > 3){
                              sent_email = 0;
                            }

                            if(exclude_other_with_return == 1 && Ord.IsReplacementOrder == true){
                              sent_email = 0;
                            }

                            if(sent_email == 1){
                              console.log("CHECKED ALL EXCLUDE ORDERS");
                              ScheduleMail(req, res, Ord, temp);
                            }

                            console.log("PRODUCT FIND");
                          });

                        }else{
                          console.log("EXCLUDE ORDERS EMPTY");
                          // //
                          ScheduleMail(req, res, Ord, temp);
                        }

                    }else{
                      // console.log(Ord.OrderStatus + " Time Expired " + distance);
                      Ord.sent_email_status = 'sent_status:2';
                      Ord.save(function (err, success) {
                          if (err) return;
                          return;
                      });
                    }
                }
            });
        });


        res.send('Schedule email sent to user');

      }

    }).catch(error=>{console.log(error)})
};

function ScheduleMail(req, res, Ord, temp){

  var messageBody = generateTemplatePreviewHtml(temp.email_message, Ord);
  let obj = {
      //email: Ord.BuyerEmail,
      email: 'shakil.shaion@gmail.com',
      templateData: temp,
      messageBody: messageBody,
      hostname: 'http://' + res.req.headers.host,
      appUrl: req.hostname
  };
  Mail.sendToOrdererFromSchedule(obj,function (result) {
      temp.﻿number_of_email_sent += 1;
      temp.save(function (err, myTemp) {
        console.log("Temp Save");
          if (err) {
            res.status(403).send(err);
          } else {
            Ord.sent_email_status = 'sent_status:1';
            Ord.number_of_email_sent += 1;
            Ord.save(function (err, ord) {
              console.log("order Save");
                if (err) {
                  res.status(403).send(err);
                }
                var tData = {};
                tData.temp_id = temp._id;
                tData.order_id = ord._id;
                const orderEmailStatData = new OrderEmailStat(tData);

                orderEmailStatData.save(function (err, emailStat){
                  console.log("Working...........");
                })

            });

          }
      });
  });
}

exports.dashboardSummary = function (req, res, next) {

  let date_start = req.body.date_start;
  let date_end = req.body.date_end;

  // user id
  // sellerID = A1LWZ980X488GK
  var user_id = "5b8d2195df84c010229fd2df";

  User.findById(user_id, (err, user) => {
    if (err) {
      res.status(400).json({ error: 'No user could be found for this ID.' });
      return next(err);
    }

    var sellerId = user.SellerId;

    var summary = {};

    if (date_start && date_end){
      // date_start = moment(date_start, "YYYY/MM/DD").format("YYYY, M, D");
      // date_end = moment(date_end, "YYYY/MM/DD").format("YYYY, M, D");
      var p_date_start = date_start.replace('/', '-');
      p_date_start = date_start+ ' 00:00:00 PDT';

      var p_date_end = date_end.replace('/', '-');
      p_date_end = date_end+ ' 00:00:00 PDT';

      console.log(new Date(date_start));
      // PurchaseDate: { $gte: new Date(date_start), $lt: new Date(date_end) }
      Product.find({
        sellerId: sellerId, open_date: { $gte: p_date_start, $lte: p_date_end }
      }).count().exec(function (err, products) {
          if (err){console.log(err);}

          summary.totalProduct = products;

          Order.find({
            sellerId: sellerId, PurchaseDate: { $gte: new Date(date_start), $lte: new Date(date_end) }
          }).count().exec(function (err, orders) {
              if (err){console.log(err);}

              summary.totalOrder = orders;

              Template.aggregate([
                {
                  $match:
                  {
                    createdAt: {
                      $gte: new Date(date_start),
                      $lte: new Date(date_end)
                    },
                    user_id: user_id
                  }

                },
                {
                  $group: {
                    _id: {
                      "number_of_email_sent": "$number_of_email_sent",
                    },

                    "totalEmailSent": { "$sum": 1},
                  }
                }
              ]).exec(function (err, emailSentTemplate) {
                  if (err){console.log(err);}
                  var totalEmailSent = 0;
                  for(let i=0; i< emailSentTemplate.length; i++){
                    if(emailSentTemplate[i]._id.number_of_email_sent == 0){
                      continue;
                    }else{
                      totalEmailSent += (emailSentTemplate[i].totalEmailSent*emailSentTemplate[i]._id.number_of_email_sent);
                    }
                  }
                  summary.totalEmailSent = totalEmailSent;
                  Template.find({
                    user_id: user_id, createdAt: { $gte: new Date(date_start), $lte: new Date(date_end) }
                  }).count().exec(function (err, template) {
                    summary.totalTemplate = template;
                    return res.status(200).json({ summary: summary });
                  });

              });

          })

      })
    } else {
      Product.find({sellerId: sellerId}).count().exec(function (err, products) {
          if (err){console.log(err);}

          summary.totalProduct = products;

          Order.find({sellerId: sellerId}).count().exec(function (err, orders) {
              if (err){console.log(err);}

              summary.totalOrder = orders;
              Template.aggregate([
                {
                  $group: {
                    _id: {
                      "number_of_email_sent": "$number_of_email_sent",
                    },

                    "totalEmailSent": { "$sum": 1},
                  }
                }
              ]).exec(function (err, emailSentTemplate) {
                  if (err){console.log(err);}
                  var totalEmailSent = 0;
                  for(let i=0; i< emailSentTemplate.length; i++){
                    if(emailSentTemplate[i]._id.number_of_email_sent == 0){
                      continue;
                    }else{
                      totalEmailSent += (emailSentTemplate[i].totalEmailSent*emailSentTemplate[i]._id.number_of_email_sent);
                    }
                  }
                  summary.totalEmailSent = totalEmailSent;
                  Template.find({user_id: user_id}).count().exec(function (err, template) {
                    summary.totalTemplate = template;
                    return res.status(200).json({ summary: summary });
                  });



              });

          })

      })
    }

  });

};


// *********************** Email Message Body Re-design *********************
// template message body
function generateAmazonButton (text, link) {
  let amazon_button_outer = `
      background: #f0c14b;
      border-color: #a88734 #9c7e31 #846a29;
      color: #111;
      display: inline-block;
      margin: 6px 3px;
  `
  let amazon_button_inner = `
    background: linear-gradient(to bottom,#f7dfa5,#f0c14b);
    box-shadow: 0 1px 0 rgba(255,255,255,.4) inset;
    padding: 6px 8px;
  `
  let amazon_button_inner_a = `
    color: #111;
  `
  return `<span style="${amazon_button_outer}">
      <span style="${amazon_button_inner}" >
          <a target='_blank' style="${amazon_button_inner_a}" href="${link}">${text}</a>
      </span>
  </span>`
}

function replaceWithRealValue (contents='', dependancy={}) {
  let item = dependancy;
  let all_variables_value = {}
  if (item)  {
    all_variables_value = {
      // buyer
      "buyer-name": item.BuyerName,
      "buyer-first-name": item.BuyerName ? item.BuyerName.split(" ").slice(0, -1).join(" ") : "",
      "thank-you-for-feedback": "Thank you text for leaving feedback. (Note - only shows if good feedback left)",


      //order
      "order-date": item.PurchaseDate,
      "order-id": item.AmazonOrderId,
      "product-name": item.orderItem[0].title,
      "product-qty": item.orderItem.reduce((a, c) => a + Number(c.qty), 0),
      "product-price": item.OrderTotal.Amount,
      "product-shipping": 1,
      "product-condition": 1,
      "order-estimated-arrival": 1,
      "my-seller-name": 1,

      // shipping
      "shipping-address1": 1,
      "shipping-address2": 1,
      "shipping-city": 1,
      "shipping-zip/postal code": 1,
      "shipping-country": 1,
      "shipping-courier": 1,
      "shipping-trackingno": 1,
      "shipping-state": 1,

      // logos
      "logo": 1,
      "logo-amz-link": 1,

      // links
      "feedback-link": generateAmazonButton('feedback link', "https://www.amazon.com/gp/feedback/leave-customer-feedback.html/?order=SAMPLE-ORDER-ID&pageSize=1"),
      "feedback-link-5star": generateAmazonButton('feedback-link-5star', `http://www.amazon.co.uk/gp/feedback/email-excellent-fb.html?ie=UTF8&excellent=2&isCBA=&marketplaceID=A1F83G8C2ARO7P&orderID=${item.AmazonOrderId}&rating=5&sellerID=YOUR-SELLER-ID`),
      "contact-link": generateAmazonButton( 'contact-link', `https://www.amazon.co.uk/ss/help/contact/?_encoding=UTF8&asin=&isCBA=&marketplaceID=A1F83G8C2ARO7P&orderID=${item.AmazonOrderId}&ref_=aag_d_sh&sellerID=YOUR-SELLER-ID`),
      "order-link": generateAmazonButton('order-link', `https://www.amazon.com/gp/css/summary/edit.html?orderID=${item.AmazonOrderId}`),
      "review-link": generateAmazonButton('review-link', `https://www.amazon.com/review/create-review?ie=UTF8&asin=B000000001&#`),
      "store-link": generateAmazonButton('store-link', `https://www.amazon.co.uk/gp/aag/main/ref=olp_merch_name_4?ie=UTF8&asin=&isAmazonFulfilled=0&seller=YOUR-SELLER-ID`),
      "product-link": generateAmazonButton('product link', `https://www.amazon.co.uk/gp/product/B000000001`),
      "amazon-fba-contact-link ": generateAmazonButton('amazon-fba-contact-link',`https://www.amazon.co.uk/gp/help/customer/contact-us?ie=UTF8&orderId=${item.AmazonOrderId}&`),
    }
  }

  if (! item) {
    return '__ORDER_NOT__FOUND__'
  } else if (contents in all_variables_value) {
    return all_variables_value[contents]
  }else {
    return '__CONTENT_NOT_FOUND__'
  }

}

function generateTemplatePreviewHtml(messageBody, dependancy){
  let regexPattern = /\[#([a-z-\s1-9]+)#\]/g
  let templateHtmlPreview = messageBody.replace(regexPattern, (match, contents, offset, input_string) => {
    return replaceWithRealValue(contents, dependancy)
  })
  return templateHtmlPreview;
}

// *********************** /Email Message Body Re-design *********************
