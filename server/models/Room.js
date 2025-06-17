
const mongoose = require('mongoose');

const drawingEventSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['path', 'clear', 'erase'],
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  color: {
    type: String,
    required: true
  }
});

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  creatorToken: {
    type: String,
    required: true
  },
  creatorUsername: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  drawings: [drawingEventSchema]
});

// Auto-delete rooms after 1 hour of inactivity
roomSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 3600 });

module.exports = mongoose.model('Room', roomSchema);
