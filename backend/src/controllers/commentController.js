const Comment = require('../models/Comment');
const Activity = require('../models/Activity');
const Ticket = require('../models/Ticket');
const mongoose = require('mongoose');
const { formatRoleName } = require('../utils/mobileFormat');

const cleanIdValue = (value) =>
  value === null || value === undefined
    ? ''
    : String(value).trim().replace(/^["']+|["']+$/g, '');

const resolveTicketObjectId = async (value) => {
  const ticketId = cleanIdValue(value);
  if (mongoose.Types.ObjectId.isValid(ticketId)) return ticketId;

  const ticket = await Ticket.findOne({ ticketNo: ticketId }).select('_id');
  return ticket?._id;
};

const formatComment = (comment) => ({
  id: comment._id,
  comment_text: comment.comment,
  comment: comment.comment,
  user_name: comment.userId?.name || '',
  role_name: formatRoleName(comment.userId?.role || ''),
  created_at: comment.createdAt,
  coAuthor: comment.userId?.name || '',
  coRole: formatRoleName(comment.userId?.role || ''),
});

const getComments = async (req, res) => {
  try {
    const ticketId = await resolveTicketObjectId(req.params.ticketId);
    if (!ticketId) {
      return res.status(404).json({ success: false, status: false, message: 'Ticket not found' });
    }

    const comments = await Comment.find({ ticketId })
      .populate('userId', 'name employeeId role')
      .sort({ createdAt: -1 });

    const data = comments.map(formatComment);

    res.json({ success: true, status: true, data, comments: data, count: data.length });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch comments' });
  }
};

const addComment = async (req, res) => {
  try {
    const ticketId = await resolveTicketObjectId(req.params.ticketId);
    if (!ticketId) {
      return res.status(404).json({ success: false, status: false, message: 'Ticket not found' });
    }
    const ticket = await Ticket.findById(ticketId).select('status');
    if (ticket?.status === 'DELIVERED') {
      return res.status(409).json({ success: false, message: 'Delivered tickets are read-only' });
    }
    const commentText = (req.body.comment_text || req.body.comment || '').trim();

    if (!commentText) {
      return res.status(400).json({ success: false, message: 'Comment cannot be empty' });
    }

    const newComment = await Comment.create({
      ticketId,
      userId: req.user._id,
      comment: commentText,
    });

    await Activity.create({
      ticketId,
      userId: req.user._id,
      action: 'COMMENT_ADDED',
      details: `${req.user.name} added a comment`,
    });

    const populated = await Comment.findById(newComment._id).populate(
      'userId',
      'name employeeId role'
    );

    const formatted = formatComment(populated);
    const io = req.app.get('io');
    if (io) {
      io.to(`ticket_${ticketId}`).emit('new_comment', formatted);
    }

    res.status(201).json({ success: true, status: true, data: formatted, comment: formatted });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ success: false, message: 'Failed to add comment' });
  }
};

module.exports = {
  getComments,
  addComment,
};
