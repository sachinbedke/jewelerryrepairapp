const Ticket = require('../models/Ticket');
const Customer = require('../models/Customer');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const Task = require('../models/Task');
const ChecklistAcknowledgement = require('../models/ChecklistAcknowledgement');
const User = require('../models/User');
const Assignment = require('../models/Assignment');
const TicketAttachment = require('../models/TicketAttachment');
const StoneDetail = require('../models/StoneDetail');
const mongoose = require('mongoose');
const {
  createActivity: logActivity,
  createNotification: notifyUser,
  assertTicketEditableBeforeAssignment,
  assertTicketNotDelivered,
} = require('../services/workflowService');
const {
  formatTicketListItem,
  formatTicketDetail,
  parseBracketFields,
  buildTicketQueryFromRequest,
  STATUS_TO_MOBILE,
  parseMobilePriority,
  parseMobileStatus,
} = require('../utils/mobileFormat');

const createActivity = async (ticketId, userId, action, details, metadata) =>
  logActivity({ ticketId, userId, action, details, metadata });

const createNotification = async (userId, title, message, type, referenceId, metadata) =>
  notifyUser({ userId, title, message, type, referenceId, metadata });

const cleanIdValue = (value) =>
  value === null || value === undefined
    ? ''
    : String(value).trim().replace(/^["']+|["']+$/g, '');

const parseFormBody = (body) => {
  const parsed = {};
  Object.keys(body || {}).forEach((key) => {
    const value = body[key];
    if (typeof value === 'string') {
      try {
        parsed[key] = JSON.parse(value);
      } catch {
        parsed[key] = value;
      }
    } else {
      parsed[key] = value;
    }
  });
  return parsed;
};

const mediaFromFiles = (files = [], comments = []) =>
  files.map((file, index) => ({
    url: `/uploads/${file.filename}`,
    type: file.mimetype.startsWith('image')
      ? 'IMAGE'
      : file.mimetype.startsWith('video')
        ? 'VIDEO'
        : 'AUDIO',
    comment: comments[index] || '',
  }));

const persistTicketAttachments = async (ticketId, userId, files = [], comments = [], phase = 'BEFORE_REPAIR') => {
  if (!files.length) return [];

  return TicketAttachment.insertMany(files.map((file, index) => ({
    ticketId,
    uploadedBy: userId,
    phase,
    url: `/uploads/${file.filename}`,
    fileName: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    mediaType: file.mimetype.startsWith('image')
      ? 'IMAGE'
      : file.mimetype.startsWith('video')
        ? 'VIDEO'
        : 'AUDIO',
    comment: comments[index] || '',
  })));
};

const persistStoneDetails = async (ticketId, userId, stones = []) => {
  await StoneDetail.deleteMany({ ticketId });
  if (!stones.length) return [];

  return StoneDetail.insertMany(stones.map((stone) => ({
    ticketId,
    createdBy: userId,
    stoneType: stone.stoneType,
    weight: stone.weight,
    unit: stone.unit,
    shape: stone.shape,
    count: stone.count,
    comment: stone.comment,
  })));
};

const isPastDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date < today;
};

const sendError = (res, error, fallback = 'Server error') =>
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || fallback,
  });

const parseMediaComments = (body = {}) => {
  const comments = [];
  Object.keys(body).forEach((rawKey) => {
    const bracketMatch = rawKey.match(/^media_details\[(\d+)\]\[media_comment\]$/);
    if (bracketMatch) comments[Number(bracketMatch[1])] = body[rawKey];
  });

  const direct = body.comments || body.comment || body.media_comment;
  if (Array.isArray(direct)) direct.forEach((value, index) => { comments[index] = value; });
  if (typeof direct === 'string' && !comments.length) comments[0] = direct;

  return comments;
};

const canCloseTicket = async (ticketId) => {
  const cleanedTicketId = cleanIdValue(ticketId);
  const internalTasks = await Task.find({ ticketId: cleanedTicketId, isExternal: { $ne: true } });
  const externalTasks = await Task.find({ ticketId: cleanedTicketId, isExternal: true });
  const internalClosed = internalTasks.every((task) => task.status === 'CLOSE_BY_RHO');
  const externalClosed = externalTasks.every(
    (task) => ['COMPLETED_BY_KARIGAR', 'CLOSE_BY_RHO'].includes(task.status)
  );
  return { ok: internalClosed && externalClosed, internalClosed, externalClosed };
};

const findTicketByLooseId = (value) => {
  const ticketId = cleanIdValue(value);
  const lookup = mongoose.Types.ObjectId.isValid(ticketId)
    ? { _id: ticketId }
    : { ticketNo: ticketId };
  return Ticket.findOne(lookup);
};

const findTicketAndUpdateByLooseId = (value, update, options = {}) => {
  const ticketId = cleanIdValue(value);
  const lookup = mongoose.Types.ObjectId.isValid(ticketId)
    ? { _id: ticketId }
    : { ticketNo: ticketId };
  return Ticket.findOneAndUpdate(lookup, update, options);
};

