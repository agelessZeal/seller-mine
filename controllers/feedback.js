const Order = require("../models/order");
const User = require("../models/user");
const Feedback = require("../models/feedback");
const SellerConfig = require('../models/sellerConfig');
const RemoveFeedbackRequest = require("../models/removeFeedbackRequest");
const Product = require("../models/product");
const OrderItem = require("../models/orderItem");
const config = require("../config/main");
const moment = require("moment");
const async = require("async");
const Mail = require('./mail');

const mws_key = config.MWS_KEY || "";
const mws_access = config.MWS_SECRET || "";
var amazonMws = require("amazon-mws")("AKIAIEGT53RIXYQUCTPQ", "VdToubCLaeVs+ngo3g7aIGCUzlqsisfCVWnKCga6");

exports.getReportList = function (req, res, next) {

    var user_id = req.query.userId;
    if (config.test_mode) {
        user_id = "5b8d2195df84c010229fd2df";
    }
    User.findById(user_id, (err, user) => {
        if (err) {
            res.status(400).json({error: 'No user could be found for this ID.'});
            return next(err);
        }

        if (user.SellerId == null) {
            console.log("No SellerId");
            return res.status(200).json({});
        }

        var sellerId = user.SellerId;

        SellerConfig.find({SellerId: sellerId}).exec(function (err, sellerConfig) {
            var amazonMws = require('amazon-mws')(sellerConfig.tokenConfig.mws_key, sellerConfig.tokenConfig.mws_access);


            amazonMws.reports.search({
                "Version": "2009-01-01",
                "Action": "GetReportList",
                "SellerId": sellerId,
                "MWSAuthToken": sellerConfig.MWSAuthToken
                //'ReportTypeList.Type.1': 'REPORT_TYPE_LIST' //optional
            }, function (error, response) {
                if (error) {
                    //console.log("error ", error);
                    // return;
                    return res.status(200).json(error);
                }
                return res.status(200).json(response);
                // console.log('response', response);
            });
        });
    });
};

exports.getReportRequestList = function (req, res, next) {
    var user_id = req.query.userId
    // var user_id = "5b8d2195df84c010229fd2df";
    User.findById(user_id, (err, user) => {
        if (err) {
            res.status(400).json({error: 'No user could be found for this ID.'});
            return next(err);
        }

        if (user.SellerId == null) {
            console.log("No SellerId");
            return res.status(200).json({});
        }

        var sellerId = user.SellerId;

        SellerConfig.find({SellerId: sellerId}).exec(function (err, sellerConfig) {
            var amazonMws = require('amazon-mws')(sellerConfig.tokenConfig.mws_key, sellerConfig.tokenConfig.mws_access);

            amazonMws.reports.search({
                "Version": "2009-01-01",
                "Action": "GetReportRequestList",
                "SellerId": sellerId,
                "MWSAuthToken": sellerConfig.MWSAuthToken
                //'ReportTypeList.Type.1': 'REPORT_TYPE_LIST' //optional
            }, function (error, response) {
                if (error) {
                    //console.log("error ", error);
                    // return;
                    return res.status(200).json(error);
                }
                return res.status(200).json(response);
                // console.log('response', response);
            });
        })
    })
};


