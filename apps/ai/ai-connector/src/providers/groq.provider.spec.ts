import { ChatGroq } from '@langchain/groq';
import { Test, TestingModule } from '@nestjs/testing';
import { z } from 'zod';
import { GroqProvider } from './groq.provider';

// Mock the ChatGroq class from LangChain
jest.mock('@langchain/groq', () => ({
  ChatGroq: jest.fn().mockImplementation(() => ({
    withStructuredOutput: jest.fn().mockReturnValue({
      invoke: jest.fn().mockResolvedValue({ success: true }),
    }),
  })),
}));

describe('GroqProvider', () => {
  let provider: GroqProvider;
  let mockChatGroq: ChatGroq;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GroqProvider],
    }).compile();

    provider = module.get<GroqProvider>(GroqProvider);
    mockChatGroq = new ChatGroq();
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('should initialize Groq LLM with environment variables', () => {
    expect(ChatGroq).toHaveBeenCalledWith({
      apiKey: process.env.GROQ_API_KEY,
      modelName: process.env.GROQ_MODEL_NAME,
      temperature: 0,
    });
  });

  it('should return a structured response when invoked successfully', async () => {
    const prompt = 'Translate this sentence';
    const responseSchema = z.object({
      translation: z.string(),
    });

    const response = await provider.getStructuredResponse(
      prompt,
      responseSchema,
    );
    expect(response).toEqual({ success: true });
  });

  it('should log an error and throw if LLM invocation fails', async () => {
    const prompt = 'Translate this sentence';
    const responseSchema = z.object({
      translation: z.string(),
    });

    // Mock the LLM invocation to throw an error
    mockChatGroq.withStructuredOutput = jest.fn().mockReturnValue({
      invoke: jest.fn().mockRejectedValue(new Error('LLM Error')),
    });

    await expect(
      provider.getStructuredResponse(prompt, responseSchema),
    ).rejects.toThrow('Error generating structured response');
  });
});