const formatMediaForMobile = (media = []) =>
  media.map((item) => ({
    id: item._id,
    media_url: item.url,
    url: item.url,
    file: item.url,
    media_type:
      item.type === 'IMAGE' ? 'Image' : item.type === 'VIDEO' ? 'Video' : 'Document',
    type: item.type,
    media_comment: item.comment || '',
    comment: item.comment || '',
    created_at: item.uploadedAt,
  }));

const normalizeCreatePayload = async (req) => {
  const ticketData = parseFormBody(req.body);
  const stoneFromBrackets = parseBracketFields(req.body, 'stone_details');
  const repairFromBrackets = parseBracketFields(req.body, 'repair_type_details');

  if (stoneFromBrackets.length) ticketData.stone_details = stoneFromBrackets;
  if (repairFromBrackets.length) ticketData.repair_type_details = repairFromBrackets;

  if (!ticketData.customerId && ticketData.customer_id) {
    ticketData.customerId = ticketData.customer_id;
  }
  if (!ticketData.dueDate && ticketData.due_date) {
    ticketData.dueDate = ticketData.due_date;
  }
  if (ticketData.item_weight && !ticketData.weight) {
    ticketData.weight = ticketData.item_weight;
  }
  if (ticketData.unit_id && !ticketData.unit) ticketData.unit = ticketData.unit_id;
  if (!ticketData.jewelleryItem && ticketData.jewellery_item_id) {
    ticketData.jewelleryItem = ticketData.jewellery_item_id;
  }
  if (!ticketData.customJewellery && ticketData.jwellery_name) {
    ticketData.customJewellery = ticketData.jwellery_name;
  }
  if (!ticketData.material && ticketData.material_id) {
    ticketData.material = ticketData.material_id;
  }
  if (!ticketData.customMaterial && ticketData.material_name) {
    ticketData.customMaterial = ticketData.material_name;
  }
  if (!ticketData.purity && ticketData.purity_id) {
    ticketData.purity = ticketData.purity_id;
  }
  if (!ticketData.priority && ticketData.tkt_priority) {
    ticketData.priority = ticketData.tkt_priority;
  }

  if (!ticketData.repairTypes) {
    if (Array.isArray(ticketData.repair_type_details)) {
      ticketData.repairTypes = ticketData.repair_type_details.map(
        (r) => r.repair_type_id || r.id
      );
    } else if (ticketData.repair_type_id) {
      ticketData.repairTypes = [ticketData.repair_type_id];
    }
  }

  if (!ticketData.stones && ticketData.stone_details) {
    ticketData.stones = ticketData.stone_details.map((s) => ({
      stoneType: s.stone_type_id,
      weight: s.stone_weight,
      unit: s.unit_id || s.unit,
      shape: s.shape,
      count: s.count,
      comment: s.stone_comment,
    }));
  }

  let customerId = ticketData.customerId;
  const customerPayload = ticketData.customer;
  if (!customerId && customerPayload) {
    const c =
      typeof customerPayload === 'string'
        ? JSON.parse(customerPayload)
        : customerPayload;
    customerId = c.id || c._id;
    const mobile = c.mobile ? String(c.mobile).trim() : null;
    if (!customerId && mobile) {
      const existingCustomer = await Customer.findOne({ mobile });
      if (existingCustomer) {
        customerId = existingCustomer._id;
      } else if (c.name && c.location) {
        const createdCustomer = await Customer.create({
          name: c.name,
          mobile,
          email: c.email,
          location: c.location,
          whatsappEnabled: c.whatsappEnabled,
        });
        customerId = createdCustomer._id;
      }
    }
  }

  const mediaComments = parseMediaComments(req.body);

  return { ticketData, customerId, mediaComments };
};