exports.getReport = function (req, res, next) {
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

        if (user.SellerId == null) {
            console.log("No SellerId");
            return res.status(200).json({});
        }

        var sellerId = user.SellerId;

        SellerConfig.find({SellerId: sellerId}).exec(function (err, sellerConfig) {
            var amazonMws = require('amazon-mws')(sellerConfig.tokenConfig.mws_key, sellerConfig.tokenConfig.mws_access);


            amazonMws.reports.search({
                "Version": "2009-01-01",
                "Action": "GetReport",
                "SellerId": sellerId,
                "MWSAuthToken": sellerConfig.MWSAuthToken,
                "ReportId": reportId
                //'ReportTypeList.Type.1': 'REPORT_TYPE_LIST' //optional
            }, function (error, response) {
                if (error) {
                    //console.log(error);
                }
                let respData = response.data || [];
                if (respData.length) {
                    let feedbackData = respData.map(rd => {
                        return {
                            date: rd["Date"], rating: rd["Rating"], comment: rd["Comments"], sellerId: sellerId,
                            response: rd["Your Response"], orderId: rd["Order ID"], email: rd["Rater Email"]
                        };
                    });

                    async.each(feedbackData, function (feedbackDta, callb) {
                        Feedback.findOne({
                            sellerId: sellerId,
                            orderId: feedbackDta.orderId,
                            email: feedbackDta.email
                        }, (err, foundFeedback) => {
                            if (err) {
                                //console.log(err);
                            }
                            // If order is exist
                            if (!foundFeedback) {
                                const feedbackData = new Feedback(feedbackDta);
                                feedbackData.save((err, fdData) => {
                                    if (err) {
                                        //console.log(err);
                                    }
                                    // console.log(fdData);
                                    Order.findOne({
                                        sellerId: fdData.sellerId,
                                        AmazonOrderId: fdData.orderId
                                    }, (err, foundOrder) => {
                                        if (err) {
                                            //console.log(err);
                                        }
                                        if (foundOrder) {
                                            Order.findById(foundOrder.id, function (err, orderData) {
                                                if (err) {
                                                    //console.log(err);
                                                }
                                                orderData.haveFeedback = true;
                                                orderData.feedback.push(fdData.id);
                                                orderData.save(function (err, updatedOrder) {
                                                    if (err) {
                                                        //console.log(err);
                                                    }
                                                    callb();
                                                });
                                            });
                                        } else {
                                            callb();
                                        }
                                    });
                                });
                            } else {
                                callb();
                            }
                        });

                    }, function (err) {
                        if (err) {
                            //console.log(err);
                            //console.log("there is a problem to get feedback data from server.");
                        } else {
                            return res.status(200).json({message: "successfully done"});
                        }
                    });
                } else {
                    return res.status(200).json(response);
                }
            });
        })
    })
};


exports.requestReport = function (req, res, next) {

    var user_id = req.query.userId
    // var user_id = "5b8d2195df84c010229fd2df";
    User.findById(user_id, (err, user) => {
        if (err) {
            res.status(400).json({error: 'No user could be found for this ID.'});
            return next(err);
        }

        var sellerId = user.SellerId;

        SellerConfig.find({SellerId: sellerId}).exec(function (err, sellerConfig) {
            var amazonMws = require('amazon-mws')(sellerConfig.tokenConfig.mws_key, sellerConfig.tokenConfig.mws_access);


            let startDate = moment().subtract(3, "years").toISOString();
            let endDate = moment().subtract(2, "years").toISOString();
            amazonMws.reports.search({
                "Version": "2009-01-01",
                "Action": "RequestReport",
                "SellerId": sellerId,
                "MWSAuthToken": sellerConfig.MWSAuthToken,
                // 'MarketplaceIdList.Id.1': 'ATVPDKIKX0DER',
                "ReportType": "_GET_SELLER_FEEDBACK_DATA_",
                "StartDate": startDate,
                "EndDate": endDate
                //'ReportTypeList.Type.1': 'REPORT_TYPE_LIST' //optional
            }, function (error, response) {
                if (error) {
                    //console.log("error ", error);
                    // return;
                    return res.status(200).json(error);
                }
                return res.status(200).json(response);
                // console.log('response', response);
            });
        })
    })
};
// from mws
exports.getAllFeedback = function (req, res, next) {
    let user_id = req.query.userId;
    console.log("getAllFeedback");
    User.findById(user_id, (err, user) => {
        if (err) {
            res.status(400).json({error: 'No user could be found for this ID.'});
            return next(err);
        }
        if (user.SellerId == null) {
            console.log("No SellerId");
            return res.status(200).json({});
        }
        let sellerId = user.SellerId;
        SellerConfig.findOne({SellerId: sellerId}).exec(function (err, sellerConfig) {
            const reviewsCrawler = require("amazon-reviews-crawler");
            Product.aggregate([
                {
                    $lookup:
                        {
                            from: 'orderitems',
                            localField: 'asin1',  //asin of feedback
                            foreignField: 'asin',
                            as: 'orderdetails'
                        }
                },
                // { $group: { _id: 'asin1'}},
                {$match: {sellerId: sellerId}},
                {
                    $replaceRoot: {newRoot: {$mergeObjects: [{$arrayElemAt: ["$orderdetails", 0]}, "$$ROOT"]}}
                },
                {$project: {orderdetails: 0}}
            ]).exec(function (err, products) {
                if (err) {
                    console.log(err);
                }
                products = products.filter((product, index, self) =>
                    index === self.findIndex((t) => (
                        t.asin1 === product.asin1
                    ))
                );
                console.log("products found ", products.length);
                async.each(products, function (product, callb) {
                    let asin = product.asin1;
                    reviewsCrawler(asin)
                        .then(function (results) {
                            let feedbacks = results.reviews || [];
                            console.log("reviewsCrawler " + asin + "  count:" + feedbacks.length);
                            if (feedbacks.length > 0) {
                                // console.log(results);
                                Product.update({asin1: product.asin1}, {rating: feedbacks[0].rating}, {multi: true}, callback);

                                function callback(err, result) {
                                    console.log("FEEDBACK saved product id: " + product.asin1 + " " + product.AmazonOrderId);
                                    if (!product.AmazonOrderId) {
                                        console.log("Null order id: " + product.asin1);
                                        return callb;
                                    }
                                    feedbacks.sellerId = sellerId;
                                    feedbacks.product_id = asin;
                                    feedbacks.product_title = product.item_name;
                                    feedbacks.AmazonOrderId = product.AmazonOrderId;
                                    saveAndBackFeedback(feedbacks, function (data) {
                                        console.log("saveAndBack " + asin);
                                        // console.log("reply back from save and back");
                                        // if (data) {
                                        //   return callb();
                                        // }
                                    });
                                }
                            }
                        }).catch(function (err) {
                        console.error(err);
                        return callb();
                    });

                }, function (err) {
                    if (err) {
                        console.log(err);
                    } else {
                        // exports.list(req, res, next)
                        console.log("get all feedback process done !");
                    }
                });
            });
        })
    })
};

