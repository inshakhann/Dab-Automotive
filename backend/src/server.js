// FILE: src/server.js
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');

const PORT = process.env.PORT || 5000;

// HTTP server banayein (Express app ke sath)
const server = http.createServer(app);

// Socket.IO ko server ke sath initialize karein
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

// Socket.IO instance ko app mein save karein taake controllers use kar sakein
app.set('socketio', io);

// Socket.IO connection logic (Live Job Tracking - UC-13)
io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Jab customer kisi specific job (vehicle) ko track karna chahe
    const handleJoinJob = (jobId) => {
        if (!jobId) return;
        const roomName = `job_${jobId}`;
        socket.join(roomName);
        console.log(`Socket ${socket.id} joined room: ${roomName}`);
    };

    socket.on("track_job", handleJoinJob);
    socket.on("join_job", handleJoinJob);

    // Jab customer tracking page band kare to room leave kar de
    socket.on("leave_job", (jobId) => {
        if (!jobId) return;
        const roomName = `job_${jobId}`;
        socket.leave(roomName);
        console.log(`Socket ${socket.id} left room: ${roomName}`);
    });

    socket.on("disconnect", (reason) => {
        console.log(`Socket disconnected (${socket.id}): ${reason}`);
    });
});

// Port conflict ya server startup errors handle karein
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use.`);
        process.exit(1);
    }
    throw error;
});

// Server start karein
server.listen(PORT, () => {
    console.log(`Dab Automotive Backend running at http://localhost:${PORT}`);
});

// Graceful shutdown
const shutdown = () => {
    console.log('Shutting down server gracefully...');
    io.close(() => {
        server.close(() => {
            process.exit(0);
        });
    });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);