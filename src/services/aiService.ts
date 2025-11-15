import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { ollama } from 'ollama-ai-provider';
import { streamText } from 'ai';
import type { GenerationSettings, ModelConfig } from '@/types';

export class AIService {
  private config: ModelConfig;

  constructor(config: ModelConfig) {
    this.config = config;
  }

  private getModel(modelName: string): any {
    switch (this.config.provider) {
      case 'openai': {
        const openai = createOpenAI({
          apiKey: this.config.api_key || (import.meta as any).env?.VITE_OPENAI_API_KEY || '',
          baseURL: this.config.api_base,
        });
        return openai(modelName);
      }

      case 'anthropic': {
        const anthropic = createAnthropic({
          apiKey: this.config.api_key || (import.meta as any).env?.VITE_ANTHROPIC_API_KEY || '',
          baseURL: this.config.api_base,
        });
        return anthropic(modelName);
      }

      case 'ollama': {
        return ollama(modelName);
      }

      case 'custom': {
        // For custom providers, try OpenAI-compatible endpoint
        const customProvider = createOpenAI({
          apiKey: this.config.api_key || 'dummy-key',
          baseURL: this.config.api_base,
        });
        return customProvider(modelName);
      }

      default:
        throw new Error(`Provider não suportado: ${this.config.provider}`);
    }
  }

  async generateStreaming(
    prompt: string,
    settings: GenerationSettings,
    onChunk: (completionIndex: number, text: string, done: boolean) => void
  ): Promise<void> {
    try {
      // Generate each continuation sequentially with streaming
      for (let i = 0; i < settings.num_continuations; i++) {
        // Use completions API if configured, otherwise use chat API
        if (this.config.api_type === 'completions') {
          await this.generateCompletionStreaming(prompt, settings, i, onChunk);
        } else {
          await this.generateSingleStreaming(prompt, settings, i, onChunk);
        }
      }
    } catch (error) {
      console.error('Streaming generation error:', error);
      throw error;
    }
  }

  private async generateCompletionStreaming(
    prompt: string,
    settings: GenerationSettings,
    completionIndex: number,
    onChunk: (completionIndex: number, text: string, done: boolean) => void
  ): Promise<void> {
    // Build the full prompt with system prompt if configured
    let fullPrompt = prompt;
    if (this.config.system_prompt) {
      fullPrompt = this.config.system_prompt + '\n\n' + prompt;
    }

    // Determine the endpoint URL
    let baseURL = this.config.api_base;
    if (!baseURL) {
      if (this.config.provider === 'ollama') {
        baseURL = 'http://localhost:11434/v1';
      } else {
        baseURL = 'https://api.openai.com/v1';
      }
    }

    const url = `${baseURL}/completions`;

    // Prepare the request body
    const body = {
      model: settings.model,
      prompt: fullPrompt,
      temperature: settings.temperature,
      stream: true,
    };

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add API key if configured
    if (this.config.api_key) {
      headers['Authorization'] = `Bearer ${this.config.api_key}`;
    }

    // Make the streaming request
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Completions API error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let fullText = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const text = parsed.choices?.[0]?.text || '';
              if (text) {
                fullText += text;
                onChunk(completionIndex, fullText, false);
              }
            } catch (e) {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Signal completion
    onChunk(completionIndex, fullText, true);
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
    const model = this.getModel(settings.model);

    // Simplified parameters - only temperature
    const result = await streamText({
      model,
      messages,
      temperature: settings.temperature,
    });

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
