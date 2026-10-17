const {
  masterData,
  resolveJewelleryName,
  resolveRepairTypeName,
  resolveMaterialName,
} = require('../data/masterData');

const STATUS_TO_MOBILE = {
  NOT_ASSIGNED: 'Not assigned',
  ASSIGNED_TO_RHO: 'Assigned to RHO',
  IN_PROGRESS: 'In progress',
  INT_KARIGAR: 'Int Karigar',
  REQUEST_REWORK: 'Request Rework',
  IN_REVIEW: 'In Review',
  READY_FOR_DELIVERY: 'Ready for Delivery',
  BRANCH_TRANSFER: 'Branch Transfer',
  DELIVERED: 'Delivered',
  TICKET_CLOSED_BY_RHO: 'Ticket Closed By RHO',
  EXPENSE_SHEET_SKIPPED: 'Expense Sheet Skipped',
  ACCEPTED_BY_RHO: 'Accepted by RHO',
};

const MOBILE_TO_STATUS = Object.entries(STATUS_TO_MOBILE).reduce(
  (acc, [db, mobile]) => {
    acc[mobile.toLowerCase()] = db;
    acc[mobile] = db;
    return acc;
  },
  {
    'in progress': 'IN_PROGRESS',
    'int karigar': 'INT_KARIGAR',
    'request rework': 'REQUEST_REWORK',
    'in review': 'IN_REVIEW',
    'ready for delivery': 'READY_FOR_DELIVERY',
    'branch transfer': 'BRANCH_TRANSFER',
    'not assigned': 'NOT_ASSIGNED',
    'assigned to rho': 'ASSIGNED_TO_RHO',
    delivered: 'DELIVERED',
  }
);

const ROLE_TO_MOBILE = {
  BRSH: 'BRSH',
  RHO: 'RHO',
  KARIGAR: 'Int. Kaarigar',
  EXTERNAL_KARIGAR: 'Ext. Kaarigar',
};

const PRIORITY_TO_MOBILE = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

const MOBILE_TO_PRIORITY = {
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
  urgent: 'URGENT',
  Low: 'LOW',
  Medium: 'MEDIUM',
  High: 'HIGH',
  Urgent: 'URGENT',
};

const formatRoleName = (role) => ROLE_TO_MOBILE[role] || role;

const formatPriority = (priority) =>
  PRIORITY_TO_MOBILE[priority] || priority || 'Medium';

const formatStatus = (status) => STATUS_TO_MOBILE[status] || status;

const parseMobileStatus = (value) => {
  if (!value) return null;
  const parts = String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parts
    .map((part) => MOBILE_TO_STATUS[part] || MOBILE_TO_STATUS[part.toLowerCase()])
    .filter(Boolean);
};

const parseMobilePriority = (value) => {
  if (!value) return null;
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .map((part) => MOBILE_TO_PRIORITY[part] || part.toUpperCase())
    .filter(Boolean);
};

const formatUserForMobile = (user) => {
  const roleName = formatRoleName(user.role);
  const branch = user.branchId;
  const department = user.departmentId;

  return {
    id: user._id,
    employeeId: user.employeeId,
    emp_name: user.name,
    emp_phone_number: user.phone,
    emp_username: user.employeeId,
    name: user.name,
    phone: user.phone,
    role: roleName,
    role_name: roleName,
    branch_code: branch?.code || '',
    branch_Name: branch?.name || '',
    branch_name: branch?.name || '',


    department_name: department?.name || '',
    preferred_language: user.language || 'en',
    language: user.language || 'en',
  };
};

const formatCustomerForMobile = (customer) => ({
  id: customer._id,
  customer_name: customer.name,
  customer_phone_number: customer.mobile,
  customer_address: customer.location,
  name: customer.name,
  mobile: customer.mobile,
  location: customer.location,
  is_whatsapp_enabled: customer.whatsappEnabled,
});