function saveAndBackFeedback(feedbacks, callback) {
    console.log("save feedback start " + feedbacks.product_id + " " + feedbacks.AmazonOrderId);
    async.each(feedbacks, function (feedback, callb) {
        Feedback.findOne({feedback_id: feedback.id}, (err, existingItem) => {
            if (err) {
                console.log(err);
            }
            if (existingItem) {
                console.log('feedback existed:' + feedback.id);
                return callb();
            } else {
                let feedbackData = {
                    product_title: feedbacks.product_title || "",
                    title: feedback.title,
                    date: new Date(feedback.date)
                    ,
                    link: feedback.link,
                    rating: feedback.rating,
                    comment: feedback.text,
                    author: feedback.author,
                    feedback_id: feedback.id
                };

                feedbackData.sellerId = feedbacks.sellerId;
                feedbackData.product_id = feedbacks.product_id;  //asin
                feedbackData.orderId = feedbacks.AmazonOrderId;
                const productDataObj = new Feedback(feedbackData);
                console.log("save:" + productDataObj.feedback_id + " " + productDataObj.orderId + " " + feedbacks.AmazonOrderId + " " + feedbackData.product_id);
                productDataObj.save((err, savedItem) => {
                    // if (!savedItem.feedback_id)
                    console.log("saved   :" + savedItem.feedback_id + ":" + savedItem.orderId);
                    // console.log("Feedback data saved");
                    if (err) {
                        console.log(err);
                    }
                    return callb();
                });
            }
        });
    }, function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log("save feedback done " + feedbacks.product_id);
            callback({data: "done"});
        }
    });
}

