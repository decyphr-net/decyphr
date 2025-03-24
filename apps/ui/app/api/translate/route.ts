import { Kafka } from 'kafkajs';
import { NextResponse } from 'next/server';

const kafka = new Kafka({
  clientId: process.env.KAFKA_GROUP_ID,
  brokers: [process.env.KAFKA_BROKER],
});

const producer = kafka.producer();

export async function POST(req) {
  try {
    const { text, sourceLang, targetLang, clientId } = await req.json();
    if (!text || !sourceLang || !targetLang) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await producer.connect();
    await producer.send({
      topic: 'translation.translate',
      messages: [{
        key: sourceLang + '-' + targetLang,
        value: JSON.stringify({ text, sourceLang, targetLang, clientId }),
      }],
    });
    await producer.disconnect();

    return NextResponse.json({ message: 'Translation request sent' }, { status: 200 });
  } catch (error) {
    console.error('Error sending Kafka message:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
