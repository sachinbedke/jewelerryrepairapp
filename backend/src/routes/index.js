const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Auth Controllers
const authController = require('../controllers/authController');

// Ticket Controllers
const ticketController = require('../controllers/ticketController');

// Task Controllers
const taskController = require('../controllers/taskController');

// Customer Controllers
const customerController = require('../controllers/customerController');

// Comment & Activity Controllers
const commentController = require('../controllers/commentController');
const activityController = require('../controllers/activityController');

// Transit Controllers
const transitController = require('../controllers/transitController');

// Expense Controllers
const expenseController = require('../controllers/expenseController');

// Notification Controllers
const notificationController = require('../controllers/notificationController');

// Master Data Controllers
const masterDataController = require('../controllers/masterDataController');

// ============ AUTH ROUTES ============
router.post('/auth/login', authController.login);
router.get('/employee/profile', protect, authController.getProfile);
router.get('/employee/Profile', protect, authController.getProfile);
router.put('/employee/updateEmpPref', protect, authController.updatePreference);
router.post('/push/register', protect, authController.registerPushToken);

// ============ CUSTOMER ROUTES ============
router.get('/customers/detail/:id', protect, customerController.getCustomerDetails);
router.get('/customers/search/:query', protect, customerController.searchCustomers);
router.get('/customers/:query', protect, customerController.searchCustomers);
router.post('/customers', protect, customerController.createCustomer);

// ============ MASTER DATA ROUTES ============
router.get('/jewellery', protect, masterDataController.getJewellery);
router.get('/repairType', protect, masterDataController.getRepairTypes);
router.get('/MaterialwithPurity', protect, masterDataController.getMaterials);
router.get('/unit', protect, masterDataController.getUnits);
router.get('/purity', protect, masterDataController.getPurities);
router.get('/stone', protect, masterDataController.getStones);
router.get('/role', protect, masterDataController.getRoles);
router.get('/branch', protect, masterDataController.getBranches);
router.get('/department/deptforMobile', protect, masterDataController.getDepartments);
router.get('/assignments/GetAllRHO', protect, masterDataController.getAllRHO);
router.get('/kaarigar/GetAllKaarigar', protect, masterDataController.getAllKarigar);

// ============ TICKET ROUTES ============
router.post('/repairTicket', protect, authorize('BRSH'), upload.any(), ticketController.createTicket);
router.put('/repairTicket', protect, authorize('BRSH'), upload.any(), ticketController.updateTicket);
router.get('/repairTicket', protect, ticketController.getTickets);
router.get('/repairTicket/ticketByDeptNew', protect, ticketController.getTickets);
router.get('/repairTicket/ticketCountWithStatus', protect, ticketController.getTicketCounts);
router.get('/repairTicket/dashboardCounts', protect, ticketController.getDashboardCounts);
router.put('/repairTicket/tktPriority/:ticketId', protect, ticketController.updatePriority);
router.put('/repairTicket/tktPriorityOrStatus/:ticketId', protect, ticketController.updatePriorityOrStatus);
router.put('/repairTicket/tktDueDate/:ticketId', protect, ticketController.updateDueDate);
router.put('/repairTicket/tktJwellerySection/:ticketId', protect, authorize('BRSH'), ticketController.updateJewellerySection);
router.put('/repairTicket/tktStoneDetails/:ticketId', protect, authorize('BRSH'), ticketController.updateStoneDetails);
router.put('/repairTicket/tktStoneActiveInactive/:ticketId', protect, authorize('BRSH'), ticketController.setStoneActiveInactive);
router.put('/repairTicket/tktCloseByRHO/:ticketId', protect, authorize('RHO'), upload.any(), ticketController.closeTicket);
router.put('/assignments/AssignToRHO', protect, authorize('BRSH'), ticketController.assignToRHO);
router.put('/assignments/AcceptedByRHO', protect, authorize('RHO'), ticketController.acceptTicket);
router.put('/assignments/saleshead/ticket_status/:ticketId', protect, authorize('BRSH'), ticketController.markReadyForDelivery);
router.put('/assignments/saleshead/ticket_delivered/:ticketId', protect, authorize('BRSH'), ticketController.markDelivered);
router.get('/checklist/:id', protect, ticketController.getChecklist);
router.post('/assignments/Checklist/Acknowledgement', protect, ticketController.acknowledgeChecklist);
router.post('/assignments/Checklist/Acknowledgement/', protect, ticketController.acknowledgeChecklist);
router.get('/assignments/AcknowlegmentStatus/:ticketId/:checkListId', protect, ticketController.getAcknowledgementStatus);