exports.getProductFeedback = function (req, res, next) {

    var user_id = req.query.userId;
    if (config.test_mode) {
        user_id = "5b8d2195df84c010229fd2df";
    }
    User.findById(user_id, (err, user) => {
        if (err) {
            res.status(400).json({error: 'No user could be found for this ID.'});
            return next(err);
        }

        if (user.SellerId == null) {
            console.log("No SellerId");
            return res.status(200).json({});
        }

        var sellerId = user.SellerId;
        const axios = require("axios");
        const request = require("request");
        const rp = require("request-promise");
        const cheerio = require("cheerio");
        let fs = require("fs");
        let productId = req.params.id;
        const reviewsCrawler = require("amazon-reviews-crawler");

        //console.log("got the product id", productId);

        let url = `https://www.amazon.com/product-reviews/${productId}/ref=cm_cr_arp_d_viewopt_srt?reviewerType=all_reviews&pageNumber=1&sortBy=recent`;

        let rData = [];
        let iteration = 0;

        let options;


        options = {
            uri: `https://medium.com/`,
            transform: function (body) {
                return cheerio.load(body);
            }
        };
        rp(options)
            .then(($) => {
                //console.log($);
                const logoData = $(".siteNav-logo").text();
                return res.status(200).json({data: logoData});
            })
            .catch((err) => {
                //console.log(err);
                return res.status(200).json({data: err});
            });
    });
};
// get all feedback list (website)
exports.list = function (req, res, next) {
    let user_id = req.query.userId;
    User.findById(user_id, (err, user) => {
        if (err) {
            res.status(400).json({error: 'No user could be found for this ID.'});
            return next(err);
        }
        let sellerId = user.SellerId;
        // Feedback.find({sellerId: sellerId}).limit(150).exec(function(err, feedback) {
        Feedback.aggregate([
            {
                $lookup:
                    {
                        from: 'orders',
                        localField: 'orderId',  //asin of feedback
                        foreignField: 'AmazonOrderId',
                        as: 'orderdetails'
                    }
            },
            {
                $replaceRoot: {newRoot: {$mergeObjects: [{$arrayElemAt: ["$orderdetails", 0]}, "$$ROOT"]}}
            },
            {$project: {orderdetails: 0}}
        ]).exec(function (err, feedback) {
            if (err) {
                console.log(err);
            }
            const feedbackData = feedback.map(function (fd) {
                return {
                    feedback: {id: fd.id, remove_request: fd.remove_request, title: fd.title, details: fd.comment},
                    rating: fd.rating,
                    author: fd.BuyerName,
                    order_id: fd.orderId,
                    product_info: {id: fd.product_id, title: fd.product_title},
                    date: fd.date
                };
            });
            Feedback.aggregate([
                {
                    $match:
                        {
                            rating: {
                                $gte: '1',
                                $lte: '2'
                            },
                            sellerId: sellerId
                        }

                },
                {
                    $group: {
                        _id: {
                            "comment": "$comment"
                        },

                        "total": {"$sum": 1},
                    }
                }
            ]).exec(function (err, totalNegativeFeedback) {
                if (err) {
                    console.log(err);
                }
                console.log("totalNegativeFeedback " + totalNegativeFeedback.length)
                Feedback.aggregate([
                    {
                        $match:
                            {
                                rating: '3',
                                sellerId: sellerId
                            }

                    },
                    {
                        $group: {
                            _id: {
                                "comment": "$comment"
                            },

                            "total": {"$sum": 1},
                        }
                    }
                ]).exec(function (err, totalNeutralFeedback) {
                    if (err) {
                        console.log(err);
                    }
                    console.log("totalNeutralFeedback " + totalNeutralFeedback.length)
                    Feedback.find({
                        sellerId: sellerId, remove_request: 1
                    }).exec(function (err, totalRemoveRequest) {
                        if (err) {
                            console.log(err);
                        }
                        console.log("totalRemoveRequest " + totalRemoveRequest.length)
                        return res.status(200).json({
                            totalFeedbackRequestRemoval: totalRemoveRequest.length,
                            totalNegativeFeedback: totalNegativeFeedback.length,
                            totalNeutralFeedback: totalNeutralFeedback.length,
                            feedbacks: feedbackData
                        });
                    });

                });
            });
        });
    });
};

