// Importing Node packages required for schema
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

//= ===============================
// User Schema
//= ===============================
const CronConfigSchema = new Schema({
        type: { type: String, required: true },
        campaign: { type: Schema.Types.ObjectId, ref: 'Campaign' },
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        SellerId: {type: String},
        seller_config: {type: String},
        send_after: {type: String},
        NextToken: {type: String},
        current_date: {type: Date},
        count: {type: Number},
        pending_count: {type: Number}
    },
    {
        timestamps: true
    });


module.exports = mongoose.model('Cron', CronConfigSchema);
