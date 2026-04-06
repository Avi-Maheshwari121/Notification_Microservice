// config/kafka.js
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'notification-service',
  // Use environment variable, fallback to localhost
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'] 
});

module.exports = kafka;