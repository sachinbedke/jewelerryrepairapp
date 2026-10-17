# Quick API Reference - BRSH Workflow

## Base URL
```
http://YOUR_SERVER_IP:5000/api
```

## Authentication
Add header to all requests:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 1. AUTHENTICATION

### Login
```
POST /auth/login
Content-Type: application/json

{
  "username": "EMP001",
  "password": "password123"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "...",
    "emp_name": "Rajesh Kumar",
    "role": "BRSH",
    "branch_name": "New Delhi"
  }
}
```

### Get Profile
```
GET /employee/profile
```

### Update Language Preference
```
PUT /employee/updateEmpPref
Content-Type: application/json

{
  "language": "en"  // or "hi"
}
```

---

## 2. CUSTOMER MANAGEMENT

### Search Customers
```
GET /customers/search/rajesh
GET /customers/9876543210
```

### Get Customer Details
```
GET /customers/detail/CUSTOMER_ID
```

### Create New Customer
```
POST /customers
Content-Type: application/json

{
  "name": "Rajesh Kumar",
  "mobile": "9876543210",
  "email": "rajesh@example.com",
  "location": "New Delhi",
  "whatsappEnabled": true
}

Response:
{
  "success": true,
  "customer": {
    "id": "CUST_ID",
    "name": "Rajesh Kumar",
    "mobile": "9876543210",
    "location": "New Delhi"
  }
}
```

**Required Fields:**
- `name` (min 2 chars)
- `mobile` (10 digits, starts with 6-9)
- `location` (min 3 chars)

---

## 3. TICKET CREATION (BRSH ONLY)

### Create Repair Ticket
```
POST /repairTicket
Content-Type: multipart/form-data

Form Fields:
- customerId: "CUSTOMER_ID"
- jewelleryItem: "Ring"  // or custom name
- material: "Gold"       // or custom material
- purity: "22K"
- weight: 5
- unit: "Gram"
- dueDate: "2026-06-30"
- repairTypes: ["REPAIR_TYPE_ID_1", "REPAIR_TYPE_ID_2"]
- specialInstructions: "Handle with care"
- stone_details[0][stoneType]: "Diamond"
- stone_details[0][weight]: 0.5
- stone_details[0][unit]: "Carat"
- stone_details[0][count]: 1
- files: [image.jpg, video.mp4]  // At least 1 required

Response:
{
  "success": true,
  "ticket": {
    "ticket_no": "CHT202605001",
    "id": "TICKET_ID",
    "status": "Not assigned",
    "customer_name": "Rajesh Kumar",
    "due_date": "2026-06-30",
    "jewellery_name": "Ring"
  }
}
```

**Validations:**
- ✓ Due date cannot be in past
- ✓ At least 1 attachment required (image/video/audio)
- ✓ Jewellery item required
- ✓ Material required
- ✓ At least 1 repair type required
- ✓ Mobile aliases supported: customer_id, material_id, jewellery_item_id, item_weight, unit_id

---

## 4. TICKET LISTING & SEARCH

### Get Tickets (Paginated)
```
GET /repairTicket?page=1&limit=10&search=CHT202605001

Query Params:
- page: Page number (default: 1)
- limit: Items per page (default: 10)
- search: Search by ticket no or customer name/phone
- status: Filter by status (comma-separated)
- priority: Filter by priority (comma-separated)
- RN: Filter by repair type names
- JC: Filter by jewellery category
- ccdFrom: Creation date from (YYYY-MM-DD)
- ccdTo: Creation date to
- cddFrom: Due date from
- cddTo: Due date to

Response:
{
  "success": true,
  "data": {
    "data": [
      {
        "ticket_no": "CHT202605001",
        "status": "Not assigned",
        "customer_name": "Rajesh Kumar",
        "due_date": "2026-06-30",
        "priority": "High"
      }
    ],
    "page": 1,
    "totalPages": 5,
    "total": 50
  }
}
```

### Get Ticket Details
```
GET /repairTicket/TICKET_ID
GET /repairTicket/CHT202605001  // By ticket number
```

