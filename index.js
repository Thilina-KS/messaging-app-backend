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

app.use(cors());
app.use(express.json());

// MongoDB connection
const mongoURI = process.env.MONGO_URI || "mongodb+srv://thilinakavinda26:1k6Is11MUR5FSG8X@cluster0.xurwf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Connect to MongoDB Atlas
mongoose
    .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch((err) => console.error('Failed to connect to MongoDB Atlas:', err));

// Define a schema and model for chat messages
const chatSchema = new mongoose.Schema({
    username: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const Chat = mongoose.model('Chat', chatSchema);

// Test route
app.get('/', (req, res) => {
    res.send('Backend is running with MongoDB!');
});

// Save chat messages to MongoDB and handle real-time communication
io.on('connection', (socket) => {
    console.log('A user connected');

    // Handle incoming chat messages
    socket.on('chat message', async (msg) => {
        console.log('Message:', msg);

        // Save the message to the database
        try {
            const newMessage = new Chat(msg);
            await newMessage.save();
            io.emit('chat message', msg); // Broadcast the message to all clients
        } catch (error) {
            console.error('Error saving message:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

// Retrieve chat history
app.get('/chat-history', async (req, res) => {
    try {
        const chatHistory = await Chat.find().sort({ timestamp: -1 }).limit(50); // Retrieve last 50 messages
        res.status(200).json(chatHistory);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve chat history' });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
