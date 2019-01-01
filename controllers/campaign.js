const Campaign = require('../models/campaign');
const Template = require('../models/template');
const config = require('../config/main');
const moment = require('moment');

const mws_key = config.MWS_KEY || '';
const mws_access = config.MWS_SECRET || '';
var amazonMws = require('amazon-mws')('AKIAIEGT53RIXYQUCTPQ','VdToubCLaeVs+ngo3g7aIGCUzlqsisfCVWnKCga6');


exports.createCampaign = function (req, res, next) {
    const tData = req.body;
    const campaignData = new Campaign(tData);
    campaignData.save((err, savedCampaign) => {
        if (err) { console.log(err); }
        let cronData = {type: 'campaign'};
        cronData.send_after = savedCampaign.send_after;
        cronData.campaign = savedCampaign['_id'];
        cronData.user = savedCampaign.user;

        Campaign.find().limit(100).exec(function (err, campaigns) {
            if (err){console.log(err);}
            return res.status(200).json({ campaigns: campaigns });
        })
    });
}

exports.update = function (req, res, next) {
    const tData = req.body;
    Campaign.findById(tData.id, function (err, campaignData) {
        if (err){console.log(err);}
        campaignData.name = tData.name;
        campaignData.channel = tData.channel;
        campaignData.send_day = tData.send_day;
        campaignData.send_time = tData.send_time;
        campaignData.send_after = tData.send_after;
        campaignData.minimum_item_condition = tData.minimum_item_condition;
        campaignData.fulfillment_type = tData.fulfillment_type;
        campaignData.message = tData.message;
        campaignData.save(function (err, updatedOrder) {
            if (err){console.log(err);}
            Campaign.find().limit(100).exec(function (err, campaigns) {
                if (err){console.log(err);}
                return res.status(200).json({ campaigns: campaigns });
            })
        });
    });
}

exports.list = function (req, res, next) {
    Campaign.find().limit(100).exec(function (err, campaigns) {
        if (err){console.log(err);}
        return res.status(200).json({ campaigns: campaigns });
    })
}

exports.delete = function (req, res, next) {
    const campaignId = req.params.id;
    Campaign.findByIdAndRemove(campaignId, (err, deletedTemp) => {
        if(err) { console.log(err); }
        setTimeout(function () {
            Campaign.find().limit(100).exec(function (err, campaigns) {
                if (err){console.log(err);}
                return res.status(200).json({ campaigns: campaigns });
            })
        })
    });
}