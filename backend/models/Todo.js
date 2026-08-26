// This file describes what a "todo" looks like inside MongoDB.

const mongoose = require("mongoose");

const todoSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },

    // This is the most important field in the whole project.
    //
    // Every todo remembers WHICH USER created it, by storing that user's _id.
    // Without this field, every user would see every todo in the database.
    //
    // "ref: User" tells Mongoose that this id belongs to the User collection.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    // This one option gives us createdAt and updatedAt automatically.
    // Mongoose fills them in and keeps updatedAt fresh whenever we edit.
    timestamps: true,
  }
);

module.exports = mongoose.model("Todo", todoSchema);
