// This file describes what a "user" looks like inside MongoDB.

const mongoose = require("mongoose");

// A schema is the shape of the data.
// It tells MongoDB which fields a user has, and what type each field is.
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true, // two users cannot have the same username
    trim: true,   // removes accidental spaces at the start and end
  },
  email: {
    type: String,
    required: true,
    unique: true, // two users cannot have the same email
    trim: true,
    lowercase: true, // "ARUN@x.com" and "arun@x.com" are the same person
  },
  password: {
    type: String,
    required: true,
    // IMPORTANT: we never store the real password here.
    // We store the bcrypt hash of it. See the /api/auth/register route.
  },
  createdAt: {
    type: Date,
    default: Date.now, // if we don't set it, MongoDB uses the current time
  },
});

// A model is what we actually use in our code to talk to the database.
// Mongoose will create a collection called "users" from this.
module.exports = mongoose.model("User", userSchema);
