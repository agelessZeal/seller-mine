// Importing Node packages required for schema
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

//= ===============================
// Template Schema
//= ===============================
const unsubscribeSchema = new Schema({
        user_id: {type: String},
        temp_id: {type: String},
        buyer_email: {type: String}
    },
    {
        timestamps: true,
        usePushEach: true
    });


module.exports = mongoose.model('Unsubscribes', unsubscribeSchema);