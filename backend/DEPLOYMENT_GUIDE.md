# Deployment & Troubleshooting Guide

## Quick Start

### 1. Environment Setup

Create `.env` file in backend root:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/jewelry_repair
# For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/jewelry_repair

# JWT Configuration
JWT_SECRET=your_very_secure_secret_key_min_32_chars
JWT_EXPIRE=7d

# Server Configuration
PORT=5000
NODE_ENV=development
# Use 0.0.0.0 for hotspot connections, localhost for local dev

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=20971520  # 20MB

# Socket.io Configuration
SOCKET_CORS_ORIGIN=*
SOCKET_TRANSPORTS=websocket,polling

# Email/SMS (Optional, for future notifications)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your_email@gmail.com
# SMTP_PASS=your_password
```

### 2. Install Dependencies

```bash
cd backend
npm install
```

### 3. Run in Development

```bash
npm run dev
# Server runs on http://0.0.0.0:5000
```

### 4. Run in Production

```bash
npm start
```

### 5. Check Server Status

```bash
# Health check
curl http://localhost:5000/health

# Get server IPs
curl http://localhost:5000/api/server-info
```

---

## Database Setup

### MongoDB Local Installation

#### Windows
```bash
# Install MongoDB
https://www.mongodb.com/try/download/community

# Start MongoDB service
net start MongoDB

# Connect to local database
mongosh mongodb://localhost:27017
```

#### Linux/Mac
```bash
# Install MongoDB
brew install mongodb-community  # Mac
sudo apt-get install mongodb    # Linux

# Start MongoDB
brew services start mongodb-community  # Mac
sudo systemctl start mongod             # Linux

# Connect
mongosh mongodb://localhost:27017
```

### MongoDB Atlas (Cloud)

1. Create account at https://www.mongodb.com/cloud/atlas
2. Create cluster
3. Set IP whitelist
4. Create database user
5. Get connection string
6. Add to .env:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/jewelry_repair?retryWrites=true&w=majority
```

---

## Common Issues & Solutions

### Issue 1: MongoDB Connection Fails

**Error:**
```
❌ MongoDB Connection Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solutions:**
- Ensure MongoDB is running: `mongosh`
- Check MONGODB_URI in .env
- For Windows: `net start MongoDB`
- For Linux: `sudo systemctl start mongod`
- For Atlas: Verify IP whitelist includes your current IP

---

### Issue 2: Port 5000 Already in Use

**Error:**
```
listen EADDRINUSE: address already in use :::5000
```

**Solutions:**
```bash
# Windows - Find and kill process
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac - Find and kill process
lsof -i :5000
kill -9 <PID>

# Or use different port
PORT=5001 npm run dev
```

---

### Issue 3: JWT Token Invalid/Expired

**Error:**
```
"Not authorized, token failed"
```

**Solutions:**
- Ensure JWT_SECRET matches between token generation and verification
- Check token format: `Authorization: Bearer TOKEN`
- Token expires after time set in JWT_EXPIRE (default 7d)
- Generate new token via login endpoint

---

### Issue 4: File Upload Fails

**Error:**
```
"Only images, videos, and audio files are allowed"
```

**Solutions:**
- Check file extension: .jpg, .png, .jpeg, .mp4, .mov, .mp3, .wav
- Check file size < MAX_FILE_SIZE (20MB default)
- Ensure uploads directory exists: `mkdir uploads`
- Check write permissions: `chmod 777 uploads`

---

### Issue 5: CORS Error on Mobile App

**Error:**
```
"No 'Access-Control-Allow-Origin' header"
```

**Solutions:**
```env
# In .env, ensure CORS is open (for dev only!)
SOCKET_CORS_ORIGIN=*

