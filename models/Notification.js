const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    message: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    isRead: {
        type: Boolean,
        default: false
    } // Pour savoir si l'admin l'a lue
});

module.exports = mongoose.model('Notification', notificationSchema);