const createTicket = async (req, res) => {
  try {
    const { ticketData, customerId, mediaComments } = await normalizeCreatePayload(req);

    if (!customerId) {
      return res.status(400).json({ success: false, message: 'customerId is required' });
    }

    const dueDate = ticketData.dueDate ? new Date(ticketData.dueDate) : undefined;
    if (ticketData.dueDate && Number.isNaN(dueDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid dueDate' });
    }
    if (!ticketData.dueDate || isPastDate(ticketData.dueDate)) {
      return res.status(400).json({ success: false, message: 'Due date cannot be a past date' });
    }

    const weight =
      ticketData.weight !== undefined && ticketData.weight !== ''
        ? Number(ticketData.weight)
        : undefined;
    if (ticketData.weight !== undefined && ticketData.weight !== '' && Number.isNaN(weight)) {
      return res.status(400).json({ success: false, message: 'Invalid weight' });
    }

    const beforeMedia = mediaFromFiles(req.files || [], mediaComments);
    if (!beforeMedia.length) {
      return res.status(400).json({ success: false, message: 'At least one before-repair attachment is required' });
    }

    const stones = (Array.isArray(ticketData.stones) ? ticketData.stones : []).map(
      (stone) => ({
        stoneType: stone?.stoneType,
        weight:
          stone?.weight !== undefined && stone?.weight !== ''
            ? Number(stone.weight)
            : undefined,
        unit: stone?.unit,
        shape: stone?.shape,
        count:
          stone?.count !== undefined && stone?.count !== ''
            ? Number(stone.count)
            : undefined,
        comment: stone?.comment,
      })
    );

    const jewelleryValue =
      ticketData.customJewellery ||
      ticketData.jwellery_name ||
      ticketData.jewelleryItem;
    const materialValue =
      ticketData.customMaterial || ticketData.material_name || ticketData.material;
    const repairTypes = Array.isArray(ticketData.repairTypes) ? ticketData.repairTypes.filter(Boolean) : [];

    if (!jewelleryValue) {
      return res.status(400).json({ success: false, message: 'Jewellery item is required' });
    }
    if (!materialValue) {
      return res.status(400).json({ success: false, message: 'Material is required' });
    }
    if (!repairTypes.length) {
      return res.status(400).json({ success: false, message: 'At least one repair type is required' });
    }

    const ticket = await Ticket.create({
      customerId,
      dueDate,
      jewelleryItem: jewelleryValue,
      customJewelleryItem: ticketData.customJewellery || ticketData.jwellery_name,
      material: materialValue,
      customMaterial: ticketData.customMaterial || ticketData.material_name,
      purity: ticketData.purity,
      weight,
      unit: ticketData.unit || 'Gram',
      repairTypes,
      specialInstructions: ticketData.specialInstructions,
      stones,
      priority: ticketData.priority || 'MEDIUM',
      status: 'NOT_ASSIGNED',
      createdBy: req.user._id,
      branchId: req.user.branchId,
      beforeMedia,
    });

    await persistTicketAttachments(ticket._id, req.user._id, req.files || [], mediaComments, 'BEFORE_REPAIR');
    await persistStoneDetails(ticket._id, req.user._id, stones);

    await createActivity(
      ticket._id,
      req.user._id,
      'TICKET_CREATED',
      `Ticket created by ${req.user.name}`
    );

    const formatted = formatTicketDetail(
      await Ticket.findById(ticket._id).populate('customerId', 'name mobile location')
    );

    res.status(201).json({
      success: true,
      ticket: formatted,
      data: formatted,
      id: ticket._id,
      ticket_no: ticket.ticketNo,
      ticketNo: ticket.ticketNo,
    });
  } catch (error) {
    console.error(error);
    sendError(res, error);
  }
};

const getRoleScopedQuery = async (req) => {
  const query = buildTicketQueryFromRequest(req);

  if (req.user.role === 'BRSH') {
    query.branchId = req.user.branchId;
  } else if (req.user.role === 'RHO') {
    const existingConditions = query.$and ? [...query.$and] : [];
    if (query.$or) {
      existingConditions.push({ $or: query.$or });
      delete query.$or;
    }
    existingConditions.push({
      $or: [
        { assignedRhoId: req.user._id },
        {
          status: 'ASSIGNED_TO_RHO',
          branchId: req.user.branchId,
          $or: [
            { assignedRhoId: { $exists: false } },
            { assignedRhoId: null },
          ],
        },
      ],
    });
    query.$and = existingConditions;
  } else if (req.user.role === 'KARIGAR') {
    const Task = require('../models/Task');
    const tasks = await Task.find({ assignedTo: req.user._id }).distinct('ticketId');
    query._id = { $in: tasks };
  }

  const { search } = req.query;
  if (search && String(search).trim() && !query.status) {
    const term = String(search).trim();
    const matchingCustomers = await Customer.find({
      $or: [
        { name: { $regex: term, $options: 'i' } },
        { mobile: { $regex: term, $options: 'i' } },
      ],
    }).select('_id');
    const customerIds = matchingCustomers.map((c) => c._id);

    const searchOr = [
      { ticketNo: { $regex: term, $options: 'i' } },
      ...(customerIds.length ? [{ customerId: { $in: customerIds } }] : []),
    ];

    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: searchOr }];
      delete query.$or;
    } else if (query.$and) {
      query.$and.push({ $or: searchOr });
    } else {
      query.$or = searchOr;
    }
  }

  return query;
};

const getTickets = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const query = await getRoleScopedQuery(req);

    const tickets = await Ticket.find(query)
      .populate('customerId', 'name mobile')
      .populate('createdBy', 'name')
      .populate('assignedRhoId', 'name')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Ticket.countDocuments(query);
    const formatted = tickets.map(formatTicketListItem);

    res.json({
      success: true,
      data: {
        data: formatted,
        page: Number(page),
        totalPages: Math.max(1, Math.ceil(total / Number(limit))),
        total,
      },
    });
  } catch (error) {
    console.error(error);
    sendError(res, error);
  }
};

