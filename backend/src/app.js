// server.js - MODIFIED VERSION for hotspot connection
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const path = require('path');
const dotenv = require('dotenv');
const http = require('http');
const socketIO = require('socket.io');

// Load environment variables
dotenv.config();

// Initialize express
const app = express();
const server = http.createServer(app);

// IMPORTANT: Configure CORS properly for mobile
const corsOptions = {
  origin: '*', // For development with hotspot
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

const io = socketIO(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'], // Better for mobile networks
  allowEIO3: true
});

// Connect to MongoDB
const connectDB = require('./config/database');
connectDB();

// Register models required by population
require('./models/Branch');
require('./models/Department');
require('./models/Employee');
require('./models/TicketAttachment');
require('./models/StoneDetail');
require('./models/RepairType');
require('./models/Material');
require('./models/Assignment');

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Make io accessible to routes
app.set('io', io);

// Socket.io connection handling with better error handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  socket.on('joinTicketRoom', (ticketId) => {
    socket.join(`ticket_${ticketId}`);
    console.log(`Socket ${socket.id} joined ticket_${ticketId}`);
  });
  
  socket.on('leaveTicketRoom', (ticketId) => {
    socket.leave(`ticket_${ticketId}`);
    console.log(`Socket ${socket.id} left ticket_${ticketId}`);
  });
  
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
  
  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, 'Reason:', reason);
  });
});

// Routes
app.use('/api', require('./routes/index'));

// Health check (useful for debugging)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date(),
    serverInfo: {
      host: req.headers.host,
      ip: req.ip
    }
  });
});

// Get server IP (helpful for mobile app)
app.get('/api/server-info', (req, res) => {
  const networkInterfaces = require('os').networkInterfaces();
  const ips = [];
  
  for (const interfaceName in networkInterfaces) {
    for (const iface of networkInterfaces[interfaceName]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  
  res.json({
    ips: ips,
    port: PORT,
    message: 'Use one of these IPs in your mobile app'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: err.message || 'Something went wrong!' 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Start server - LISTEN ON ALL INTERFACES (crucial for hotspot)
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // This is critical for mobile hotspot!

server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Display available IPs for mobile connection
  const os = require('os');
  const interfaces = os.networkInterfaces();
  console.log('\n📱 Connect your mobile app using one of these IPs:');
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`   → http://${iface.address}:${PORT}`);
      }
    }
  }
  console.log('\n💡 Make sure your phone is connected to the same hotspot as this computer\n');
});

module.exports = { app, server, io };