### Get Dashboard Counts
```
GET /repairTicket/dashboardCounts

Response:
{
  "success": true,
  "data": {
    "total": 150,
    "overdue": 5,
    "dueToday": 3,
    "byStatus": {
      "NOT_ASSIGNED": 10,
      "ASSIGNED_TO_RHO": 20,
      "IN_PROGRESS": 30,
      "DELIVERED": 90
    },
    "byPriority": {
      "LOW": 50,
      "MEDIUM": 70,
      "HIGH": 20,
      "URGENT": 10
    }
  }
}
```

---

## 5. TICKET UPDATES (BRSH ONLY, PRE-ASSIGNMENT)

### Update Ticket Jewellery Details
```
PUT /repairTicket/tktJwellerySection/TICKET_ID
Content-Type: application/json

{
  "jewelleryItem": "Necklace",
  "material": "Silver",
  "purity": "925",
  "weight": 15,
  "unit": "Gram",
  "repairTypes": ["REPAIR_ID_1", "REPAIR_ID_2"]
}
```

### Update Stone Details
```
PUT /repairTicket/tktStoneDetails/TICKET_ID
Content-Type: application/json

{
  "stones": [
    {
      "stoneType": "Diamond",
      "weight": 0.5,
      "unit": "Carat",
      "shape": "Round",
      "count": 2
    },
    {
      "stoneType": "Ruby",
      "weight": 1,
      "unit": "Carat",
      "count": 1
    }
  ]
}
```

### Update Priority
```
PUT /repairTicket/tktPriority/TICKET_ID
Content-Type: application/json

{
  "priority": "HIGH"  // LOW, MEDIUM, HIGH, URGENT
}
```

### Update Due Date
```
PUT /repairTicket/tktDueDate/TICKET_ID
Content-Type: application/json

{
  "dueDate": "2026-07-15"
}
```

### Update Full Ticket
```
PUT /repairTicket
Content-Type: multipart/form-data

Form Fields: (Same as creation, only for NOT_ASSIGNED tickets)
- ticket_id: "TICKET_ID"
- [other fields to update]
- files: [optional new media]
```

---

## 6. MEDIA MANAGEMENT

### Get Before-Repair Media
```
GET /assignments/BeforeMedia/TICKET_ID

Response:
{
  "success": true,
  "data": [
    {
      "id": "MEDIA_ID",
      "url": "/uploads/file.jpg",
      "type": "IMAGE",
      "comment": "Front view"
    }
  ]
}
```

### Upload Before-Repair Media (BRSH, Pre-assignment)
```
POST /assignments/BeforeMedia/TICKET_ID
Content-Type: multipart/form-data

Files:
- files: [image1.jpg, image2.jpg]
- media_details[0][media_comment]: "Front view"
- media_details[1][media_comment]: "Side view"
```

### Upload After-Repair Media (RHO)
```
POST /assignments/AfterMedia/TICKET_ID
Content-Type: multipart/form-data

Files:
- files: [repaired.jpg]
- media_comment: "After repair"
```

### Delete Media
```
DELETE /asset/media/ticket/MEDIA_ID
```

---

## 7. ASSIGNMENT TO RHO (BRSH ONLY)

### Get All Active RHOs
```
GET /assignments/GetAllRHO

Response:
{
  "success": true,
  "data": [
    {
      "id": "RHO_ID",
      "name": "Suresh Kumar",
      "employeeId": "RHO001",
      "role_name": "RHO"
    }
  ]
}
```

### Assign Ticket to RHO
```
PUT /assignments/AssignToRHO
Content-Type: application/json

{
  "ticketId": "TICKET_ID",  // or ticket number
  "rhoId": "RHO_ID"
}

Response:
{
  "success": true,
  "ticket": {
    "ticket_no": "CHT202605001",
    "status": "Assigned to RHO",
    "assigned_rho_name": "Suresh Kumar"
  }
}
```

---

## 8. TICKET STATUS UPDATES (BRSH)

### Mark Ready for Delivery
```
PUT /assignments/saleshead/ticket_status/TICKET_ID
Content-Type: application/json

{}

// Only works if ticket is in TICKET_CLOSED_BY_RHO status
```

### Mark Delivered
```
PUT /assignments/saleshead/ticket_delivered/TICKET_ID
Content-Type: application/json

{}

// Only works if ticket is in READY_FOR_DELIVERY status
```

---

## 9. COMMENTS

