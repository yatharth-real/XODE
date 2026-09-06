import express from 'express';
import { CONFIG } from './config.mjs';
import { api } from './api.mjs';

const app = express();

app.use(express.json());

// Mount the API
app.use('/', api);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Express Error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(CONFIG.port, () => {
  console.log(`Thursday Router running on http://localhost:${CONFIG.port}`);
});