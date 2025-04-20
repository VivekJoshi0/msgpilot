const mongoose = require("mongoose");

const MessageLogSchema = new mongoose.Schema({
    number:{type: String, required: true},
    status: { type: String, enum: ['success', 'failed', 'cancelled', 'skipped'], default: 'sent' },
    delay: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now, index: { expires: 60 * 60 * 6 }},
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    batchId: { type: String },
    error: { type: String, default: null },
    duplicate: {
        type: Boolean,
        default: false,
    }
})

module.exports = mongoose.model('MessageLog', MessageLogSchema);