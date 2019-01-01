// Importing Node packages required for schema
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

//= ===============================
// Template Schema
//= ===============================
const OrderEmailStat = new Schema({
        order_id: {type: String},
        temp_id: {type: String}
    },
    {
        timestamps: true,
        usePushEach: true
    });


module.exports = mongoose.model('OrderEmailStat', OrderEmailStat);