exports.filterList = function (req, res, next) {
    let date_start = req.body.date_start;
    let date_end = req.body.date_end;
    let filter_items = req.body.filter_items;
    console.log(date_start, date_end, filter_items);

    // var user_id = req.body.userId
    var user_id = "5b8d2195df84c010229fd2df";
    User.findById(user_id, (err, user) => {
        if (err) {
            res.status(400).json({error: 'No user could be found for this ID.'});
            return next(err);
        }

        var sellerId = user.SellerId;

        let query = Order.find({sellerId: sellerId, haveFeedback: true});


        Feedback.aggregate([
            {
                $match:
                    {
                        rating: {
                            $gte: '1',
                            $lte: '2'
                        },
                        sellerId: sellerId
                    }

            },
            {
                $group: {
                    _id: {
                        "comment": "$comment"
                    },

                    "total": {"$sum": 1},
                }
            }
        ]).exec(function (err, totalNegativeFeedback) {
            if (err) {
                console.log(err);
            }
            console.log("totalNegativeFeedback " + totalNegativeFeedback.length)
            Feedback.aggregate([
                {
                    $match:
                        {
                            rating: '3',
                            sellerId: sellerId
                        }

                },
                {
                    $group: {
                        _id: {
                            "comment": "$comment"
                        },

                        "total": {"$sum": 1},
                    }
                }
            ]).exec(function (err, totalNeutralFeedback) {
                if (err) {
                    console.log(err);
                }

                console.log("totalNeutralFeedback " + totalNeutralFeedback.length)

                Feedback.find({
                    sellerId: sellerId,
                    remove_request: 1
                }).exec(function (err, totalRemoveRequest) {
                    if (err) {
                        console.log(err);
                    }
                    if ((date_start && date_end) && (filter_items && filter_items.length)) {

                        date_start = moment(date_start, "YYYY/MM/DD").format("YYYY, M, D");
                        date_end = moment(date_end, "YYYY/MM/DD").format("YYYY, M, D");
                        Feedback.find(
                            {
                                $and: [
                                    {
                                        date: {
                                            $gte: new Date(date_start), $lt: new Date(date_end)
                                        },
                                        sellerId: sellerId
                                    },
                                    {
                                        $or: [
                                            {
                                                rating: {
                                                    $in: filter_items
                                                }
                                            }
                                        ]
                                    }
                                ]
                            }
                        ).limit(150).exec(function (err, feedback) {
                            if (err) {
                                console.log(err);
                            }
                            const feedbackData = feedback.map(function (fd) {
                                return {
                                    feedback: {
                                        id: fd.id,
                                        remove_request: fd.remove_request,
                                        title: fd.title,
                                        details: fd.comment
                                    }, rating: fd.rating, author: fd.author,
                                    product_info: {id: fd.product_id, title: fd.product_title}, date: fd.date
                                };
                            });
                            return res.status(200).json({
                                totalFeedbackRequestRemoval: totalRemoveRequest.length,
                                totalNegativeFeedback: totalNegativeFeedback.length,
                                totalNeutralFeedback: totalNeutralFeedback.length,
                                feedbacks: feedbackData
                            });
                        });
                    } else if (date_start && date_end) {
                        date_start = moment(date_start, "YYYY/MM/DD").format("YYYY, M, D");
                        date_end = moment(date_end, "YYYY/MM/DD").format("YYYY, M, D");
                        Feedback.find(
                            {sellerId: sellerId, date: {$gte: new Date(date_start), $lt: new Date(date_end)}}
                        ).limit(150).exec(function (err, feedback) {
                            if (err) {
                                console.log(err);
                            }
                            const feedbackData = feedback.map(function (fd) {
                                return {
                                    feedback: {
                                        id: fd.id,
                                        remove_request: fd.remove_request,
                                        title: fd.title,
                                        details: fd.comment
                                    }, rating: fd.rating, author: fd.author,
                                    product_info: {id: fd.product_id, title: fd.product_title}, date: fd.date
                                };
                            });
                            return res.status(200).json({
                                totalFeedbackRequestRemoval: totalRemoveRequest.length,
                                totalNegativeFeedback: totalNegativeFeedback.length,
                                totalNeutralFeedback: totalNeutralFeedback.length,
                                feedbacks: feedbackData
                            });
                        });
                    } else if (filter_items && filter_items.length) {
                        console.log("filter items " + filter_items);
                        Feedback.find(
                            {sellerId: sellerId, $or: [{rating: {$in: filter_items}}]}
                        ).limit(150).exec(function (err, feedback) {
                            if (err) {
                                console.log(err);
                            }
                            const feedbackData = feedback.map(function (fd) {
                                return {
                                    feedback: {
                                        id: fd.id,
                                        remove_request: fd.remove_request,
                                        title: fd.title,
                                        details: fd.comment
                                    }, rating: fd.rating, author: fd.author,
                                    product_info: {id: fd.product_id, title: fd.product_title}, date: fd.date
                                };
                            });
                            return res.status(200).json({
                                totalFeedbackRequestRemoval: totalRemoveRequest.length,
                                totalNegativeFeedback: totalNegativeFeedback.length,
                                totalNeutralFeedback: totalNeutralFeedback.length,
                                feedbacks: feedbackData
                            });
                        });

                    } else {
                        Feedback.find({sellerId: sellerId}).limit(150).exec(function (err, feedback) {
                            if (err) {
                                console.log(err);
                            }
                            const feedbackData = feedback.map(function (fd) {
                                return {
                                    feedback: {
                                        id: fd.title,
                                        remove_request: fd.remove_request,
                                        title: fd.title,
                                        details: fd.comment
                                    }, rating: fd.rating, author: fd.author,
                                    product_info: {id: fd.product_id, title: fd.product_title}, date: fd.date
                                };
                            });
                            return res.status(200).json({
                                totalFeedbackRequestRemoval: totalRemoveRequest.length,
                                totalNegativeFeedback: totalNegativeFeedback.length,
                                totalNeutralFeedback: totalNeutralFeedback.length,
                                feedbacks: feedbackData
                            });
                        });
                    }
                });

            });
        });
    })
};


function formatOrderData(resp) {
    let orderData = {NextToken: resp.NextToken, RequestId: resp.ResponseMetadata.RequestId};
    orderData.orders = resp.Orders.Order;
    return orderData;
}

