// api/index.js
const express = require('express');
const kafka = require('../config/kafka');
// 1. Import the Prometheus client
const client = require('prom-client'); 

const app = express();
app.use(express.json());

// 2. Enable default metrics collection (CPU, Memory, Event Loop)
// This automatically gathers system-level metrics every 10 seconds
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

const producer = kafka.producer();

async function startServer() {
  await producer.connect();
  console.log('Kafka Producer connected');

  // 3. Expose the /metrics route for Prometheus to scrape
  app.get('/metrics', async (req, res) => {
    res.setHeader('Content-Type', client.register.contentType);
    // Send the gathered metrics formatted for Prometheus
    res.send(await client.register.metrics()); 
  });

  app.post('/api/v1/notify', async (req, res) => {
    try {
      const payload = req.body;
      let notificationsToSend = [];

      // 1. Check if this is an Alertmanager Webhook
      if (payload.alerts && Array.isArray(payload.alerts)) {
        console.log(`🚨 [Alertmanager] Received ${payload.alerts.length} alerts.`);
        
        payload.alerts.forEach(alert => {
          // Only process 'firing' alerts (ignore 'resolved' for now to avoid spam)
          if (alert.status === 'firing') {
            notificationsToSend.push({
              // Route critical alerts to BOTH PagerDuty and Slack. Others just to Slack.
              channels: alert.labels.severity === 'critical' ? ['slack', 'incident'] : ['slack'],
              priority: alert.labels.severity || 'high',
              payload: {
                title: `🔥 SLA BREACH: ${alert.annotations.summary || alert.labels.alertname}`,
                body: `${alert.annotations.description || 'No description provided.'}\n\n*Severity:* ${alert.labels.severity}`
              }
            });
          }
        });
      } else {
        // 2. Standard direct notification request
        notificationsToSend.push(payload);
      }

      // 3. Send all formatted notifications to the Kafka topic
      for (const msg of notificationsToSend) {
        await producer.send({
          topic: 'notifications',
          messages: [{ value: JSON.stringify(msg) }],
        });
      }

      res.status(202).json({ status: 'success', message: `Queued ${notificationsToSend.length} notifications` });
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