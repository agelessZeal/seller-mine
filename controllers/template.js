const Order = require('../models/order');
const Template = require('../models/template');
const Unsubscribe = require('../models/unsubscribe');
const OrderEmailStat = require("../models/orderEmailStat");
const Campaign = require('../models/campaign');
const OrderItem = require('../models/orderItem');
const config = require('../config/main');
const moment = require('moment');
const async = require("async");


const mws_key = config.MWS_KEY || '';
const mws_access = config.MWS_SECRET || '';
var amazonMws = require('amazon-mws')('AKIAIEGT53RIXYQUCTPQ', 'VdToubCLaeVs+ngo3g7aIGCUzlqsisfCVWnKCga6');


exports.createTemplate = function (req, res, next) {

    const tData = {};
    let logo = "";
    let email_attachment = "";

    if(req.files && req.files.logo){
        logo = templateFileUpload(req.files.logo);
        //console.log("UpLogo "+logo);
    }

    if(req.files && req.files.email_attachment){
        email_attachment = templateFileUpload(req.files.email_attachment);
        //console.log("UpAttachment "+email_attachment);
    }

    // templateData
    tData.user_id = req.body.user_id;
    tData.template_name = req.body.template_name;
    tData.email_subject = req.body.email_subject;
    tData.template_type = req.body.template_type;
    tData.template_status = req.body.template_status;
    tData.email_message = req.body.email_message;
    tData.order_id = req.body.order_id;
    tData.send_day = req.body.send_day;
    tData.send_time = req.body.send_time;
    tData.send_after = req.body.send_after;
    tData.minimum_item_condition = req.body.minimum_item_condition;
    tData.fulfillment_type = req.body.fulfillment_type;
    tData.logo = logo;
    tData.email_attachment = email_attachment;

    // exclude order reshaping
    var getExOrder = req.body.exclude_orders;
    getExOrder = getExOrder.split(',');

    var with_feedback_1 = 0;
    var with_feedback_2 = 0;
    var with_feedback_3 = 0;
    var with_feedback_4 = 0;
    var with_feedback_5 = 0;

    var with_review_1 = 0;
    var with_review_2 = 0;
    var with_review_3 = 0;
    var with_review_4 = 0;
    var with_review_5 = 0;

    var with_promotion_item_discount = 0;
    var with_promotion_shipping_discount = 0;

    var with_other_return = 0;
    var with_other_repeat_buyer = 0;
    


    for(let i = 0; i < getExOrder.length; i++){
        if(getExOrder[i] == 'feedback:1'){  with_feedback_1 = 1; }
        else if(getExOrder[i] == 'feedback:2'){ with_feedback_2 = 1; }
        else if(getExOrder[i] == 'feedback:3'){ with_feedback_3 = 1; }
        else if(getExOrder[i] == 'feedback:4'){ with_feedback_4 = 1; }
        else if(getExOrder[i] == 'feedback:5'){ with_feedback_5 = 1; }
        else if(getExOrder[i] == 'review:1'){ with_review_1 = 1; }
        else if(getExOrder[i] == 'review:2'){ with_review_2 = 1; }
        else if(getExOrder[i] == 'review:3'){ with_review_3 = 1; }
        else if(getExOrder[i] == 'review:4'){ with_review_4 = 1; }
        else if(getExOrder[i] == 'review:5'){ with_review_5 = 1; }
        else if(getExOrder[i] == 'promotion:item_discount'){ with_promotion_item_discount = 1; }
        else if(getExOrder[i] == 'promotion:shipping_discount'){ with_promotion_shipping_discount = 1; }
        else if(getExOrder[i] == 'other:return'){ with_other_return = 1; }
        else if(getExOrder[i] == 'other:repeat_buyer'){ with_other_repeat_buyer = 1; }
    }

    // test
    var ex_order = {
        feedback: {
            with_feedback_1: with_feedback_1,
            with_feedback_2: with_feedback_2,
            with_feedback_3: with_feedback_3,
            with_feedback_4: with_feedback_4,
            with_feedback_5: with_feedback_5,

        },
        review: {
            with_review_1: with_review_1,
            with_review_2: with_review_2,
            with_review_3: with_review_3,
            with_review_4: with_review_4,
            with_review_5: with_review_5,
        },
        promotion: {
            item_discount: with_promotion_item_discount,
            shipping_discount: with_promotion_shipping_discount
        },
        other: {
            with_return: with_other_return,
            with_repeat_buyer: with_other_repeat_buyer
        }
    }

  tData.exclude_orders = ex_order;
  tData.include_products = req.body.include_products;
  tData.include_products_type = req.body.include_products_type;
  tData.exclude_products = req.body.exclude_products;
  tData.exclude_products_type = req.body.exclude_products_type;

  // include product
    // 

    const templateData = new Template(tData);
    //console.log(req.body);

    templateData.save((err, savedTemplate) => {
        if (err) {
            res.send(err);
        }
        Template.find().limit(100).exec(function (err, templates) {
            if (err) {
                res.send(err);
            }
            return res.status(200).json({templates: savedTemplate});
        });
    });


};

