const cron = require('node-cron');
const Order = require('../models/order');
const OrderItem = require('../models/orderItem');
const Template = require('../models/template');
const FeedbackRequest = require('../models/feedbackRequest');
const async = require("async");
const Product = require('../models/product');
const Cron = require('../models/cron');
const SellerConfig = require('../models/sellerConfig');
const Mail = require('../controllers/mail');

const amazonMws = require('amazon-mws')('AKIAIEGT53RIXYQUCTPQ','VdToubCLaeVs+ngo3g7aIGCUzlqsisfCVWnKCga6');
const moment = require('moment');

module.exports = {
    orders: function () {
//run every 3 minutes
        let order = cron.schedule('*/3 * * * *', function(){
          //for NextToken
            Cron.findOne({ type: 'order'}, (err, foundOrder) => {
                if (err) {return next(err); }
                if (foundOrder && foundOrder.SellerId) {
                    // console.log(foundOrder.NextToken);
                    SellerConfig.findOne({SellerId: foundOrder.SellerId}, (err, sellerConfig)=>{
                        if(err){
                            console.log("Order SellerConfig.findOne error:"+err);
                        }
                        var amazonMws = require('amazon-mws')(sellerConfig.tokenConfig.mws_key, sellerConfig.tokenConfig.mws_access);

                        if(sellerConfig && sellerConfig.SellerId){
                            let sellerId = sellerConfig.SellerId;
                            let cDate;
                            if(sellerConfig.current_date){
                                cDate = new Date(sellerConfig.current_date);
                            }else{
                                cDate = new Date(moment().subtract(3, 'years').format());
                            }
                            let searchQuery = {
                                'Version': '2013-09-01',
                                'Action': 'ListOrders',
                                'SellerId': sellerId,
                                'MWSAuthToken': sellerConfig.tokenConfig.MWSAuthToken,
                                'MarketplaceId.Id.1': sellerConfig.MarketplaceId,
                                'LastUpdatedAfter': cDate
                            };
                            if(foundOrder.NextToken){
                                searchQuery.NextToken = foundOrder.NextToken;
                                searchQuery['Action'] = 'ListOrdersByNextToken';
                            }
                            console.log('amazon mws order search');
                            amazonMws.orders.search(searchQuery, function (error, response) {
                                if (error) {
                                    console.log('amazonMws.orders.search error :');
                                    console.log(error);
                                    return;
                                }
                                response.sellerId = sellerId;
                              // console.log('response.sellerId'+sellerId);
                                formateSaveUpdateOrderData(response, function (respData) {
                                    // let cuDate = sellerConfig.current_date;
                                    if(moment(cDate).isBefore(moment())){
                                        // cuDate = new Date(moment(cDate).add(1, 'weeks').format());
                                      //Cron is MongoDb
                                        Cron.findOneAndUpdate(sellerConfig.id, {NextToken: response.NextToken}, (err, selData) => {
                                            // return res.status(200).json({ messsage: 'done cron data' });
                                            console.log('Cron NextToken updated');
                                            }
                                        )
                                    }else{
                                        Cron.findByIdAndRemove(sellerConfig.id, (err, fseller) => {
                                            if (err){}
                                            console.log("The crone has been deleted");
                                        });
                                    }
                                });
                            });
                        }
                    });
                }
            });
        }, false);
        order.start();
    },
  //run every 5 minutes
    orderItems: function () {
        let orderItem = cron.schedule('*/5 * * * *', function() {
            console.log('run a orderItems cron request');
            Order.find({haveItem: { $exists: false }}, (err, foundOrders) => {
                if (err) {}
                async.each(foundOrders, function (order, callb) {
                    let orderId = order.AmazonOrderId;
                    let sellerId = order.sellerId;
                    SellerConfig.findOne({SellerId: sellerId}, (err, sellerConfig)=>{
                        if(err){
                            console.log(err);
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
                                console.log("'Action': 'ListOrderItems' error:");
                              console.log(error);
                            }
                            if(response && Object.keys(response).length){

                                let itemData = response.OrderItems.OrderItem;
                                let respOrder = {AmazonOrderId: response.AmazonOrderId, asin: itemData.ASIN, qty: itemData.QuantityOrdered,
                                    sku: itemData.SellerSKU, title: itemData.Title, itemId: itemData.OrderItemId,
                                    price: itemData.ItemPrice && itemData.ItemPrice.Amount? itemData.ItemPrice.Amount : '',
                                    currency: itemData.ItemPrice && itemData.ItemPrice.CurrencyCode?itemData.ItemPrice.CurrencyCode: ''};
                                OrderItem.findOne({ AmazonOrderId: response.AmazonOrderId, itemId: respOrder.itemId}, (err, existingItem) => {
                                    if (err) {}
                                    // If order is exist
                                    if (!existingItem) {
                                        respOrder.sellerId = sellerId;
                                        const orderData = new OrderItem(respOrder);
                                        orderData.save((err, savedOrderItem) => {
                                            if (err) {}
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
                      console.log('there is a problem to get order data from API.');
                      // console.log(err);
                    }else{
                        console.log('Item Order Saved.');
                        // return res.status(200).json({ messsage: 'done cron data' });
                    }
                });
            })
        }, false);
        orderItem.start();
    },

    sendScheduleLetter: function () {
        let mailer = cron.schedule('*/1 * * * *', function(){
            //console.log("Mail automation calling...")
            Template.find({template_status: 'active'})
                .exec(function (err,Temp) {
              if (err) {
                //console.log(err);
              } else {
                Temp.forEach(function (temp,index) {
                    // console.log(temp);
                    Order.find({AmazonOrderId: temp.order_id}).populate('orderItem').exec(function (error,Ord) {
                        if (error) {
                          //console.log(error);
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
                                            //console.log("NEGATIVE FEEDBACK BUT RATING = "+avg_rating);
                                            sent_email = 0;
                                          }else if(exclude_neutral_feedback == 1 && avg_rating == 3){
                                            //console.log("NEUTRAL FEEDBACK BUT RATING = "+avg_rating);
                                            sent_email = 0;
                                          }else if(exclude_positive_feedback == 1 && avg_rating > 3){
                                            //console.log("POSITIVE FEEDBACK BUT RATING = "+avg_rating);
                                            sent_email = 0;
                                          }

                                          //console.log(avg_rating);
                                        }else{
                                          //console.log("NO FEEDBACK FOUND");
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
                                      //console.log("CHECKED ALL EXCLUDE ORDERS");
                                      ScheduleMail(Ord, temp);
                                    }

                                    //console.log("PRODUCT FIND");
                                  });

                                }else{
                                  //console.log("EXCLUDE ORDERS EMPTY");
                                  // // 
                                  ScheduleMail(Ord, temp);
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


                // res.send('Schedule email sent to user');

              }

            }).catch(error=>{})
        }, false);

        //mailer.start();
    },
  prodcuts: function () {
//run every 1 minutes
    let products= cron.schedule('*/1 * * * *', function(){
      //for NextToken
      Cron.findOne({ type: 'product'}, (err, foundOrder) => {
        if (err) {return next(err); }
        if (foundOrder && foundOrder.SellerId) {
          // console.log(foundOrder.NextToken);
          SellerConfig.findOne({SellerId: foundOrder.SellerId}, (err, sellerConfig)=>{
            if(err){
              console.log("Order SellerConfig.findOne error:"+err);
            }
            const amazonMws = require('amazon-mws')(sellerConfig.tokenConfig.mws_key, sellerConfig.tokenConfig.mws_access);
            if(sellerConfig && sellerConfig.SellerId){
              let mws= {
                'Version': '2009-01-01',
                'Action': 'RequestReport',
                'SellerId': foundOrder.SellerId,
                'MWSAuthToken': sellerConfig.MWSAuthToken
              };
              if (foundOrder.count===0) //no token, no reportRequestId
              {
                mws.ReportType='_GET_MERCHANT_LISTINGS_ALL_DATA_';
              }
              else if (foundOrder.count===1) { //no token,
                mws.Action='GetReportList';
              }
              else{ // next token
                mws.NextToken = foundOrder.NextToken;
                mws.Action='GetReportListByNextToken';
              }
              amazonMws.reports.search(mws,function (error, response) { //request report
                  if (error) {console.log('error ', error); return;}
                  if (foundOrder.count===0) {// requestReport
                    foundOrder.NextToken= response['ReportRequestInfo']['ReportRequestId'];
                    console.log('request report done with id: ', foundOrder.NextToken);
                  }
                  else{
                    console.log(response);
                    if (response.HasNext){
                      foundOrder.NextToken=response.NextToken;
                    }
                    else{
                      foundOrder.count=-1;
                    }
                  }
                  foundOrder.count++;
                foundOrder.save((err, savedItem) => {
                  if (err) { console.log(err); return;}
                  if (foundOrder.count===1){ console.log('request report end'); return;}
                  // Get Product Info
                  const requestReportData = response['ReportInfo'];
                  const reportId = requestReportData[0]['ReportId'];
                  console.log('report Id:', reportId);
                  mws= {
                    'Version': '2009-01-01',
                    'Action': 'GetReport',
                    'SellerId': foundOrder.SellerId,
                    'MWSAuthToken': sellerConfig.MWSAuthToken,
                    'ReportId': reportId
                  };
                  amazonMws.reports.search(mws, function (error, response) {
                    if (error) {   console.log('error', error);             }
                    let respData = response.data || [];
                    let productData = {};
                    console.log('found report output data: ', respData.length);
                    async.each(respData, function (product, callb) {
                          console.log(product.asin1);
                          Product.findOne({ product_id: product['product-id'] }, (err, existingItem) => {
                            if (err) { console.log(err);}
                            if (existingItem) {
                              // console.log('exsiting asin:'+product.asin1);
                              return callb();
                            }else{
                              console.log('added asin:'+product.asin1);
                              // scrapping image from product
                              let asin = product['asin1'];
                              productData = {item_name: product['item-name'], item_description: product['item-description'], listing_id: product['listing-id'],
                                seller_sku: product['seller-sku'],
                                price: product['price'], quantity: product['quantity'], open_date: product['open-date'],
                                item_is_marketplace: product['item-is-marketplace'] === 'y',
                                product_id_type: product['product-id-type'], zshop_shipping_fee: product['zshop-shipping-fee'],
                                item_note: product['item-note'], item_condition: product['item-condition'],
                                zshop_category1: product['zshop-category1'], zshop_browse_path: product['zshop-browse-path'],
                                zshop_storefront_feature: product['zshop-storefront-feature'],
                                asin1: product['asin1'], asin2: product['asin2'], asin3: product['asin3'],
                                will_ship_internationally: product['will-ship-internationally'],
                                expedited_shipping: product['expedited-shipping'], zshop_boldface: product['zshop-boldface'], product_id: product['product-id'],
                                bid_for_featured_placement: product['bid-for-featured-placement'], add_delete: product['add-delete'],
                                pending_quantity: product['pending-quantity'],
                                fulfillment_channel: product['fulfillment-channel'], merchant_shipping_group: product['merchant-shipping-group'],
                                status: product['status']};

                              productData.sellerId = foundOrder.SellerId;
                              var image_url = "";
                              amazonMws.products.search({
                                'Version': '2011-10-01',
                                'Action': 'GetMatchingProduct',
                                'SellerId': foundOrder.SellerId,
                                'MWSAuthToken': sellerConfig.MWSAuthToken,
                                'MarketplaceId': sellerConfig.MarketplaceId,
                                'ASINList.ASIN.1': asin
                              }).then(function (response) {
                                productData.image_url = response.Product.AttributeSets.ItemAttributes.SmallImage.URL;
                                productData.pen_name = response.Product.AttributeSets.ItemAttributes.Publisher;
                                //productData.rating = response.Product.SalesRankings.salesRank[0].Rank;
                                const productDataObj = new Product(productData);
                                productDataObj.save((err, savedItem) => {
                                  if (err) { console.log(err); }
                                  return callb();
                                });
                              }).catch(function (error) {
                                console.log('error products', error);
                              });
                            }
                          });
                        },
                        function (err) {
                          if(err){
                            console.log(err);
                          }else{
                            // Console Report Done
                            console.log('Already added whatever found product data asin:');
                          }
                        });
                  });
                });
              });
            }
          });
        }
      });
    }, false);
    products.start();
  }
};

function formateSaveUpdateOrderData(resp, callback){
    if(resp && Object.keys(resp).length){
        if(resp.Orders.Order.length){
          // console.log('formateSaveUpdateOrderData resp Length:'+resp.Orders.Order.length);
            async.each(resp.Orders.Order, function (order, callb) {
                Order.findOne({ AmazonOrderId: order.AmazonOrderId}, (err, existingId) => {
                    if (err) {}
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
            callback({message: 'Get order : Did not response any data.'});
        }
    }else{
        //console.log('Did not response any data.');
        callback({message: 'Get order : Did not response any data.'});
    }
}



function ScheduleMail( Ord, temp){

  var messageBody = generateTemplatePreviewHtml(temp.email_message, Ord);
  let obj = {
      //email: Ord.BuyerEmail,
      email: 'shakil.shaion@gmail.com',
      templateData: temp,
      messageBody: messageBody,
      hostname: '',
      appUrl: ''
  };
  Mail.sendToOrdererFromSchedule(obj,function (result) {
      temp.﻿number_of_email_sent += 1;
      temp.save(function (err, myTemp) {
        //console.log("Temp Save");
          if (err) {
             res.status(403).send(err);
          } else {
            Ord.sent_email_status = 'sent_status:1';
            Ord.number_of_email_sent += 1;
            Ord.save(function (err, ord) {
              //console.log("order Save");
                if (err) {
                  res.status(403).send(err);
                }
                var tData = {};
                tData.temp_id = temp._id;
                tData.order_id = ord._id;
                const orderEmailStatData = new OrderEmailStat(tData);

                orderEmailStatData.save(function (err, emailStat){
                  //console.log("Working...........");
                })
                
            });
            
          }
      });
  });
}

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