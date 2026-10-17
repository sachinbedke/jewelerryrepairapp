# Developer Quick Start Card

## 🚀 Get Started in 5 Minutes

```bash
# 1. Navigate to backend
cd backend

# 2. Install dependencies
npm install

# 3. Create .env file
cat > .env << EOF
MONGODB_URI=mongodb://localhost:27017/jewelry_repair
JWT_SECRET=dev_secret_key_12345
JWT_EXPIRE=7d
PORT=5000
NODE_ENV=development
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=20971520
EOF

# 4. Start MongoDB (separate terminal)
mongosh

# 5. Start backend
npm run dev

# 6. Check health
curl http://localhost:5000/health
```

✅ Backend running on **http://localhost:5000**

---

## 📝 Typical Workflow

### 1️⃣ Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "EMP001",
    "password": "password123"
  }'
```
**Get TOKEN from response**

### 2️⃣ Create Customer
```bash
curl -X POST http://localhost:5000/api/customers \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rajesh Kumar",
    "mobile": "9876543210",
    "location": "Delhi"
  }'
```
**Get CUSTOMER_ID from response**

### 3️⃣ Create Ticket
```bash
curl -X POST http://localhost:5000/api/repairTicket \
  -H "Authorization: Bearer TOKEN" \
  -F 'customerId=CUSTOMER_ID' \
  -F 'jewelleryItem=Ring' \
  -F 'material=Gold' \
  -F 'purity=22K' \
  -F 'weight=5' \
  -F 'unit=Gram' \
  -F 'repairTypes=REPAIR001' \
  -F 'dueDate=2026-06-30' \
  -F 'files=@image.jpg'
```
**Get TICKET_ID from response**

### 4️⃣ Get All Tickets
```bash
curl -X GET http://localhost:5000/api/repairTicket?page=1&limit=10 \
  -H "Authorization: Bearer TOKEN"
```

### 5️⃣ Get All RHOs
```bash
curl -X GET http://localhost:5000/api/assignments/GetAllRHO \
  -H "Authorization: Bearer TOKEN"
```
**Get RHO_ID from response**

### 6️⃣ Assign to RHO
```bash
curl -X PUT http://localhost:5000/api/assignments/AssignToRHO \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ticketId": "TICKET_ID",
    "rhoId": "RHO_ID"
  }'
