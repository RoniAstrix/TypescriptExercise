const request = require('supertest');
const app = require('../echoServer');
const fs = require('fs');
const path = require('path');

describe('Logging Middleware', () => {
  const logsDir = path.join(process.cwd(), 'logs');
  const logFile = path.join(logsDir, 'requests.log');

  beforeEach(() => {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    if (fs.existsSync(logFile)) {
      fs.writeFileSync(logFile, '');
    }
  });

  afterEach(() => {
    if (fs.existsSync(logFile)) {
      fs.writeFileSync(logFile, '');
    }
  });

  afterAll(() => {
    if (fs.existsSync(logFile)) {
      fs.unlinkSync(logFile);
    }
    if (fs.existsSync(logsDir)) {
      fs.rmdirSync(logsDir);
    }
  });

  describe('Log File Creation', () => {
    it('should create log file if it does not exist', async () => {
      if (fs.existsSync(logFile)) {
        fs.unlinkSync(logFile);
      }

      await request(app).get('/');

      expect(fs.existsSync(logFile)).toBe(true);
    });
  });

  describe('Log Format', () => {
    it('should log requests with correct format', async () => {
      await request(app).get('/');

      const logContent = fs.readFileSync(logFile, 'utf8');
      const logLine = logContent.trim();

      expect(logLine).toMatch(/^\[.*\] GET \/ - .*$/);
    });

    it('should include ISO timestamp', async () => {
      const beforeRequest = new Date();
      await request(app).get('/');
      const afterRequest = new Date();

      const logContent = fs.readFileSync(logFile, 'utf8');
      const timestampMatch = logContent.match(/\[(.*?)\]/);

      expect(timestampMatch).toBeTruthy();
      const timestamp = new Date(timestampMatch![1]!);

      expect(timestamp.getTime()).toBeGreaterThanOrEqual(
        beforeRequest.getTime(),
      );
      expect(timestamp.getTime()).toBeLessThanOrEqual(afterRequest.getTime());
    });

    it('should log HTTP method correctly', async () => {
      await request(app).get('/');
      await request(app).post('/echo').send({ test: 'data' });

      const logContent = fs.readFileSync(logFile, 'utf8');
      const lines = logContent.trim().split('\n');

      expect(lines[0]).toMatch(/GET/);
      expect(lines[1]).toMatch(/POST/);
    });

    it('should log URL path correctly', async () => {
      await request(app).get('/');
      await request(app).post('/echo').send({ test: 'data' });

      const logContent = fs.readFileSync(logFile, 'utf8');
      const lines = logContent.trim().split('\n');

      expect(lines[0]).toMatch(/ \/ /);
      expect(lines[1]).toMatch(/ \/echo /);
    });
  });

  describe('Multiple Requests', () => {
    it('should append each request to the log file', async () => {
      await request(app).get('/');
      await request(app).post('/echo').send({ test: 'data1' });
      await request(app).post('/echo').send({ test: 'data2' });

      const logContent = fs.readFileSync(logFile, 'utf8');
      const lines = logContent.trim().split('\n');

      expect(lines).toHaveLength(3);
      expect(lines[0]).toMatch(/GET \/ /);
      expect(lines[1]).toMatch(/POST \/echo /);
      expect(lines[2]).toMatch(/POST \/echo /);
    });

    it('should maintain chronological order', async () => {
      const requests = [
        () => request(app).get('/'),
        () => request(app).post('/echo').send({ test: 'data1' }),
        () => request(app).get('/'),
        () => request(app).post('/echo').send({ test: 'data2' }),
      ];

      for (const req of requests) {
        await req();
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      const logContent = fs.readFileSync(logFile, 'utf8');
      const lines = logContent.trim().split('\n');

      expect(lines).toHaveLength(4);
      expect(lines[0]).toMatch(/GET \/ /);
      expect(lines[1]).toMatch(/POST \/echo /);
      expect(lines[2]).toMatch(/GET \/ /);
      expect(lines[3]).toMatch(/POST \/echo /);
    });
  });

  describe('IP Address Logging', () => {
    it('should log IP address or unknown if not available', async () => {
      await request(app).get('/');

      const logContent = fs.readFileSync(logFile, 'utf8');
      const logLine = logContent.trim();

      expect(logLine).toMatch(/ - (?:unknown|[\d.:]+|::ffff:[\d.]+)$/);
    });
  });

  describe('Log Persistence', () => {
    it('should persist logs across multiple server instances', async () => {
      await request(app).get('/');

      fs.readFileSync(logFile, 'utf8');

      await request(app).get('/');

      const logContent2 = fs.readFileSync(logFile, 'utf8');

      const lines = logContent2.trim().split('\n');
      expect(lines).toHaveLength(2);
      expect(lines[0]).toMatch(/GET \/ /);
      expect(lines[1]).toMatch(/GET \/ /);
    });
  });
});
