const express = require('express');
import type { Request, Response, NextFunction } from 'express';
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

const VALID_API_KEY = process.env.API_KEY || 'your-secret-api-key-here';

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${req.method} ${req.url} - ${req.ip || 'unknown'}\n`;

  console.log(logEntry.trim());

  const logFile = path.join(logsDir, 'requests.log');
  fs.appendFileSync(logFile, logEntry);

  next();
});
app.use((req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      error: 'API key is required',
      message: 'Please provide a valid API key in the x-api-key header',
    });
  }

  if (apiKey !== VALID_API_KEY) {
    return res.status(401).json({
      error: 'Invalid API key',
      message: 'The provided API key is not valid',
    });
  }

  next();
});

app.use(express.json());

app.post('/echo', (req: Request, res: Response) => {
  res.json(req.body);
});

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Echo server is running!', endpoints: ['POST /echo'] });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`POST /echo endpoint is available`);
  });
}

module.exports = app;
