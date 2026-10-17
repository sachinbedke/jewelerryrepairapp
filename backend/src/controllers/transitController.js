const Transit = require('../models/Transit');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const Ticket = require('../models/Ticket');
const mongoose = require('mongoose');

const cleanIdValue = (value) =>
  value === null || value === undefined
    ? ''
    : String(value).trim().replace(/^["']+|["']+$/g, '');

const normalizePurpose = (purpose) => {
  const value = String(purpose || '').toLowerCase();
  if (value.includes('branch')) return 'BRANCH_TRANSFER';
  if (value.includes('repair')) return 'REPAIR_TRANSFER';
  return 'DEPARTMENT_TRANSFER';
};

// @desc    Create transit
// @route   POST /api/assignments/InTransit
// @access  Private
const createTransit = async (req, res) => {
  try {
    const transit = await Transit.create({
      ...req.body,
      ticketId: req.body.ticketId || req.body.ticket_id,
      purpose: normalizePurpose(req.body.purpose),
      fromBranchId: req.body.fromBranchId || req.user.branchId,
      toBranchId: req.body.toBranchId || req.body.branchId || req.body.branch_id,
      toDepartmentId: req.body.toDepartmentId || req.body.departmentId || req.body.dept_id,
      contactPerson: req.body.contactPerson || req.body.contact_person,
      carrierName: req.body.carrierName || req.body.carrier_name,
      carrierNumber: req.body.carrierNumber || req.body.carrier_number,
      senderId: req.user._id
    });

    // Update ticket status
    await Ticket.findByIdAndUpdate(transit.ticketId, { status: 'BRANCH_TRANSFER' });

    await Activity.create({
      ticketId: transit.ticketId,
      userId: req.user._id,
      action: 'TRANSIT_CREATED',
      details: `Transit created by ${req.user.name}`
    });

    res.status(201).json({ success: true, transit });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get transit by ticket
// @route   GET /api/assignments/InTransit/:ticketId
// @access  Private
const getTransitByTicket = async (req, res) => {
  try {
    const ticketId = cleanIdValue(req.params.ticketId);
    const transits = await Transit.find({ ticketId })
      .populate('fromBranchId', 'name')
      .populate('toBranchId', 'name')
      .populate('toDepartmentId', 'name')
      .populate('senderId', 'name')
      .populate('receiverId', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, transits });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update transit status (receive)
// @route   PUT /api/assignments/InTransitStatus/:ticketId/:transitId
// @access  Private
const updateTransitStatus = async (req, res) => {
  try {
    const { status, receiptPhoto, receiptRemark } = req.body;
    const ticketId = cleanIdValue(req.params.ticketId);
    const transitId = cleanIdValue(req.params.transitId);
    
    const transit = await Transit.findByIdAndUpdate(
      transitId,
      { 
        status,
        receiverId: req.user._id,
        receiptPhoto,
        receiptRemark,
        receivedAt: status === 'RECEIVED' ? new Date() : null
      },
      { new: true }
    );

    await Activity.create({
      ticketId,
      userId: req.user._id,
      action: 'TRANSIT_RECEIVED',
      details: `Transit received by ${req.user.name}`
    });

    res.json({ success: true, transit });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Add transit media
// @route   PUT /api/assignments/InTransitMedia/:ticketId/:transitId
// @access  Private
const addTransitMedia = async (req, res) => {
  try {
    const uploadedFile = req.file || req.files?.[0];
    const receiptPhoto = uploadedFile ? `/uploads/${uploadedFile.filename}` : req.body.receiptPhoto;
    const receiptRemark = req.body.receiptRemark || req.body.remark;
    const transitId = cleanIdValue(req.params.transitId);
    
    const transit = await Transit.findByIdAndUpdate(
      transitId,
      { receiptPhoto, receiptRemark },
      { new: true }
    );

    res.json({ success: true, transit });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateTransit = async (req, res) => {
  try {
    const transitId = cleanIdValue(req.params.transitId);
    const transit = await Transit.findByIdAndUpdate(transitId, req.body, { new: true });
    if (!transit) return res.status(404).json({ success: false, message: 'Transit not found' });
    res.json({ success: true, transit, data: transit });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getTransitStatusByTicket = async (req, res) => {
  try {
    const ticketId = cleanIdValue(req.params.ticketId);
    const activeTransit = await Transit.findOne({
      ticketId,
      status: { $in: ['INITIATED', 'IN_TRANSIT'] },
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      inTransit: Boolean(activeTransit),
      data: {
        inTransit: Boolean(activeTransit),
        transit: activeTransit,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  createTransit,
  getTransitByTicket,
  updateTransitStatus,
  addTransitMedia,
  updateTransit,
  getTransitStatusByTicket
};
