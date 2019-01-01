let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let ProductSchema = new Schema({
    asin: String,
    sellerId: String,
    image_url: String,
    pen_name: String,
    rating: String,

    item_name: String,
    item_description: String,
    listing_id: String,
    seller_sku: String,
    price: String,
    quantity: String,
    open_date: String,
    item_is_marketplace: Boolean,
    product_id_type: String,
    zshop_shipping_fee: String,
    item_note: String,
    item_condition: String,
    zshop_category1: String,
    zshop_browse_path: String,
    zshop_storefront_feature: String,
    asin1: String,
    asin2: String,
    asin3: String,
    will_ship_internationally: String,
    expedited_shipping: String,
    zshop_boldface: String,
    product_id: String,
    bid_for_featured_placement: String,
    add_delete: String,
    pending_quantity: String,
    fulfillment_channel: String,
    merchant_shipping_group: String,
    status: String,

    createdAt:Date,
    updatedAt:Date,

},{ usePushEach: true });

module.exports = mongoose.model('product', ProductSchema);
