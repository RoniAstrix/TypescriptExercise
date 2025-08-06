const request = require('supertest');
const app = require('../echoServer');
const fs = require('fs');
const path = require('path');

describe('Echo Server', () => {
  const logsDir = path.join(process.cwd(), 'logs');
  const logFile = path.join(logsDir, 'requests.log');
  const validApiKey = 'your-secret-api-key-here';
  const invalidApiKey = 'wrong-api-key';

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

  describe('Authentication', () => {
    it('should return 401 when no API key is provided', async () => {
      const response = await request(app).get('/').expect(401);

      expect(response.body).toEqual({
        error: 'API key is required',
        message: 'Please provide a valid API key in the x-api-key header',
      });
    });

    it('should return 401 when invalid API key is provided', async () => {
      const response = await request(app)
        .get('/')
        .set('x-api-key', invalidApiKey)
        .expect(401);

      expect(response.body).toEqual({
        error: 'Invalid API key',
        message: 'The provided API key is not valid',
      });
    });

    it('should allow access when valid API key is provided', async () => {
      const response = await request(app)
        .get('/')
        .set('x-api-key', validApiKey)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Echo server is running!',
        endpoints: ['POST /echo'],
      });
    });
  });

  describe('GET /', () => {
    it('should return welcome message and available endpoints', async () => {
      const response = await request(app)
        .get('/')
        .set('x-api-key', validApiKey)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Echo server is running!',
        endpoints: ['POST /echo'],
      });
    });

    it('should have correct content type', async () => {
      const response = await request(app)
        .get('/')
        .set('x-api-key', validApiKey)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
    });
  });

  describe('POST /echo', () => {
    it('should echo back the request body', async () => {
      const testData = {
        message: 'Hello World',
        number: 42,
        boolean: true,
        array: [1, 2, 3],
        nested: { key: 'value' },
      };

      const response = await request(app)
        .post('/echo')
        .set('x-api-key', validApiKey)
        .send(testData)
        .expect(200);

      expect(response.body).toEqual(testData);
    });

    it('should handle empty JSON body', async () => {
      const response = await request(app)
        .post('/echo')
        .set('x-api-key', validApiKey)
        .send({})
        .expect(200);

      expect(response.body).toEqual({});
    });

    it('should handle string data', async () => {
      const testData = { text: 'This is a test string' };

      const response = await request(app)
        .post('/echo')
        .set('x-api-key', validApiKey)
        .send(testData)
        .expect(200);

      expect(response.body).toEqual(testData);
    });

    it('should handle numeric data', async () => {
      const testData = {
        integer: 123,
        float: 3.14159,
        negative: -42,
      };

      const response = await request(app)
        .post('/echo')
        .set('x-api-key', validApiKey)
        .send(testData)
        .expect(200);

      expect(response.body).toEqual(testData);
    });

    it('should handle boolean data', async () => {
      const testData = {
        trueValue: true,
        falseValue: false,
      };

      const response = await request(app)
        .post('/echo')
        .set('x-api-key', validApiKey)
        .send(testData)
        .expect(200);

      expect(response.body).toEqual(testData);
    });

    it('should handle array data', async () => {
      const testData = {
        numbers: [1, 2, 3, 4, 5],
        strings: ['a', 'b', 'c'],
        mixed: [1, 'two', true, null],
      };

      const response = await request(app)
        .post('/echo')
        .set('x-api-key', validApiKey)
        .send(testData)
        .expect(200);

      expect(response.body).toEqual(testData);
    });

    it('should handle nested objects', async () => {
      const testData = {
        user: {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          preferences: {
            theme: 'dark',
            notifications: true,
          },
        },
        metadata: {
          timestamp: '2025-08-06T12:00:00Z',
          version: '1.0.0',
        },
      };

      const response = await request(app)
        .post('/echo')
        .set('x-api-key', validApiKey)
        .send(testData)
        .expect(200);

      expect(response.body).toEqual(testData);
    });

    it('should have correct content type', async () => {
      const response = await request(app)
        .post('/echo')
        .set('x-api-key', validApiKey)
        .send({ test: 'data' })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
    });
  });

  describe('Logging Middleware', () => {
    it('should log GET requests to file', async () => {
      await request(app).get('/').set('x-api-key', validApiKey);

      expect(fs.existsSync(logFile)).toBe(true);
      const logContent = fs.readFileSync(logFile, 'utf8');
      expect(logContent).toMatch(/\[.*\] GET \/ - .*/);
    });

    it('should log POST requests to file', async () => {
      await request(app)
        .post('/echo')
        .set('x-api-key', validApiKey)
        .send({ test: 'data' });

      expect(fs.existsSync(logFile)).toBe(true);
      const logContent = fs.readFileSync(logFile, 'utf8');
      expect(logContent).toMatch(/\[.*\] POST \/echo - .*/);
    });

    it('should log multiple requests', async () => {
      await request(app).get('/').set('x-api-key', validApiKey);
      await request(app)
        .post('/echo')
        .set('x-api-key', validApiKey)
        .send({ test: 'data1' });
      await request(app)
        .post('/echo')
        .set('x-api-key', validApiKey)
        .send({ test: 'data2' });

      const logContent = fs.readFileSync(logFile, 'utf8');
      const lines = logContent.trim().split('\n');

      expect(lines).toHaveLength(3);
      expect(lines[0]).toMatch(/\[.*\] GET \/ - .*/);
      expect(lines[1]).toMatch(/\[.*\] POST \/echo - .*/);
      expect(lines[2]).toMatch(/\[.*\] POST \/echo - .*/);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      await request(app)
        .get('/nonexistent')
        .set('x-api-key', validApiKey)
        .expect(404);
    });

    it('should return 404 for POST to non-existent routes', async () => {
      await request(app)
        .post('/nonexistent')
        .set('x-api-key', validApiKey)
        .send({ test: 'data' })
        .expect(404);
    });

    it('should handle malformed JSON gracefully', async () => {
      await request(app)
        .post('/echo')
        .set('x-api-key', validApiKey)
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });
  });

  describe('HTTP Methods', () => {
    it('should reject PUT requests to /echo', async () => {
      await request(app)
        .put('/echo')
        .set('x-api-key', validApiKey)
        .send({ test: 'data' })
        .expect(404);
    });

    it('should reject DELETE requests to /echo', async () => {
      await request(app)
        .delete('/echo')
        .set('x-api-key', validApiKey)
        .expect(404);
    });

    it('should reject PATCH requests to /echo', async () => {
      await request(app)
        .patch('/echo')
        .set('x-api-key', validApiKey)
        .send({ test: 'data' })
        .expect(404);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    describe('Authentication Edge Cases', () => {
      it('should handle empty API key string', async () => {
        const response = await request(app)
          .get('/')
          .set('x-api-key', '')
          .expect(401);

        expect(response.body).toEqual({
          error: 'API key is required',
          message: 'Please provide a valid API key in the x-api-key header',
        });
      });

      it('should handle API key with only whitespace', async () => {
        const response = await request(app)
          .get('/')
          .set('x-api-key', '   ')
          .expect(401);

        expect(response.body).toEqual({
          error: 'API key is required',
          message: 'Please provide a valid API key in the x-api-key header',
        });
      });

      it('should handle case-sensitive API key comparison', async () => {
        const response = await request(app)
          .get('/')
          .set('x-api-key', 'YOUR-SECRET-API-KEY-HERE')
          .expect(401);

        expect(response.body).toEqual({
          error: 'Invalid API key',
          message: 'The provided API key is not valid',
        });
      });

      it('should handle API key with special characters', async () => {
        const response = await request(app)
          .get('/')
          .set('x-api-key', 'your-secret-api-key-here!@#$%^&*()')
          .expect(401);

        expect(response.body).toEqual({
          error: 'Invalid API key',
          message: 'The provided API key is not valid',
        });
      });

      it('should handle very long API key', async () => {
        const longApiKey = 'a'.repeat(1000);
        const response = await request(app)
          .get('/')
          .set('x-api-key', longApiKey)
          .expect(401);

        expect(response.body).toEqual({
          error: 'Invalid API key',
          message: 'The provided API key is not valid',
        });
      });
    });

    describe('Content-Type Edge Cases', () => {
      it('should handle missing Content-Type header for POST', async () => {
        const response = await request(app)
          .post('/echo')
          .set('x-api-key', validApiKey)
          .send('{"test": "data"}')
          .expect(200);

        expect(response.body).toEqual('');
      });

      it('should handle text/plain Content-Type', async () => {
        const response = await request(app)
          .post('/echo')
          .set('x-api-key', validApiKey)
          .set('Content-Type', 'text/plain')
          .send('{"test": "data"}')
          .expect(200);

        expect(response.body).toEqual('');
      });

      it('should handle application/xml Content-Type', async () => {
        const response = await request(app)
          .post('/echo')
          .set('x-api-key', validApiKey)
          .set('Content-Type', 'application/xml')
          .send('<test>data</test>')
          .expect(200);

        expect(response.body).toEqual('');
      });

      it('should handle multipart/form-data Content-Type', async () => {
        const response = await request(app)
          .post('/echo')
          .set('x-api-key', validApiKey)
          .set('Content-Type', 'multipart/form-data')
          .send('test=data')
          .expect(200);

        expect(response.body).toEqual('');
      });

      it('should handle malformed Content-Type header', async () => {
        const response = await request(app)
          .post('/echo')
          .set('x-api-key', validApiKey)
          .set('Content-Type', 'application/json; charset=utf-8; invalid')
          .send('{"test": "data"}')
          .expect(200);

        expect(response.body).toEqual('');
      });
    });

    describe('Request Body Edge Cases', () => {
      it('should handle null request body', async () => {
        const response = await request(app)
          .post('/echo')
          .set('x-api-key', validApiKey)
          .set('Content-Type', 'application/json')
          .send(null)
          .expect(400);

        expect(response.body).toEqual({});
      });

      it('should handle undefined request body', async () => {
        const response = await request(app)
          .post('/echo')
          .set('x-api-key', validApiKey)
          .set('Content-Type', 'application/json')
          .send(undefined)
          .expect(200);

        expect(response.body).toEqual({});
      });

      it('should handle empty string body', async () => {
        const response = await request(app)
          .post('/echo')
          .set('x-api-key', validApiKey)
          .set('Content-Type', 'application/json')
          .send('')
          .expect(200);

        expect(response.body).toEqual({});
      });

      it('should handle whitespace-only body', async () => {
        const response = await request(app)
          .post('/echo')
          .set('x-api-key', validApiKey)
          .set('Content-Type', 'application/json')
          .send('   ')
          .expect(400);

        expect(response.body).toEqual({});
      });

      it('should handle JSON with trailing comma', async () => {
        const response = await request(app)
          .post('/echo')
          .set('x-api-key', validApiKey)
          .set('Content-Type', 'application/json')
          .send('{"test": "data",}')
          .expect(400);

        expect(response.body).toEqual({});
      });

      it('should handle JSON with unclosed quotes', async () => {
        const response = await request(app)
          .post('/echo')
          .set('x-api-key', validApiKey)
          .set('Content-Type', 'application/json')
          .send('{"test": "data}')
          .expect(400);

        expect(response.body).toEqual({});
      });

      it('should handle JSON with unclosed brackets', async () => {
        const response = await request(app)
          .post('/echo')
          .set('x-api-key', validApiKey)
          .set('Content-Type', 'application/json')
          .send('{"test": "data"')
          .expect(400);

        expect(response.body).toEqual({});
      });

      it('should handle moderately large JSON payload', async () => {
        const largePayload = { data: 'x'.repeat(100000) };
        const response = await request(app)
          .post('/echo')
          .set('x-api-key', validApiKey)
          .set('Content-Type', 'application/json')
          .send(largePayload)
          .expect(200);

        expect(response.body).toEqual(largePayload);
      });

      it('should handle deeply nested JSON objects', async () => {
        const nestedObject = {
          level1: {
            level2: {
              level3: {
                level4: {
                  level5: {
                    value: 'deep',
                  },
                },
              },
            },
          },
        };

        const response = await request(app)
          .post('/echo')
          .set('x-api-key', validApiKey)
          .set('Content-Type', 'application/json')
          .send(nestedObject)
          .expect(200);

        expect(response.body).toEqual(nestedObject);
      });
    });

    describe('Special Characters and Encoding', () => {
      it('should handle Unicode characters in JSON', async () => {
        const unicodeData = {
          emoji: '🚀',
          chinese: '你好世界',
          arabic: 'مرحبا بالعالم',
          russian: 'Привет мир',
        };

        const response = await request(app)
          .post('/echo')
          .set('x-api-key', validApiKey)
          .set('Content-Type', 'application/json')
          .send(unicodeData)
          .expect(200);

        expect(response.body).toEqual(unicodeData);
      });

      it('should handle special characters in JSON keys', async () => {
        const specialKeyData = {
          'key-with-dashes': 'value1',
          key_with_underscores: 'value2',
          keyWithCamelCase: 'value3',
          'key with spaces': 'value4',
          'key.with.dots': 'value5',
        };

        const response = await request(app)
          .post('/echo')
          .set('x-api-key', validApiKey)
          .set('Content-Type', 'application/json')
          .send(specialKeyData)
          .expect(200);

        expect(response.body).toEqual(specialKeyData);
      });

      it('should handle escape sequences in JSON', async () => {
        const escapeData = {
          newline: 'line1\nline2',
          tab: 'col1\tcol2',
          quote: 'He said "Hello"',
          backslash: 'path\\to\\file',
          unicode: '\\u0048\\u0065\\u006C\\u006C\\u006F',
        };

        const response = await request(app)
          .post('/echo')
          .set('x-api-key', validApiKey)
          .set('Content-Type', 'application/json')
          .send(escapeData)
          .expect(200);

        expect(response.body).toEqual(escapeData);
      });
    });

    describe('Data Type Edge Cases', () => {
      it('should handle null values in JSON', async () => {
        const nullData = {
          nullValue: null,
          stringValue: 'test',
          numberValue: 42,
        };

        const response = await request(app)
          .post('/echo')
          .set('x-api-key', validApiKey)
          .set('Content-Type', 'application/json')
          .send(nullData)
          .expect(200);

        expect(response.body).toEqual(nullData);
      });

      it('should handle undefined values in JSON (should be converted to null)', async () => {
        const undefinedData = {
          undefinedValue: undefined,
          stringValue: 'test',
        };

        const response = await request(app)
          .post('/echo')
          .set('x-api-key', validApiKey)
          .set('Content-Type', 'application/json')
          .send(undefinedData)
          .expect(200);

        expect(response.body.undefinedValue).toBeUndefined();
        expect(response.body.stringValue).toBe('test');
      });

      it('should handle very large numbers', async () => {
        const largeNumberData = {
          maxSafeInteger: Number.MAX_SAFE_INTEGER,
          minSafeInteger: Number.MIN_SAFE_INTEGER,
          infinity: Infinity,
          negativeInfinity: -Infinity,
          nan: NaN,
        };

        const response = await request(app)
          .post('/echo')
          .set('x-api-key', validApiKey)
          .set('Content-Type', 'application/json')
          .send(largeNumberData)
          .expect(200);

        expect(response.body.maxSafeInteger).toBe(Number.MAX_SAFE_INTEGER);
        expect(response.body.minSafeInteger).toBe(Number.MIN_SAFE_INTEGER);
        expect(response.body.infinity).toBeNull();
        expect(response.body.negativeInfinity).toBeNull();
        expect(response.body.nan).toBeNull();
      });

      it('should handle boolean values', async () => {
        const booleanData = {
          trueValue: true,
          falseValue: false,
        };

        const response = await request(app)
          .post('/echo')
          .set('x-api-key', validApiKey)
          .set('Content-Type', 'application/json')
          .send(booleanData)
          .expect(200);

        expect(response.body).toEqual(booleanData);
      });

      it('should handle empty arrays and objects', async () => {
        const emptyData = {
          emptyArray: [],
          emptyObject: {},
          nestedEmpty: { arr: [], obj: {} },
        };

        const response = await request(app)
          .post('/echo')
          .set('x-api-key', validApiKey)
          .set('Content-Type', 'application/json')
          .send(emptyData)
          .expect(200);

        expect(response.body).toEqual(emptyData);
      });
    });

    describe('Header Edge Cases', () => {
      it('should handle duplicate x-api-key headers', async () => {
        const response = await request(app)
          .get('/')
          .set('x-api-key', validApiKey)
          .set('x-api-key', 'another-key')
          .expect(401);

        expect(response.body).toEqual({
          error: 'Invalid API key',
          message: 'The provided API key is not valid',
        });
      });

      it('should handle case-insensitive header names', async () => {
        const response = await request(app)
          .get('/')
          .set('X-API-KEY', validApiKey)
          .expect(200);

        expect(response.body).toEqual({
          message: 'Echo server is running!',
          endpoints: ['POST /echo'],
        });
      });

      it('should handle extra whitespace in header values', async () => {
        const response = await request(app)
          .get('/')
          .set('x-api-key', `  ${validApiKey}  `)
          .expect(200);

        expect(response.body).toEqual({
          message: 'Echo server is running!',
          endpoints: ['POST /echo'],
        });
      });

      it('should handle malformed headers', async () => {
        const response = await request(app)
          .get('/')
          .set('x-api-key', validApiKey)
          .set('Content-Type', 'application/json; charset=utf-8; invalid-param')
          .expect(200);

        expect(response.body).toEqual({
          message: 'Echo server is running!',
          endpoints: ['POST /echo'],
        });
      });
    });

    describe('URL and Query Parameter Edge Cases', () => {
      it('should handle URLs with query parameters', async () => {
        const response = await request(app)
          .get('/?param1=value1&param2=value2')
          .set('x-api-key', validApiKey)
          .expect(200);

        expect(response.body).toEqual({
          message: 'Echo server is running!',
          endpoints: ['POST /echo'],
        });
      });

      it('should handle URLs with special characters', async () => {
        await request(app)
          .get('/test%20path?param=%26value')
          .set('x-api-key', validApiKey)
          .expect(404);
      });

      it('should handle very long URLs', async () => {
        const longPath = '/'.repeat(1000);
        await request(app)
          .get(longPath)
          .set('x-api-key', validApiKey)
          .expect(404);
      });

      it('should handle URLs with Unicode characters', async () => {
        await request(app)
          .get('/test/🚀/path')
          .set('x-api-key', validApiKey)
          .expect(404);
      });
    });

    describe('Rate Limiting and Performance', () => {
      it('should handle multiple rapid requests', async () => {
        const promises = Array.from({ length: 10 }, () =>
          request(app).get('/').set('x-api-key', validApiKey).expect(200),
        );

        const responses = await Promise.all(promises);
        responses.forEach((response) => {
          expect(response.body).toEqual({
            message: 'Echo server is running!',
            endpoints: ['POST /echo'],
          });
        });
      });

      it('should handle concurrent POST requests', async () => {
        const testData = { message: 'concurrent test' };
        const promises = Array.from({ length: 5 }, () =>
          request(app)
            .post('/echo')
            .set('x-api-key', validApiKey)
            .set('Content-Type', 'application/json')
            .send(testData)
            .expect(200),
        );

        const responses = await Promise.all(promises);
        responses.forEach((response) => {
          expect(response.body).toEqual(testData);
        });
      });
    });

    describe('Additional Edge Cases', () => {
      describe('Request Size and Payload Validation', () => {
        it('should handle zero Content-Length', async () => {
          const response = await request(app)
            .post('/echo')
            .set('x-api-key', validApiKey)
            .set('Content-Type', 'application/json')
            .set('Content-Length', '0')
            .send('')
            .expect(200);

          expect(response.body).toEqual({});
        });
      });

      describe('Common HTTP Headers', () => {
        it('should handle User-Agent header', async () => {
          const response = await request(app)
            .get('/')
            .set('x-api-key', validApiKey)
            .set('User-Agent', 'Mozilla/5.0 (Test Browser)')
            .expect(200);

          expect(response.body).toEqual({
            message: 'Echo server is running!',
            endpoints: ['POST /echo'],
          });
        });

        it('should handle Accept header', async () => {
          const response = await request(app)
            .get('/')
            .set('x-api-key', validApiKey)
            .set('Accept', 'application/json, text/plain, */*')
            .expect(200);

          expect(response.body).toEqual({
            message: 'Echo server is running!',
            endpoints: ['POST /echo'],
          });
        });

        it('should handle Authorization header (should not interfere with x-api-key)', async () => {
          const response = await request(app)
            .get('/')
            .set('x-api-key', validApiKey)
            .set('Authorization', 'Bearer some-token')
            .expect(200);

          expect(response.body).toEqual({
            message: 'Echo server is running!',
            endpoints: ['POST /echo'],
          });
        });

        it('should handle X-Forwarded-For header', async () => {
          const response = await request(app)
            .get('/')
            .set('x-api-key', validApiKey)
            .set('X-Forwarded-For', '192.168.1.1, 10.0.0.1')
            .expect(200);

          expect(response.body).toEqual({
            message: 'Echo server is running!',
            endpoints: ['POST /echo'],
          });
        });
      });

      describe('Additional Malformed JSON Patterns', () => {
        it('should handle JSON with undefined as string', async () => {
          const response = await request(app)
            .post('/echo')
            .set('x-api-key', validApiKey)
            .set('Content-Type', 'application/json')
            .send('{"test": "undefined"}')
            .expect(200);

          expect(response.body).toEqual({ test: 'undefined' });
        });

        it('should handle JSON with function-like strings', async () => {
          const response = await request(app)
            .post('/echo')
            .set('x-api-key', validApiKey)
            .set('Content-Type', 'application/json')
            .send('{"test": "function() { return true; }"}')
            .expect(200);

          expect(response.body).toEqual({
            test: 'function() { return true; }',
          });
        });

        it('should handle JSON with HTML-like content', async () => {
          const response = await request(app)
            .post('/echo')
            .set('x-api-key', validApiKey)
            .set('Content-Type', 'application/json')
            .send('{"html": "<script>alert(\'test\')</script>"}')
            .expect(200);

          expect(response.body).toEqual({
            html: "<script>alert('test')</script>",
          });
        });
      });

      describe('Buffer and Binary Data', () => {
        it('should handle Buffer data in JSON', async () => {
          const bufferData = Buffer.from('test data');
          const response = await request(app)
            .post('/echo')
            .set('x-api-key', validApiKey)
            .set('Content-Type', 'application/json')
            .send({ buffer: bufferData })
            .expect(200);

          // Buffer gets serialized as an object with type and data
          expect(response.body).toHaveProperty('buffer');
        });

        it('should handle base64 encoded data', async () => {
          const base64Data = Buffer.from('test data').toString('base64');
          const response = await request(app)
            .post('/echo')
            .set('x-api-key', validApiKey)
            .set('Content-Type', 'application/json')
            .send({ encoded: base64Data })
            .expect(200);

          expect(response.body).toEqual({ encoded: base64Data });
        });
      });

      describe('CORS and Preflight Requests', () => {
        it('should handle OPTIONS request (preflight)', async () => {
          const response = await request(app)
            .options('/echo')
            .set('x-api-key', validApiKey)
            .set('Origin', 'https://example.com')
            .set('Access-Control-Request-Method', 'POST')
            .set('Access-Control-Request-Headers', 'content-type')
            .expect(200); // Express handles OPTIONS requests

          expect(response.body).toEqual({});
        });

        it('should handle Origin header', async () => {
          const response = await request(app)
            .get('/')
            .set('x-api-key', validApiKey)
            .set('Origin', 'https://example.com')
            .expect(200);

          expect(response.body).toEqual({
            message: 'Echo server is running!',
            endpoints: ['POST /echo'],
          });
        });
      });

      describe('Request Method Edge Cases', () => {
        it('should handle HEAD request', async () => {
          const response = await request(app)
            .head('/')
            .set('x-api-key', validApiKey)
            .expect(200); // Express handles HEAD requests

          expect(response.body).toEqual({});
        });

        it('should handle TRACE request', async () => {
          const response = await request(app)
            .trace('/')
            .set('x-api-key', validApiKey)
            .expect(404); // No TRACE handler defined

          expect(response.body).toEqual({});
        });
      });

      describe('Query Parameter Edge Cases', () => {
        it('should handle empty query parameters', async () => {
          const response = await request(app)
            .get('/?')
            .set('x-api-key', validApiKey)
            .expect(200);

          expect(response.body).toEqual({
            message: 'Echo server is running!',
            endpoints: ['POST /echo'],
          });
        });

        it('should handle duplicate query parameters', async () => {
          const response = await request(app)
            .get('/?param=value1&param=value2')
            .set('x-api-key', validApiKey)
            .expect(200);

          expect(response.body).toEqual({
            message: 'Echo server is running!',
            endpoints: ['POST /echo'],
          });
        });

        it('should handle query parameters with special characters', async () => {
          const response = await request(app)
            .get('/?param=%20%26%3D%2B')
            .set('x-api-key', validApiKey)
            .expect(200);

          expect(response.body).toEqual({
            message: 'Echo server is running!',
            endpoints: ['POST /echo'],
          });
        });
      });

      describe('Response Header Validation', () => {
        it('should return correct response headers for GET', async () => {
          const response = await request(app)
            .get('/')
            .set('x-api-key', validApiKey)
            .expect(200);

          expect(response.headers['content-type']).toMatch(/application\/json/);
          expect(response.headers['content-length']).toBeDefined();
        });

        it('should return correct response headers for POST', async () => {
          const response = await request(app)
            .post('/echo')
            .set('x-api-key', validApiKey)
            .set('Content-Type', 'application/json')
            .send({ test: 'data' })
            .expect(200);

          expect(response.headers['content-type']).toMatch(/application\/json/);
          expect(response.headers['content-length']).toBeDefined();
        });
      });

      describe('Memory and Performance Edge Cases', () => {
        it('should handle rapid successive requests without memory leaks', async () => {
          const promises = Array.from({ length: 50 }, (_, i) =>
            request(app)
              .post('/echo')
              .set('x-api-key', validApiKey)
              .set('Content-Type', 'application/json')
              .send({ requestId: i, data: 'test' })
              .expect(200),
          );

          const responses = await Promise.all(promises);
          responses.forEach((response, i) => {
            expect(response.body).toEqual({ requestId: i, data: 'test' });
          });
        });

        it('should handle requests with large number of headers', async () => {
          const headers: Record<string, string> = { 'x-api-key': validApiKey };
          for (let i = 0; i < 20; i++) {
            headers[`x-custom-header-${i}`] = `value-${i}`;
          }

          const response = await request(app).get('/').set(headers).expect(200);

          expect(response.body).toEqual({
            message: 'Echo server is running!',
            endpoints: ['POST /echo'],
          });
        });
      });
    });
  });
});
