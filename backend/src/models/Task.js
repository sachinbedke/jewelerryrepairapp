const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  status: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED_BY_KARIGAR', 'COMPLETED_BY_KAARIGAR', 'CLOSE_BY_RHO', 
           'REWORK', 'REJECTED', 'HOLD', 'CANCELLED'],
    default: 'PENDING'
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM'
  },
  dueDate: {
    type: Date,
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isExternal: {
    type: Boolean,
    default: false
  },
  externalName: String,
  externalPhone: String,
  completedByKarigarAt: Date,
  closedByRhoAt: Date,
  reworkRemark: String,
  taskMedia: [{
    url: String,
    type: {
      type: String,
      enum: ['IMAGE', 'VIDEO']
    },
    comment: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Task', taskSchema);