```

---

## 🗂️ Project Structure

```
backend/
├── src/
│   ├── controllers/       # Business logic
│   ├── models/           # Database schemas
│   ├── routes/           # API endpoints
│   ├── middleware/       # Auth, upload, validation
│   ├── services/         # Workflow logic
│   ├── utils/            # Helpers & formatting
│   └── app.js            # Server setup
├── uploads/              # File storage
├── package.json          # Dependencies
└── .env                  # Environment config
```

---

## 🔑 Key Endpoints

| Method | Path | Role | Purpose |
|--------|------|------|---------|
| POST | `/auth/login` | All | Login |
| POST | `/customers` | BRSH | Create customer |
| GET | `/customers/search/:query` | BRSH | Search customers |
| POST | `/repairTicket` | BRSH | Create ticket |
| GET | `/repairTicket` | All | List tickets |
| GET | `/repairTicket/:id` | All | Get ticket details |
| PUT | `/repairTicket/:id` | BRSH | Update ticket |
| PUT | `/assignments/AssignToRHO` | BRSH | Assign to RHO |
| POST | `/assignments/BeforeMedia/:id` | BRSH | Upload media |
| GET | `/repairTicket/ticket-comments/:id` | All | Get comments |
| POST | `/repairTicket/ticket-comments/:id` | All | Add comment |
| GET | `/ticket-activity/:id` | All | Get activity log |

---

## ✅ Validation Rules

| Field | Rule | Example |
|-------|------|---------|
| Mobile | 10 digits, starts with 6-9 | 9876543210 ✓ |
| Due Date | Cannot be past date | 2026-06-30 ✓ |
| Attachment | At least 1 required | jpg, mp4, mp3 ✓ |
| Repair Type | At least 1 required | REPAIR001 ✓ |
| Material | Required | Gold, Silver ✓ |
| Jewellery | Required | Ring, Necklace ✓ |

---

## 🛠️ Common Tasks

### Check Server Status
```bash
curl http://localhost:5000/health
```

### Get Server IP for Mobile
```bash
curl http://localhost:5000/api/server-info
```

### View Real-Time Logs
```bash
npm run dev  # Shows all logs
```

### Check Database Connection
```bash
mongosh  # In separate terminal
use jewelry_repair
db.customers.find().count()
```

### Restart Server
```bash
# Kill current process (Ctrl+C)
# Then restart
npm run dev
```

### Clear All Uploads
```bash
rm -rf uploads/*
mkdir uploads
```

---

## 🐛 Troubleshooting

### MongoDB Connection Failed
```bash
# Check MongoDB is running
mongosh

# If not running, start MongoDB:
# Windows: net start MongoDB
# Mac: brew services start mongodb-community
# Linux: sudo systemctl start mongod
```

### Port 5000 Already in Use
```bash
# Kill process on port 5000
# Windows: netstat -ano | findstr :5000, then taskkill /PID <PID> /F
# Mac/Linux: lsof -i :5000, then kill -9 <PID>

# Or use different port
PORT=5001 npm run dev
```

### File Upload Fails
```bash
# Create uploads directory
mkdir uploads

# Check file is valid type (jpg, png, mp4, mp3, wav)
# Check file size < 20MB
```

### Token Invalid
```bash
# Get new token from login endpoint
# Use in header: Authorization: Bearer TOKEN
```

### Ticket Not Found
```bash
# Ensure MongoDB contains the ticket
mongosh
use jewelry_repair
db.tickets.findOne({ticketNo: "CHT202605001"})

# If empty, create new ticket first
```

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| `API_QUICK_REFERENCE.md` | API examples & testing |
| `DEPLOYMENT_GUIDE.md` | Setup & troubleshooting |
| `IMPLEMENTATION_COMPLETE.md` | Architecture & design |
| `BRSH_BACKEND_IMPLEMENTATION.md` | Implementation notes |

---

## 🚀 Deploy to Production

```bash
# 1. Set up server (AWS/Azure/DigitalOcean)
# 2. Install Node.js and MongoDB
# 3. Create .env with production values
# 4. Install PM2
npm install -g pm2

# 5. Start with PM2
pm2 start src/app.js --name jewelry-repair-api

# 6. Make PM2 start on reboot
pm2 startup
pm2 save

# 7. Check status
pm2 status
```

---

## 🔒 Security Reminders

✅ Use strong JWT_SECRET (min 32 chars)  
✅ Never commit .env to git  
✅ Use HTTPS in production  
✅ Restrict CORS to mobile app origin  
✅ Keep dependencies updated: `npm audit fix`  
✅ Use environment-specific configs  

---

## 📊 Useful Queries

### Count Total Tickets
```bash
mongosh
use jewelry_repair
db.tickets.countDocuments()
```

### Count Tickets by Status
```bash
db.tickets.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
])
```

### Find Tickets Created Today
```bash
db.tickets.find({
  createdAt: { 
    $gte: new Date(new Date().toDateString())
  }
})
```

### Count Customers
```bash
db.customers.countDocuments()
```

---

## 💡 Development Tips

1. **Use Postman** for testing APIs
2. **Check logs** in terminal for errors
3. **Test without mobile app** first using cURL
4. **Create test user** in database for testing
5. **Use pagination** for large result sets
6. **Check MongoDB** directly for data issues
7. **Read error messages** carefully - they're descriptive
8. **Keep .env locally** - never commit it
9. **Test all roles** (BRSH, RHO, KARIGAR)
10. **Monitor performance** in production

---

## 📞 Quick Help

**Question: How do I create a test user?**
```bash
mongosh
use jewelry_repair
db.users.insertOne({
  employeeId: "EMP001",
  name: "Test User",
  phone: "9876543210",
  password: <bcrypt hash>,  // Use bcrypt
  role: "BRSH",
  branchId: <branch_id>,
  departmentId: <dept_id>,
  isActive: true
})
```

**Question: How do I get branch and department IDs?**
```bash
mongosh
use jewelry_repair
db.branches.find()
db.departments.find()
```

**Question: How do I view all tickets?**
```bash
curl http://localhost:5000/api/repairTicket?page=1&limit=1000 \
  -H "Authorization: Bearer TOKEN"
```

**Question: How do I reset database?**
```bash
mongosh
use jewelry_repair
db.dropDatabase()
# Then recreate collections by creating records
```

---

## 🎯 Testing Checklist

Before deployment, verify:

- [ ] Login works
- [ ] Customer creation works
- [ ] Ticket creation with attachment works
- [ ] Ticket listing shows correct data
- [ ] Ticket can be assigned to RHO
- [ ] Comments work
- [ ] Activity log shows all actions
- [ ] Mobile app can connect
- [ ] File uploads work
- [ ] Real-time updates work
- [ ] Error handling works
- [ ] Different roles see different data
- [ ] Cannot edit delivered tickets
- [ ] Cannot create tickets as RHO
- [ ] Cannot assign unassigned tickets

---

**Print this card and keep at your desk! 📋**

Last Updated: May 26, 2026  
Status: Production Ready ✅
