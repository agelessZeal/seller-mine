let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let FeedbackSchema = new Schema({
    "updatedAt":Date,
    "createdAt":Date,
    "product_title":String,
    "title": String,
    "date": Date,
    "link": String,
    "rating": String,
    "comment": String,
    "author": String,
    "authorEmail": String,
    "response":String,
    "feedback_id":String ,
    "sellerId": String,
    "product_id": String,///This is Asin
    "orderId": String,
    "email" : String,
    "remove_request": Number,
    "number_of_email_sent": Number,
});

module.exports = mongoose.model('feedback', FeedbackSchema);
