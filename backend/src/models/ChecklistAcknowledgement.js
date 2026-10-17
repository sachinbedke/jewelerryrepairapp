const mongoose = require('mongoose');

const checklistAcknowledgementSchema = new mongoose.Schema({
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true,
  },
  checklistId: {
    type: String,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  answers: mongoose.Schema.Types.Mixed,
  remark: String,
}, {
  timestamps: true,
});

checklistAcknowledgementSchema.index(
  { ticketId: 1, checklistId: 1, userId: 1 },
  { unique: true }
);

module.exports = mongoose.model('ChecklistAcknowledgement', checklistAcknowledgementSchema);
