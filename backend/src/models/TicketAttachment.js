const mongoose = require('mongoose');

const ticketAttachmentSchema = new mongoose.Schema({
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true,
    index: true,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  phase: {
    type: String,
    enum: ['BEFORE_REPAIR', 'AFTER_REPAIR', 'TASK_PROOF', 'TRANSIT'],
    default: 'BEFORE_REPAIR',
  },
  url: {
    type: String,
    required: true,
  },
  fileName: String,
  originalName: String,
  mimeType: String,
  size: Number,
  mediaType: {
    type: String,
    enum: ['IMAGE', 'VIDEO', 'AUDIO'],
    required: true,
  },
  comment: String,
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('TicketAttachment', ticketAttachmentSchema);
