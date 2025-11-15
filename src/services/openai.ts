import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import type { GenerationSettings, ModelConfig } from '@/types';

export class OpenAIService {
  private provider: ReturnType<typeof createOpenAI>;
  private config: ModelConfig;

  constructor(config: ModelConfig) {
    this.config = config;

    this.provider = createOpenAI({
      apiKey: config.api_key || (import.meta as any).env?.VITE_OPENAI_API_KEY || '',
      baseURL: config.api_base,
    });
  }

  async generateStreaming(
    prompt: string,
    settings: GenerationSettings,
    onChunk: (completionIndex: number, text: string, done: boolean) => void
  ): Promise<void> {
    try {
      // Generate each continuation sequentially with streaming
      for (let i = 0; i < settings.num_continuations; i++) {
        await this.generateSingleStreaming(prompt, settings, i, onChunk);
      }
    } catch (error) {
      console.error('Streaming generation error:', error);
      throw error;
    }
  }

  private async generateSingleStreaming(
    prompt: string,
    settings: GenerationSettings,
    completionIndex: number,
    onChunk: (completionIndex: number, text: string, done: boolean) => void
  ): Promise<void> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    // Add system prompt if configured
    if (this.config.system_prompt) {
      messages.push({ role: 'system', content: this.config.system_prompt });
    }

    messages.push({ role: 'user', content: prompt });

    // Get the model instance
    const model = this.provider(settings.model);

    // Build request parameters
    const requestParams: any = {
      model,
      messages,
      temperature: settings.temperature,
      topP: settings.top_p,
      ...(settings.stop && settings.stop.length > 0 && { stopSequences: settings.stop }),
    };

    // Use maxCompletionTokens or maxTokens based on configuration
    if (this.config.use_max_completion_tokens) {
      requestParams.maxCompletionTokens = settings.response_length;
    } else {
      requestParams.maxTokens = settings.response_length;
    }

    const result = await streamText(requestParams);

    let fullText = '';

    // Stream the response
    for await (const textPart of result.textStream) {
      fullText += textPart;
      onChunk(completionIndex, fullText, false);
    }

    // Signal completion
    onChunk(completionIndex, fullText, true);
  }
}
