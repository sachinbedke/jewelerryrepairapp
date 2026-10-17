const Activity = require('../models/Activity');
const User = require('../models/User');
const { formatRoleName } = require('../utils/mobileFormat');

const getActivities = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { role_ids, start_date, end_date, page = 1, limit = 50 } = req.query;

    let query = { ticketId };

    if (role_ids) {
      const roleIds = String(role_ids).split(',').map((r) => r.trim());
      const users = await User.find({ role: { $in: roleIds } }).select('_id');
      query.userId = { $in: users.map((u) => u._id) };
    }

    if (start_date || end_date) {
      query.createdAt = {};
      if (start_date) query.createdAt.$gte = new Date(start_date);
      if (end_date) {
        const end = new Date(end_date);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const activities = await Activity.find(query)
      .populate('userId', 'name employeeId role')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Activity.countDocuments(query);

    const data = activities.map((activity) => ({
      id: activity._id,
      action: activity.action,
      details: activity.details,
      performed_by: activity.userId?.name || '',
      performed_by_role: formatRoleName(activity.userId?.role || ''),
      created_at: activity.createdAt,
    }));

    res.json({
      success: true,
      data: {
        data,
        page: Number(page),
        totalPages: Math.max(1, Math.ceil(total / Number(limit))),
        total,
      },
    });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch activities' });
  }
};

module.exports = {
  getActivities,
};
