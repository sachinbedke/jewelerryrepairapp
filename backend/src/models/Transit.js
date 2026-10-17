const mongoose = require('mongoose');

const transitSchema = new mongoose.Schema({
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true
  },
  purpose: {
    type: String,
    enum: ['BRANCH_TRANSFER', 'DEPARTMENT_TRANSFER', 'REPAIR_TRANSFER'],
    required: true
  },
  fromBranchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  toBranchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  toDepartmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  contactPerson: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  carrierName: String,
  carrierNumber: String,
  status: {
    type: String,
    enum: ['INITIATED', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED'],
    default: 'INITIATED'
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  receiptPhoto: String,
  receiptRemark: String,
  receivedAt: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('Transit', transitSchema);