const formatTicketListItem = (ticket) => {
  const customer = ticket.customerId;
  const firstRepairTypeId =
    Array.isArray(ticket.repairTypes) && ticket.repairTypes.length > 0
      ? ticket.repairTypes[0]
      : null;

  return {
    id: ticket._id,
    ticket_no: ticket.ticketNo,
    status: formatStatus(ticket.status),
    ticket_status: formatStatus(ticket.status),
    due_date: ticket.dueDate,
    tkt_deliver_commit_date: ticket.dueDate,
    priority: formatPriority(ticket.priority),
    tkt_priority: formatPriority(ticket.priority),
    customer_name: customer?.name || '',
    customer: customer
      ? {
          customer_name: customer.name,
          customer_phone_number: customer.mobile,
        }
      : null,
    jwellery_name: resolveJewelleryName(
      ticket.customJewelleryItem || ticket.jewelleryItem
    ),
    jewellery_name: resolveJewelleryName(
      ticket.customJewelleryItem || ticket.jewelleryItem
    ),
    repair_category_name: resolveRepairTypeName(firstRepairTypeId),
    repair_types: (ticket.repairTypes || []).map((id) => ({
      id,
      name: resolveRepairTypeName(id),
    })),
    repair_details: (ticket.repairTypes || []).map((id) => ({
      id,
      repair_type_id: id,
      name: resolveRepairTypeName(id),
    })),
    transitStatus: ticket.inTransit ? 1 : 0,
  };
};

const formatTicketDetail = (ticket) => {
  const customer = ticket.customerId;
  const list = formatTicketListItem(ticket);

  return {
    ...list,
    data: list,
    customer_id: customer?._id,
    customer_info: customer
      ? {
          id: customer._id,
          name: customer.name,
          phone: customer.mobile,
          address: customer.location,
        }
      : null,
    item_weight: ticket.weight,
    unit_name: ticket.unit,
    unit_id: ticket.unit,
    unit: {
      unit_name: ticket.unit,
      id: ticket.unit,
    },
    material_name: resolveMaterialName(ticket.customMaterial || ticket.material),
    material_id: ticket.customMaterial ? null : ticket.material,
    material: {
      id: ticket.material,
      name: resolveMaterialName(ticket.customMaterial || ticket.material),
    },
    purity: ticket.purity,
    jewellery_category_id: ticket.customJewelleryItem ? null : ticket.jewelleryItem,
    jewellery_category: resolveJewelleryName(
      ticket.customJewelleryItem || ticket.jewelleryItem
    ),
    jewllaryName: resolveJewelleryName(
      ticket.customJewelleryItem || ticket.jewelleryItem
    ),
    specialInstructions: ticket.specialInstructions,
    stone_details: (ticket.stones || []).map((stone, index) => ({
      stone_type_id: stone.stoneType,
      stone_weight: stone.weight,
      unit_id: stone.unit,
      shape: stone.shape,
      count: stone.count,
      stone_comment: stone.comment,
      id: index + 1,
    })),
    repair_type_details: (ticket.repairTypes || []).map((id) => ({
      id,
      repair_type_id: id,
      name: resolveRepairTypeName(id),
    })),
    repair_details: (ticket.repairTypes || []).map((id) => ({
      id,
      repair_type_id: id,
      name: resolveRepairTypeName(id),
    })),
    before_media: (ticket.beforeMedia || []).map((media) => ({
      id: media._id,
      file: media.url,
      url: media.url,
      media_comment: media.comment,
      comment: media.comment,
      type: media.type,
    })),
    after_media: (ticket.afterMedia || []).map((media) => ({
      id: media._id,
      file: media.url,
      url: media.url,
      media_comment: media.comment,
      comment: media.comment,
      type: media.type,
    })),
    media_details: (ticket.beforeMedia || []).map((media) => ({
      id: media._id,
      file: media.url,
      url: media.url,
      media_comment: media.comment,
      comment: media.comment,
      type: media.type,
    })),
    assigned_rho_id: ticket.assignedRhoId?._id || ticket.assignedRhoId || null,
    assigned_rho_name: ticket.assignedRhoId?.name || '',
    branch_name: ticket.branchId?.name || '',
    employee: ticket.createdBy
      ? {
          id: ticket.createdBy._id,
          emp_name: ticket.createdBy.name,
          employeeId: ticket.createdBy.employeeId,
        }
      : null,
    created_at: ticket.createdAt,
  };
};

