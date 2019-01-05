const Product = require('../models/product');
const User = require('../models/user');
const SellerConfig = require('../models/sellerConfig');
const OrderItem = require("../models/orderItem");
const config = require('../config/main');
const async = require("async");
const moment = require("moment");

var scraper = require('../library/product-scraper');
// const AmazonScraper = require('amazon-scraper')

const mws_key = config.MWS_KEY || '';
const mws_access = config.MWS_SECRET || '';
//var amazonMws = require('amazon-mws')('AKIAIEGT53RIXYQUCTPQ','VdToubCLaeVs+ngo3g7aIGCUzlqsisfCVWnKCga6');

exports.getProducts = function (req, res, next) {
    var user_id = req.query.userId;
    User.findById(user_id, (err, user) => {
        if (err) {
          res.status(400).json({ error: 'No user could be found for this ID.' });
          return next(err);
        }
        if(user.SellerId == null){
            return res.status(200).json({});
        }

        var sellerId = user.SellerId;
        SellerConfig.find({SellerId: sellerId}).exec(function(err, sellerConfig){
            var amazonMws = require('amazon-mws')(sellerConfig[0].tokenConfig.mws_key, sellerConfig[0].tokenConfig.mws_access);
             amazonMws.products.search({
                'Version': '2011-10-01',
                'Action': 'ListMatchingProducts',
                'SellerId': sellerId,
                'MWSAuthToken': sellerConfig[0].MWSAuthToken,
                'MarketplaceId': sellerConfig[0].MarketplaceId,
                'Query': '0439708184'
            }, function (error, response) {
                if (error) {
                    return;
                }
                console.log(JSON.stringify(response.Products.Product));
                if(response && Object.keys(response).length){
                    // let orders = formatProductData(response);
                    console.log("count: ", response['Products']['Product'].length);
                    console.log("Response: ", response['Products']['Product'][0]['AttributeSets']['ItemAttributes']['SmallImage']);
                    console.log("Response: ", response['Products']['Product'][0]['SalesRankings']['SalesRank']);

                   return res.status(200).json(response);
                }

            });
        });
    })

}


// product scrapper
exports.singleProduct = function (req, res, next){
    // scraper.init('http://www.amazon.com/gp/product/B07GJJJGCL/', function(data){
    scraper.init('http://www.amazon.com/gp/product/B01N1UX8RW/', function(data){
        return res.status(200).json(data);
    });
}


