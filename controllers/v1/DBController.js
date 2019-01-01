let async, mongoose,config, BaseController;
let ProductModel;
async = require("async");
mongoose = require('mongoose');
config = require('../../config/main');
BaseController = require('./BaseController');

ProductModel = require('../../models/v1/product');

module.exports = BaseController.extend({
    name: 'DBController',
    updateProduct:async function(pdtArray) {
        let asinArray = [];
        for(let i = 0;i<pdtArray.length; i++) {
            let pdtInfoObj = this.makeProductObj(pdtArray[i]);
            await this.insertOrUpdateProduct(pdtInfoObj);
            asinArray.push(pdtInfoObj.asin);
        }
        return asinArray;
    },
    insertOrUpdateProduct:async function(pdtInfo){
        let prevRecInfo;
        prevRecInfo = await ProductModel.findOne({asin:pdtInfo.asin});
        if(prevRecInfo == null) {
            pdtInfo.createdAt = new Date();
            await ProductModel.collection.insertOne(pdtInfo);
        } else {
            pdtInfo.updatedAt = new Date();
            await ProductModel.collection.updateOne({asin:pdtInfo.asin}, {$set:pdtInfo});
        }
    },
    updateProductSubFields: async function(pdtInfo){
        let prevRecInfo;
        prevRecInfo = await ProductModel.findOne({asin:pdtInfo.asin});
        prevRecInfo.image_url = pdtInfo.image_url;
        prevRecInfo.pen_name = pdtInfo.pen_name;
        await prevRecInfo.save();
    },
    makeProductObj:function (pdtInfo) {
        let pdtObj = {};
        pdtObj.asin =  pdtInfo['asin1'] ||  pdtInfo['asin2'] || pdtInfo['asin3'];
        pdtObj.item_name = pdtInfo['item-name'];
        pdtObj.item_description = pdtInfo['item-description'];
        pdtObj.listing_id = pdtInfo['listing-id'];
        pdtObj.seller_sku = pdtInfo['seller-sku'];
        pdtObj.price = pdtInfo['price'];
        pdtObj.quantity = pdtInfo['quantity'];
        pdtObj.open_date = pdtInfo['open-date'];
        pdtObj.image_url = pdtInfo['image-url'];
        pdtObj.item_is_marketplace = (pdtInfo['item-is-marketplace']=='y')? true: false;
        pdtObj.product_id_type = pdtInfo['product-id-type'];
        pdtObj.zshop_shipping_fee = pdtInfo['zshop-shipping-fee'];
        pdtObj.item_note = pdtInfo['item-note'];
        pdtObj.item_condition = pdtInfo['item-condition'];
        pdtObj.zshop_category1 = pdtInfo['zshop-category1'];
        pdtObj.zshop_browse_path = pdtInfo['zshop-browse_path'];
        pdtObj.zshop_storefront_feature = pdtInfo['zshop-storefront-feature'];
        pdtObj.asin1 = pdtInfo['asin1'];
        pdtObj.asin2 = pdtInfo['asin2'];
        pdtObj.asin3 = pdtInfo['asin3'];
        pdtObj.will_ship_internationally = pdtInfo['will-ship-internationally'];
        pdtObj.expedited_shipping = pdtInfo['expedited-shipping'];
        pdtObj.zshop_boldface = pdtInfo['zshop-boldface'];
        pdtObj.product_id = pdtInfo['product-id'];
        pdtObj.bid_for_featured_placement = pdtInfo['bid-for-featured-placement'];
        pdtObj.add_delete = pdtInfo['add-delete'];
        pdtObj.pending_quantity = pdtInfo['pending-quantity'];
        pdtObj.fulfillment_channel = pdtInfo['fulfillment-channel'];
        pdtObj.merchant_shipping_group = pdtInfo['merchant-shipping_group'];
        pdtObj.status = pdtInfo['status'];
        pdtObj.sellerId = config.mws.SellerId;
        return pdtObj;
    },

});
