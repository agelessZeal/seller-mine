// Importing Node packages required for schema
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

//= ===============================
// Feedback Request Schema
//= ===============================
const FeedbackRequestSchema = new Schema({
        SellerId: {type: String},
        ReportType: {type: String},
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        ReportRequestId: {type: String},
        ReportId: {type: String},
        StartDate: {type: Date},
        EndDate: {type: Date},
    },
    {
        timestamps: true
    });


module.exports = mongoose.model('FeedbackRequest', FeedbackRequestSchema);
