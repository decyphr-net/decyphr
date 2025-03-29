// import { Injectable, Logger } from '@nestjs/common';
// import { GroqProvider } from 'apps/ai-connector/src/providers/groq.provider';

// @Injectable()
// export class ChatService {
//   private readonly logger = new Logger(ChatService.name);

//   constructor(
//     private readonly groqProvider: GroqProvider,
//     private readonly kafkaService: KafkaService,
//   ) { }

//   async handleIncomingMessage(message: {
//     text: string;
//     sourceLang: string;
//     targetLang: string;
//     clientId: string;
//     conversationId: string;
//   }) {
//     const { translatedInput, translatedResponse, aiResponse } =
//       await this.groqProvider.translateAndTrack({
//         text: message.text,
//         sourceLang: message.sourceLang,
//         targetLang: message.targetLang,
//       });

//     // Emit translated input to Lexicon
//     await this.kafkaService.emit('lexicon.track', {
//       text: message.text,
//       translated: translatedInput,
//       lang: message.sourceLang,
//       type: 'user_message',
//       clientId: message.clientId,
//     });

//     // Emit AI response (translated) to Lexicon
//     await this.kafkaService.emit('lexicon.track', {
//       text: aiResponse,
//       translated: translatedResponse,
//       lang: message.targetLang,
//       type: 'ai_response',
//       clientId: message.clientId,
//     });

//     // Emit translated response back to chat topic for FE
//     await this.kafkaService.emit('chat.response', {
//       clientId: message.clientId,
//       conversationId: message.conversationId,
//       response: translatedResponse,
//     });
//   }
// }
