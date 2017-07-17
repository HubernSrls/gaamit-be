'use strict';
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var UserSchema = new Schema({
  email: {
    type: String,
    unique: true,
    required: 'Enter the email'
  },
  password: {
    type: String,
    required: 'Enter the password'
  },
  banner_link: {
    type: String
  },
  postingKey: {
    type: String
  },
  steemitUsername: {
    type: String,
    unique: true
  },
  followers: {
    type: Schema.ObjectId,
    ref: "UserSchema"
  }
});

module.exports = mongoose.model('Users', UserSchema);
