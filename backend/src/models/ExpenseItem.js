const mongoose = require('mongoose');

const expenseItemSchema = new mongoose.Schema({
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true
  },
  workType: {         // ← keep this, controller maps work_detail_id here
    type: String,
    required: true
  },
  workName: {         // ← add: human-readable name for GET response
    type: String,
    default: ''
  },
  weight:        { type: Number, default: 0 },
  purity:        { type: String, default: '' },
  unit:          { type: String, default: '' },
  amount:        { type: Number, required: true },
  material:      { type: String, default: null },
  materialCount: { type: Number, default: null },
  reason:        { type: String, default: null },
  tagNumber:     { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('ExpenseItem', expenseItemSchema);