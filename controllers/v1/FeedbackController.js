let _, async, mongoose, BaseController;
let config, axios, request, FormData, HTMLParser, amazonMws;
let DBController, reviewsCrawler, querystring, parseString;
let OrderModel, OrderItemModel, ProductModel, FeedbackModel;

async = require("async");
mongoose = require('mongoose');
axios = require('axios');
HTMLParser = require('node-html-parser');

querystring = require("querystring");
parseString = require("xml2js").parseString;

config = require('../../config/main');
OrderModel = require('../../models/v1/order');
OrderItemModel = require('../../models/v1/orderitem');
ProductModel = require('../../models/v1/product');
FeedbackModel = require('../../models/v1/feedback');

BaseController = require('../../controllers/v1/BaseController');
DBController = require('../../controllers/v1/DBController');

reviewsCrawler = require('amazon-reviews-crawler');
request = require('request');
FormData = require('form-data');

amazonMws = require('amazon-mws')(config.mws.AWSAccessKeyId, config.mws.SecretKey);

module.exports = BaseController.extend({
    name: 'FeedbackController',
    getFeedbackSchedule: async function () {
        let self = this;
        let makeReportPromise = this.makeRequestReportPromise();
        makeReportPromise.then(function (mrResp) {
            console.log("Feedback Done Request Report==========");
            parseString(mrResp, function (mrRespErr, mrRespResult) {
                if (mrRespResult.hasOwnProperty('RequestReportResponse')) {
                    let mrResInfo = mrRespResult.RequestReportResponse.RequestReportResult[0].ReportRequestInfo[0];
                    if (mrResInfo.ReportProcessingStatus[0] == '_SUBMITTED_') {
                        let ReportRequestId = mrResInfo.ReportRequestId[0];
                        self.watchRequestReportStatus([ReportRequestId]);
                    } else {
                        console.log("Report Request Done, But Processing Status is " + mrResInfo.ReportProcessingStatus[0]);
                    }
                }
                if (mrRespResult.hasOwnProperty('ErrorResponse')) {
                    console.log("Make Request Report Error=============");
                    console.log(mrRespResult.ErrorResponse.Error[0].Message[0]);
                }
            })
        }).catch(function (err) {
            console.error('Make Request Report Function Error');
            console.log(err);
        })
    },
    watchRequestReportStatus: async function (ReportRequestIdList) {
        console.log("Checking Feedback Report Status ========================");
        console.log(ReportRequestIdList);
        let maxWatchCount = 90 * 24 * 10;
        let self = this;
        let watchReportStatus = setInterval(function () {
            if (maxWatchCount < 0) {
                clearInterval(watchReportStatus);
                return;
            }
            maxWatchCount--;
            let getReportRequestListPromise = self.getReportRequestListPromise(ReportRequestIdList);
            getReportRequestListPromise.then(function (rrlResp) {
                parseString(rrlResp, function (err, result) {
                    if (err) {
                        console.error("Get Report Request List Parsing Error...");
                        return;
                    }
                    if (result.hasOwnProperty('GetReportRequestListResponse')
                        && result.GetReportRequestListResponse.hasOwnProperty('GetReportRequestListResult')) {
                        let rrlRespObj = result.GetReportRequestListResponse.GetReportRequestListResult[0].ReportRequestInfo[0];
                        if (rrlRespObj.ReportProcessingStatus[0] == '_DONE_') {
                            clearInterval(watchReportStatus);
                            if (rrlRespObj.hasOwnProperty('GeneratedReportId')) {
                                let genReportID = rrlRespObj.GeneratedReportId[0];
                                self.getOrderList(genReportID);
                            }
                        }
                        console.log("=================================================================");
                    } else {
                        console.log("Can't get Feedback Information", result);
                    }
                })
            }).catch(function (err) {
                console.error('Get Report Request List Function Error');
                console.log(err);
            });

        }, 3 * 60 * 1000);//This is 5 mins,

    },
    getReportRequestListPromise: function (reportIDList) {
        let path = '/Reports/2009-01-01';
        let Version = '2009-01-01';
        let action = 'GetReportRequestList';
        let headers = {'content-type': 'application/x-www-form-urlencoded'};
        console.log(reportIDList);
        let reqInfo = this.makeListQuery(reportIDList, 'ReportRequestIdList.Id');
        let reqParams = this.getSignature(Version, path, action, reqInfo);
        return new Promise(function (resolve, reject) {
            request(config.baseURI + path + "?" + reqParams, {headers: headers}, function (error, res, body) {
                // in addition to parsing the value, deal with possible errors
                if (error) return reject(error);
                resolve(body);
            });
        });
    },
    getOrderList: async function (reportId) {
        let self, i;
        self = this;
        amazonMws.reports.search({
            'Version': '2009-01-01',
            'Action': 'GetReport',
            'SellerId': config.mws.SellerId,
            'MWSAuthToken': config.mws.MWSAuthToken,
            'ReportId': reportId
        }, async function (error, response) {
            if (error) {
                console.log('Can\'t get Report Status', error);
                return;
            }
            console.log("This is Feedback Response********************");
            console.log(response.data);
            console.log("This is Feedback Response********************");
            for (i = 0; i < response.data.length; i++) {
                console.log("==========================================");
                let orderId = response.data[i]['Order ID'];
                let orderInfo = await OrderModel.findOne({AmazonOrderId: orderId});
                let orderItemInfo = await OrderItemModel.findOne({AmazonOrderId: orderId});
                if (orderInfo != null) {
                    //check previous feedback
                    let prevFb = await FeedbackModel.findOne({feedback_id:orderId});
                    if(prevFb == null){
                        await FeedbackModel.collection.insertOne({
                            "product_title":orderItemInfo.title,
                            "title": response.data[i]['Comments'],
                            "date": new Date(response.data[i]['Date']),
                            //"link": "https://www.amazon.com/gp/product/" + orderItemInfo.asin ,
                            // https://www.amazon.com/product-reviews/B07G3ZNK4Y/ref=cm_cr_arp_d_viewopt_srt?reviewerType=all_reviews&pageNumber=1&sortBy=recent
                            "link": "https://www.amazon.com/gp/product/" + orderItemInfo.asin ,
                            "rating": response.data[i]['Rating'],
                            "comment": response.data[i]['Comments'],
                            "author": orderInfo.BuyerName,
                            "authorEmail": orderInfo.BuyerEmail,
                            "response":response.data[i]['Your Response'],
                            "feedback_id":orderId ,
                            "sellerId": config.mws.SellerId,
                            "product_id": orderItemInfo.asin,///This is Asin
                            "orderId": orderId,
                            "email" : response.data[i]['Rater Email'],
                            "remove_request": 0,
                            "number_of_email_sent": 0,
                        });
                    }
                }
            }
        });
    },
    makeRequestReportPromise: function () {
        let path = '/Reports/2009-01-01';
        let Version = '2009-01-01';
        let action = 'RequestReport';
        let headers = {'content-type': 'application/x-www-form-urlencoded'};
        let reqInfo = {
            ReportType: '_GET_SELLER_FEEDBACK_DATA_',
            StartDate: '2018-01-01T16:00:00Z',
        };
        let reqParams = this.getSignature(Version, path, action, reqInfo);
        return new Promise(function (resolve, reject) {
            request(config.baseURI + path + "?" + reqParams, {headers: headers}, function (error, res, body) {
                // in addition to parsing the value, deal with possible errors
                if (error) return reject(error);
                resolve(body);
            });
        });
    },
});