exports.getFeedbackAnalysis = function (req, res, next) {

    var start_date = req.body.start_date;
    var end_date = req.body.end_date;
    let filter_items = req.body.filter_items;

    console.log(req.body.filter_items)

    filters = []

    if (filter_items && filter_items.length) {
        for (let i = 0; i < filter_items.length; i++) {
            if (filter_items[i] == 'feedback:neutral') {
                filters.push('3');
            } else if (filter_items[i] == 'feedback:negative') {
                filters.push('1');
                filters.push('2');
            } else if (filter_items[i] == 'feedback:positive') {
                filters.push('4');
                filters.push('5');
            }
        }
    }
    // var user_id = req.body.userId
    var user_id = "5b8d2195df84c010229fd2df";
    User.findById(user_id, (err, user) => {
        if (err) {
            res.status(400).json({error: 'No user could be found for this ID.'});
            return next(err);
        }
        if (user.SellerId == null) {
            console.log("No SellerId");
            return res.status(200).json({});
        }

        var sellerId = user.SellerId;
        if ((start_date && end_date) && filters.length) {
            end_date = new Date(end_date);
            end_date = new Date(new Date(end_date).setMonth(end_date.getMonth() + 1));

            console.log("Working 1st")
            Feedback.aggregate([
                {
                    $match:
                        {
                            $and: [
                                {
                                    date: {
                                        $gte: new Date(start_date),
                                        $lt: new Date(end_date)
                                    },
                                    sellerId: sellerId
                                },
                                {
                                    $or: [
                                        {
                                            rating: {
                                                $in: filters
                                            }
                                        }
                                    ]
                                }]

                        }

                },
                {
                    $group: {
                        _id: {
                            "rating": "$rating",
                            "month": {$substr: ['$date', 0, 7]},
                        },

                        "totalFeedback": {"$sum": 1},
                    }
                },
                {
                    "$group": {
                        "_id": "$_id.rating",
                        "counts": {
                            "$push": {
                                "month": "$_id.month",
                                "total": "$totalFeedback"
                            }
                        }
                    }
                },
                {$sort: {_id: -1}}
            ], function (err, feedback) {
                if (err) {
                    console.log(err);
                }

                var feedback_val = FeedbackAnalyticsRearrange(feedback);

                return res.status(200).json({feedback_analysis: feedback_val});
            });
        } else if (start_date && end_date) {
            end_date = new Date(end_date);
            end_date = new Date(new Date(end_date).setMonth(end_date.getMonth() + 1));

            Feedback.aggregate([
                {
                    $match:
                        {
                            date: {
                                $gte: new Date(start_date),
                                $lt: new Date(end_date)
                            },
                            sellerId: sellerId
                        }

                },
                {
                    $group: {
                        _id: {
                            "rating": "$rating",
                            "month": {$substr: ['$date', 0, 7]},
                        },

                        "totalFeedback": {"$sum": 1},
                    }
                },
                {
                    "$group": {
                        "_id": "$_id.rating",
                        "counts": {
                            "$push": {
                                "month": "$_id.month",
                                "total": "$totalFeedback"
                            }
                        }
                    }
                },
                {$sort: {_id: -1}}
            ], function (err, feedback) {
                if (err) {
                    console.log(err);
                }

                var feedback_val = FeedbackAnalyticsRearrange(feedback);

                return res.status(200).json({feedback_analysis: feedback_val});
            });
        } else if (filters && filters.length) {
            Feedback.aggregate([
                {
                    $match:
                        {
                            sellerId: sellerId,
                            $or: [
                                {
                                    rating:
                                        {$in: filters}
                                }
                            ]
                        }

                },
                {
                    $group: {
                        _id: {
                            "rating": "$rating",
                            "month": {$substr: ['$date', 0, 7]},
                        },

                        "totalFeedback": {"$sum": 1},
                    }
                },
                {
                    "$group": {
                        "_id": "$_id.rating",
                        "counts": {
                            "$push": {
                                "month": "$_id.month",
                                "total": "$totalFeedback"
                            }
                        }
                    }
                },
                {$sort: {_id: -1}}
            ], function (err, feedback) {
                if (err) {
                    console.log(err);
                }

                var feedback_val = FeedbackAnalyticsRearrange(feedback);

                return res.status(200).json({feedback_analysis: feedback_val});
            });
        } else {
            Feedback.aggregate([
                {
                    $match: {
                        sellerId: sellerId
                    }
                },
                {
                    $group: {
                        _id: {
                            "rating": "$rating",
                            "month": {$substr: ['$date', 0, 7]},
                        },

                        "totalFeedback": {"$sum": 1},
                    }
                },
                {
                    "$group": {
                        "_id": "$_id.rating",
                        "counts": {
                            "$push": {
                                "month": "$_id.month",
                                "total": "$totalFeedback"
                            }
                        }
                    }
                },
                {$sort: {_id: -1}}
            ], function (err, feedback) {
                if (err) {
                    console.log(err);
                }

                var feedback_val = FeedbackAnalyticsRearrange(feedback);

                return res.status(200).json({feedback_analysis: feedback_val});
            });
        }
    })
};

