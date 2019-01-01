// Importing Node packages required for schema
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

//= ===============================
// User Schema
//= ===============================
const OrderSchema = new Schema({
        asin: { type: String },
        BuyerEmail: { type: String },
        sellerId: { type: String },
        BuyerName: { type: String},
        EarliestShipDate: { type: Date},
        FulfillmentChannel: { type: String},
        IsBusinessOrder: { type: Boolean},
        IsPremiumOrder: { type: Boolean},
        IsPrime: { type: Boolean},
        IsReplacementOrder: { type: Boolean},
        LastUpdateDate: { type: Date},
        LatestShipDate: { type: Date},
        MarketplaceId: { type: String},
        NumberOfItemsShipped: { type: String},
        NumberOfItemsUnshipped: { type: String},
        OrderStatus: { type: String},
        OrderTotal: { type: Object},
        OrderType: { type: String},
        PaymentMethod: { type: String},
        PaymentMethodDetails: { type: Object},
        PurchaseDate: { type: Date},
        SalesChannel: { type: String},
        SellerOrderId: { type: String },
        ShipmentServiceLevelCategory: { type: String },
        ShippingAddress: { type: Object },
        ShipServiceLevel: { type: String },
        haveItem: { type: Boolean },
        haveFeedback: { type: Boolean },
        orderItem: [{ type: Schema.Types.ObjectId, ref: 'OrderItem' }],
        feedback: [{ type: Schema.Types.ObjectId, ref: 'Feedback' }],
        number_of_email_sent: {type: Number, default: 0},
        AmazonOrderId: { type: String },
        sent_email_status: {type: String, default: 'sent_status:0'},
    },
    {
        timestamps: true,
        usePushEach: true
    });


module.exports = mongoose.model('Order', OrderSchema);