# Or specify mobile app URL for production:
SOCKET_CORS_ORIGIN=http://192.168.x.x:8081
```

Update app.js:
```javascript
const corsOptions = {
  origin: '*',  // or specific URL
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
```

---

### Issue 6: Mobile App Can't Connect

**Error:**
```
Connection refused to server IP
```

**Solutions:**
- Get correct server IP: `curl http://localhost:5000/api/server-info`
- Use IP address, not localhost
- Ensure phone is on same network
- Check firewall allows port 5000
- For hotspot: Server must bind to 0.0.0.0 (already configured)

---

### Issue 7: Tickets Not Loading

**Error:**
```
"Ticket not found" or empty list
```

**Solutions:**
- Verify customer exists first
- Check BRSH is seeing their branch tickets only
- Ensure ticket was created with attachments
- Check MongoDB contains data: `db.tickets.find().count()`

---

### Issue 8: Role-Based Access Denied

**Error:**
```
"Role BRSH is not authorized to access this route"
```

**Solutions:**
- Only BRSH can create tickets: `/repairTicket` POST
- Only RHO can close tickets: `/repairTicket/tktCloseByRHO/:ticketId`
- Only KARIGAR can complete tasks: `/Kaarigar/Tasks/UpdateTaskStatus/:taskId`
- Verify correct role in database: `db.users.findOne({_id: ObjectId("...")})`

---

### Issue 9: Validation Fails - Invalid Mobile

**Error:**
```
"Valid Indian mobile number is required"
```

**Solutions:**
- Mobile must be exactly 10 digits
- Must start with 6, 7, 8, or 9
- No special characters or spaces
- Valid example: 9876543210

---

### Issue 10: Socket.io Not Working

**Error:**
```
"Cannot connect to Socket.io" or "401 Unauthorized"
```

**Solutions:**
```javascript
// Ensure Socket.io configured in app.js
const io = socketIO(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Make io accessible to routes
app.set('io', io);
```

---

## Performance Optimization

### 1. Database Indexing

Create indexes for frequently queried fields:

```javascript
// In MongoDB console
use jewelry_repair

// Customers
db.customers.createIndex({ "mobile": 1 })
db.customers.createIndex({ "name": 1 })

// Tickets
db.tickets.createIndex({ "status": 1 })
db.tickets.createIndex({ "branchId": 1 })
db.tickets.createIndex({ "customerId": 1 })
db.tickets.createIndex({ "dueDate": 1 })
db.tickets.createIndex({ "assignedRhoId": 1 })

// Activities
db.activities.createIndex({ "ticketId": 1, "createdAt": -1 })

// Notifications
db.notifications.createIndex({ "userId": 1, "isRead": 1 })
```

### 2. Enable Caching

In mobile app, cache master data:

```javascript
// Master data doesn't change often
// Cache on app startup: jewellery, materials, repair types
// Refresh on app launch if older than 1 day
```

### 3. Pagination Best Practices

- Always use pagination for list endpoints
- Default limit: 10-20 items per page
- Don't fetch all records at once
- Example: `GET /repairTicket?page=1&limit=20`

### 4. Connection Pooling

MongoDB already handles this, but configure if needed:

```javascript
const mongoose = require('mongoose');
await mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,  // Connection pool size
});
```

---

## Security Checklist

### Production Deployment

- [ ] Change JWT_SECRET to strong random value
- [ ] Set NODE_ENV=production
- [ ] Enable HTTPS (use reverse proxy like Nginx)
- [ ] Restrict CORS to specific origin
- [ ] Use MongoDB authentication with strong password
- [ ] Enable MongoDB encryption
- [ ] Set up firewall rules
- [ ] Use environment variables for all secrets
- [ ] Implement rate limiting
- [ ] Set up logging and monitoring
- [ ] Regular database backups
- [ ] Update dependencies: `npm audit fix`
- [ ] Use HTTPS for mobile app connection
- [ ] Implement request validation
- [ ] Add helmet security headers (already done)

### Code Security

```javascript
// DO: Validate all inputs
if (!mobile || !INDIAN_MOBILE_REGEX.test(mobile)) {
  return res.status(400).json({ success: false, message: 'Invalid mobile' });
}

// DON'T: Trust user input directly
// db.tickets.find({ status: req.query.status })  // Bad

// DO: Use parameterized queries (Mongoose does this)
// db.tickets.find({ status: parseMobileStatus(req.query.status) })

// DO: Hash passwords
bcrypt.hash(password, 10)

// DON'T: Store plain passwords
// user.password = plainPassword
```

---

## Monitoring & Logging

### Enable Logging

```bash
# Development logging with Morgan (already enabled)
npm run dev

# Production logging with Winston (optional)
npm install winston
```

### Check Logs

```bash
# Real-time logs
tail -f server.log

# Last 100 lines
tail -100 server.log

# Filter errors
grep "error" server.log
```

### Monitoring Tools

- **PM2** - Process manager
```bash
npm install -g pm2
pm2 start src/app.js --name "jewelry-repair-api"
pm2 logs jewelry-repair-api
pm2 status
```

- **New Relic** - APM monitoring (optional)
```bash
npm install newrelic
```

---

## Backup & Recovery

### MongoDB Backup

```bash
# Create backup
mongodump --uri="mongodb://localhost:27017/jewelry_repair" --out=./backup

# Restore from backup
mongorestore --uri="mongodb://localhost:27017" ./backup

# For MongoDB Atlas
mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net/jewelry_repair?retryWrites=true&w=majority" --out=./backup
```

### File Upload Backup

```bash
# Backup uploads folder
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/

# Copy to secure location
cp uploads_backup_*.tar.gz /backup/location/
```

---

## Testing

### Manual Testing with cURL

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"EMP001","password":"password123"}' \
  | jq -r '.token')

