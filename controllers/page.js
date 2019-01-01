const User = require('../models/user');
const Template = require('../models/template');
const config = require('../config/main');
const moment = require('moment');

const mws_key = config.MWS_KEY || '';
const mws_access = config.MWS_SECRET || '';
var amazonMws = require('amazon-mws')('AKIAIEGT53RIXYQUCTPQ','VdToubCLaeVs+ngo3g7aIGCUzlqsisfCVWnKCga6');


exports.activeAccount = function (req, res, next) {
    const userId = req.params.id;
    let appUrl;
    if(req.hostname){
        appUrl = 'http://'+req.hostname+':3000/#/dashboard/?o=confirm_email&u=' + userId;
    }else{
        appUrl = 'http://'+req.hostname+':3000/#/dashboard/?o=confirm_email&u=' + userId;
    }

    User.findById(userId, function (err, user) {
        if (err){}
        user.confirmEmail = true;
        user.save(function (err, updatedUser) {
            if (err){}
            // redirect for amazon auth input page
            //console.log("Hello");
            res.redirect('http://'+req.hostname+':3000/#/dashboard/');
        });
    });
}
