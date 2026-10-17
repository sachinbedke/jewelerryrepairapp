# Chetmani Repair Mobile App - BRSH Backend Phase

## Structure

```text
src/
  app.js
  config/database.js
  controllers/
    authController.js
    customerController.js
    ticketController.js
    commentController.js
    activityController.js
    notificationController.js
  middleware/
    auth.js
    upload.js
  models/
    Employee.js
    User.js
    Customer.js
    Ticket.js
    TicketAttachment.js
    StoneDetail.js
    RepairType.js
    Material.js
    Assignment.js
    Task.js
    Comment.js
    Activity.js
    Notification.js
  routes/index.js
  services/workflowService.js
```

## Core Rules Implemented

- Only `BRSH` can create repair tickets.
- Salesman role has been removed from role middleware, routes, master data, and user schema.
- Customer mobile numbers are unique and validated as Indian mobile numbers.
- Ticket creation requires customer, due date, jewellery item, material, repair type, gross weight, unit, and at least one before-repair attachment.
- Due date cannot be in the past.
- Jewellery and stone intake edits are allowed only while ticket status is `NOT_ASSIGNED`.
- Assignment to RHO is allowed only for `NOT_ASSIGNED` branch tickets.
- Assigned RHO becomes the ticket owner through `assignedRhoId` and an `assignments` record.
- Delivered tickets are read-only for ticket updates, media deletion, and comments.
- Every BRSH ticket action logs an activity.
- Assignment and delivery status changes create notifications.

## Primary APIs

### Customer

- `GET /api/customers/search/:query`
- `GET /api/customers/:query` legacy-compatible search
- `GET /api/customers/detail/:id`
- `POST /api/customers`

Create customer body:

```json
{
  "name": "Customer Name",
  "mobile": "9876543210",
  "email": "customer@example.com",
  "location": "Branch area",
  "whatsappEnabled": true
}
```

### Ticket Intake

- `POST /api/repairTicket` multipart, BRSH only
- `PUT /api/repairTicket` multipart, BRSH only, pre-assignment only
- `GET /api/repairTicket/:id`
- `POST /api/assignments/BeforeMedia/:ticketId` multipart, BRSH only, pre-assignment only
- `PUT /api/repairTicket/tktJwellerySection/:ticketId` BRSH only, pre-assignment only
- `PUT /api/repairTicket/tktStoneDetails/:ticketId` BRSH only, pre-assignment only

Create ticket accepts mobile aliases such as `customer_id`, `due_date`, `jewellery_item_id`, `material_id`, `repair_type_details`, `stone_details`, `item_weight`, and uploaded files.

### Listing, Search, Filters, Dashboard

- `GET /api/repairTicket?page=1&limit=10&search=CHT`
- `GET /api/repairTicket/ticketByDeptNew`
- `GET /api/repairTicket/ticketCountWithStatus`
- `GET /api/repairTicket/dashboardCounts`

Supported filters include `status`, `tStatus`, `priority`, `RN` repair type, `JC` jewellery category, `ccdFrom`, `ccdTo`, `cddFrom`, and `cddTo`.

### Assignment And Delivery

- `GET /api/assignments/GetAllRHO`
- `PUT /api/assignments/AssignToRHO`
- `PUT /api/assignments/saleshead/ticket_status/:ticketId`
- `PUT /api/assignments/saleshead/ticket_delivered/:ticketId`

Assign body:

```json
{
  "ticketId": "ticket-object-id-or-ticket-no",
  "rhoId": "rho-object-id"
}
```

## Activity And Notification Strategy

`services/workflowService.js` centralizes activity logging, notification creation, and status guards. Controllers call it whenever a ticket is created, edited, assigned, moved to delivery, delivered, commented on, or media is uploaded.
