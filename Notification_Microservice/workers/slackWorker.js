// workers/slackWorker.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const kafka = require('../config/kafka');

// Different Group ID so it gets its own copy of the message!
const consumer = kafka.consumer({ groupId: 'slack-consumers' });

async function startSlackWorker() {
  await consumer.connect();
  console.log(' Slack Worker connected to Kafka');
  await consumer.subscribe({ topic: 'notifications', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const data = JSON.parse(message.value.toString());

        // Check if this message is meant for Slack
        if (!data.channels || !data.channels.includes('slack')) {
            return; 
        }

        console.log('\n Processing Slack Task...');

        // Format the message using Slack's Block Kit for a professional look
        const slackPayload = {
          blocks: [
            {
              type: "header",
              text: { type: "plain_text", text: ` ${data.payload.title}` }
            },
            {
              type: "section",
              text: { type: "mrkdwn", text: `*Priority:* ${data.priority.toUpperCase()}\n${data.payload.body}` }
            }
          ]
        };

        const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slackPayload)
        });

        if (response.ok) {
            console.log(' Slack message dropped successfully!');
        } else {
            console.error(' Slack API rejected the payload', await response.text());
        }

      } catch (error) {
        console.error(' Slack Worker Failed:', error);
      }
    },
  });
}

startSlackWorker().catch(console.error);