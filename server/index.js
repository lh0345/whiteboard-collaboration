
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URL);


const Room = require('./models/Room');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:8080",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// In-memory room management
const activeRooms = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('create-room', async (data) => {
    const { roomId, password, username } = data;
    
    try {
      // Check if room already exists
      const existingRoom = await Room.findOne({ roomId });
      if (existingRoom) {
        socket.emit('room-error', { message: 'Room already exists' });
        return;
      }

      // Create new room
      const creatorToken = uuidv4();
      const newRoom = new Room({
        roomId,
        password,
        creatorToken,
        creatorUsername: username,
        drawings: []
      });

      await newRoom.save();

      // Add to active rooms
      activeRooms.set(roomId, {
        users: new Map(),
        creatorToken
      });

      socket.emit('room-created', { 
        roomId, 
        creatorToken,
        message: 'Room created successfully' 
      });
    } catch (error) {
      console.error('Error creating room:', error);
      socket.emit('room-error', { message: 'Failed to create room' });
    }
  });

  socket.on('join-room', async (data) => {
    const { roomId, password, username, creatorToken } = data;
    
    try {
      // Validate room and password
      const room = await Room.findOne({ roomId });
      if (!room) {
        socket.emit('room-error', { message: 'Room not found' });
        return;
      }

      if (room.password !== password) {
        socket.emit('room-error', { message: 'Invalid password' });
        return;
      }

      // Update last activity
      room.lastActivity = new Date();
      await room.save();

      // Add user to room
      socket.join(roomId);
      socket.userId = socket.id;
      socket.username = username;
      socket.roomId = roomId;

      // Initialize room in memory if not exists
      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, {
          users: new Map(),
          creatorToken: room.creatorToken
        });
      }

      const roomData = activeRooms.get(roomId);
      const userColor = generateUserColor();
      
      roomData.users.set(socket.id, {
        id: socket.id,
        username,
        color: userColor,
        isCreator: creatorToken === room.creatorToken
      });

      // Send room data to user
      socket.emit('room-joined', {
        roomId,
        users: Array.from(roomData.users.values()),
        drawings: room.drawings,
        userColor,
        isCreator: creatorToken === room.creatorToken
      });

      // Notify other users
      socket.to(roomId).emit('user-joined', {
        id: socket.id,
        username,
        color: userColor
      });

      // Send updated user list
      io.to(roomId).emit('users-updated', Array.from(roomData.users.values()));

      console.log(`User ${username} joined room ${roomId}`);
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('room-error', { message: 'Failed to join room' });
    }
  });

  socket.on('drawing-event', async (data) => {
    if (!socket.roomId) return;

    try {
      // Save drawing to database
      const room = await Room.findOne({ roomId: socket.roomId });
      if (room) {
        const drawingEvent = {
          type: data.type,
          data: data.data,
          userId: socket.id,
          username: socket.username,
          timestamp: new Date(),
          color: data.color
        };

        room.drawings.push(drawingEvent);
        room.lastActivity = new Date();
        await room.save();

        // Broadcast to other users in room
        socket.to(socket.roomId).emit('drawing-event', drawingEvent);
      }
    } catch (error) {
      console.error('Error saving drawing:', error);
    }
  });

  socket.on('clear-board', async (data) => {
    if (!socket.roomId) return;

    try {
      // Clear drawings in database
      const room = await Room.findOne({ roomId: socket.roomId });
      if (room) {
        room.drawings = [];
        room.lastActivity = new Date();
        await room.save();

        // Broadcast clear event to all users in room
        io.to(socket.roomId).emit('board-cleared', {
          userId: socket.id,
          username: socket.username
        });
      }
    } catch (error) {
      console.error('Error clearing board:', error);
    }
  });

  socket.on('terminate-room', async (data) => {
    const { creatorToken } = data;
    if (!socket.roomId) return;

    try {
      const room = await Room.findOne({ roomId: socket.roomId });
      if (room && room.creatorToken === creatorToken) {
        // Remove from database
        await Room.deleteOne({ roomId: socket.roomId });
        
        // Remove from active rooms
        activeRooms.delete(socket.roomId);

        // Notify all users and disconnect them
        io.to(socket.roomId).emit('room-terminated', {
          message: 'Room has been terminated by the creator'
        });

        // Disconnect all sockets from room
        const socketsInRoom = await io.in(socket.roomId).fetchSockets();
        socketsInRoom.forEach(s => s.leave(socket.roomId));

        console.log(`Room ${socket.roomId} terminated`);
      }
    } catch (error) {
      console.error('Error terminating room:', error);
    }
  });

  socket.on('disconnect', () => {
    if (socket.roomId && activeRooms.has(socket.roomId)) {
      const roomData = activeRooms.get(socket.roomId);
      roomData.users.delete(socket.id);

      // Notify other users
      socket.to(socket.roomId).emit('user-left', {
        id: socket.id,
        username: socket.username
      });

      // Send updated user list
      io.to(socket.roomId).emit('users-updated', Array.from(roomData.users.values()));

      // Clean up empty rooms
      if (roomData.users.size === 0) {
        activeRooms.delete(socket.roomId);
      }
    }

    console.log('User disconnected:', socket.id);
  });
});

// Helper function to generate user colors
function generateUserColor() {
  const colors = [
    "#ef4444", "#f97316", "#eab308", "#22c55e", 
    "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
