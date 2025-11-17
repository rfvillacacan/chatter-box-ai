import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { debateRouter } from './src/routes/debate.js';
import { connectionManager } from './src/websocket/broadcaster.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Allow CORS from any localhost port (for Vite dev server)
app.use(cors({ 
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow any localhost port
    if (origin.match(/^http:\/\/localhost:\d+$/)) {
      return callback(null, true);
    }
    
    // Allow the configured frontend URL
    if (origin === FRONTEND_URL) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  }
}));
app.use(express.json());

// Routes
app.use('/api/debate', debateRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const server = createServer(app);

// WebSocket server for real-time updates
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const debateId = url.searchParams.get('debateId');
  
  if (debateId) {
    connectionManager.add(debateId, ws);
    
    ws.on('close', () => {
      connectionManager.remove(debateId, ws);
    });
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
});


