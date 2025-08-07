const express = require('express');
import type { Request, Response } from 'express';

const app = express();
const PORT = 3001;

interface Message {
  id: string;
  content: string;
  recipient: string;
  timestamp: Date;
}

interface AppWithMessages extends Express.Application {
  messages?: Map<string, Message[]>;
}

const messages: Map<string, Message[]> = new Map();

(app as AppWithMessages).messages = messages;

app.use(express.json());

const generateMessageId = (): string => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

app.post('/send', (req: Request, res: Response) => {
  try {
    const { recipient, message } = req.body;

    if (!recipient || typeof recipient !== 'string') {
      return res.status(400).json({
        error: 'Invalid recipient',
        message: 'Recipient is required and must be a string'
      });
    }

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Invalid message',
        message: 'Message is required and must be a string'
      });
    }

    const newMessage: Message = {
      id: generateMessageId(),
      content: message,
      recipient: recipient.toLowerCase(),
      timestamp: new Date()
    };

    if (!messages.has(newMessage.recipient)) {
      messages.set(newMessage.recipient, []);
    }
    messages.get(newMessage.recipient)!.push(newMessage);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        id: newMessage.id,
        recipient: newMessage.recipient,
        timestamp: newMessage.timestamp
      }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to send message'
    });
  }
});

app.get('/recv', (req: Request, res: Response) => {
  try {
    const { recipient } = req.query;

    if (!recipient) {
      return res.status(400).json({
        error: 'Invalid recipient',
        message: 'Recipient parameter is required'
      });
    }

    const recipientStr = String(recipient);
    if (recipientStr.trim() === '') {
      return res.status(400).json({
        error: 'Invalid recipient',
        message: 'Recipient parameter cannot be empty'
      });
    }

    const recipientKey = recipientStr.toLowerCase();
    const recipientMessages = messages.get(recipientKey) || [];

    if (recipientMessages.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No messages found for recipient',
        data: {
          recipient: recipientKey,
          messages: [],
          count: 0
        }
      });
    }

    const messagesToReturn = [...recipientMessages];
    messages.delete(recipientKey);

    res.status(200).json({
      success: true,
      message: 'Messages retrieved successfully',
      data: {
        recipient: recipientKey,
        messages: messagesToReturn.map(msg => ({
          id: msg.id,
          content: msg.content,
          timestamp: msg.timestamp
        })),
        count: messagesToReturn.length
      }
    });
  } catch (error) {
    console.error('Error retrieving messages:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve messages'
    });
  }
});

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    message: 'Message server is running',
    endpoints: ['POST /send', 'GET /recv'],
    totalRecipients: messages.size
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Message server is running on http://localhost:${PORT}`);
    console.log('Available endpoints:');
    console.log('  POST /send - Send a message to a recipient');
    console.log('  GET /recv - Retrieve messages for a recipient');
    console.log('  GET /health - Health check');
  });
}

module.exports = app; 