function FeedbackAnalyticsRearrange(feedback) {

    var feedback_val = [];
    for (let i = 0; i < feedback.length; i++) {
        if (feedback[i]._id == '5' || feedback[i]._id == '4') {
            // positive
            var list = feedback[i].counts;

            for (let j = 0; j < list.length; j++) {
                var temp_feedback = {};

                if (feedback_val.length > 0) {
                    // Already feedback data
                    var index = -1;
                    for (let k = 0; k < feedback_val.length; k++) {
                        if (feedback_val[k]._id == list[j].month) {
                            index = k;
                            break;
                        }
                    }

                    if (index == -1) {
                        console.log("INDEX NOT FOUND");
                        temp_feedback._id = list[j].month;

                        temp_feedback.totalPositiveFeedback = list[j].total;

                        feedback_val.push(temp_feedback);
                    } else {
                        console.log("INDEX FOUND");
                        if (feedback_val[index].totalPositiveFeedback) {
                            feedback_val[index].totalPositiveFeedback += list[j].total;
                        } else {
                            feedback_val[index].totalPositiveFeedback = list[j].total;
                        }

                    }
                } else {
                    // new data push
                    temp_feedback._id = list[j].month;
                    temp_feedback.totalPositiveFeedback = list[j].total;
                    feedback_val.push(temp_feedback);
                }
            }
        } else if (feedback[i]._id == '3') {
            // neutral
            var list = feedback[i].counts;

            for (let j = 0; j < list.length; j++) {
                var temp_feedback = {};

                if (feedback_val.length > 0) {
                    // Already feedback data
                    var index = -1;
                    for (let k = 0; k < feedback_val.length; k++) {
                        if (feedback_val[k]._id == list[j].month) {
                            index = k;
                            break;
                        }
                    }

                    if (index == -1) {
                        console.log("INDEX NOT FOUND");
                        temp_feedback._id = list[j].month;

                        temp_feedback.totalNeutralFeedback = list[j].total;

                        feedback_val.push(temp_feedback);
                    } else {
                        console.log("INDEX FOUND");

                        feedback_val[index].totalNeutralFeedback = list[j].total;

                    }
                } else {
                    // new data push
                    temp_feedback._id = list[j].month;
                    temp_feedback.totalNeutralFeedback = list[j].total;
                    feedback_val.push(temp_feedback);
                }
            }
        } else {
            // negative
            var list = feedback[i].counts;

            for (let j = 0; j < list.length; j++) {
                var temp_feedback = {};

                if (feedback_val.length > 0) {
                    // Already feedback data
                    var index = -1;
                    for (let k = 0; k < feedback_val.length; k++) {
                        if (feedback_val[k]._id == list[j].month) {
                            index = k;
                            break;
                        }
                    }

                    if (index == -1) {
                        console.log("INDEX NOT FOUND");
                        temp_feedback._id = list[j].month;

                        temp_feedback.totalNegativeFeedback = list[j].total;

                        feedback_val.push(temp_feedback);
                    } else {
                        console.log("INDEX FOUND");
                        if (feedback_val[index].totalNegativeFeedback) {
                            feedback_val[index].totalNegativeFeedback += list[j].total;
                        } else {
                            feedback_val[index].totalNegativeFeedback = list[j].total;
                        }

                    }
                } else {
                    // new data push
                    temp_feedback._id = list[j].month;
                    temp_feedback.totalNegativeFeedback = list[j].total;
                    feedback_val.push(temp_feedback);
                }
            }
        }

    }

    for (let i = 0; i < feedback_val.length; i++) {
        if (feedback_val[i].totalPositiveFeedback
            && feedback_val[i].totalNeutralFeedback
            && feedback_val[i].totalNegativeFeedback) {

            feedback_val[i].totalFeedback = feedback_val[i].totalPositiveFeedback
                + feedback_val[i].totalNeutralFeedback
                + feedback_val[i].totalNegativeFeedback;

        } else if (feedback_val[i].totalPositiveFeedback
            && feedback_val[i].totalNeutralFeedback) {

            feedback_val[i].totalFeedback = feedback_val[i].totalPositiveFeedback
                + feedback_val[i].totalNeutralFeedback;
            feedback_val[i].totalNegativeFeedback = 0;

        } else if (feedback_val[i].totalPositiveFeedback
            && feedback_val[i].totalNegativeFeedback) {

            feedback_val[i].totalFeedback = feedback_val[i].totalPositiveFeedback
                + feedback_val[i].totalNegativeFeedback;
            feedback_val[i].totalNeutralFeedback = 0;

        } else if (feedback_val[i].totalNeutralFeedback
            && feedback_val[i].totalNegativeFeedback) {

            feedback_val[i].totalFeedback = feedback_val[i].totalNeutralFeedback
                + feedback_val[i].totalNegativeFeedback;
            feedback_val[i].totalPositiveFeedback = 0;

        } else if (feedback_val[i].totalPositiveFeedback) {

            feedback_val[i].totalFeedback = feedback_val[i].totalPositiveFeedback;
            feedback_val[i].totalNeutralFeedback = 0;
            feedback_val[i].totalNegativeFeedback = 0;

        } else if (feedback_val[i].totalNeutralFeedback) {

            feedback_val[i].totalFeedback = feedback_val[i].totalNeutralFeedback;
            feedback_val[i].totalPositiveFeedback = 0;
            feedback_val[i].totalNegativeFeedback = 0;

        } else if (feedback_val[i].totalNegativeFeedback) {

            feedback_val[i].totalFeedback = feedback_val[i].totalNegativeFeedback;
            feedback_val[i].totalPositiveFeedback = 0;
            feedback_val[i].totalNeutralFeedback = 0;

        }

    }


    return feedback_val;

}

