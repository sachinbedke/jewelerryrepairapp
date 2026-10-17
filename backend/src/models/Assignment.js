const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true,
    index: true,
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    enum: ['RHO', 'KARIGAR', 'EXTERNAL_KARIGAR'],
    required: true,
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'ACCEPTED', 'COMPLETED', 'CANCELLED'],
    default: 'ACTIVE',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Assignment', assignmentSchema);
