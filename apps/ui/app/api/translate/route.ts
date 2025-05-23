import { Kafka } from 'kafkajs';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const kafka = new Kafka({
  clientId: process.env.KAFKA_GROUP_ID!,
  brokers: [process.env.KAFKA_BROKER!],
});

const producer = kafka.producer();

type TranslationRequestPayload = {
  text: string;
  sourceLang: string;
  targetLang: string;
  clientId?: string;
};

/**
 * POST /api/translate
 *
 * Accepts a translation request and emits it to the Kafka topic "translation.translate".
 *
 * Request body:
 * {
 *   text: string;
 *   sourceLang: string;
 *   targetLang: string;
 *   clientId?: string;
 * }
 *
 * Responses:
 * - 200: Message successfully sent to Kafka
 * - 400: Missing required fields
 * - 500: Internal server error
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TranslationRequestPayload;
    const { text, sourceLang, targetLang, clientId } = body;

    if (!text || !sourceLang || !targetLang) {
      console.warn(`[translate] Missing fields in request body:`, body);
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await producer.connect();
    console.log(`[translate] Connected to Kafka`);

    const message = {
      topic: 'translation.translate',
      messages: [
        {
          key: `${sourceLang}-${targetLang}`,
          value: JSON.stringify({ text, sourceLang, targetLang, clientId }),
        },
      ],
    };

    await producer.send(message);
    console.info(`[translate] Sent translation request for client ${clientId || 'unknown'}`);

    await producer.disconnect();
    console.log(`[translate] Disconnected from Kafka`);

    return NextResponse.json({ message: 'Translation request sent' }, { status: 200 });
  } catch (error: any) {
    console.error('[translate] Error sending Kafka message:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
