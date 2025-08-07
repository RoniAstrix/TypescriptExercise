const request = require('supertest');
const app = require('../messageServer');

interface Message {
  id: string;
  content: string;
  recipient: string;
  timestamp: Date;
}

interface AppWithMessages {
  messages?: Map<string, Message[]>;
}

describe('Message Server', () => {
  beforeEach(() => {
    const messages = (app as AppWithMessages).messages || new Map();
    messages.clear();
  });

  describe('POST /send', () => {
    it('should send a message successfully', async () => {
      const messageData = {
        recipient: 'alice',
        message: 'Hello, Alice!',
      };

      const response = await request(app)
        .post('/send')
        .send(messageData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        message: 'Message sent successfully',
        data: {
          id: expect.any(String),
          recipient: 'alice',
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle multiple messages for the same recipient', async () => {
      const messages = [
        { recipient: 'bob', message: 'First message' },
        { recipient: 'bob', message: 'Second message' },
        { recipient: 'bob', message: 'Third message' },
      ];

      for (const msg of messages) {
        await request(app).post('/send').send(msg).expect(201);
      }

      const response = await request(app)
        .get('/recv')
        .query({ recipient: 'bob' })
        .expect(200);

      expect(response.body.data.messages).toHaveLength(3);
      expect(response.body.data.count).toBe(3);
    });

    it('should handle case-insensitive recipients', async () => {
      await request(app)
        .post('/send')
        .send({ recipient: 'ALICE', message: 'Hello!' })
        .expect(201);

      const response = await request(app)
        .get('/recv')
        .query({ recipient: 'alice' })
        .expect(200);

      expect(response.body.data.messages).toHaveLength(1);
      expect(response.body.data.recipient).toBe('alice');
    });

    it('should return 400 when recipient is missing', async () => {
      const response = await request(app)
        .post('/send')
        .send({ message: 'Hello!' })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Invalid recipient',
        message: 'Recipient is required and must be a string',
      });
    });

    it('should return 400 when message is missing', async () => {
      const response = await request(app)
        .post('/send')
        .send({ recipient: 'alice' })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Invalid message',
        message: 'Message is required and must be a string',
      });
    });

    it('should return 400 when recipient is not a string', async () => {
      const response = await request(app)
        .post('/send')
        .send({ recipient: 123, message: 'Hello!' })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Invalid recipient',
        message: 'Recipient is required and must be a string',
      });
    });

    it('should return 400 when message is not a string', async () => {
      const response = await request(app)
        .post('/send')
        .send({ recipient: 'alice', message: 123 })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Invalid message',
        message: 'Message is required and must be a string',
      });
    });

    it('should return 400 when recipient is empty string', async () => {
      const response = await request(app)
        .post('/send')
        .send({ recipient: '', message: 'Hello!' })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Invalid recipient',
        message: 'Recipient is required and must be a string',
      });
    });

    it('should return 400 when message is empty string', async () => {
      const response = await request(app)
        .post('/send')
        .send({ recipient: 'alice', message: '' })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Invalid message',
        message: 'Message is required and must be a string',
      });
    });

    it('should handle special characters in message', async () => {
      const messageData = {
        recipient: 'test',
        message: 'Hello! 🎉 Special chars: @#$%^&*()_+-=[]{}|;:,.<>?',
      };

      await request(app).post('/send').send(messageData).expect(201);

      const response = await request(app)
        .get('/recv')
        .query({ recipient: 'test' })
        .expect(200);

      expect(response.body.data.messages[0].content).toBe(messageData.message);
    });

    it('should handle very long messages', async () => {
      const longMessage = 'A'.repeat(10000);
      const messageData = {
        recipient: 'test',
        message: longMessage,
      };

      await request(app).post('/send').send(messageData).expect(201);

      const response = await request(app)
        .get('/recv')
        .query({ recipient: 'test' })
        .expect(200);

      expect(response.body.data.messages[0].content).toBe(longMessage);
    });
  });

  describe('GET /recv', () => {
    it('should retrieve messages for a recipient', async () => {
      // Send a message first
      await request(app)
        .post('/send')
        .send({ recipient: 'charlie', message: 'Hello, Charlie!' })
        .expect(201);

      // Retrieve the message
      const response = await request(app)
        .get('/recv')
        .query({ recipient: 'charlie' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Messages retrieved successfully',
        data: {
          recipient: 'charlie',
          messages: [
            {
              id: expect.any(String),
              content: 'Hello, Charlie!',
              timestamp: expect.any(String),
            },
          ],
          count: 1,
        },
      });
    });

    it('should return empty array when no messages exist', async () => {
      const response = await request(app)
        .get('/recv')
        .query({ recipient: 'nonexistent' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'No messages found for recipient',
        data: {
          recipient: 'nonexistent',
          messages: [],
          count: 0,
        },
      });
    });

    it('should clear messages after retrieval', async () => {
      // Send a message
      await request(app)
        .post('/send')
        .send({ recipient: 'david', message: 'Test message' })
        .expect(201);

      // Retrieve the message
      await request(app).get('/recv').query({ recipient: 'david' }).expect(200);

      // Try to retrieve again - should be empty
      const response = await request(app)
        .get('/recv')
        .query({ recipient: 'david' })
        .expect(200);

      expect(response.body.data.messages).toHaveLength(0);
      expect(response.body.data.count).toBe(0);
    });

    it('should return 400 when recipient parameter is missing', async () => {
      const response = await request(app).get('/recv').expect(400);

      expect(response.body).toEqual({
        error: 'Invalid recipient',
        message: 'Recipient parameter is required',
      });
    });

    it('should handle numeric recipient parameter (converts to string)', async () => {
      const response = await request(app)
        .get('/recv')
        .query({ recipient: 123 })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'No messages found for recipient',
        data: {
          recipient: '123',
          messages: [],
          count: 0,
        },
      });
    });

    it('should return 400 when recipient parameter is empty string', async () => {
      const response = await request(app)
        .get('/recv')
        .query({ recipient: '' })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Invalid recipient',
        message: 'Recipient parameter is required',
      });
    });

    it('should handle case-insensitive recipient retrieval', async () => {
      await request(app)
        .post('/send')
        .send({ recipient: 'eve', message: 'Hello, Eve!' })
        .expect(201);

      const response = await request(app)
        .get('/recv')
        .query({ recipient: 'EVE' })
        .expect(200);

      expect(response.body.data.messages).toHaveLength(1);
      expect(response.body.data.recipient).toBe('eve');
    });

    it('should handle multiple recipients independently', async () => {
      await request(app)
        .post('/send')
        .send({ recipient: 'frank', message: 'Hello, Frank!' })
        .expect(201);

      await request(app)
        .post('/send')
        .send({ recipient: 'grace', message: 'Hello, Grace!' })
        .expect(201);

      const response = await request(app)
        .get('/recv')
        .query({ recipient: 'frank' })
        .expect(200);

      expect(response.body.data.messages).toHaveLength(1);
      expect(response.body.data.messages[0].content).toBe('Hello, Frank!');
      expect(response.body.data.recipient).toBe('frank');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body).toEqual({
        status: 'healthy',
        message: 'Message server is running',
        endpoints: ['POST /send', 'GET /recv'],
        totalRecipients: 0,
      });
    });

    it('should show correct recipient count', async () => {
      await request(app)
        .post('/send')
        .send({ recipient: 'alice', message: 'Hello' })
        .expect(201);

      await request(app)
        .post('/send')
        .send({ recipient: 'bob', message: 'Hello' })
        .expect(201);

      const response = await request(app).get('/health').expect(200);

      expect(response.body.totalRecipients).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent message sending', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post('/send')
          .send({ recipient: 'concurrent', message: `Message ${i}` })
          .expect(201),
      );

      await Promise.all(promises);

      const response = await request(app)
        .get('/recv')
        .query({ recipient: 'concurrent' })
        .expect(200);

      expect(response.body.data.messages).toHaveLength(10);
    });

    it('should handle concurrent message retrieval', async () => {
      await request(app)
        .post('/send')
        .send({ recipient: 'concurrent', message: 'Test message' })
        .expect(201);

      const promises = Array.from({ length: 5 }, () =>
        request(app)
          .get('/recv')
          .query({ recipient: 'concurrent' })
          .expect(200),
      );

      const responses = await Promise.all(promises);

      const messagesReceived = responses.filter((r) => r.body.data.count > 0);
      expect(messagesReceived).toHaveLength(1);
    });

    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/send')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.text).toContain('SyntaxError');
    });

    it('should handle missing Content-Type header', async () => {
      const response = await request(app)
        .post('/send')
        .send('{"recipient": "test", "message": "test"}')
        .expect(500);

      expect(response.body.error).toBeDefined();
    });
  });
});
