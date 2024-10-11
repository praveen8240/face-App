import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors())

io.on('connection', (socket) => {
  console.log('A client connected');

  socket.on('faceData', (data) => {
    console.log('Received face data:', data);
    // Here you can process the data or send it to other connected clients
  });

  socket.on('disconnect', () => {
    console.log('A client disconnected');
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});