# 2. Create Customer
curl -X POST http://localhost:5000/api/customers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Customer","mobile":"9876543210","location":"Test Location"}'

# 3. Get Tickets
curl -X GET http://localhost:5000/api/repairTicket?page=1&limit=10 \
  -H "Authorization: Bearer $TOKEN"
```

### API Testing with Postman

1. Create new collection
2. Set base URL: `{{base_url}}/api`
3. Add environment variable: `base_url = http://localhost:5000`
4. Import endpoints from routes/index.js
5. Set Authorization header for all requests

### Automated Testing

```bash
# Install testing framework
npm install jest supertest --save-dev

# Create test file: tests/ticket.test.js
# Run tests
npm test
```

---

## Scaling Considerations

### Horizontal Scaling

1. **Load Balancer**: Use Nginx or HAProxy
```nginx
upstream backend {
  server localhost:5000;
  server localhost:5001;
  server localhost:5002;
}

server {
  listen 80;
  location /api {
    proxy_pass http://backend;
  }
}
```

2. **Sticky Sessions**: For Socket.io
```javascript
// Use Redis adapter for Socket.io
const redisIO = require("@socket.io/redis-adapter");
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");

const pubClient = createClient({ host: "localhost", port: 6379 });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

### Vertical Scaling

- Increase server CPU/RAM
- Optimize database queries
- Increase connection pool size
- Cache frequently accessed data

### Database Scaling

- **Replication**: MongoDB replica sets for HA
- **Sharding**: Distribute data across multiple servers
- **Read Replicas**: For read-heavy workloads

---

## Maintenance

### Regular Tasks

- **Daily**: Check error logs, monitor performance
- **Weekly**: Backup database, review security
- **Monthly**: Update dependencies, audit code
- **Quarterly**: Security scan, performance analysis
- **Annually**: Full system audit, architecture review

### Dependency Updates

```bash
# Check for outdated packages
npm outdated

# Update minor versions
npm update

# Update major versions
npm install package-name@latest

# Security audit
npm audit
npm audit fix
```

---

## Deployment to Production

### Using PM2

```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem.config.js
module.exports = {
  apps: [{
    name: "jewelry-repair-api",
    script: "./src/app.js",
    instances: "max",
    exec_mode: "cluster",
    env: {
      NODE_ENV: "production",
      PORT: 5000
    }
  }]
};

# Start with PM2
pm2 start ecosystem.config.js

# Make PM2 start on reboot
pm2 startup
pm2 save
```

### Using Docker

```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
```

```bash
# Build image
docker build -t jewelry-repair-api .

# Run container
docker run -p 5000:5000 \
  -e MONGODB_URI=mongodb://mongo:27017/jewelry_repair \
  -e JWT_SECRET=your_secret \
  jewelry-repair-api
```

### Using AWS/Azure/DigitalOcean

1. Create VM instance
2. Install Node.js and MongoDB
3. Clone repository
4. Set environment variables
5. Run with PM2 or Docker
6. Configure reverse proxy (Nginx)
7. Set up SSL/TLS with Let's Encrypt

---

## Support & Debugging

### Enable Debug Logging

```bash
# Set debug environment variable
DEBUG=* npm run dev

# Or specific debug namespaces
DEBUG=express:* npm run dev
```

### Check Server Health

```javascript
// Add to app.js for detailed health check
app.get('/api/health/detailed', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: mongooseConnection.readyState // 0=disconnected, 1=connected
  });
});
```

### Common Commands

```bash
# Check running processes
pm2 status
ps aux | grep node

# Check server logs
pm2 logs
tail -f nohup.out

# Check MongoDB status
mongosh --eval "db.adminCommand('ping')"

# Check disk space
df -h

# Check CPU/Memory
top
htop  # If installed
```

---

**Last Updated:** May 26, 2026  
**Version:** 1.0.0  
**Environment:** Production Ready
