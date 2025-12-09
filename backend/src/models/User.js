const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    childName: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    // parentName: String,
    // notes: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
