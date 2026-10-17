const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticketNo: {
    type: String,
    required: true,
    unique: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  status: {
    type: String,
    enum: [
      'NOT_ASSIGNED',
      'ASSIGNED_TO_RHO',
      'ACCEPTED_BY_RHO',
      'IN_PROGRESS',
      'INT_KARIGAR',
      'REQUEST_REWORK',
      'IN_REVIEW',
      'READY_FOR_DELIVERY',
      'BRANCH_TRANSFER',
      'DELIVERED',
      'TICKET_CLOSED_BY_RHO',
      'EXPENSE_SHEET_SKIPPED',
    ],
    default: 'NOT_ASSIGNED'
  },
  assignedAt: Date,
  readyForDeliveryAt: Date,
  deliveredAt: Date,
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM'
  },
  dueDate: {
    type: Date,
    required: true
  },
  jewelleryItem: {
    type: String,
    required: true
  },
  customJewelleryItem: String,
  material: {
    type: String,
    required: true
  },
  customMaterial: String,
  purity: String,
  weight: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    required: true
  },
  stones: [{
    stoneType: String,
    weight: Number,
    unit: String,
    shape: String,
    count: Number,
    comment: String
  }],
  repairTypes: [String],
  specialInstructions: String,
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedRhoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  beforeMedia: [{
    url: String,
    type: {
      type: String,
      enum: ['IMAGE', 'VIDEO', 'AUDIO']
    },
    comment: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  afterMedia: [{
    url: String,
    type: {
      type: String,
      enum: ['IMAGE', 'VIDEO', 'AUDIO']
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

// Generate ticket number before validation so it exists during schema validation
const assignTicketNumber = async function() {
  if (!this.ticketNo) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const count = await mongoose.model('Ticket').countDocuments();
    this.ticketNo = `CHT${year}${month}${String(count + 1).padStart(4, '0')}`;
  }
};

ticketSchema.pre('validate', assignTicketNumber);
ticketSchema.pre('save', assignTicketNumber);

module.exports = mongoose.model('Ticket', ticketSchema);
