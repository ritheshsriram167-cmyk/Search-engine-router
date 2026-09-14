import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import keysRouter from './routes/keys.js';
import brainRouter from './routes/brain.js';
import providersRouter from './routes/providers.js';
import statsRouter from './routes/stats.js';
import searchRouter from './routes/search.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/keys', keysRouter);
app.use('/api/brain', brainRouter);
app.use('/api/providers', providersRouter);
app.use('/api/stats', statsRouter);
app.use('/api/v1/search', searchRouter);

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'such-engine-rotor'
  });
});

// Serve built React dashboard in production
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Relay Engine</title></head>
        <body style="background:#0A0D12;color:#E8EAEE;font-family:sans-serif;padding:40px;text-align:center;">
          <h1>Relay API Engine is Running</h1>
          <p>The backend API is active on port ${PORT}.</p>
          <p>Run <code>npm run build</code> to compile the client dashboard.</p>
        </body>
        </html>
      `);
    }
  });
});

app.listen(PORT, () => {
  console.log(`[Server] Relay Search Engine Rotor is running on http://localhost:${PORT}`);
  console.log(`[Server] Permanent search endpoint: http://localhost:${PORT}/api/v1/search`);
});
