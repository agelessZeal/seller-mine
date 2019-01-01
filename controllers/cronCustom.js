const cron = require('node-cron');
const Order = require('../models/order');
const OrderItem = require('../models/orderItem');
const FeedbackRequest = require('../models/feedbackRequest');
const config = require('../config/main');
const async = require("async");
const Cron = require('../models/cron');
const SellerConfig = require('../models/sellerConfig');

const mws_key = config.MWS_KEY || '';
const mws_access = config.MWS_SECRET || '';
const amazonMws = require('amazon-mws')('AKIAIEGT53RIXYQUCTPQ','VdToubCLaeVs+ngo3g7aIGCUzlqsisfCVWnKCga6');
const moment = require('moment');

module.exports = {
    orders: function (req, res) {
        Cron.findOne({ type: 'order'}, (err, foundOrder) => {
            if (err) { return next(err); }

            if (foundOrder && foundOrder.SellerId) {
                SellerConfig.findOne({SellerId: foundOrder.SellerId}, (err, sellerConfig)=>{
                    if(err){
                    }
                    var amazonMws = require('amazon-mws')(sellerConfig.tokenConfig.mws_key, sellerConfig.tokenConfig.mws_access);

                    if(foundSaller && foundSaller.SellerId){
                        let sellerId = foundSaller.SellerId;
                        let cDate;
                        if(foundSaller.current_date){
                            cDate = new Date(foundSaller.current_date);
                        }else{
                            cDate = new Date(moment().subtract(3, 'years').format());
                        }
                        let searchQuery = {
                            'Version': '2013-09-01',
                            'Action': 'ListOrders',
                            'SellerId': sellerId,
                            'MWSAuthToken': foundSaller.tokenConfig.MWSAuthToken,
                            'MarketplaceId.Id.1': foundSaller.tokenConfig.id1,
                            'LastUpdatedAfter': cDate
                        };
                        if(foundOrder.NextToken){
                            searchQuery.NextToken = foundOrder.NextToken;
                            searchQuery['Action'] = 'ListOrdersByNextToken';
                        }
                        amazonMws.orders.search(searchQuery, function (error, response) {
                            if (error) {
                                return;
                            }
                            response.sellerId = sellerId;
                            formateSaveUpdateOrderData(response, function (respData) {
                                let cuDate = foundSaller.current_date;
                                if(moment(cDate).isBefore(moment())){
                                    cuDate = new Date(moment(cDate).add(1, 'weeks').format());
                                    Cron.findOneAndUpdate(foundSaller.id, {NextToken: response.NextToken}, (err, selData) => {
                                        return res.status(200).json({ messsage: 'done cron data' });
                                        }
                                    )
                                }else{
                                    Cron.findByIdAndRemove(foundSaller.id, (err, fseller) => {
                                        if (err){}

                                    });
                                }
                            });
                        });
                    }
                });

            }

        });
    },
    orderItems: function (req, res) {
        Order.find({haveItem: { $exists: false }}, (err, foundOrders) => {
            if (err) {}
            async.each(foundOrders, function (order, callb) {
                let orderId = order.AmazonOrderId;
                let sellerId = order.sellerId;
                SellerConfig.findOne({SellerId: sellerId}, (err, sellerConfig)=>{
                    if(err){

                    }
                    var amazonMws = require('amazon-mws')(sellerConfig.tokenConfig.mws_key, sellerConfig.tokenConfig.mws_access);

                    amazonMws.orders.search({
                        'Version': '2013-09-01',
                        'Action': 'ListOrderItems',
                        'SellerId': sellerId,
                        'MWSAuthToken': sellerConfig.MWSAuthToken,
                        'AmazonOrderId': orderId,
                    }, function (error, response) {
                        if (error) {
                            //console.log(error);
                        }
                        if(response && Object.keys(response).length){

                            let itemData = response.OrderItems.OrderItem;
                            let respOrder = {AmazonOrderId: response.AmazonOrderId, asin: itemData.ASIN, qty: itemData.QuantityOrdered,
                                sku: itemData.SellerSKU, title: itemData.Title, itemId: itemData.OrderItemId,
                                price: itemData.ItemPrice && itemData.ItemPrice.Amount? itemData.ItemPrice.Amount : '',
                                currency: itemData.ItemPrice && itemData.ItemPrice.CurrencyCode?itemData.ItemPrice.CurrencyCode: ''};
                            OrderItem.findOne({ AmazonOrderId: response.AmazonOrderId, itemId: respOrder.itemId}, (err, existingItem) => {
                                if (err) { }
                                // If order is exist
                                if (!existingItem) {
                                    respOrder.sellerId = sellerId;
                                    const orderData = new OrderItem(respOrder);
                                    orderData.save((err, savedOrderItem) => {
                                        if (err) { }
                                        Order.findOne({ AmazonOrderId: savedOrderItem.AmazonOrderId}, function (err, findOrderDta) {
                                            if (err){}
                                            if(findOrderDta){
                                                Order.findById(findOrderDta.id, function (err, orderData) {
                                                    if (err){}
                                                    orderData.haveItem = true;
                                                    orderData.orderItem.push(savedOrderItem.id);
                                                    orderData.save(function (err, updatedOrder) {
                                                        if (err){}
                                                        callb(updatedOrder);
                                                    });
                                                });
                                            }else{
                                                callb();
                                            }
                                        });
                                    });
                                }else{
                                    callb({ exist: true, item: existingItem });
                                }
                            });
                        }else{
                            callb();
                        }
                    });
                })
            }, function (err) {
                if(err){
                    //console.log(err);
                    //console.log('there is a problem to get order data from API.');
                }else{
                    return res.status(200).json({ messsage: 'done cron data' });
                    // console.log('Item Order Saved.');
                }
            });
        })
    }
};


function formateSaveUpdateOrderData(resp, callback){
    if(resp && Object.keys(resp).length){
        if(resp.Orders.Order.length){
            async.each(resp.Orders.Order, function (order, callb) {
                Order.findOne({ AmazonOrderId: order.AmazonOrderId}, (err, existingId) => {
                    if (err) { }

                    // If order is exist
                    if (!existingId) {
                        order.sellerId = resp.sellerId;
                        const orderData = new Order(order);
                        orderData.save((err, sellerData) => {
                            if (err) {}
                            callb();
                        });
                    }else{
                        callb();
                    }
                });
            }, function (err) {
                if(err){
                    //console.log(err);
                    callback({message: 'there is a problem to get data.'});
                }else{
                    callback({message: 'Order data has been updated'});
                }
            });
        }else{
            //console.log('Did not response any data.');
            callback({message: 'Did not response any data.'});
        }
    }else{
        //console.log('Did not response any data.');
        callback({message: 'Did not response any data.'});
    }
}