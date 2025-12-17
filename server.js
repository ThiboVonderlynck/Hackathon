const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Store connected users
const connectedUsers = new Map(); // userId -> { userId, buildingId, timestamp, locationVerified }

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: dev ? "*" : process.env.NEXT_PUBLIC_URL || "*",
      methods: ["GET", "POST"]
    }
  });

  // Cleanup old users periodically
  const USER_TIMEOUT = 120000; // 2 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [userId, user] of connectedUsers.entries()) {
      if (now - user.timestamp > USER_TIMEOUT) {
        connectedUsers.delete(userId);
        io.emit('user_disconnected', { userId });
      }
    }
    // Broadcast updated user list
    const activeUsers = Array.from(connectedUsers.values());
    io.emit('users_updated', activeUsers);
  }, 30000); // Check every 30 seconds

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Send current user list to newly connected client
    const activeUsers = Array.from(connectedUsers.values());
    socket.emit('users_updated', activeUsers);

    // Handle user joining
    socket.on('user_join', (data) => {
      const { userId, buildingId, locationVerified } = data;
      
      if (!userId || !buildingId) {
        return;
      }

      // Only add if location is verified
      if (!locationVerified) {
        return;
      }

      // Check if user is already in this building (prevent duplicate logs)
      const existingUser = connectedUsers.get(userId);
      if (existingUser && existingUser.buildingId === buildingId) {
        // User already in this building, just update timestamp
        existingUser.timestamp = Date.now();
        connectedUsers.set(userId, existingUser);
        return;
      }

      // Remove user from previous building if exists
      if (existingUser && existingUser.buildingId !== buildingId) {
        // User switched buildings
      }

      // Add/update user
      connectedUsers.set(userId, {
        userId,
        buildingId,
        timestamp: Date.now(),
        locationVerified: true,
      });

      // Broadcast updated user list to all clients
      const activeUsers = Array.from(connectedUsers.values());
      io.emit('users_updated', activeUsers);
      
      console.log(`User ${userId} joined building ${buildingId}. Total users: ${activeUsers.length}`);
    });

    // Handle heartbeat
    socket.on('heartbeat', (data) => {
      const { userId } = data;
      if (userId && connectedUsers.has(userId)) {
        const user = connectedUsers.get(userId);
        user.timestamp = Date.now();
        connectedUsers.set(userId, user);
      }
    });

    // Handle user leaving
    socket.on('user_leave', (data) => {
      const { userId } = data;
      if (userId && connectedUsers.has(userId)) {
        connectedUsers.delete(userId);
        const activeUsers = Array.from(connectedUsers.values());
        io.emit('users_updated', activeUsers);
        console.log(`User ${userId} left. Total users: ${activeUsers.length}`);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});