exports.toggleTemplateStatus = function (req, res, next) {
    Template.findById(req.body.id, function (err, templateData) {
        templateData.template_status = req.body.template_status;
        templateData.save(function (err, updatedOrder) {
            if (err) {
                res.send(err);
            }
            Template.find({user_id: updatedOrder.user_id}).limit(100).exec(function (err, templates) {
                if (err) {
                    res.send(err);
                }
               // return exports.list(req, res, next);
                return res.status(200).json({templates: templates});
            });
        });

    })
}

exports.update = function (req, res, next) {

    Template.findById(req.body.id, function (err, templateData) {
        if (err) {
            res.send(err);
        }
        
        templateData.template_name = req.body.template_name;
        templateData.email_subject = req.body.email_subject;
        templateData.template_type = req.body.template_type;
        templateData.template_status = req.body.template_status;
        templateData.email_message = req.body.email_message;
        templateData.order_id = req.body.order_id;
        templateData.send_day = req.body.send_day;
        templateData.send_time = req.body.send_time;
        templateData.send_after = req.body.send_after;
        templateData.minimum_item_condition = req.body.minimum_item_condition;
        templateData.fulfillment_type = req.body.fulfillment_type;

        if(req.files && req.files.logo){
            // remove existing logo
            // Find Hostname
            if(templateData.logo){
                var fs = require('fs');
                fs.unlink('.'+templateData.logo, (err) => {
                  if (err) throw err;
                  //console.log('successfully deleted '+templateData.logo);
                });
            }
            
            
            let logo = templateFileUpload(req.files.logo);
            templateData.logo = logo;
            //console.log("UpLogo "+logo);
        }

        if(req.files && req.files.email_attachment){
            // remove existing email attachment
            // Find Hostname
            if(templateData.email_attachment){
                var fs = require('fs');
                fs.unlink('.'+templateData.email_attachment, (err) => {
                  if (err) throw err;
                  //console.log('successfully deleted '+templateData.email_attachment);
                });
            }
            
            let email_attachment = templateFileUpload(req.files.email_attachment);
            templateData.email_attachment = email_attachment;
            //console.log("UpAttachment "+email_attachment);
        }

        // exclude order reshaping
        var getExOrder = req.body.exclude_orders;
        getExOrder = getExOrder.split(',');

        var with_feedback_1 = 0;
        var with_feedback_2 = 0;
        var with_feedback_3 = 0;
        var with_feedback_4 = 0;
        var with_feedback_5 = 0;

        var with_review_1 = 0;
        var with_review_2 = 0;
        var with_review_3 = 0;
        var with_review_4 = 0;
        var with_review_5 = 0;

        var with_promotion_item_discount = 0;
        var with_promotion_shipping_discount = 0;

        var with_other_return = 0;
        var with_other_repeat_buyer = 0;
        


        for(let i = 0; i < getExOrder.length; i++){
            if(getExOrder[i] == 'feedback:1'){  with_feedback_1 = 1; }
            else if(getExOrder[i] == 'feedback:2'){ with_feedback_2 = 1; }
            else if(getExOrder[i] == 'feedback:3'){ with_feedback_3 = 1; }
            else if(getExOrder[i] == 'feedback:4'){ with_feedback_4 = 1; }
            else if(getExOrder[i] == 'feedback:5'){ with_feedback_5 = 1; }
            else if(getExOrder[i] == 'review:1'){ with_review_1 = 1; }
            else if(getExOrder[i] == 'review:2'){ with_review_2 = 1; }
            else if(getExOrder[i] == 'review:3'){ with_review_3 = 1; }
            else if(getExOrder[i] == 'review:4'){ with_review_4 = 1; }
            else if(getExOrder[i] == 'review:5'){ with_review_5 = 1; }
            else if(getExOrder[i] == 'promotion:item_discount'){ with_promotion_item_discount = 1; }
            else if(getExOrder[i] == 'promotion:shipping_discount'){ with_promotion_shipping_discount = 1; }
            else if(getExOrder[i] == 'other:return'){ with_other_return = 1; }
            else if(getExOrder[i] == 'other:repeat_buyer'){ with_other_repeat_buyer = 1; }
        }

        // test
        var ex_order = {
            feedback: {
                with_feedback_1: with_feedback_1,
                with_feedback_2: with_feedback_2,
                with_feedback_3: with_feedback_3,
                with_feedback_4: with_feedback_4,
                with_feedback_5: with_feedback_5,

            },
            review: {
                with_review_1: with_review_1,
                with_review_2: with_review_2,
                with_review_3: with_review_3,
                with_review_4: with_review_4,
                with_review_5: with_review_5
            },
            promotion: {
                item_discount: with_promotion_item_discount,
                shipping_discount: with_promotion_shipping_discount
            },
            other: {
                with_return: with_other_return,
                with_repeat_buyer: with_other_repeat_buyer
            }
        }

        templateData.exclude_orders = ex_order;
        templateData.include_products = req.body.include_products;
        templateData.include_products_type = req.body.include_products_type;
        templateData.exclude_products = req.body.exclude_products;
        templateData.exclude_products_type = req.body.exclude_products_type;

        templateData.save(function (err, updatedOrder) {
            if (err) {
                res.send(err);
            }
            Template.find({user_id: updatedOrder.user_id}).limit(100).exec(function (err, templates) {
                if (err) {
                    res.send(err);
                }
                return res.status(200).json({templates: templates});
            });
        });
    });
};

