const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, sparse: true },
  phone: { type: String, unique: true, sparse: true },
  passwordHash: { type: String, required: true }
});

// Custom validation to require at least one of email or phone
UserSchema.pre('validate', function(next) {
  if (!this.email && !this.phone) {
    next(new Error('Email or phone number is required.'));
  } else {
    next();
  }
});

module.exports = mongoose.model('User', UserSchema);

