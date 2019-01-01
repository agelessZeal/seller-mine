let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let OrderItemSchema = new Schema({
    asin: String,
    AmazonOrderId: String,
    sellerId: String,
    qty: String,
    sku: String,
    title: String,
    itemId: String,
    price: String,
    currency: String,
    orderIds: [{ type: Schema.Types.ObjectId, ref: 'Order' }],
    createdAt:Date,
    updatedAt:Date,
},{ usePushEach: true });

module.exports = mongoose.model('orderitem', OrderItemSchema);