exports.previewTemplate = function (req, res, next) {
    const id = req.params.id;
    Template.findById(id, function (err, templateData) {
        if (err) {
            res.send(err);
        }
        res.status(200).json({templates: templateData});
    });
};

exports.unsubscribes = function (req, res, next) {
    const tData = {};
    tData.temp_id = req.query.temp_id;
    tData.user_id = req.query.user_id;
    tData.buyer_email = req.query.buyer_email;

    const unsubscribeData = new Unsubscribe(tData);
    unsubscribeData.save(function (err, updatedOrder) {
        if (err) {
            res.send(err);
        }
        
        res.redirect(req.query.appUrl);
    });
};

exports.unsubscribeStats = function (req, res, next) {
    var start_date = req.query.start_date;
    var end_date = req.query.end_date;
    var user_id = req.query.user_id;

    if(start_date && end_date){
        end_date = new Date(end_date);
        end_date = new Date(new Date(end_date).setMonth(end_date.getMonth()+1));
        
        Unsubscribe.aggregate([
            { 
                $match: { 
                    'createdAt': {
                        $gte: new Date(start_date), 
                        $lt: new Date(end_date)
                    },
                    'user_id': user_id
              } 

            },
            { 
                $group: {
                    _id: {$substr: ['$createdAt', 0, 7]}, 
                    totalUnsubscribe: {$sum: 1}
                }
            },
            { $sort : { _id : -1 } }
        ], function (err, unsubscribeData) {
            if (err) {
            //console.log(err);
          }
          return res.status(200).json({unsubscribe_analysis: unsubscribeData});
        });
    }else{
        Unsubscribe.aggregate([
            { 
                $match: {
                    'user_id': user_id
                }
            },
            { 
                $group: {
                    _id: {$substr: ['$createdAt', 0, 7]}, 
                    totalUnsubscribe: {$sum: 1}
                }
            },
            { $sort : { _id : -1 } },
            { $limit : 12 }
        ], function (err, unsubscribeData) {
            if (err) {
            //console.log(err);
          }
          return res.status(200).json({unsubscribe_analysis: unsubscribeData});
        });
    }
};



// need user id
exports.list = function (req, res, next) {
    var user_id = req.query.userId;
    // var user_id = "5b8d2195df84c010229fd2df";
    Template.find({user_id: user_id}).limit(100).exec(function (err, templates) {
        if (err) {
            //console.log(err);
        }
        return res.status(200).json({templates: templates});
    })
};

exports.delete = function (req, res, next) {
    const templateId = req.params.id;
    Template.findByIdAndRemove(templateId, (err, deletedTemp) => {
        if (err) {
            //console.log(err);
        }
        Template.find().limit(100).exec(function (err, templates) {
            if (err) {
                //console.log(err);
            }
            return res.status(200).json({templates: templates});
        })
    });
}

function templateFileUpload (myFile) {
    var date = new Date();
    var now = date.getTime();
    var file_name = now+'-'+myFile.name.replace(' ', '-');

    var fs = require('fs');
    var dir = './upload_files';

    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }


    myFile.mv(dir+'/'+file_name, function(err) {
        if (err)
            return err;
    });

    return '/upload_files/'+file_name;
    
}

exports.templateAnalysis = function(req, res, next){

    var tempId = req.body.templateId;

    var start_date = req.body.start_date;
    var end_date = req.body.end_date;

    if(start_date && end_date){
        OrderEmailStat.aggregate([
            { 
                $match: 
                { 
                    temp_id: tempId,
                    createdAt: {
                        $gte: new Date(start_date), 
                        $lte: new Date(end_date)
                    }
                } 

            },
            { 
                $group: {
                  _id: { $substr: ['$createdAt', 0, 10] }, 
                  "totalEmailSent": { "$sum": 1},
                }
            }
        ]).exec(function (err, orderSentEmailStat) {
            return res.status(200).json({template_analysis: orderSentEmailStat});
        });
    }else{
        OrderEmailStat.aggregate([
            { 
                $match: 
                { 
                    temp_id: tempId
                } 
            },
            { 
                $group: {
                  _id: { $substr: ['$createdAt', 0, 10] }, 
                  "totalEmailSent": { "$sum": 1},
                }
            }
        ]).exec(function (err, orderSentEmailStat) {
            return res.status(200).json({template_analysis: orderSentEmailStat});
        });
    }
    
};
