// Importing Node packages required for schema
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

//= ===============================
// Campaign Schema
//= ===============================
const campaignSchema = new Schema({
        name: { type: String},
        sellerId: {type: String},
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        channel: { type: String},
        message: { type: String },
        send_day: { type: Number},
        send_immediately: { type: Boolean},
        send_time: { type: Date},
        send_after: { type: String},
        minimum_item_condition: { type: String},
        fulfillment_type: { type: String}
    },
    {
        timestamps: true,
        usePushEach: true
    });


module.exports = mongoose.model('Campaign', campaignSchema);
