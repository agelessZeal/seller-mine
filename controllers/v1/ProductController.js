let _, async, mongoose, BaseController, request, HTMLParser;
let config, axios, utf8, parseString, querystring, amazonMws;
let DBController, ProductModel;

async = require("async");
mongoose = require('mongoose');
BaseController = require('../v1/BaseController');
DBController = require('../v1/DBController');
ProductModel = require('../../models/v1/product');

axios = require('axios');
config = require('../../config/main');
request = require('request');
querystring = require("querystring");
parseString = require("xml2js").parseString;
HTMLParser = require('node-html-parser');
utf8 = require('utf8');
amazonMws = require('amazon-mws')(config.mws.AWSAccessKeyId, config.mws.SecretKey);

module.exports = BaseController.extend({
    name: 'ProductController',
    getProductSchedule: async function () {
        let self = this;
        console.log("Making report promise request");
        let makeReportPromise = self.makeRequestReportPromise();
        makeReportPromise.then(function (mrResp) {
            console.log("Done Request Report==========");
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
        console.log("Checking Report Status ========================");
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
                                self.getProductList(genReportID);
                            } else {
                                //Get Report List............... again ....
                                self.getReportList(ReportRequestIdList, [])
                            }
                        }
                        console.log("=================================================================");
                    } else {
                        console.log("Can't get Product Information", result);
                    }
                })
            }).catch(function (err) {
                console.error('Get Report Request List Function Error');
                console.log(err);
            });

        }, 3 * 60 * 1000);//This is 5 mins,

    },
    getProductList: function (reportID) {
        let asinArray = [], self, i;
        self = this;
        amazonMws.reports.search({
            'Version': '2009-01-01',
            'Action': 'GetReport',
            'SellerId': config.mws.SellerId,
            'MWSAuthToken': config.mws.MWSAuthToken,
            'ReportId': reportID
        }, async function (error, response) {
            if (error) {
                console.log('Can\'t get Report Status', error);
                return;
            }
            asinArray = await DBController.updateProduct(response.data);
            console.log('Data Extraction From Report ------------------------------------------');
            console.log('Getting Additional Information.... pen-name, image-url using Get Product ');
            if (asinArray.length == 0) return;
            let matchingPdtAsinGroup = self.splitArray(asinArray, 1);
            for (i = 0; i < matchingPdtAsinGroup.length; i++) {
                let asinListQuery = self.makeListQuery(matchingPdtAsinGroup[i], 'ASINList.ASIN');
                let mPdtReqInfo = {
                    'Version': '2011-10-01',
                    'Action': 'GetMatchingProduct',
                    'SellerId': config.mws.SellerId,
                    'MWSAuthToken': config.mws.MWSAuthToken,
                    'MarketplaceId': 'A1AM78C64UM0Y8'
                };
                mPdtReqInfo = Object.assign(asinListQuery, mPdtReqInfo);
                setTimeout(function () {
                    amazonMws.products.search(mPdtReqInfo).then(function (response) {
                        console.log('---------------------------------------------------------------------------------');
                        if (typeof response.Product != 'undefined' && response.Product.hasOwnProperty('AttributeSets')) {
                            let pdtAttribute = response.Product.AttributeSets.ItemAttributes;
                            console.log("Updating Product Information (Image URL, PenName....)" + response.Product.Identifiers.MarketplaceASIN.ASIN);
                            let pdtInfo = {
                                asin: response.Product.Identifiers.MarketplaceASIN.ASIN,
                                image_url: pdtAttribute.SmallImage.URL,
                                pen_name: pdtAttribute.Label
                            };
                            DBController.updateProductSubFields(pdtInfo);
                        } else {
                            //console.log("\x1b[31m",response.Error.Message);
                            console.log(response.Error.Message);
                        }

                    }).catch(function (error) {
                        console.log('error products', error);
                    });
                }, 1000 * i);
            }
        });
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
    getReportList: function (reportRequestIDList, reportRequestTypeList) {
        let params = {
            'Version': '2009-01-01',
            'Action': 'GetReportList',
            'SellerId': config.mws.SellerId,
            'MWSAuthToken': config.mws.MWSAuthToken,
        };
        let rrIDList = this.makeListQuery(reportRequestIDList, 'ReportRequestIdList.Id');
        let rrTypeList = this.makeListQuery(reportRequestTypeList, 'ReportTypeList.Type');
        params = Object.assign(rrIDList, params);
        params = Object.assign(rrTypeList, params);
        amazonMws.reports.search(params, function (error, response) {
            if (error) {
                console.log('error ', error);
                return;
            }
            if (response.data.length) {
                console.log("----------------------------------------");
                console.log(response.data);
            }
        });
    },
    makeRequestReportPromise: function () {
        let path = '/Reports/2009-01-01';
        let Version = '2009-01-01';
        let action = 'RequestReport';
        let headers = {'content-type': 'application/x-www-form-urlencoded'};
        let reqInfo = {
            ReportType: '_GET_MERCHANT_LISTINGS_DATA_',
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


    splitArray: function (srcArray, arrayLength) {
        if (srcArray.length < arrayLength) return srcArray;
        let dstArray = [];
        let tmpArray = [];
        for (let i = 0; i < srcArray.length; i++) {
            tmpArray.push(srcArray[i]);
            if (tmpArray.length === arrayLength) {
                dstArray.push(tmpArray);
                tmpArray = [];
            }
        }
        if (tmpArray.length > 0) {
            dstArray.push(tmpArray);
        }
        return dstArray;
    },
    getRatingByASIN: async function () {
        let pdtList = await ProductModel.find();
        for (let i = 0; i < pdtList.length; i++) {
            setTimeout(function (i) {
                let asin = pdtList[i].asin;
                let apiURL = config.ratingAPIURL + asin;
                try {
                    request(apiURL, async function (err, response, body) {
                        if (err) {
                            return console.error('request failed:', err);
                        }
                        let root = HTMLParser.parse(body);
                        let ratingTag = root.querySelector('.a-size-base.a-color-secondary');
                        console.log(apiURL)
                        if (ratingTag != null) {
                            let pdtInfo = await ProductModel.findOne({asin: asin});
                            if (pdtInfo != null) {
                                let rating = ratingTag.rawText.trim().substr(0, 3);
                                pdtInfo.rating = rating;
                                await pdtInfo.save();
                                console.log('ASIN : ' + asin + ", Rating : " + rating);
                            } else {
                                console.log("Can't Get Product Info Information : " + asin);
                            }
                            console.log();
                        } else {
                            console.log("Can't Get Product Rating Information : " + asin);
                        }

                    })
                } catch (e) {
                    console.log(e);
                }

            }, i * 10 * 1000, i);
        }
    },
    getMatchingPdtTest: async function (req, res, next) {
        let self = this;
        let asin = "B07GJ96NZN";
        let apiURL = config.ratingAPIURL + asin;
        request({
            headers: {
                'Cookie': 'something=anything',
            },
            uri: apiURL,
            method: 'GET'
        }, function (err, response, body) {
            if (err) {
                return console.error('request failed:', err);
            }
            let root = HTMLParser.parse(body);
            let ratingTag = root.querySelector('.a-size-base.a-color-secondary');
            console.log(body);
            if (ratingTag != null) {
                console.log(ratingTag.rawText.trim().substr(0, 3));
            } else {
                console.log("Can't Get Product Rating Information : " + asin);
            }

        })
    },
});
