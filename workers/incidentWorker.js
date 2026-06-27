require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const kafka = require('../config/kafka');

const consumer = kafka.consumer({ groupId: 'incident-consumers' });

async function startIncidentWorker() {
  await consumer.connect();
  console.log('Incident Worker connected to Kafka');
  await consumer.subscribe({ topic: 'notifications', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const data = JSON.parse(message.value.toString());

        // Only trigger for the 'incident' channel and high/critical priorities
        if (!data.channels || !data.channels.includes('incident')) return;
        if (data.priority !== 'critical' && data.priority !== 'high') {
            console.log('Incident skipped: Priority not high enough.');
            return;
        }

        console.log('\n Triggering PagerDuty Events API v2 Incident...');

        // Updated PagerDuty Events API v2 Payload
        const incidentPayload = {
          "routing_key": process.env.PAGERDUTY_ROUTING_KEY, // Note: Now uses routing_key
          "event_action": "trigger",                       // Mandatory for V2
          "payload": {
            "summary": `[${data.priority.toUpperCase()}] ${data.payload.title}`,
            "severity": data.priority === 'critical' ? 'critical' : 'warning',
            "source": "Alumni App Notification Microservice",
            "custom_details": {
              "body": data.payload.body,
              "target_users": data.recipients || "None specified"
            }
          }
        };

        const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
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