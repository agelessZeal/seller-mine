// Importing Node packages required for schema
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

//= ===============================
// Product Schema
//= ===============================
const OrderItemSchema = new Schema({
        AmazonOrderId: { type: String},
        sellerId: { type: String},
        title: { type: String },
        qty: { type: String},
        price: { type: String},
        sku: { type: String},
        asin: { type: String},
        itemId: { type: String},
        currency: { type: String},
        image_url: { type: String},
        orderIds: [{ type: Schema.Types.ObjectId, ref: 'Order' }]
    },
    {
        timestamps: true,
        usePushEach: true
    });


module.exports = mongoose.model('OrderItem', OrderItemSchema);
