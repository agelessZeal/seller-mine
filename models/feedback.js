// Importing Node packages required for schema
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

//= ===============================
// Feedback Schema
//= ===============================
const feedbackSchema = new Schema({
        orderId: { type: String },
        product_title: { type: String },
        product_id: { type: String },  //asin
        title: { type: String },
        sellerId: { type: String },
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        date: { type: Date },
        rating: { type: String},
        comment: { type: String},
        response: { type: String},
        author: { type: String},
        authorEmail: { type: String},
        link: { type: String},
        feedback_id: { type: String},
        email: { type: String},
        number_of_email_sent: {type: Number, default: 0},
        remove_request: {type: Number, default: 0},
    },
    {
        timestamps: true,
        usePushEach: true
    });


module.exports = mongoose.model('Feedback', feedbackSchema);