//  For test purpose
exports.deleteProducts = function (req, res, next) {
    Product.remove({}, (err, deletedProducts) => {
        if (err) {
        }
        return res.status(200).json({message: "Delete Successfully"});
    });
}
// get products with mws token from aws
exports.requestReport = function (req, res, next) {
    const userId = req.query.userId;
    var SellerId;
    console.log("get products with mws token from aws userId: " + userId);
    User.findById(userId, (err, user) => {
        if (err) {
            res.status(400).json({error: 'No user could be found for this ID.'});
            return next(err);
        }
        if(user.SellerId == null){
            console.log("No SellerId");
            return res.status(200).json({});
        }
        SellerId = user.SellerId;
        console.log("SellerId:", SellerId);
        SellerConfig.findOne({SellerId: SellerId}).exec(function(err, sellerConfig){
          const amazonMws = require('amazon-mws')(sellerConfig.tokenConfig.mws_key, sellerConfig.tokenConfig.mws_access);
          let mws= {
            'Version': '2009-01-01',
            'Action': 'RequestReport',
            'SellerId': SellerId,
            'MWSAuthToken': sellerConfig.MWSAuthToken,
            'ReportType': '_GET_MERCHANT_LISTINGS_ALL_DATA_'
          };
          // 'MarketplaceIdList.Id.1': 'ATVPDKIKX0DER',
          amazonMws.reports.search(mws,function (error, response) {
              if (error) {
                  console.log('error ', error);
              }
              const reportRequestId = response['ReportRequestInfo']['ReportRequestId'];
              console.log('request report done with id: ', reportRequestId);
              // setTimeout(function () {
              //     console.log('currently on the timeout function in');

            mws= {
              'Version': '2009-01-01',
              'Action': 'GetReportList',
              'SellerId': SellerId,
              'MWSAuthToken': sellerConfig.MWSAuthToken
              // 'ReportRequestIdList.Id.1':reportRequestId
            };
                  amazonMws.reports.search(mws, function (error, response) {
                      if (error) {
                          console.log('error ', error);
                      }
                    console.log('currently on the response report list');
                      console.log(response);
                    const requestReportData = response['ReportInfo'];
                    // .filter(function (rf) {
                    //     return rf['ReportRequestId'] === reportRequestId;
                    // });
                    // console.log("requestReportData: ", requestReportData);
                    if( requestReportData && requestReportData.length ){
                        const reportId = requestReportData[0]['ReportId'];
                        // Console Report Id
                        console.log('report Id found with: ', reportId);
                      mws= {
                        'Version': '2009-01-01',
                        'Action': 'GetReport',
                        'SellerId': SellerId,
                        'MWSAuthToken': sellerConfig.MWSAuthToken,
                        'ReportId': reportId
                      };
                      amazonMws.reports.search(mws, function (error, response) {
                          if (error) {
                              console.log('error', error);
                          }
                          let respData = response.data || [];
                          let productData = {};
                          // Console Report Data
                          console.log('found report output data: ', respData.length);
                          async.each(respData, function (product, callb) {
                            console.log(product.asin1);
                            Product.findOne({ product_id: product['product-id'] }, (err, existingItem) => {
                                  if (err) { console.log(err);}
                                  if (existingItem) {
                                    console.log('exsiting asin:'+product.asin1);
                                      return callb();
                                  }else{
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

                                      productData.sellerId = SellerId;
                                      var image_url = "";
                                      amazonMws.products.search({
                                          'Version': '2011-10-01',
                                          'Action': 'GetMatchingProduct',
                                          'SellerId': SellerId,
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
                                  Product.find({SellerId: SellerId}).limit(150).exec(function (err, products) {
                                      if (err){console.log("error: ", err);}
                                      console.log("Send products Count", products.length);
                                      return res.status(200).json({ products: products });
                                  })
                              }
                          });
                      });
                    }else{
                        console.log("Failed!!!");
                        return res.status(200).json({});
                    }
                  });
              // }, 180000)
            });//amazonMws.reports

        });
    });
}



exports.saveProductReport = function (req, res, next) {
    let reportId = req.params.id;
    var user_id = req.query.userId;
    if (config.test_mode) {
        user_id = "5b8d2195df84c010229fd2df";
    }
    User.findById(user_id, (err, user) => {
        if (err) {
            res.status(400).json({error: 'No user could be found for this ID.'});
            return next(err);
        }
        if(user.SellerId == null){
            return res.status(200).json({});
        }
        var sellerId = user.SellerId;

        amazonMws.reports.search({
            'Version': '2009-01-01',
            'Action': 'GetReport',
            'SellerId': sellerId,
            'MWSAuthToken': 'amzn.mws.3aaf2cf5-417d-c970-3895-30d590fa88f8',
            'ReportId': reportId
            //'ReportTypeList.Type.1': 'REPORT_TYPE_LIST' //optional
        }, function (error, response) {
            if (error) {
                console.log(error);
            }
            // return res.status(200).json(response);
            let respData = response.data || [];
            let productData = {};
            // return res.status(200).json(response);
            async.each(respData, function (product, callb) {
                Product.findOne({product_id: product['product-id']}, (err, existingItem) => {
                    if (err) {
                        console.log(err);
                    }

                    if (existingItem) {
                        return callb();
                    } else {
                        // scrapping image from product
                        let asin = product['asin1'];
                        scraper.init('http://www.amazon.com/gp/product/' + asin + '/', function (data) {
                            productData = {
                                item_name: product['item-name'],
                                item_description: product['item-description'],
                                listing_id: product['listing-id'],
                                seller_sku: product['seller-sku'],
                                price: product['price'],
                                quantity: product['quantity'],
                                open_date: product['open-date'],
                                item_is_marketplace: product['item-is-marketplace'] === 'y',
                                product_id_type: product['product-id-type'],
                                zshop_shipping_fee: product['zshop-shipping-fee'],
                                item_note: product['item-note'],
                                item_condition: product['item-condition'],
                                zshop_category1: product['zshop-category1'],
                                zshop_browse_path: product['zshop-browse-path'],
                                zshop_storefront_feature: product['zshop-storefront-feature'],
                                asin1: product['asin1'],
                                asin2: product['asin2'],
                                asin3: product['asin3'],
                                will_ship_internationally: product['will-ship-internationally'],
                                expedited_shipping: product['expedited-shipping'],
                                zshop_boldface: product['zshop-boldface'],
                                product_id: product['product-id'],
                                bid_for_featured_placement: product['bid-for-featured-placement'],
                                add_delete: product['add-delete'],
                                pending_quantity: product['pending-quantity'],
                                fulfillment_channel: product['fulfillment-channel'],
                                merchant_shipping_group: product['merchant-shipping-group'],
                                status: product['status']
                            };

                            productData.sellerId = sellerId;
                            productData.image_url = data.image;
                            var rating = data.review.length > 0 ? data.review[0].split(' ')[0] : '';
                            rating = Math.round(rating);
                            productData.rating = rating;

                            const productDataObj = new Product(productData);
                            productDataObj.save((err, savedItem) => {
                                if (err) {
                                    console.log(err);
                                }
                                return callb();
                            });
                        });
                    }
                });

            }, function (err) {
                if (err) {
                    console.log(err);
                    console.log('there is a problem to get order data from API.');
                } else {
                    return res.status(200).json(response);
                    // console.log('Item Order Saved.');
                }
            });
          });
        });

};

// fetchProducts(userId)
exports.list = function (req, res, next) {
    var user_id = req.query.userId;
    if(config.test_mode){
        user_id = "5b8d2195df84c010229fd2df";
    }
    User.findById(user_id, (err, user) => {
        if (err) {
          res.status(400).json({ error: 'No user could be found for this ID.' });
          return next(err);
        }

        if(user.SellerId == null){
            console.log("No SellerId");
            return res.status(200).json({});
        }
        var sellerId = user.SellerId;
        console.log("SellerId: ", sellerId);
        Product.find({sellerId: sellerId}).limit(150).exec(function (err, products) {
            if (err){console.log(err);}
            Product.find(
                { sellerId: sellerId, $or: [{ rating: "1" }, { rating: "2"}] }
            ).limit(150).exec(function(err, reviews) {
                if (err){console.log(err);}

                console.log("review "+ reviews.length);
                return res.status(200).json({ totalNegativeReview: reviews.length, products: products });
            });

        });
    });

}

exports.filterList = function(req, res, next) {
    let date_start = req.body.date_start;
    let date_end = req.body.date_end;
    let filter_items = req.body.filter_items;
    let item_name = req.body.product_name;


    var d = new Date();
    var hrs = d.getHours();
    var min = d.getMinutes();

    if(date_start && date_end){
        date_start = date_start.replace('/', '-');
        date_start = date_start+ ' '+hrs+':'+min+':00 PDT';

        date_end = date_end.replace('/', '-');
        date_end = date_end+ ' '+hrs+':'+min+':00 PDT';
    }

    console.log(filter_items);
    var user_id = req.body.userId;
    if(config.test_mode){
        user_id = "5b8d2195df84c010229fd2df";
    }
    User.findById(user_id, (err, user) => {
        if (err) {
          res.status(400).json({ error: 'No user could be found for this ID.' });
          return next(err);
        }
        if(user.SellerId == null){
            console.log("No SellerId");
            return res.status(200).json({});
        }
        var sellerId = user.SellerId;

        Product.find(
                { sellerId: sellerId, $or: [{ rating: "1" }, { rating: "2"}] }
            ).limit(150).exec(function(err, reviews) {
                if (err){console.log(err);}

                if ((date_start && date_end) && (filter_items && filter_items.length) && item_name) {

                    Product.find(
                      {
                        $and: [
                          {
                            open_date: {
                              $gte: date_start, $lt: date_end
                            },
                            sellerId: sellerId
                          },
                          {
                            $or: [
                              {
                                rating: {
                                  $in: filter_items
                                }
                              },
                              {
                                item_name: { $regex: '.*' + item_name + '.*' }
                              },
                              {
                                status: {
                                  $in: filter_items
                                }
                              }
                            ]
                          }
                        ]
                      }
                    ).limit(150).collation( { locale: 'en', strength: 2 }).exec(function(err, products) {
                        if (err){console.log(err);}
                        return res.status(200).json({ totalNegativeReview: reviews.length, products: products });
                    });
                }else if ((date_start && date_end) && (filter_items && filter_items.length)) {
                    Product.find(
                      {
                        $and: [
                          {
                            open_date: {
                              $gte: date_start, $lt: date_end
                            },
                            sellerId: sellerId
                          },
                          {
                            $or: [
                              {
                                rating: {
                                  $in: filter_items
                                }
                              },
                              {
                                status: {
                                  $in: filter_items
                                }
                              }
                            ]
                          }
                        ]
                      }
                    ).limit(150).collation( { locale: 'en', strength: 2 }).exec(function(err, products) {
                        if (err){console.log(err);}
                        return res.status(200).json({ totalNegativeReview: reviews.length, products: products });
                    });
                } else if ((date_start && date_end) && item_name) {
                    Product.find(
                      {
                        $and: [
                          {
                            open_date: {
                              $gte: date_start, $lt: date_end
                            },
                            sellerId: sellerId
                          },
                          {
                            item_name: { $regex: '.*' + item_name + '.*' }
                          }
                        ]
                      }
                    ).limit(150).collation( { locale: 'en', strength: 2 }).exec(function(err, products) {
                        if (err){console.log(err);}
                        return res.status(200).json({ totalNegativeReview: reviews.length, products: products });
                    });
                } else if (date_start && date_end) {
                    Product.find(
                      { sellerId: sellerId, open_date: { $gte: date_start, $lt: date_end } }
                    ).limit(150).exec(function(err, products) {
                        if (err){console.log(err);}

                        return res.status(200).json({ totalNegativeReview: reviews.length, products: products });
                    });
                }else if ((filter_items && filter_items.length) && item_name) {
                    Product.find(
                        {
                        $and: [
                          {
                            item_name: { $regex: '.*' + item_name + '.*' },
                            sellerId: sellerId
                          },
                          {
                            $or: [
                                {
                                    rating: {
                                      $in: filter_items
                                    }
                                },
                                {
                                    status: {
                                        $in: filter_items
                                    }
                                }
                            ]
                          }
                        ]
                      }
                    ).limit(150).collation( { locale: 'en', strength: 2 }).exec(function(err, products) {
                        if (err){console.log(err);}
                        return res.status(200).json({ totalNegativeReview: reviews.length, products: products });

                    });

                } else if (filter_items && filter_items.length) {
                    Product.find(
                      {
                        sellerId: sellerId,

                        $or: [
                        {
                            rating: {
                              $in: filter_items
                            }
                        },
                        {
                            status: {
                                $in: filter_items
                            }
                        }
                    ]}
                    ).limit(150).collation( { locale: 'en', strength: 2 }).exec(function(err, products) {
                        if (err){console.log(err);}
                        return res.status(200).json({ totalNegativeReview: reviews.length, products: products });

                    });

                } else if (item_name) {
                    Product.find(
                      { sellerId: sellerId, item_name: { $regex: '.*' + item_name + '.*' }  }
                    ).limit(150).collation( { locale: 'en', strength: 2 }).exec(function(err, products) {
                        if (err){console.log(err);}
                        return res.status(200).json({ totalNegativeReview: reviews.length, products: products });

                    });

                } else {
                    Product.find({sellerId: sellerId}).limit(150).collation( { locale: 'en', strength: 2 }).exec(function(err, products) {
                        if (err){console.log(err);}
                        return res.status(200).json({ totalNegativeReview: reviews.length, products: products });
                    });
                }
        });
    });
};


function formatProductData(resp){
    let orderData = {NextToken: resp.NextToken, RequestId: resp.ResponseMetadata.RequestId};
    orderData.orders = resp.Orders.Order;
    return orderData;
}


exports.topTenProducts = function (req, res, next) {
    let order = req.body.order;
    let rating = req.body.rating;
    var user_id = req.body.userId;
    if(config.test_mode){
        user_id = "5b8d2195df84c010229fd2df";
    }
    User.findById(user_id, (err, user) => {
        if (err) {
            res.status(400).json({error: 'No user could be found for this ID.'});
            return next(err);
        }
        if(user.SellerId == null){
            console.log("No SellerId");
            return res.status(200).json({});
        }
        var sellerId = user.SellerId;
            OrderItem.aggregate([
                {
                    $match:
                        {
                            sellerId: sellerId
                        }
                },
                {
                    $group: {
                        _id: '$asin',
                        totalOrder: {$sum: 1}
                    }
                },
                {$sort: {_id: -1}}
            ], function (err, orderItem) {
                if (err) {
                    console.log(err);
                }
              if (order) {
                product_ids = [];
                for (let i = 0; i < orderItem.length; i++) {
                    product_ids.push(orderItem[i]._id)
                }
                Product.find({
                    asin1: {
                        $in: product_ids
                    }
                }).limit(10).sort({open_date: 1}).exec(function (err, product) {
                    if (err) {
                        console.log(err);
                    }
                  for (let i = 0; i < product.length; i++) {
                    for (let j = 0; j < orderItem.length; j++) {
                      if (product[i].asin1 === orderItem[j]._id)
                        product[i].order_count = orderItem[j].totalOrder;
                    }
                  }
                    //console.log(product);
                    return res.status(200).json({top_product: product});
                });
              } else {
                Product.find({sellerId: sellerId}).sort({rating: -1}).limit(10).sort({open_date: 1}).exec(function (err, product) {
                  if (err) {
                    console.log(err);
                  }
                  for (let i = 0; i < product.length; i++) {
                    for (let j = 0; j < orderItem.length; j++) {
                      if (product[i].asin1===orderItem[j]._id)
                        product[i].order_count=orderItem[j].totalOrder;
                    }
                  }
                  // console.log(product);
                  return res.status(200).json({top_product: product});
                });
              }
            });
    });
};
