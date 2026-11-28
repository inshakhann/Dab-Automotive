// FILE: src/server.js
require('dotenv').config();
const app = require('./app');
const http = require('http');
const { Server } = require('socket.io');


const PORT = process.env.PORT || 5000;

// HTTP server banayein (Express app ke sath)
const server = http.createServer(app);

// Socket.IO ko server ke sath initialize karein
const io = new Server(server, {
    cors: {
        origin: "*", // Filhal sab allow karein (Production mein isko restrict karenge)
        methods: ["GET", "POST", "PUT"]
    }
});

// Socket.IO connection logic
io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Jab customer kisi specific job (vehicle) ko track karna chahe
    socket.on("track_job", (jobId) => {
        socket.join(`job_${jobId}`); // Customer ko us job ke "room" mein daal dein
        console.log(`User joined room: job_${jobId}`);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected");
    });
});

// Socket.IO ka instance app ke andar save karein taake controllers use kar sakein
app.set('socketio', io);

// Server start karein (app.listen nahi, balke server.listen chalayein)
server.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
});