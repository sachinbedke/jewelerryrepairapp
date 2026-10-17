const mongoose = require('mongoose');

const stoneDetailSchema = new mongoose.Schema({
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true,
    index: true,
  },
  stoneType: {
    type: String,
    required: true,
    trim: true,
  },
  weight: Number,
  unit: String,
  shape: String,
  count: {
    type: Number,
    default: 0,
  },
  comment: String,
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('StoneDetail', stoneDetailSchema);
