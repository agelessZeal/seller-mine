const SellerConfig = require('../models/sellerConfig');
const Cron = require('../models/cron');
const config = require('../config/main');
const User = require('../models/user');


//= =======================================
// User Routes
//= =======================================
// exports.viewProfile = function (req, res, next) {
//     const userId = req.params.userId;
//
//     if (req.user._id.toString() !== userId) { return res.status(401).json({ error: 'You are not authorized to view this user profile.' }); }
//     User.findById(userId, (err, user) => {
//         if (err) {
//             res.status(400).json({ error: 'No user could be found for this ID.' });
//             return next(err);
//         }
//
//         const userToReturn = setUserInfo(user);
//
//         return res.status(200).json({ user: userToReturn });
//     });
// };


exports.orderConfig = function (req, res, next) {
    let userId = req.body.userId;
    let sellerId = req.body.sellerId;
    let sellerToken = req.body.sellerToken;
    let username = req.body.username;

    console.log("userid: ", userId);
    console.log("sellerid: ", sellerId);
    console.log("sellertoken: ", sellerToken);
    console.log("username: ", username);

    User.updateOne({_id: userId}, {SellerId: sellerId}, function(err, result) {
        if(err) throw err;
        console.log("Seller Id updated");
    });

    SellerConfig.findOne({ SellerId: sellerId}, (err, existingId) => {
        if (err) { return next(err); }

        // If user is not unique, return error
        if (existingId) {
            return res.status(422).send({ error: 'That seller id is already exist.' });
        }

        var sellerinfo = {
            SellerId: sellerId,
            tokenConfig: {
                mws_key: 'AKIAIEGT53RIXYQUCTPQ',
                mws_access: 'VdToubCLaeVs+ngo3g7aIGCUzlqsisfCVWnKCga6',
            },
        };
        sellerinfo.MWSAuthToken = sellerToken;
        sellerinfo.MarketplaceId = 'ATVPDKIKX0DER';

        const sellerData = new SellerConfig(sellerinfo);

        sellerData.save((err, sellerData) => {
            if (err) { console.log(err); return next(err); }
            return res.status(200).json(sellerData);
        });
    });
};

exports.cron = function (req, res, next) {

    Cron.findOne({ SellerId: 'A1LWZ980X488GK'}, (err, existingId) => {
        if (err) { return next(err); }

        // If user is not unique, return error
        if (existingId) {
            return res.status(422).send({ error: 'That seller id is already exist for cron.' });
        }

        const cronData = new Cron({SellerId: 'A1LWZ980X488GK', type: 'order', count: 0, current_date: null});

        cronData.save((err, cronData) => {
            if (err) { console.log(err); return next(err); }
            return res.status(200).json(cronData);
        });
    });
};
