// workers/incidentWorker.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const kafka = require('../config/kafka');

const consumer = kafka.consumer({ groupId: 'incident-consumers' });

async function startIncidentWorker() {
  await consumer.connect();
  console.log(' Incident Worker connected to Kafka');
  await consumer.subscribe({ topic: 'notifications', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const data = JSON.parse(message.value.toString());

        // Only trigger for the 'incident' channel and high/critical priorities
        if (!data.channels || !data.channels.includes('incident')) return;
        if (data.priority !== 'critical' && data.priority !== 'high') {
            console.log(' Incident skipped: Priority not high enough.');
            return;
        }

        console.log('\n Triggering PagerDuty v1 Incident...');

        // Standard PagerDuty Events API v1 Payload
        const incidentPayload = {
          "service_key": process.env.INCIDENT_ROUTING_KEY, // Your v1 Integration Key
          "event_type": "trigger",
          "description": `[${data.priority.toUpperCase()}] ${data.payload.title}`,
          "details": {
            "body": data.payload.body,
            "source": "Alumni App Notification Microservice",
            "target_users": data.recipients || "None specified"
          }
        };

        const response = await fetch('https://events.pagerduty.com/generic/2010-04-15/create_event.json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(incidentPayload)
        });

        if (response.ok) {
            console.log(' PagerDuty incident triggered successfully!');
        } else {
            console.error(' PagerDuty API rejected the payload', await response.text());
        }
      } catch (error) {
        console.error(' Incident Worker Failed:', error);
      }
    },
  });
}

startIncidentWorker().catch(console.error);