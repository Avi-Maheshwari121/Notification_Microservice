// workers/notificationWorker.js
const kafka = require('../config/kafka');

// Consumers need a groupId. If you spin up 5 workers with the same groupId,
// Kafka will automatically balance the load among them!
const consumer = kafka.consumer({ groupId: 'notification-group' });

// --- MOCK PLUG & PLAY SERVICES ---
// These represent the actual integration points (AWS SES, Slack API, etc.)
const services = {
  email: async (data) => {
    console.log(`📧 [EMAIL SERVICE] Sending email...`);
    console.log(`   -> Subject: ${data.payload.title}`);
    // Imagine calling AWS SES here
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network latency
  },
  slack: async (data) => {
    console.log(`💬 [SLACK SERVICE] Pinging channel...`);
    console.log(`   -> Message: ${data.payload.body}`);
    // Imagine hitting a Slack Webhook here
    await new Promise(resolve => setTimeout(resolve, 300));
  }
};

async function startWorker() {
  await consumer.connect();
  console.log('👷 Kafka Consumer Worker connected');

  // Subscribe to our topic. fromBeginning: true means if the worker was down, 
  // it will process missed messages when it boots up.
  await consumer.subscribe({ topic: 'notifications', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const notificationData = JSON.parse(message.value.toString());
        console.log('\n📥 Picked up new task from queue:');
        
        // The "Fan-out" Logic
        const deliveryPromises = [];

        if (notificationData.channels) {
           notificationData.channels.forEach(channel => {
               if (services[channel]) {
                   deliveryPromises.push(services[channel](notificationData));
               } else {
                   console.log(`⚠️ [WARNING] No service configured for channel: ${channel}`);
               }
           });
        }

        // Wait for all selected services to finish sending
        await Promise.all(deliveryPromises);
        console.log('✅ Task successfully processed.');

      } catch (error) {
        console.error('❌ Failed to process message', error);
      }
    },
  });
}

startWorker().catch(console.error);