exports.recentFeedback = function (req, res, next) {
    var user_id = req.query.userId;
    User.findById(user_id, (err, user) => {
        if (err) {
            res.status(400).json({error: 'No user could be found for this ID.'});
            return next(err);
        }
        if (user.SellerId == null) {
            console.log("No SellerId");
            return res.status(200).json({});
        }
        var sellerId = user.SellerId;

        Feedback.find({
            rating: {
                $gte: 1
            },
            sellerId: sellerId
        }).limit(5).sort({date: 1}).exec(function (err, recentFeedback) {
            if (err) {
                console.log(err);
            }
            return res.status(200).json({recent_feedback: recentFeedback});
        });
    })
};

exports.sentRemoveFeedbackRequest = function (req, res, next) {
    const tData = req.body;
    console.log(tData);
    const feedbackRequestData = new RemoveFeedbackRequest(tData);
    feedbackRequestData.save((err, saveFeedbackRequest) => {
        if (err) {
            console.log(err);
        }

        let obj = {
            requestData: tData,
            hostname: 'http://' + res.req.headers.host
        };
        Mail.sentRemoveFeedbackRequest(obj, function (result) {
            Feedback.findOne({_id: saveFeedbackRequest.feedback_id}).exec(function (err, feedback) {
                if (err) {
                    console.log(err);
                }
                feedback.remove_request = 1;
                feedback.save((err, saveFeedbackRequest) => {
                    if (err) {
                        console.log(err);
                    }
                    return res.status(200).json({saveFeedbackRequest: saveFeedbackRequest});
                });
            })
        });
    });
};


// testing purpose
exports.getRemoveFeedbackRequest = function (req, res, next) {
    Feedback.find({
        remove_request: 1
    }).exec(function (err, totalRemoveRequest) {
        if (err) {
            console.log(err);
        }
        console.log("totalRemoveRequest: " + totalRemoveRequest.length);
        return res.status(200).json({totalFeedbackRequestRemoval: totalRemoveRequest.length});
    });
};

// testing purpose
exports.getNegativeFeedback = function (req, res, next) {
    Feedback.aggregate([
        {
            $match:
                {
                    rating: {
                        $gte: '1',
                        $lte: '2'
                    }
                }

        },
        {
            $group: {
                _id: {
                    "comment": "$comment"
                },

                "total": {"$sum": 1},
            }
        }
    ]).exec(function (err, totalNegativeFeedback) {
        return res.status(200).json({negative: totalNegativeFeedback.length});
    });
};