### Get Comments
```
GET /repairTicket/ticket-comments/TICKET_ID

Response:
{
  "success": true,
  "data": [
    {
      "id": "COMMENT_ID",
      "comment": "Check gold purity",
      "user_name": "Rajesh Kumar",
      "role_name": "BRSH",
      "created_at": "2026-05-26T10:30:00Z"
    }
  ]
}
```

### Add Comment
```
POST /repairTicket/ticket-comments/TICKET_ID
Content-Type: application/json

{
  "comment": "Please check the diamond setting"
}

// Not allowed for DELIVERED tickets
```

---

## 10. ACTIVITY LOG

### Get Activity Log
```
GET /ticket-activity/TICKET_ID?page=1&limit=50&start_date=2026-05-20&end_date=2026-05-26

Response:
{
  "success": true,
  "data": {
    "data": [
      {
        "action": "TICKET_CREATED",
        "details": "Ticket created by Rajesh Kumar",
        "performed_by": "Rajesh Kumar",
        "performed_by_role": "BRSH",
        "created_at": "2026-05-26T09:00:00Z"
      }
    ],
    "page": 1,
    "totalPages": 1,
    "total": 5
  }
}
```

---

## 11. MASTER DATA

### Get Jewellery Types
```
GET /jewellery

Response:
{
  "success": true,
  "data": [
    {
      "id": "JEWEL_001",
      "name": "Ring"
    },
    {
      "id": "JEWEL_002",
      "name": "Necklace"
    }
  ]
}
```

### Get Repair Types
```
GET /repairType
```

### Get Materials with Purity
```
GET /MaterialwithPurity
```

### Get Units
```
GET /unit

Response:
{
  "success": true,
  "data": [
    {
      "id": "GRAM",
      "name": "Gram"
    },
    {
      "id": "CARAT",
      "name": "Carat"
    }
  ]
}
```

### Get Stone Types
```
GET /stone
```

### Get Purity Levels
```
GET /purity
```

---

## 12. NOTIFICATIONS

### Get Notifications
```
GET /notification?page=1&limit=10

Response:
{
  "success": true,
  "data": [
    {
      "id": "NOTIF_ID",
      "title": "Ticket Assigned",
      "message": "Ticket CHT202605001 assigned to you",
      "type": "TICKET",
      "isRead": false,
      "createdAt": "2026-05-26T10:00:00Z"
    }
  ]
}
```

### Mark Notification as Read
```
POST /notification/NOTIFICATION_ID/read
```

---

## 13. CHECKLISTS

### Get Checklist
```
GET /checklist/1

Response:
{
  "success": true,
  "data": {
    "id": "1",
    "name": "Checklist 1",
    "items": [
      {
        "id": "1-1",
        "text": "Customer details checked"
      },
      {
        "id": "1-2",
        "text": "Before media checked"
      }
    ]
  }
}
```

### Acknowledge Checklist
```
POST /assignments/Checklist/Acknowledgement
Content-Type: application/json

{
  "ticketId": "TICKET_ID",
  "checklistId": "1",
  "items": [true, true, true],
  "remark": "All checked"
}
```

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (no token) |
| 403 | Forbidden (wrong role) |
| 404 | Not Found |
| 409 | Conflict (business rule violation) |
| 500 | Server Error |

---

## Mobile Field Aliases

The API supports these mobile-friendly field names:

| Desktop Name | Mobile Alias |
|--------------|--------------|
| customerId | customer_id |
| dueDate | due_date |
| jewelleryItem | jewellery_item_id |
| weight | item_weight |
| unit | unit_id |
| material | material_id |
| priority | tkt_priority |
| status | tStatus |
| ticketId | ticket_id |

---

## Error Handling

```json
{
  "success": false,
  "message": "Specific error description",
  "details": "Optional additional details"
}
```

Common errors:
- "Delivered tickets are read-only"
- "Ticket intake details can be edited only before assignment"
- "Only Not Assigned tickets can be assigned to RHO"
- "Due date cannot be a past date"
- "At least one before-repair attachment is required"
- "Valid Indian mobile number is required"

---

## Development Tips

1. **Test Login First**: Get token before testing other APIs
2. **Use Postman**: Import collection from `/docs/Postman_Collection.json`
3. **Check Server IP**: `curl http://localhost:5000/api/server-info`
4. **Real-time Updates**: Connect Socket.io after login
5. **Debug Mode**: Check console logs in terminal for detailed errors

---

**Last Updated:** May 26, 2026
