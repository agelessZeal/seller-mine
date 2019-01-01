let _, config,_ld,qs,fs;

_ = require("underscore");
config = require('../../config/main');
crypto = require("crypto");

_ld = require('lodash');
qs = require('qs');
fs = require('fs');

module.exports = {
    name: "BaseController",
    extend: function (child) {
        return _.extend({}, this, child);
    },
    run: function (req, res, next) {
    },
    makeListQuery:function (idList,prefix) {
        let marketKeyValueList = {};
        let retStr = "";
        for(let i = 0; i < idList.length ;i++) {
            marketKeyValueList[prefix + "." + (i+1)] = idList[i];
        }
        return marketKeyValueList;
    },
    getSignature: function (Version, path, action, params) {

        let self = this;
        let host = 'mws.amazonservices.com';
        let method = 'GET';

        let requestParams = {
            "Version": Version,
            "Action": action,
            "SellerId": config.mws.SellerId,
            "MWSAuthToken": config.mws.MWSAuthToken,
            "AWSAccessKeyId": config.mws.AWSAccessKeyId,
            "Timestamp": (new Date()),
            "SignatureVersion": config.mws.SignatureVersion,
            "SignatureMethod": config.mws.SignatureMethod,
        };

        requestParams = Object.assign(params, requestParams);

        let sorted = _.reduce(_ld.keys(requestParams).sort(), function (m, k) {
            m[k] = requestParams[k];
            return m;
        }, {});

        let stringToSign = [method, host, path, qs.stringify(sorted)].join('\n');
        stringToSign = stringToSign.replace(/'/g, '%27');
        stringToSign = stringToSign.replace(/\*/g, '%2A');
        stringToSign = stringToSign.replace(/\(/g, '%28');
        requestParams.Signature = crypto.createHmac('sha256', config.mws.SecretKey).update(stringToSign, 'utf8').digest('base64');

        self.requestParamsJSON = _ld.clone(requestParams);
        requestParams = qs.stringify(requestParams);
        return requestParams;
    },
    splitArray:function(srcArray, arrayLength){
        if(srcArray.length<arrayLength) return srcArray;
        let dstArray = [];
        let tmpArray = [];
        for(let i = 0; i< srcArray.length; i++){
            tmpArray.push(srcArray[i]);
            if(tmpArray.length === arrayLength) {
                dstArray.push(tmpArray);
                tmpArray = [];
            }
        }
        if(tmpArray.length>0) {
            dstArray.push(tmpArray);
        }
        return dstArray;
    },
};