const parseBracketFields = (body, prefix) => {
  const result = [];
  const regex = new RegExp(`^${prefix}\\[(\\d+)\\]\\[(\\w+)\\]$`);

  Object.keys(body || {}).forEach((key) => {
    const match = key.match(regex);
    if (!match) return;
    const idx = Number(match[1]);
    const field = match[2];
    if (!result[idx]) result[idx] = {};
    result[idx][field] = body[key];
  });

  return result.filter(Boolean);
};

const buildTicketQueryFromRequest = (req) => {
  const {
    status,
    priority,
    tStatus,
    RN,
    JC,
    ccdFrom,
    ccdTo,
    cdTo,
    cddFrom,
    cddTo,
    ddTo,
    search,
  } = req.query;

  const query = {};

  const statusFilter = tStatus || status;
  if (statusFilter) {
    const statuses = parseMobileStatus(statusFilter);
    if (statuses.length === 1) query.status = statuses[0];
    else if (statuses.length > 1) query.status = { $in: statuses };
  }

  if (priority) {
    const priorities = parseMobilePriority(priority);
    if (priorities.length === 1) query.priority = priorities[0];
    else if (priorities.length > 1) query.priority = { $in: priorities };
  }

  if (RN) {
    const names = String(RN).split(',').map((n) => n.trim());
    const ids = masterData.repairTypes
      .filter((rt) => names.includes(rt.name))
      .map((rt) => rt.id);
    if (ids.length) query.repairTypes = { $in: ids };
  }

  if (JC) {
    const names = String(JC).split(',').map((n) => n.trim());
    const ids = masterData.jewellery
      .filter((j) => names.includes(j.name))
      .map((j) => j.id);
    if (ids.length) {
      query.$or = [
        { jewelleryItem: { $in: ids } },
        { customJewelleryItem: { $in: names } },
      ];
    }
  }

  if (ccdFrom || ccdTo) {
    query.createdAt = {};
    if (ccdFrom) query.createdAt.$gte = new Date(ccdFrom);
    if (ccdTo) {
      const end = new Date(ccdTo);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  } else if (cdTo) {
    const days = Number(cdTo);
    if (!Number.isNaN(days)) {
      const from = new Date();
      from.setDate(from.getDate() - days);
      query.createdAt = { $gte: from };
    }
  }

  if (cddFrom || cddTo) {
    query.dueDate = {};
    if (cddFrom) query.dueDate.$gte = new Date(cddFrom);
    if (cddTo) {
      const end = new Date(cddTo);
      end.setHours(23, 59, 59, 999);
      query.dueDate.$lte = end;
    }
  } else if (ddTo) {
    const days = Number(ddTo);
    if (!Number.isNaN(days)) {
      const from = new Date();
      from.setDate(from.getDate() - days);
      query.dueDate = { $gte: from };
    }
  }

  if (search && String(search).trim()) {
    const term = String(search).trim();
    const statusMatch = parseMobileStatus(term);
    if (statusMatch?.length === 1) {
      query.status = statusMatch[0];
    } else {
      query.$or = [
        { ticketNo: { $regex: term, $options: 'i' } },
        ...(query.$or || []),
      ];
    }
  }

  return query;
};

module.exports = {
  masterData,
  STATUS_TO_MOBILE,
  formatRoleName,
  formatPriority,
  formatStatus,
  formatUserForMobile,
  formatCustomerForMobile,
  formatTicketListItem,
  formatTicketDetail,
  parseBracketFields,
  buildTicketQueryFromRequest,
  parseMobileStatus,
  parseMobilePriority,
};
