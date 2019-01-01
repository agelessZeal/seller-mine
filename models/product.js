// Importing Node packages required for schema
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

//= ===============================
// Product Schema
//= ===============================

const ProductSchema = new Schema({
        item_name: { type: String },
        item_description: { type: String },
        sellerId: { type: String },
        listing_id: { type: String},
        seller_sku: { type: String, required: true},
        price: { type: String},
        quantity: { type: String},
        open_date: { type: String},
        image_url: { type: String},
        rating: { type: String},
        pen_name: { type: String},
        item_is_marketplace: { type: Boolean},
        product_id_type: { type: String},
        zshop_shipping_fee: { type: String},
        item_note: { type: String},
        item_condition: { type: String},
        zshop_category1: { type: String},
        zshop_browse_path: { type: String},
        zshop_storefront_feature: { type: String},
        asin1: { type: String},
        asin2: { type: String},
        asin3: { type: String},
        will_ship_internationally: { type: String},
        expedited_shipping: { type: String},
        zshop_boldface: { type: String},
        product_id: { type: String },
        bid_for_featured_placement: { type: String},
        add_delete: { type: String},
        pending_quantity: { type: String},
        fulfillment_channel: { type: String},
        merchant_shipping_group: { type: String},
        order_count:{ type: Number},
        status: { type: String}
    },
    {
        timestamps: true,
        usePushEach: true
    });


module.exports = mongoose.model('Product', ProductSchema);
