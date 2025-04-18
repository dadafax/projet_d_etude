
const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const UserSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  ipAddress: {
    type: String
  },
  lastLogin: {
    type: Date
  },
  sessionExpiry: {
    type: Date
  },
  blacklisted: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('User', UserSchema);