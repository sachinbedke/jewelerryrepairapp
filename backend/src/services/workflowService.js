const Activity = require('../models/Activity');
const Notification = require('../models/Notification');

const EDITABLE_INTAKE_STATUS = 'NOT_ASSIGNED';
const DELIVERED_STATUS = 'DELIVERED';

const createActivity = async ({ ticketId, userId, action, details, metadata }) =>
  Activity.create({ ticketId, userId, action, details, metadata });

const createNotification = async ({ userId, title, message, type = 'SYSTEM', referenceId, metadata }) =>
  Notification.create({ userId, title, message, type, referenceId, metadata });

const assertTicketEditableBeforeAssignment = (ticket) => {
  if (!ticket) {
    const error = new Error('Ticket not found');
    error.statusCode = 404;
    throw error;
  }

  if (ticket.status === DELIVERED_STATUS) {
    const error = new Error('Delivered tickets are read-only');
    error.statusCode = 409;
    throw error;
  }

  if (ticket.status !== EDITABLE_INTAKE_STATUS) {
    const error = new Error('Ticket intake details can be edited only before assignment');
    error.statusCode = 409;
    throw error;
  }
};

const assertTicketNotDelivered = (ticket) => {
  if (!ticket) {
    const error = new Error('Ticket not found');
    error.statusCode = 404;
    throw error;
  }

  if (ticket.status === DELIVERED_STATUS) {
    const error = new Error('Delivered tickets are read-only');
    error.statusCode = 409;
    throw error;
  }
};

module.exports = {
  EDITABLE_INTAKE_STATUS,
  DELIVERED_STATUS,
  createActivity,
  createNotification,
  assertTicketEditableBeforeAssignment,
  assertTicketNotDelivered,
};
