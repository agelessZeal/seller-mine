// Importing Node packages required for schema
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

//= ===============================
// Feedback Request Schema
//= ===============================
const PackageSchema = new Schema({
        name: {type: String},
        total_email_sent: {type: Number, default: -1},
        total_template: {type: Number, default: -1},
        total_product: {type: Number, default: 0},
        price: {type: String},
        discount: {type: String, default: '0'},
    },
    {
        timestamps: true
    });


module.exports = mongoose.model('packages', PackageSchema);