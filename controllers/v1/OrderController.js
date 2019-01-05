let _, async, mongoose, BaseController, request, fs;
let config, axios, parseString, querystring, amazonMws;
let DBController;
let OrderModel, OrderItemModel;

async = require("async");
mongoose = require('mongoose');
BaseController = require('./BaseController');
DBController = require('./DBController');

axios = require('axios');
config = require('../../config/main');
request = require('request');
querystring = require("querystring");
parseString = require("xml2js").parseString;
fs = require('fs');
OrderModel = require('../../models/v1/order');
OrderItemModel = require('../../models/v1/orderitem');

amazonMws = require('amazon-mws')(config.mws.AWSAccessKeyId, config.mws.SecretKey);

module.exports = BaseController.extend({
    name: 'ProductController',
    getOrderSchedule: async function () {
        this.getOrderList(config.mws.SellerId, config.mws.MWSAuthToken, config.mws.MarketplaceID);
    },
    getOrderList: async function (sellerID, MWSAuthToken, MarketplaceID) {
        let self = this;
        let reqParams = {
            'Version': '2013-09-01',
            'Action': 'ListOrders',
            'SellerId': sellerID,
            'MWSAuthToken': MWSAuthToken,
            'MarketplaceId.Id.1': MarketplaceID,
            'CreatedAfter':await self.getCreatedAfterTime(sellerID)
        };

        amazonMws.orders.search(reqParams, function (error, response) {
            if (error) {
                console.log('error ', error);
                return;
            }
            console.log(response);
            if (response.hasOwnProperty('Orders')) {
                self.insertOrUpdateOrders(sellerID, MWSAuthToken,response.Orders);
            }
            if (response.hasOwnProperty('NextToken')) {
                setTimeout(function () {
                    self.getListOrderByNextToken(config.mws.SellerId, config.mws.MWSAuthToken, MarketplaceID, response.NextToken)
                }, 5 * 1000);//1 min
            } else {
                console.log("***Done***");
            }
        });
    },
    getListOrderByNextToken: function (sellerID, MWSAuthToken, marketplaceID, nextToken) {
        let self = this;
        console.log('Getting Next Order Items.................' + nextToken);
        amazonMws.orders.search({
            'Version': '2013-09-01',
            'Action': 'ListOrdersByNextToken',
            'SellerId': sellerID,
            'MWSAuthToken': MWSAuthToken,
            'NextToken': nextToken
        }, function (error, response) {
            if (error) {
                console.log('error ', error);
                return;
            }
            if (response.hasOwnProperty('Orders')) {
                self.insertOrUpdateOrders(sellerID, MWSAuthToken, response.Orders);
            }
            if (response.hasOwnProperty('NextToken')) {
                setTimeout(function () {
                    self.getListOrderByNextToken(sellerID, MWSAuthToken, marketplaceID, response.NextToken)
                }, 5 * 60 * 1000);//5 min
            } else {
                console.log("***Done***");
            }
        });
    },
    getCreatedAfterTime: async function (sellerID) {
        let orders;
        orders = await OrderModel.find({SellerId:sellerID}).sort({PurchaseDate:-1});
        if(orders.length<1){
            return "1994-07-05T16:00:00Z";
        }else{
            return orders[0].PurchaseDate;
        }
    },
    insertOrUpdateOrders: async function (sellerID, mwsAuthToken,orderListObj) {
        let self = this;
        if (orderListObj.hasOwnProperty('Order')) {
            let orderList = [];
            if(Array.isArray(orderListObj.Order)){
                orderList = orderListObj.Order
            }else{
                orderList.push(orderListObj.Order);
            }
            for (let i = 0; i < orderList.length; i++) {
                let amzID = orderList[i].AmazonOrderId;
                console.log("........Getting Order Information........AmazonOrderID : " + amzID);
                let prevOrder = await OrderModel.findOne({AmazonOrderId: amzID});
                if (prevOrder == null) {
                    //insert New order
                    orderList[i].SellerId = sellerID;
                    orderList[i].createdAt = new Date();
                    orderList[i].updatedAt = new Date();
                    orderList[i].BuyerEmail = orderList[i].BuyerEmail || "";
                    orderList[i].BuyerName = orderList[i].BuyerName || "";
                    orderList[i].OrderTotal = orderList[i].OrderTotal || "";
                    orderList[i].ShippingAddress = orderList[i].ShippingAddress || "";
                    await OrderModel.collection.insertOne(orderList[i]);

                } else {
                    prevOrder.LatestShipDate = orderList[i].LatestShipDate;
                    prevOrder.OrderType = orderList[i].OrderType;
                    prevOrder.PurchaseDate = orderList[i].PurchaseDate;
                    prevOrder.IsReplacementOrder = orderList[i].IsReplacementOrder;
                    prevOrder.LastUpdateDate = orderList[i].LastUpdateDate;
                    prevOrder.NumberOfItemsShipped = orderList[i].NumberOfItemsShipped;
                    prevOrder.ShipServiceLevel = orderList[i].ShipServiceLevel;
                    prevOrder.OrderStatus = orderList[i].OrderStatus;
                    prevOrder.SalesChannel = orderList[i].SalesChannel;
                    prevOrder.IsBusinessOrder = orderList[i].IsBusinessOrder;
                    prevOrder.NumberOfItemsUnshipped = orderList[i].NumberOfItemsUnshipped;
                    prevOrder.PaymentMethodDetails = orderList[i].PaymentMethodDetails;
                    prevOrder.IsPremiumOrder = orderList[i].IsPremiumOrder;
                    prevOrder.EarliestShipDate = orderList[i].EarliestShipDate;
                    prevOrder.FulfillmentChannel = orderList[i].FulfillmentChannel;
                    prevOrder.PaymentMethod = orderList[i].PaymentMethod;
                    prevOrder.IsPrime = orderList[i].IsPrime;
                    prevOrder.ShipmentServiceLevelCategory = orderList[i].ShipmentServiceLevelCategory;
                    prevOrder.SellerOrderId = orderList[i].SellerOrderId;
                    prevOrder.updatedAt = new Date();
                    /////////
                    prevOrder.BuyerEmail = orderList[i].BuyerEmail || "";
                    prevOrder.BuyerName = orderList[i].BuyerName || "";
                    prevOrder.OrderTotal = orderList[i].OrderTotal || "";
                    prevOrder.ShippingAddress = orderList[i].ShippingAddress || "";

                    await prevOrder.save();
                }

                setTimeout(function(i){
                    console.log("Getting Order Detail Info of Amazon ID:" + amzID);
                    amazonMws.orders.search({
                        'Version': '2013-09-01',
                        'Action': 'ListOrderItems',
                        'SellerId': sellerID,
                        'MWSAuthToken': mwsAuthToken,
                        'AmazonOrderId': amzID
                    }, function (error, response) {
                        if (error) {
                            console.log('error ', error);
                            return;
                        }
                        self.insertOrUpdateOrderItem(amzID, sellerID, response.OrderItems.OrderItem);
                        if (i === (orderList.length - 1) && orderList.length < 100) {
                            console.log('*************************************************************************');
                            console.log('*******************Done Getting Order Information************************');
                        }
                    });
                },i*6*1000,i);
            }
        } else {
            console.log('Empty Orders');
        }

    },
    insertOrUpdateOrderItem: async function (amazonOrderID, sellerID,orderItemInfo) {
        let prevOderItem = await OrderItemModel.findOne({AmazonOrderId: amazonOrderID});
        if (prevOderItem != null) {
            prevOderItem.AmazonOrderId = amazonOrderID;
            prevOderItem.asin = orderItemInfo.ASIN;
            prevOderItem.sellerId = sellerID;
            prevOderItem.qty = orderItemInfo.QuantityOrdered;
            prevOderItem.sku = orderItemInfo.SellerSKU;
            prevOderItem.title = orderItemInfo.Title;
            prevOderItem.itemId = orderItemInfo.OrderItemId;
            prevOderItem.orderIds = [];
            prevOderItem.updatedAt = new Date();

            prevOderItem.PurchaseDate = new Date(prevOderItem.PurchaseDate);
            prevOderItem.LastUpdateDate = new Date(prevOderItem.LastUpdateDate);
            prevOderItem.EarliestShipDate = new Date(prevOderItem.EarliestShipDate);

            if (orderItemInfo.hasOwnProperty('ItemPrice')) {
                prevOderItem.price = orderItemInfo.ItemPrice.Amount;
                prevOderItem.currency = orderItemInfo.ItemPrice.CurrencyCode;
            } else {
                prevOderItem.price = 0;
                prevOderItem.currency = 'USD';
            }
            await prevOderItem.save();
        } else {

            let orderItemObj = {};
            orderItemObj.AmazonOrderId = amazonOrderID;
            orderItemObj.asin = orderItemInfo.ASIN;
            orderItemObj.sellerId = sellerID;
            orderItemObj.qty = orderItemInfo.QuantityOrdered;
            orderItemObj.sku = orderItemInfo.SellerSKU;
            orderItemObj.title = orderItemInfo.Title;
            orderItemObj.itemId = orderItemInfo.OrderItemId;

            orderItemObj.orderIds = [];
            orderItemObj.createdAt = new Date();
            orderItemObj.updatedAt = new Date();

            if (orderItemInfo.hasOwnProperty('ItemPrice')) {
                orderItemObj.price = orderItemInfo.ItemPrice.Amount;
                orderItemObj.currency = orderItemInfo.ItemPrice.CurrencyCode;
            } else {
                orderItemObj.price = 0;
                orderItemObj.currency = 0;
            }

            let insertRes = await OrderItemModel.collection.insertOne(orderItemObj);
            let orderInfo = await OrderModel.findOne({AmazonOrderId: amazonOrderID});
            orderInfo.haveItem = true;

            orderInfo.PurchaseDate = new Date(orderInfo.PurchaseDate);
            orderInfo.LastUpdateDate = new Date(orderInfo.LastUpdateDate);
            orderInfo.EarliestShipDate = new Date(orderInfo.EarliestShipDate);

            orderInfo.orderItem.push(insertRes.insertedId);
            await orderInfo.save();
        }
    },
});
