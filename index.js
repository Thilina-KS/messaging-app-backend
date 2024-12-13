const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const mongoURI = process.env.MONGO_URI || "mongodb+srv://thilinakavinda26:1k6Is11MUR5FSG8X@cluster0.xurwf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Connect to MongoDB Atlas
mongoose
    .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch((err) => {
        console.error('Failed to connect to MongoDB Atlas:', err);
        process.exit(1); // Exit process if MongoDB connection fails
    });

// Define a schema and model for chat messages
const chatSchema = new mongoose.Schema({
    username: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const Chat = mongoose.model('Chat', chatSchema);

// Root Test Route
app.get('/', (req, res) => {
    res.status(200).send('Backend is running with MongoDB!');
});

// Retrieve Chat History
app.get('/chat-history', async (req, res) => {
    try {
        const chatHistory = await Chat.find().sort({ timestamp: -1 }).limit(50); // Retrieve last 50 messages
        res.status(200).json(chatHistory);
    } catch (error) {
        console.error('Failed to retrieve chat history:', error);
        res.status(500).json({ error: 'Failed to retrieve chat history' });
    }
});

// WebSocket Connection for Real-Time Communication
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle incoming chat messages
    socket.on('chat message', async (msg) => {
        if (!msg || !msg.username || !msg.message) {
            console.warn('Invalid message received:', msg);
            return;
        }

        console.log('Message received:', msg);

        // Save the message to the database
        try {
            const newMessage = new Chat(msg);
            await newMessage.save();
            io.emit('chat message', msg); // Broadcast the message to all clients
        } catch (error) {
            console.error('Error saving message:', error);
            socket.emit('error', { error: 'Failed to save the message' });
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
    });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'An unexpected error occurred' });
});

// Start the Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

