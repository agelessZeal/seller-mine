// Importing Node packages required for schema
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

//= ===============================
// User Schema
//= ===============================
const SellerConfigSchema = new Schema({
        SellerId: { type: String, required: true },
        tokenConfig: {type: {mws_access: String, mws_key: String}, required: true},
        MWSAuthToken: { type: String, required: true },
        MarketplaceId: { type: String, required: true },
    },
    {
        timestamps: true
    });


module.exports = mongoose.model('SellerConfig', SellerConfigSchema);
