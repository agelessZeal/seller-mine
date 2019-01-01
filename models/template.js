// Importing Node packages required for schema
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

//= ===============================
// Template Schema
//= ===============================
const templateSchema = new Schema({
        user_id: {type: Schema.Types.ObjectId, ref: 'User'},
        template_name: {type: String},
        email_subject: {type: String},
        template_type: {type: String},
        template_status: {type: String},
        email_message: {type: String},
        order_id: {type: String},
        send_day: {type: String},
        send_time: {type: String},
        send_after: {type: String},
        minimum_item_condition: {type: String},
        fulfillment_type: {type: String},
        logo: {type: String},
        email_attachment: {type: String},
        exclude_orders: {type: Schema.Types.Mixed},
        include_products: {type: String},
        include_products_type: {type: String},
        exclude_products: {type: String},
        exclude_products_type: {type: String},
        number_of_email_sent: {type: Number, default: 0},
        unsubscribes: {type: Schema.Types.Mixed, default: 0},
    },
    {
        timestamps: true,
        usePushEach: true
    });



module.exports = mongoose.model('Template', templateSchema);
