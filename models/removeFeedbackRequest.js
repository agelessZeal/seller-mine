// Importing Node packages required for schema
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

//= ===============================
// Template Schema
//= ===============================
const removeFeedbackRequestSchema = new Schema({
        user_id: {type: Schema.Types.ObjectId, ref: 'User'},
        feedback_id: {type: Schema.Types.ObjectId, ref: 'Feedback'},
        email_subject: {type: String},
        email_message: {type: String},
        buyer_email: {type: String},
        number_of_email_sent: {type: Number, default: 0}
    },
    {
        timestamps: true,
        usePushEach: true
    });


module.exports = mongoose.model('RemoveFeedbackRequest', removeFeedbackRequestSchema);