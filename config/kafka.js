// config/kafka.js
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: ['localhost:9092'] // This points to our Docker container
});

module.exports = kafka;