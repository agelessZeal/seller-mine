const User = require('../models/user');
const SellerConfig = require('../models/sellerConfig');
const setUserInfo = require('../helpers').setUserInfo;

//= =======================================
// User Routes
//= =======================================
exports.viewProfile = function (req, res, next) {
  const userId = req.params.userId;

  if (req.user._id.toString() !== userId) { return res.status(401).json({ error: 'You are not authorized to view this user profile.' }); }
  User.findById(userId, (err, user) => {
    if (err) {
      res.status(400).json({ error: 'No user could be found for this ID.' });
      return next(err);
    }

    const userToReturn = setUserInfo(user);

    return res.status(200).json({ user: userToReturn });
  });
};


exports.update_profile = function (req, res, next) {
    const userId = req.body.id;
    const uData = req.body.uData;
    let updateData = {profile: {firstName: uData.firstName, lastName: uData.lastName}, email: uData.email};
    if(uData.password){
        updateData.password = uData.password;
    }
    console.log(updateData);
    User.findById(userId, function (err, user) {
        if (err) return handleError(err);
        user.set(updateData);
        user.save(function (err, updatedTank) {
          console.log(updatedTank);
            if (err) return handleError(err);
            res.send(updatedTank);
        });
    });
};

exports.updateMarketplaceAuth = function (req, res, next) {

  const userId = req.body.id;

  User.findById(userId, function (err, user) {
        if (err) return handleError(err);
        user.SellerId = req.body.sellerId;
        user.save(function (err, updatedUser) {
          SellerConfig.findOne({SellerId: req.body.sellerId}).exec(function(err, sellerConfig){
            if(err){ console.log(err) }
            console.log(sellerConfig);
          });
        });
    });

};
