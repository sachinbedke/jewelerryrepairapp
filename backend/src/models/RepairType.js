const mongoose = require('mongoose');

const repairTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  code: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
  },
  description: String,
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('RepairType', repairTypeSchema);
