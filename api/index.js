// api/index.js
const express = require('express');
const kafka = require('../config/kafka');

const app = express();
app.use(express.json());

const producer = kafka.producer();

async function startServer() {
  // Connect the producer to our Kafka broker
  await producer.connect();
  console.log('Kafka Producer connected');

  app.post('/api/v1/notify', async (req, res) => {
    try {
      const notificationData = req.body;

      // Send the payload to a Kafka topic named "notifications"
      await producer.send({
        topic: 'notifications',
        messages: [
          { 
            value: JSON.stringify(notificationData) 
          },
        ],
      });

      // Respond immediately (Async magic!)
      res.status(202).json({ 
        status: 'success', 
        message: 'Notification queued for delivery' 
      });

    } catch (error) {
      console.error('Failed to queue notification', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.listen(3000, () => {
    console.log('🚀 SHIM Layer API running on http://localhost:3000');
  });
}

startServer().catch(console.error);