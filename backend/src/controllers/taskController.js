const Task = require('../models/Task');
const Ticket = require('../models/Ticket');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { formatTicketListItem } = require('../utils/mobileFormat');

const cleanString = (value) =>
  typeof value === 'string'
    ? value.trim().replace(/^['"]+|['"]+$/g, '')
    : value;

const mediaFromFiles = (files = [], comments = []) =>
  files.map((file, index) => ({
    url: `/uploads/${file.filename}`,
    type: file.mimetype.startsWith('image') ? 'IMAGE' : 'VIDEO',
    comment: comments[index] || '',
  }));

const parseMediaComments = (body = {}) => {
  const direct = body.comments || body.comment || body.media_comment;
  if (Array.isArray(direct)) return direct;
  if (typeof direct === 'string') return [direct];
  return [];
};

const normalizeTaskStatus = (status) =>
  status === 'COMPLETED_BY_KAARIGAR' ? 'COMPLETED_BY_KARIGAR' : status;

const normalizeTaskForMobile = (task) => {
  const objectTask = task.toObject ? task.toObject() : { ...task };
  const normalizedTicketId = objectTask.ticketId && objectTask.ticketId._id
    ? objectTask.ticketId._id
    : objectTask.ticketId || objectTask.ticket_id;

  return {
    ...objectTask,
    task_id: objectTask.task_id || String(objectTask._id || objectTask.id || ''),
    ticket_id: objectTask.ticket_id || String(normalizedTicketId || ''),
    id: objectTask.id || String(objectTask._id || ''),
  };
};

// @desc    Create task
// @route   POST /api/assignments/Task
// @access  Private (RHO only)
const createTask = async (req, res) => {
  try {
    const taskData = {
      ...req.body,
      ticketId: cleanString(req.body.ticketId || req.body.ticket_id),
      assignedTo: cleanString(req.body.assignedTo || req.body.karigarId || req.body.karigar_id),
      description:
        req.body.description || req.body.taskDescription || req.body.task_details,
      title: req.body.title || req.body.taskTitle || req.body.task_title,
      priority: cleanString(req.body.priority).toUpperCase() || 'MEDIUM',
      dueDate: cleanString(req.body.dueDate) || cleanString(req.body.task_due_date),
      isExternal: req.body.employee_type === 'EXTERNAL' || false,
    };
    
    console.log("📝 createTask - Raw request body:", req.body);
    console.log("📝 createTask - Normalized taskData:", taskData);
    
    const task = await Task.create({
      ...taskData,
      createdBy: req.user._id
    });
    
    console.log("✅ createTask - Task saved successfully:", { _id: task._id, ticketId: task.ticketId, title: task.title });

    // Notify karigar
    if (task.assignedTo) {
      await Notification.create({
        userId: task.assignedTo,
        title: 'New Task Assigned',
        message: `Task: ${task.title}`,
        type: 'TASK',
        referenceId: task._id
      });
    }

    await Activity.create({
      ticketId: task.ticketId,
      userId: req.user._id,
      action: 'TASK_CREATED',
      details: `Task "${task.title}" created by ${req.user.name}`
    });

    res.status(201).json({ success: true, task });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get tasks for ticket
// @route   GET /api/assignments/Ticket/:id/tasks
// @access  Private
const getTicketTasks = async (req, res) => {
  try {
    console.log("🔍 getTicketTasks - Request param id:", req.params.id);
    const tasks = await Task.find({ ticketId: req.params.id })
      .populate('assignedTo', 'name employeeId')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    console.log("🔍 getTicketTasks - Found tasks count:", tasks.length);
    console.log("🔍 getTicketTasks - Tasks:", tasks.map(t => ({ _id: t._id, ticketId: t.ticketId, title: t.title })));

    const normalizedTasks = tasks.map(normalizeTaskForMobile);
    res.json({ success: true, tasks: normalizedTasks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update task
// @route   PUT /api/assignments/updateTask/:ticketId/:taskId
// @access  Private (RHO or assigned Karigar)
const updateTask = async (req, res) => {
  try {
    const { reworkRemark } = req.body;
    const status = normalizeTaskStatus(req.body.status);

    // Prepare update operations
    const updateOps = {};
    if (status) updateOps.status = status;
    if (reworkRemark) updateOps.reworkRemark = reworkRemark;
    if (status === 'COMPLETED_BY_KARIGAR') updateOps.completedByKarigarAt = new Date();
    if (status === 'CLOSE_BY_RHO') updateOps.closedByRhoAt = new Date();

    // Handle uploaded files (append to taskMedia)
    if (req.files && req.files.length) {
      const uploadedMedia = mediaFromFiles(req.files, parseMediaComments(req.body));
      // Use $push to append new media entries
      const task = await Task.findByIdAndUpdate(
        req.params.taskId,
        { ...updateOps, $push: { taskMedia: { $each: uploadedMedia } } },
        { new: true }
      );

      await Activity.create({
        ticketId: req.params.ticketId || task.ticketId,
        userId: req.user._id,
        action: 'TASK_UPDATED',
        details: `Task "${task.title}" status updated to ${status} by ${req.user.name}`
      });

      return res.json({ success: true, task });
    }

    // If taskMedia provided in body (non-file), set/overwrite
    if (req.body.taskMedia) updateOps.taskMedia = req.body.taskMedia;

    const task = await Task.findByIdAndUpdate(
      req.params.taskId,
      updateOps,
      { new: true }
    );

    await Activity.create({
      ticketId: req.params.ticketId || task.ticketId,
      userId: req.user._id,
      action: 'TASK_UPDATED',
      details: `Task "${task.title}" status updated to ${status} by ${req.user.name}`
    });

    res.json({ success: true, task });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete task
// @route   PUT /api/assignments/TaskDelete/:taskId
// @access  Private (RHO only)
const deleteTask = async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.taskId);
    res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Request rework
// @route   PUT /api/requestRework/RhoToKarigar/:ticketId/:taskId
// @access  Private (RHO only)
const requestRework = async (req, res) => {
  try {
    const remark = req.body.remark || req.body.reject_remarks || req.body.reworkRemark || req.body.rejectRemarks;
    
    const task = await Task.findByIdAndUpdate(
      req.params.taskId || req.body.taskId || req.body.task_id,
      { 
        status: 'REWORK',
        reworkRemark: remark
      },
      { new: true }
    );

    // Notify karigar
    if (task?.assignedTo) {
      await Notification.create({
        userId: task.assignedTo,
        title: 'Rework Required',
        message: `Task "${task.title}" needs rework: ${remark}`,
        type: 'TASK',
        referenceId: task._id
      });
    }

    await Activity.create({
      ticketId: req.params.ticketId,
      userId: req.user._id,
      action: 'REWORK_REQUESTED',
      details: `Rework requested for task "${task.title}" by ${req.user.name}: ${remark}`
    });

    res.json({ success: true, task });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get karigar tasks
// @route   GET /api/Kaarigar/Tasks/GetAllTaskByTicket/:ticketId
// @access  Private (Karigar only)
const getKarigarTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ 
      ticketId: req.params.ticketId,
      assignedTo: req.user._id
    }).populate('ticketId', 'ticketNo');

    const formatted = tasks.map(task => {
      // Normalize single vs double 'A' spelling in status for UI styling compatibility
      let taskStatus = task.status;
      if (taskStatus === 'COMPLETED_BY_KARIGAR') {
        taskStatus = 'COMPLETED_BY_KAARIGAR';
      }

      return {
        task_id: task._id,
        task_title: task.title,
        task_details: task.description || '',
        task_due_date: task.dueDate,
        status: taskStatus,
        created_at: task.createdAt,
        employee_name: req.user.name,
        assigned_employee_id: task.assignedTo,
        completed_reject_remarks: task.reworkRemark || ''
      };
    });

    res.json({ 
      success: true, 
      status: true, 
      data: formatted,
      tasks: formatted 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Complete task by karigar
// @route   POST /api/assignments/KaarigarTaskComplete
// @access  Private (Karigar only)
const completeTaskByKarigar = async (req, res) => {
  try {
    const taskId = req.body.taskId || req.body.task_id;
    const uploadedMedia = mediaFromFiles(req.files || [], parseMediaComments(req.body));
    const taskMedia = uploadedMedia.length ? uploadedMedia : req.body.taskMedia;
    
    const task = await Task.findByIdAndUpdate(
      taskId,
      { 
        status: 'COMPLETED_BY_KARIGAR',
        taskMedia: taskMedia || [],
        completedByKarigarAt: new Date()
      },
      { new: true }
    );

    await Activity.create({
      ticketId: task.ticketId,
      userId: req.user._id,
      action: 'TASK_COMPLETED_BY_KARIGAR',
      details: `Task "${task.title}" completed by karigar ${req.user.name}`
    });

    res.json({ success: true, task });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Close task by RHO
// @route   PUT /api/assignments/taskCloseByRHO/:taskId
// @access  Private (RHO only)
const closeTaskByRHO = async (req, res) => {
  try {
    const taskId = req.params.taskId || req.body.taskId || req.body.task_id;
    const uploadedMedia = mediaFromFiles(req.files || [], parseMediaComments(req.body));

    const updateOps = {
      status: 'CLOSE_BY_RHO',
      closedByRhoAt: new Date(),
    };

    const task = await Task.findByIdAndUpdate(
      taskId,
      uploadedMedia.length
        ? { ...updateOps, $push: { taskMedia: { $each: uploadedMedia } } }
        : updateOps,
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    await Activity.create({
      ticketId: task.ticketId,
      userId: req.user._id,
      action: 'TASK_CLOSED_BY_RHO',
      details: `Task "${task.title}" closed by RHO ${req.user.name}`
    });

    res.json({ success: true, task });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create external task
// @route   POST /api/assignments/external/Task
// @access  Private (RHO only)
const createExternalTask = async (req, res) => {
  try {
    const task = await Task.create({
      ticketId: req.body.ticketId || req.body.ticket_id,
      title: req.body.title || req.body.taskTitle || req.body.task_title,
      description: req.body.description || req.body.taskDetails || req.body.task_details,
      dueDate: req.body.dueDate || req.body.due_date,
      priority: req.body.priority || 'MEDIUM',
      status: normalizeTaskStatus(req.body.status) || 'PENDING',
      isExternal: true,
      externalName: req.body.externalName || req.body.external_kaarigar_name,
      externalPhone: req.body.externalPhone || req.body.external_mobile_number,
      createdBy: req.user._id,
      taskMedia: mediaFromFiles(req.files || [], parseMediaComments(req.body)),
    });

    await Activity.create({
      ticketId: task.ticketId,
      userId: req.user._id,
      action: 'EXTERNAL_TASK_CREATED',
      details: `External task "${task.title}" created by ${req.user.name}`,
    });

    res.status(201).json({ success: true, task, data: task });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getExternalTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ ticketId: req.params.id, isExternal: true }).sort({ createdAt: -1 });
    res.json({ success: true, tasks, data: tasks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateExternalTask = async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.files?.length) {
      updateData.$push = { taskMedia: { $each: mediaFromFiles(req.files, parseMediaComments(req.body)) } };
    }
    const task = await Task.findOneAndUpdate(
      { _id: req.params.taskId, isExternal: true },
      updateData,
      { new: true }
    );
    if (!task) return res.status(404).json({ success: false, message: 'External task not found' });
    res.json({ success: true, task, data: task });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const shareExternalTask = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.taskId, ticketId: req.params.ticketId, isExternal: true })
      .populate('ticketId', 'ticketNo jewelleryItem material dueDate');
    if (!task) return res.status(404).json({ success: false, message: 'External task not found' });
    res.json({
      success: true,
      data: {
        task,
        message: `Repair task ${task.title} for ticket ${task.ticketId.ticketNo}`,
        media: task.taskMedia,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all tickets with tasks assigned to karigar
// @route   GET /api/kaarigar/GetAllKaarigarTicket
// @access  Private (Karigar only)
const getAllKaarigarTickets = async (req, res) => {
  try {
    const karigarId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const searchTerm = req.query.search || '';
    
    console.log(`🔍 getAllKaarigarTickets - Karigar ID: ${karigarId}, Page: ${page}, Limit: ${limit}, Search: ${searchTerm}`);

    // Find all tasks assigned to the karigar
    const tasks = await Task.find({ 
      assignedTo: karigarId 
    }).populate('ticketId');

    if (!tasks || tasks.length === 0) {
      console.log('ℹ️ No tasks found for this karigar');
      return res.json({ 
        success: true, 
        data: {
          data: [],
          total: 0,
          page,
          limit,
          totalPages: 1
        },
        message: 'No tasks assigned to you'
      });
    }

    // Get unique ticket IDs
    const uniqueTicketIds = [...new Set(tasks.map(task => task.ticketId?._id))].filter(Boolean);
    
    console.log(`📋 Found ${tasks.length} tasks across ${uniqueTicketIds.length} unique tickets`);

    // Fetch all unique tickets
    let ticketQuery = Ticket.find({ _id: { $in: uniqueTicketIds } })
      .populate('customerId', 'name mobile email location')
      .populate('createdBy', 'name employeeId')
      .populate('assignedRhoId', 'name employeeId');

    // Add search filter if provided
    if (searchTerm) {
      ticketQuery = Ticket.find({
        _id: { $in: uniqueTicketIds },
        $or: [
          { ticketNo: { $regex: searchTerm, $options: 'i' } },
          { 'customer.customer_name': { $regex: searchTerm, $options: 'i' } },
          { jewelleryItem: { $regex: searchTerm, $options: 'i' } }
        ]
      })
      .populate('customerId', 'name mobile email location')
      .populate('createdBy', 'name employeeId')
      .populate('assignedRhoId', 'name employeeId');
    }

    // Get total count for pagination
    const total = await Ticket.countDocuments(ticketQuery);

    // Apply pagination
    const tickets = await ticketQuery
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    console.log(`✅ Returning ${tickets.length} tickets (Total: ${total})`);

    // Map tickets with their task counts and format them using the standardized mobile formatter
    const formatted = tickets.map(ticket => {
      const formattedItem = formatTicketListItem(ticket);
      return {
        ...formattedItem,
        taskCount: tasks.filter(t => t.ticketId?._id?.toString() === ticket._id.toString()).length
      };
    });

    res.json({
      success: true,
      data: {
        data: formatted,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('❌ getAllKaarigarTickets error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch assigned tickets',
      error: error.message
    });
  }
};

module.exports = {
  createTask,
  getTicketTasks,
  updateTask,
  deleteTask,
  requestRework,
  getKarigarTasks,
  completeTaskByKarigar,
  closeTaskByRHO,
  createExternalTask,
  getExternalTasks,
  updateExternalTask,
  shareExternalTask,
  getAllKaarigarTickets
};