// ============ TASK ROUTES ============
router.post('/assignments/Task', protect, authorize('RHO'), upload.any(), taskController.createTask);
router.get('/assignments/Ticket/:id/tasks', protect, taskController.getTicketTasks);
router.put('/assignments/updateTask/:ticketId/:taskId', protect, upload.any(), taskController.updateTask);
router.put('/assignments/TaskDelete/:taskId', protect, authorize('RHO'), taskController.deleteTask);
router.put('/requestRework/RhoToKarigar/:ticketId/:taskId', protect, authorize('RHO'), taskController.requestRework);
router.get('/kaarigar/GetAllKaarigarTicket', protect, authorize('KARIGAR'), taskController.getAllKaarigarTickets);
router.get('/Kaarigar/Tasks/GetAllTaskByTicket/:ticketId', protect, authorize('KARIGAR'), taskController.getKarigarTasks);
router.put('/Kaarigar/Tasks/UpdateTaskStatus/:taskId', protect, authorize('KARIGAR'), upload.any(), taskController.updateTask);
router.put('/kaarigar/ticket_status/:taskId', protect, authorize('KARIGAR'), upload.any(), taskController.updateTask);
router.post('/assignments/KaarigarTaskComplete', protect, authorize('KARIGAR'), upload.any(), taskController.completeTaskByKarigar);
router.put('/assignments/taskCloseByRHO/:taskId', protect, authorize('RHO'), upload.any(), taskController.closeTaskByRHO);
router.post('/assignments/external/Task', protect, authorize('RHO'), upload.any(), taskController.createExternalTask);
router.get('/assignments/Ticket/:id/ExternalTasks', protect, taskController.getExternalTasks);
router.put('/assignments/ExternalTaskUpdate/:taskId', protect, authorize('RHO'), upload.any(), taskController.updateExternalTask);
router.get('/assignments/share/external/Task/:ticketId/:taskId', protect, taskController.shareExternalTask);

// ============ COMMENT ROUTES ============
router.get('/repairTicket/ticket-comments/:ticketId', protect, commentController.getComments);
router.post('/repairTicket/ticket-comments/:ticketId', protect, commentController.addComment);
router.get('/repairTicket/:id', protect, ticketController.getTicketById);

// ============ ACTIVITY ROUTES ============
router.get('/ticket-activity/:ticketId', protect, activityController.getActivities);

// ============ MEDIA ROUTES ============
router.get('/assignments/BeforeMedia/:ticketId', protect, ticketController.getBeforeMedia);
router.post('/assignments/BeforeMedia/:ticketId', protect, authorize('BRSH'), upload.any(), ticketController.uploadBeforeMedia);
router.get('/assignments/AfterMedia/:ticketId', protect, ticketController.getAfterMedia);
router.post('/assignments/AfterMedia/:ticketId', protect, authorize('RHO'), upload.any(), ticketController.uploadAfterMedia);
router.delete('/asset/media/ticket/:mediaId', protect, ticketController.deleteMedia);

// ============ TRANSIT ROUTES ============
router.post('/assignments/InTransit', protect, transitController.createTransit);
router.get('/assignments/InTransit/:ticketId', protect, transitController.getTransitByTicket);
router.put('/assignments/InTransitStatus/:ticketId/:transitId', protect, transitController.updateTransitStatus);
router.put('/assignments/InTransitUpdate/:ticketId/:transitId', protect, transitController.updateTransit);
router.get('/repairTicket/transitStatusByticketId/:ticketId', protect, transitController.getTransitStatusByTicket);
router.get('/assignments/GetEmpByBranchAndDept/:deptId/:branchId', protect, masterDataController.getEmployeesByBranchAndDept);
router.put('/assignments/InTransitMedia/:ticketId/:transitId', protect, upload.any(), transitController.addTransitMedia);

// ============ EXPENSE ROUTES ============
router.get('/expensesheet/GetAllWorkDetails', protect, expenseController.getAllWorkDetails);
router.get('/expensesheet/:ticketId', protect, expenseController.getExpenseItems);
router.post('/expensesheet', protect, authorize('RHO'), expenseController.createExpenseItem);
router.delete('/expensesheet/:ticketId/:itemId', protect, authorize('RHO'), expenseController.deleteExpenseItem);
router.put('/expensesheet/:ticketId', protect, authorize('RHO'), expenseController.updateExpenseItems);
router.get('/assignments/expenseCount/:ticketId', protect, expenseController.getExpenseCount);
router.put('/assignments/skipExpenseSheet/:ticketId', protect, authorize('RHO'), expenseController.skipExpenseSheet);

// ============ NOTIFICATION ROUTES ============
router.get('/notification', protect, notificationController.getNotifications);
router.post('/notification/:id/read', protect, notificationController.markAsRead);

// ============ PRINT / PDF (Not implemented in this deployment) ============
router.get('/form/print/customer/:ticketId', protect, (req, res) => {
	res.status(501).json({ success: false, message: 'Print/customer PDF not supported in this deployment.' });
});
router.get('/form/print/branch/:ticketId', protect, (req, res) => {
	res.status(501).json({ success: false, message: 'Print/branch PDF not supported in this deployment.' });
});
router.get('/form/print/expenseSheet/:ticketId', protect, (req, res) => {
	res.status(501).json({ success: false, message: 'Print/expenseSheet PDF not supported in this deployment.' });
});

module.exports = router;
