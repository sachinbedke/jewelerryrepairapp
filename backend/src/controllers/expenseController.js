const ExpenseItem = require('../models/ExpenseItem');
const Activity = require('../models/Activity');

// @desc    Get expense items for ticket
// @route   GET /api/expensesheet/:ticketId
// @access  Private
const getExpenseItems = async (req, res) => {
  try {
    const expenses = await ExpenseItem.find({ ticketId: req.params.ticketId });

    // Frontend expects: res.data = [ { tag_no, expense_items: [...] } ]
    // Group by tag_no (or single group if no tag)
    const tag_no = expenses.length > 0 ? (expenses[0].tagNumber || '') : '';

    const expense_items = expenses.map(e => ({
      expense_item_id: e._id,
      work_name:       e.workName || e.work_name || '',
      gross_weight:    e.weight   || e.gross_weight || 0,
      unit:            e.unit     || '',
      purity:          e.purity   || '',
      amount:          e.amount   || 0,
      material:        e.material || '',
      material_count:  e.materialCount || e.material_count || null,
      reason:          e.reason   || '',
    }));

    res.json({
      success: true,
      data: [{ tag_no, expense_items }],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create expense items (supports bulk via items array)
// @route   POST /api/expensesheet
// @access  Private (RHO only)
const createExpenseItem = async (req, res) => {
  try {
    const ticketId = req.body.ticket_id || req.body.ticketId;
    const tag_no   = req.body.tag_no   || req.body.tagNumber || null;

    // Support both single item and items array
    const itemsArray = Array.isArray(req.body.items)
      ? req.body.items
      : [req.body];

    const saved = [];
    for (const item of itemsArray) {
      // Look up work_name from work_detail_id if provided
      const workDetails = getWorkDetailsList();
      const workDetail  = workDetails.find(w => String(w.id) === String(item.work_detail_id));

      const expense = await ExpenseItem.create({
        ticketId,
        workDetailId:  item.work_detail_id,
        workName:      workDetail ? workDetail.work_name : (item.work_name || ''),
        weight:        item.gross_weight || item.weight || 0,
        unit:          item.unit,
        purity:        item.purity,
        amount:        item.amount,
        material:      item.material      || null,
        materialCount: item.material_count || item.materialCount || null,
        reason:        item.reason        || null,
        tagNumber:     tag_no,
      });
      saved.push(expense);
    }

    // If tag_no provided, update all existing items for this ticket too
    if (tag_no) {
      await ExpenseItem.updateMany({ ticketId }, { tagNumber: tag_no });
    }

    await Activity.create({
      ticketId,
      userId:  req.user._id,
      action:  'EXPENSE_ADDED',
      details: `${saved.length} expense item(s) added by ${req.user.name}`,
    });

    res.status(201).json({ success: true, status: true, data: saved });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, status: false, message: error.message });
  }
};

// @desc    Delete expense item
// @route   DELETE /api/expensesheet/:ticketId/:itemId
// @access  Private (RHO only)
const deleteExpenseItem = async (req, res) => {
  try {
    const deleted = await ExpenseItem.findOneAndDelete({
      _id:      req.params.itemId,
      ticketId: req.params.ticketId,
    });

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Expense item not found' });
    }

    res.json({ success: true, status: true, message: 'Expense item deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update tag number for all items of a ticket
// @route   PUT /api/expensesheet/:ticketId
// @access  Private (RHO only)
const updateExpenseItems = async (req, res) => {
  try {
    const ticketId = req.params.ticketId;

    // Frontend calls this with { tag_no } for tag updates
    if (req.body.tag_no !== undefined) {
      await ExpenseItem.updateMany(
        { ticketId },
        { tagNumber: req.body.tag_no },
      );
      return res.json({ success: true, status: true, message: 'Tag number updated' });
    }

    // Bulk item upsert (original behaviour kept as fallback)
    const items  = Array.isArray(req.body.items) ? req.body.items : [req.body];
    const saved  = [];

    for (const item of items) {
      const payload = {
        ticketId,
        workDetailId:  item.work_detail_id || item.workDetailId,
        workName:      item.work_name      || item.workName,
        weight:        item.gross_weight   || item.weight,
        unit:          item.unit,
        purity:        item.purity,
        amount:        item.amount,
        material:      item.material      || null,
        materialCount: item.material_count || item.materialCount || null,
        reason:        item.reason        || null,
        tagNumber:     item.tag_no        || item.tagNumber || null,
      };

      if (item._id || item.id) {
        saved.push(
          await ExpenseItem.findByIdAndUpdate(item._id || item.id, payload, { new: true }),
        );
      } else {
        saved.push(await ExpenseItem.create(payload));
      }
    }

    res.json({ success: true, status: true, data: saved });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getExpenseCount = async (req, res) => {
  try {
    const count = await ExpenseItem.countDocuments({ ticketId: req.params.ticketId });
    res.json({ success: true, count, data: { count } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Helper — single source of truth for work details
const getWorkDetailsList = () => [
  { id: '1', work_name: 'Polishing' },
  { id: '2', work_name: 'Stone Setting' },
  { id: '3', work_name: 'Soldering' },
  { id: '4', work_name: 'Rhodium Plating' },
  { id: '5', work_name: 'Other' },
];

// @desc    Get all work details
// @route   GET /api/expensesheet/GetAllWorkDetails
// @access  Private
const getAllWorkDetails = (req, res) => {
  // Frontend reads: item.work_name and item.id  ← must match these keys
  res.json({ success: true, data: getWorkDetailsList() });
};

// @desc    Skip expense sheet
// @route   PUT /api/assignments/skipExpenseSheet/:ticketId
// @access  Private (RHO only)
const skipExpenseSheet = async (req, res) => {
  try {
    const Ticket = require('../models/Ticket');
    await Ticket.findByIdAndUpdate(req.params.ticketId, { status: 'EXPENSE_SHEET_SKIPPED' });

    await Activity.create({
      ticketId: req.params.ticketId,
      userId:   req.user._id,
      action:   'EXPENSE_SHEET_SKIPPED',
      details:  `Expense sheet skipped by ${req.user.name}`,
    });

    res.json({ success: true, message: 'Expense sheet skipped' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getExpenseItems,
  createExpenseItem,
  deleteExpenseItem,
  updateExpenseItems,
  getExpenseCount,
  getAllWorkDetails,
  skipExpenseSheet,
};