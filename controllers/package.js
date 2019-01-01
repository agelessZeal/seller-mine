const Package = require('../models/package');


exports.list = function (req, res, next) {
    Package.find().limit(100).exec(function (err, packages) {
        if (err) {
            console.log(err);
        }
        return res.status(200).json({packages: packages});
    })
};


exports.create = function (req, res, next) {
    const tData = {};


    tData.total_email_sent = req.body.total_email_sent;
    tData.total_template = req.body.total_template;
    tData.total_product = req.body.total_product;
    tData.price = req.body.price;
    tData.discount = req.body.discount;
  

    const packageData = new Package(tData);
    
    packageData.save((err, savedPackage) => {
        if (err) {
            res.send(err);
        }
        Package.find().limit(100).exec(function (err, packages) {
            if (err) {
                res.send(err);
            }
            return res.status(200).json({packages: packages});
        });
    });
};

exports.update = function (req, res, next) {

    Package.findById(req.body.id, function (err, tData) {
        if (err) {
            res.send(err);
        }
        
	    tData.name = req.body.name;
        tData.total_email_sent = req.body.total_email_sent;
        tData.total_template = req.body.total_template;
        tData.total_product = req.body.total_product;
        tData.price = req.body.price;
        tData.discount = req.body.discount;
	  

	    const packageData = new Package(tData);
	    
	    packageData.save((err, savedPackage) => {
	        if (err) {
	            res.send(err);
	        }
	        Package.find().limit(100).exec(function (err, packages) {
	            if (err) {
	                res.send(err);
	            }
	            return res.status(200).json({packages: packages});
	        });
	    });
    });
};

exports.delete = function (req, res, next) {
    const pId = req.params.id;
    Package.findByIdAndRemove(pId, (err, deletedPackage) => {
        if (err) {
            console.log(err);
        }
        Package.find().limit(100).exec(function (err, packages) {
            if (err) {
                console.log(err);
            }
            return res.status(200).json({packages: packages});
        })
    });
}