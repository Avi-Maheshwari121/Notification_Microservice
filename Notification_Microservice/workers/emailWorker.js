// workers/emailWorker.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const kafka = require('../config/kafka');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const consumer = kafka.consumer({ groupId: 'email-consumers' });

async function startEmailWorker() {
  await consumer.connect();
  console.log(' Email Worker connected to Kafka');
  await consumer.subscribe({ topic: 'notifications', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const data = JSON.parse(message.value.toString());

        if (!data.channels || !data.channels.includes('email')) return; 

        // Extract the recipients from the payload. 
        // We add a fallback just in case the array is missing.
        const targetEmails = data.recipients && data.recipients.length > 0 
            ? data.recipients 
            : ['delivered@resend.dev']; 

        console.log(`\nSending email to: ${targetEmails.join(', ')}`);
        
        // Pass the dynamic array to the 'to' field
        const response = await resend.emails.send({
          from: 'Acme Alumni <onboarding@resend.dev>', // Leave this as onboarding for now
          to: targetEmails, 
          subject: data.payload.title,
          html: `<p><strong>Alert Priority: ${data.priority}</strong></p><p>${data.payload.body}</p>`,
        });

        if (response.error) {
             console.error(' Resend API Error:', response.error);
        } else {
             console.log(` Email sent successfully! ID: ${response.data.id}`);
        }

      } catch (error) {
        console.error(' Email Worker Failed:', error.message);
      }
    },
  });
}

startEmailWorker().catch(console.error);