const getTicketById = async (req, res) => {
  try {
    const id = String(req.params.id || '').trim().replace(/^["']+|["']+$/g, '');
    const lookup = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { ticketNo: id };

    const ticket = await Ticket.findOne(lookup)
      .populate('customerId', 'name mobile email location')
      .populate('createdBy', 'name employeeId')
      .populate('assignedRhoId', 'name employeeId')
      .populate('branchId', 'name code');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const formatted = formatTicketDetail(ticket);
    res.json({ success: true, data: formatted, ticket: formatted });
  } catch (error) {
    console.error(error);
    sendError(res, error);
  }
};

const getTicketCounts = async (req, res) => {
  try {
    const query = {};
    if (req.user.role === 'BRSH') {
      query.branchId = req.user.branchId;
    } else if (req.user.role === 'RHO') {
      query.$or = [
        { assignedRhoId: req.user._id },
        {
          status: 'ASSIGNED_TO_RHO',
          branchId: req.user.branchId,
          $or: [
            { assignedRhoId: { $exists: false } },
            { assignedRhoId: null },
          ],
        },
      ];
    }

    const counts = await Ticket.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const data = counts.map((item) => ({
      status: STATUS_TO_MOBILE[item._id] || item._id,
      count: item.count,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    sendError(res, error);
  }
};

const updatePriority = async (req, res) => {
  try {
    const priority =
      parseMobilePriority(req.body.priority || req.body.tkt_priority)?.[0] ||
      req.body.priority ||
      req.body.tkt_priority;

    const existing = await findTicketByLooseId(req.params.ticketId);
    assertTicketNotDelivered(existing);

    const ticket = await findTicketAndUpdateByLooseId(
      req.params.ticketId,
      { priority: priority || 'MEDIUM' },
      { new: true }
    );

    await createActivity(
      ticket._id,
      req.user._id,
      'PRIORITY_UPDATED',
      `Priority updated to ${priority} by ${req.user.name}`
    );

    res.json({ success: true, status: true, ticket: formatTicketDetail(ticket), data: formatTicketDetail(ticket) });
  } catch (error) {
    console.error(error);
    sendError(res, error);
  }
};

const updateDueDate = async (req, res) => {
  try {
    const dueDate = req.body.dueDate || req.body.due_date;
    if (!dueDate || isPastDate(dueDate)) {
      return res.status(400).json({ success: false, message: 'Due date cannot be a past date' });
    }

    const existing = await findTicketByLooseId(req.params.ticketId);
    assertTicketNotDelivered(existing);

    const ticket = await findTicketAndUpdateByLooseId(
      req.params.ticketId,
      { dueDate },
      { new: true }
    );

    if (!ticket) return res.status(404).json({ success: false, status: false, message: 'Ticket not found' });

    await createActivity(
      ticket._id,
      req.user._id,
      'DUE_DATE_UPDATED',
      `Due date updated by ${req.user.name}`
    );

    res.json({ success: true, status: true, ticket: formatTicketDetail(ticket), data: formatTicketDetail(ticket) });
  } catch (error) {
    console.error(error);
    sendError(res, error);
  }
};

const updateTicket = async (req, res) => {
  try {
    const ticketId = cleanIdValue(req.body.ticket_id || req.body.ticketId);
    if (!ticketId) {
      return res.status(400).json({ success: false, message: 'ticket_id is required' });
    }

    const updates = {};
    const existing = await findTicketByLooseId(ticketId);
    assertTicketEditableBeforeAssignment(existing);

    if (req.body.due_date || req.body.dueDate) {
      if (isPastDate(req.body.due_date || req.body.dueDate)) {
        return res.status(400).json({ success: false, message: 'Due date cannot be a past date' });
      }
      updates.dueDate = req.body.due_date || req.body.dueDate;
    }
    if (req.body.tkt_priority || req.body.priority) {
      updates.priority =
        parseMobilePriority(req.body.tkt_priority || req.body.priority)?.[0] ||
        req.body.tkt_priority ||
        req.body.priority;
    }
    if (req.body.item_weight || req.body.weight) updates.weight = Number(req.body.item_weight || req.body.weight);
    if (req.body.unit_id || req.body.unit) updates.unit = req.body.unit_id || req.body.unit;
    if (req.body.purity_id || req.body.purity) updates.purity = req.body.purity_id || req.body.purity;
    if (req.body.material_id || req.body.material_name || req.body.material) {
      updates.material = req.body.material_name || req.body.material_id || req.body.material;
    }
    if (req.body.jewellery_item_id || req.body.jwellery_name || req.body.jewelleryItem) {
      updates.jewelleryItem = req.body.jwellery_name || req.body.jewellery_item_id || req.body.jewelleryItem;
    }
    if (req.body.specialInstructions || req.body.special_instructions) {
      updates.specialInstructions = req.body.specialInstructions || req.body.special_instructions;
    }
    const files = mediaFromFiles(req.files || [], parseMediaComments(req.body));
    if (files.length) updates.$push = { beforeMedia: { $each: files } };

    const ticket = await findTicketAndUpdateByLooseId(ticketId, updates, { new: true })
      .populate('customerId', 'name mobile location');

    if (!ticket) return res.status(404).json({ success: false, status: false, message: 'Ticket not found' });

    if ((req.files || []).length) {
      await persistTicketAttachments(ticket._id, req.user._id, req.files || [], parseMediaComments(req.body), 'BEFORE_REPAIR');
    }

    await createActivity(ticket._id, req.user._id, 'TICKET_UPDATED', `Ticket intake updated by ${req.user.name}`);

    res.json({
      success: true,
      ticket: formatTicketDetail(ticket),
      data: formatTicketDetail(ticket),
      id: ticket._id,
    });
  } catch (error) {
    console.error(error);
    sendError(res, error);
  }
};

const assignToRHO = async (req, res) => {
  try {
    const ticketId = cleanIdValue(req.body.ticketId || req.body.ticket_id);
    // Remove rhoId requirement - we're assigning to ALL RHOs

    if (!ticketId) {
      return res.status(400).json({ success: false, message: 'ticket_id is required' });
    }

    const existing = await findTicketByLooseId(ticketId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }
    
    if (existing.status !== 'NOT_ASSIGNED') {
      return res.status(409).json({ success: false, message: 'Only Not Assigned tickets can be assigned to RHO' });
    }
    
    if (String(existing.branchId) !== String(req.user.branchId)) {
      return res.status(403).json({ success: false, message: 'BRSH can assign only branch tickets' });
    }

    // Update ticket status WITHOUT assigning to specific RHO
    const lookup = mongoose.Types.ObjectId.isValid(ticketId)
      ? { _id: ticketId }
      : { ticketNo: ticketId };
    
    const updates = { 
      status: 'ASSIGNED_TO_RHO', 
      assignedAt: new Date(),
      // IMPORTANT: Don't set assignedRhoId - leave it null so all RHOs can see it
      assignedRhoId: null  
    };

    const ticket = await Ticket.findOneAndUpdate(lookup, updates, { new: true })
      .populate('customerId', 'name mobile email location')
      .populate('createdBy', 'name employeeId')
      .populate('assignedRhoId', 'name employeeId')
      .populate('branchId', 'name code');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Optional: Create assignment record showing it's available for all RHOs
    // You might want to create multiple assignment records or a single "pool" assignment
    await Assignment.create({
      ticketId: ticket._id,
      assignedBy: req.user._id,
      assignedTo: null,  // null means available for any RHO
      role: 'RHO',
      status: 'ACTIVE',
    });

    // Notify ALL RHOs in the branch (optional)
    const allRHOs = await User.find({ 
      role: 'RHO', 
      branchId: req.user.branchId, 
      isActive: true 
    });
    
    for (const rho of allRHOs) {
      await createNotification(
        rho._id,
        'New Ticket Available',
        `Ticket ${ticket.ticketNo} is available for acceptance`,
        'TICKET',
        ticket._id
      );
    }

    await createActivity(
      ticket._id,
      req.user._id,
      'ASSIGNED_TO_RHO',
      `Ticket made available to all RHOs by ${req.user.name}`
    );

    const formatted = formatTicketDetail(ticket);
    res.json({ success: true, ticket: formatted, data: formatted });
  } catch (error) {
    console.error(error);
    sendError(res, error);
  }
};
const getDashboardCounts = async (req, res) => {
  try {
    const baseQuery = {};
    if (req.user.role === 'BRSH') {
      baseQuery.branchId = req.user.branchId;
    } else if (req.user.role === 'RHO') {
      baseQuery.assignedRhoId = req.user._id;
    }

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [byStatus, byPriority, overdue, dueToday, total] = await Promise.all([
      Ticket.aggregate([{ $match: baseQuery }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Ticket.aggregate([{ $match: baseQuery }, { $group: { _id: '$priority', count: { $sum: 1 } } }]),
      Ticket.countDocuments({ ...baseQuery, dueDate: { $lt: new Date() }, status: { $ne: 'DELIVERED' } }),
      Ticket.countDocuments({ ...baseQuery, dueDate: { $lte: todayEnd }, status: { $ne: 'DELIVERED' } }),
      Ticket.countDocuments(baseQuery),
    ]);

    res.json({
      success: true,
      data: {
        total,
        overdue,
        dueToday,
        byStatus: byStatus.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
        byPriority: byPriority.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
      },
    });
  } catch (error) {
    console.error(error);
    sendError(res, error);
  }
};

const acceptTicket = async (req, res) => {
  try {
    const ticketId = cleanIdValue(req.body.ticketId || req.body.ticket_id);
    const lookup = mongoose.Types.ObjectId.isValid(ticketId) ? { _id: ticketId } : { ticketNo: ticketId };
    const existing = await Ticket.findOne(lookup);
    if (!existing) {
      return res.status(404).json({ success: false, status: false, message: 'Ticket not found' });
    }
    if (existing.status !== 'ASSIGNED_TO_RHO') {
      return res.status(409).json({ success: false, status: false, message: 'Only assigned tickets can be accepted by RHO' });
    }

    const ticket = await Ticket.findOneAndUpdate(
      lookup,
      { status: 'ACCEPTED_BY_RHO', assignedRhoId: req.user._id },
      { new: true }
    )
      .populate('customerId', 'name mobile email location')
      .populate('createdBy', 'name employeeId')
      .populate('assignedRhoId', 'name employeeId')
      .populate('branchId', 'name code');

    await createActivity(
      ticket._id,
      req.user._id,
      'TICKET_ACCEPTED',
      `Ticket accepted by RHO ${req.user.name}`
    );

    const formatted = formatTicketDetail(ticket);
    res.json({ success: true, status: true, ticket: formatted, data: formatted });
  } catch (error) {
    console.error(error);
    sendError(res, error);
  }
};

const closeTicket = async (req, res) => {
  try {
    const gates = await canCloseTicket(req.params.ticketId);
    if (!gates.ok) {
      return res.status(400).json({
        success: false,
        message: 'All tasks must be finished before RHO can close this ticket.',
        gates,
      });
    }

    const { afterMedia } = req.body;
    const uploadedAfterMedia = mediaFromFiles(req.files || [], parseMediaComments(req.body));
    const update = { status: 'IN_REVIEW' };
    if (uploadedAfterMedia.length) {
      update.$push = { afterMedia: { $each: uploadedAfterMedia } };
    } else if (Array.isArray(afterMedia) && afterMedia.length) {
      update.afterMedia = afterMedia;
    }

    const ticket = await findTicketAndUpdateByLooseId(
      req.params.ticketId,
      update,
      { new: true }
    );

    if (uploadedAfterMedia.length) {
      await persistTicketAttachments(ticket._id, req.user._id, req.files || [], parseMediaComments(req.body), 'AFTER_REPAIR');
    }

    await createActivity(
      ticket._id,
      req.user._id,
      'TICKET_MOVED_TO_REVIEW',
      `Ticket moved to review by RHO ${req.user.name}`
    );

    res.json({ success: true, ticket: formatTicketDetail(ticket) });
  } catch (error) {
    console.error(error);
    sendError(res, error);
  }
};

const markReadyForDelivery = async (req, res) => {
  try {
    const existing = await findTicketByLooseId(req.params.ticketId);
    if (!existing) return res.status(404).json({ success: false, status: false, message: 'Ticket not found' });
    if (!['IN_REVIEW', 'TICKET_CLOSED_BY_RHO'].includes(existing.status)) {
      return res.status(409).json({ success: false, message: 'Ticket can be marked ready only after RHO moves it to review' });
    }

    const ticket = await findTicketAndUpdateByLooseId(
      req.params.ticketId,
      { status: 'READY_FOR_DELIVERY', readyForDeliveryAt: new Date() },
      { new: true }
    );

    if (!ticket) return res.status(404).json({ success: false, status: false, message: 'Ticket not found' });

    await createActivity(
      ticket._id,
      req.user._id,
      'READY_FOR_DELIVERY',
      `Ticket marked ready for delivery by ${req.user.name}`
    );
    await createNotification(
      ticket.createdBy,
      'Ticket Ready for Delivery',
      `Ticket ${ticket.ticketNo} is ready for delivery`,
      'TICKET',
      ticket._id
    );

    res.json({ success: true, status: true, ticket: formatTicketDetail(ticket), data: formatTicketDetail(ticket) });
  } catch (error) {
    console.error(error);
    sendError(res, error);
  }
};

const markDelivered = async (req, res) => {
  try {
    const existing = await findTicketByLooseId(req.params.ticketId);
    if (!existing) return res.status(404).json({ success: false, status: false, message: 'Ticket not found' });
    if (existing.status !== 'READY_FOR_DELIVERY') {
      return res.status(409).json({ success: false, message: 'Only Ready for Delivery tickets can be delivered' });
    }

    const ticket = await findTicketAndUpdateByLooseId(
      req.params.ticketId,
      { status: 'DELIVERED', deliveredAt: new Date() },
      { new: true }
    );

    if (!ticket) return res.status(404).json({ success: false, status: false, message: 'Ticket not found' });

    await createActivity(
      ticket._id,
      req.user._id,
      'TICKET_DELIVERED',
      `Ticket delivered to customer by ${req.user.name}`
    );
    if (ticket.assignedRhoId) {
      await createNotification(
        ticket.assignedRhoId,
        'Ticket Delivered',
        `Ticket ${ticket.ticketNo} has been delivered`,
        'TICKET',
        ticket._id
      );
    }

    res.json({ success: true, status: true, ticket: formatTicketDetail(ticket), data: formatTicketDetail(ticket) });
  } catch (error) {
    console.error(error);
    sendError(res, error);
  }
};

const updatePriorityOrStatus = async (req, res) => {
  try {
    const existing = await findTicketByLooseId(req.params.ticketId);
    assertTicketNotDelivered(existing);

    const updates = {};
    const priority = parseMobilePriority(req.body.priority || req.body.tkt_priority)?.[0];
    const status = parseMobileStatus(req.body.status || req.body.tStatus)?.[0];
    if (priority) updates.priority = priority;
    if (status) updates.status = status;

    const ticket = await findTicketAndUpdateByLooseId(req.params.ticketId, updates, { new: true })
      .populate('customerId', 'name mobile email location')
      .populate('createdBy', 'name employeeId')
      .populate('assignedRhoId', 'name employeeId')
      .populate('branchId', 'name code');

    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    await createActivity(ticket._id, req.user._id, 'TICKET_UPDATED', 'Ticket priority/status updated');
    const formatted = formatTicketDetail(ticket);
    res.json({ success: true, ticket: formatted, data: formatted });
  } catch (error) {
    console.error(error);
    sendError(res, error);
  }
};

const updateJewellerySection = async (req, res) => {
  try {
    const existing = await findTicketByLooseId(req.params.ticketId);
    assertTicketEditableBeforeAssignment(existing);

    const body = parseFormBody(req.body);
    const updates = {};
    if (body.jwellery_name || body.jewelleryItem || body.jewellery_item_id) {
      updates.jewelleryItem = body.jwellery_name || body.jewelleryItem || body.jewellery_item_id;
    }
    if (body.material_name || body.material || body.material_id) {
      updates.material = body.material_name || body.material || body.material_id;
    }
    if (body.purity || body.purity_id) updates.purity = body.purity || body.purity_id;
    if (body.item_weight || body.weight) updates.weight = Number(body.item_weight || body.weight);
    if (body.unit || body.unit_id) updates.unit = body.unit || body.unit_id;
    if (body.repairTypes || body.repair_type_details) {
      updates.repairTypes = Array.isArray(body.repairTypes)
        ? body.repairTypes
        : body.repair_type_details.map((item) => item.repair_type_id || item.id);
    }

    const ticket = await findTicketAndUpdateByLooseId(req.params.ticketId, updates, { new: true })
      .populate('customerId', 'name mobile email location')
      .populate('createdBy', 'name employeeId')
      .populate('assignedRhoId', 'name employeeId')
      .populate('branchId', 'name code');

    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    await createActivity(ticket._id, req.user._id, 'JEWELLERY_DETAILS_UPDATED', `Jewellery details updated by ${req.user.name}`);
    const formatted = formatTicketDetail(ticket);
    res.json({ success: true, ticket: formatted, data: formatted });
  } catch (error) {
    console.error(error);
    sendError(res, error);
  }
};

const updateStoneDetails = async (req, res) => {
  try {
    const existing = await findTicketByLooseId(req.params.ticketId);
    assertTicketEditableBeforeAssignment(existing);

    const body = parseFormBody(req.body);
    const stoneDetails = body.stones || body.stone_details || parseBracketFields(req.body, 'stone_details');
    const stones = (Array.isArray(stoneDetails) ? stoneDetails : []).map((stone) => ({
      stoneType: stone.stoneType || stone.stone_type_id,
      weight: Number(stone.weight || stone.stone_weight || 0),
      unit: stone.unit || stone.unit_id,
      shape: stone.shape,
      count: Number(stone.count || 0),
      comment: stone.comment || stone.stone_comment,
    }));

    const ticket = await findTicketAndUpdateByLooseId(req.params.ticketId, { stones }, { new: true })
      .populate('customerId', 'name mobile email location')
      .populate('createdBy', 'name employeeId')
      .populate('assignedRhoId', 'name employeeId')
      .populate('branchId', 'name code');

    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    await persistStoneDetails(ticket._id, req.user._id, stones);
    await createActivity(ticket._id, req.user._id, 'STONE_DETAILS_UPDATED', `Stone details updated by ${req.user.name}`);
    const formatted = formatTicketDetail(ticket);
    res.json({ success: true, ticket: formatted, data: formatted });
  } catch (error) {
    console.error(error);
    sendError(res, error);
  }
};

const setStoneActiveInactive = (req, res) => {
  res.json({ success: true, message: 'Stone active/inactive state accepted.' });
};

const getBeforeMedia = async (req, res) => {
  const ticket = await findTicketByLooseId(req.params.ticketId);
  if (!ticket) return res.status(404).json({ success: false, status: false, message: 'Ticket not found' });
  const data = formatMediaForMobile(ticket.beforeMedia);
  res.json({ success: true, status: true, message: 'Before media fetched', data, media: data, before_media: data });
};

const uploadBeforeMedia = async (req, res) => {
  try {
    const existing = await findTicketByLooseId(req.params.ticketId);
    assertTicketEditableBeforeAssignment(existing);

    const mediaComments = parseMediaComments(req.body);
    const media = mediaFromFiles(req.files || [], mediaComments);
    if (!media.length) {
      return res.status(400).json({ success: false, message: 'At least one attachment is required' });
    }

    const ticket = await findTicketAndUpdateByLooseId(
      req.params.ticketId,
      { $push: { beforeMedia: { $each: media } } },
      { new: true }
    );

    await persistTicketAttachments(ticket._id, req.user._id, req.files || [], mediaComments, 'BEFORE_REPAIR');
    await createActivity(ticket._id, req.user._id, 'BEFORE_MEDIA_UPLOADED', `Before-repair media uploaded by ${req.user.name}`);

    const data = formatMediaForMobile(ticket.beforeMedia);
    res.status(201).json({ success: true, status: true, message: 'Before media uploaded', data, media: data, before_media: data });
  } catch (error) {
    console.error(error);
    sendError(res, error);
  }
};

const getAfterMedia = async (req, res) => {
  const ticket = await findTicketByLooseId(req.params.ticketId);
  if (!ticket) return res.status(404).json({ success: false, status: false, message: 'Ticket not found' });
  const data = formatMediaForMobile(ticket.afterMedia);
  res.json({ success: true, status: true, message: 'After media fetched', data, media: data, after_media: data });
};

const uploadAfterMedia = async (req, res) => {
  try {
    const media = mediaFromFiles(req.files || [], parseMediaComments(req.body));
    const ticketId = cleanIdValue(req.params.ticketId);
    const lookup = mongoose.Types.ObjectId.isValid(ticketId)
      ? { _id: ticketId }
      : { ticketNo: ticketId };
    const ticket = await Ticket.findOneAndUpdate(
      lookup,
      { $push: { afterMedia: { $each: media } } },
      { new: true }
    );
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    await persistTicketAttachments(ticket._id, req.user._id, req.files || [], parseMediaComments(req.body), 'AFTER_REPAIR');
    await createActivity(ticket._id, req.user._id, 'AFTER_MEDIA_UPLOADED', `After-repair media uploaded by ${req.user.name}`);
    const data = formatMediaForMobile(ticket.afterMedia);
    res.json({ success: true, status: true, message: 'After media uploaded', data, media: data, after_media: data });
  } catch (error) {
    console.error(error);
    sendError(res, error);
  }
};

const deleteMedia = async (req, res) => {
  try {
    const mediaId = req.params.mediaId;
    const existing = await Ticket.findOne({ $or: [{ 'beforeMedia._id': mediaId }, { 'afterMedia._id': mediaId }] });
    assertTicketNotDelivered(existing);

    const ticket = await Ticket.findOneAndUpdate(
      { $or: [{ 'beforeMedia._id': mediaId }, { 'afterMedia._id': mediaId }] },
      {
        $pull: {
          beforeMedia: { _id: mediaId },
          afterMedia: { _id: mediaId },
        },
      },
      { new: true }
    );
    if (!ticket) return res.status(404).json({ success: false, status: false, message: 'Media not found' });
    res.json({ success: true, status: true, message: 'Media deleted', data: { id: mediaId } });
  } catch (error) {
    console.error(error);
    sendError(res, error);
  }
};

const getChecklist = (req, res) => {
  const checklistId = String(req.params.id);
  const items = {
    1: ['Customer details checked', 'Before media checked', 'Repair details checked'],
    2: ['Task details checked', 'Proof media attached'],
    4: ['All tasks closed', 'After media attached', 'Expense sheet reviewed or skipped'],
  }[checklistId] || ['Confirmation checked'];

  res.json({
    success: true,
    data: {
      id: checklistId,
      name: `Checklist ${checklistId}`,
      items: items.map((text, index) => ({ id: `${checklistId}-${index + 1}`, text })),
    },
  });
};

const acknowledgeChecklist = async (req, res) => {
  try {
    const ticketId = cleanIdValue(req.body.ticketId || req.body.ticket_id);
    const checklistId = cleanIdValue(req.body.checkListId || req.body.checklistId || req.body.checklist_id);
    if (!ticketId || !checklistId) {
      return res.status(400).json({ success: false, message: 'ticketId and checklistId are required' });
    }

    const ack = await ChecklistAcknowledgement.findOneAndUpdate(
      { ticketId, checklistId, userId: req.user._id },
      {
        ticketId,
        checklistId,
        userId: req.user._id,
        answers: req.body.answers || req.body.items,
        remark: req.body.remark,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await createActivity(ticketId, req.user._id, 'CHECKLIST_ACKNOWLEDGED', `Checklist ${checklistId} acknowledged`);
    res.json({ success: true, data: ack, acknowledgement: ack });
  } catch (error) {
    console.error(error);
    sendError(res, error);
  }
};

const getAcknowledgementStatus = async (req, res) => {
  const ticketId = cleanIdValue(req.params.ticketId);
  const checklistId = cleanIdValue(req.params.checkListId);
  const ack = await ChecklistAcknowledgement.findOne({
    ticketId,
    checklistId,
    userId: req.user._id,
  });
  res.json({ success: true, acknowledged: Boolean(ack), data: ack });
};

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  getTicketCounts,
  getDashboardCounts,
  updatePriority,
  updateDueDate,
  updateTicket,
  assignToRHO,
  acceptTicket,
  closeTicket,
  markReadyForDelivery,
  markDelivered,
  updatePriorityOrStatus,
  updateJewellerySection,
  updateStoneDetails,
  setStoneActiveInactive,
  getBeforeMedia,
  uploadBeforeMedia,
  getAfterMedia,
  uploadAfterMedia,
  deleteMedia,
  getChecklist,
  acknowledgeChecklist,
  getAcknowledgementStatus,
};

