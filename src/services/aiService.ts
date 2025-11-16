import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { ollama } from 'ollama-ai-provider';
import { streamText } from 'ai';
import type { GenerationSettings, ModelConfig } from '@/types';

export class AIService {
  private config: ModelConfig;
  private globalApiKeys: { openai: string; anthropic: string };

  constructor(config: ModelConfig, globalApiKeys: { openai: string; anthropic: string }) {
    this.config = config;
    this.globalApiKeys = globalApiKeys;
  }

  private getModel(modelName: string): any {
    switch (this.config.provider) {
      case 'openai': {
        const openai = createOpenAI({
          apiKey: this.config.api_key || this.globalApiKeys.openai || '',
          baseURL: this.config.api_base,
        });
        return openai(modelName);
      }

      case 'anthropic': {
        const anthropic = createAnthropic({
          apiKey: this.config.api_key || this.globalApiKeys.anthropic || '',
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
        throw new Error(`Unsupported provider: ${this.config.provider}`);
    }
  }

  async generateCompletions(
    prompt: string,
    settings: GenerationSettings
  ): Promise<string[]> {
    try {
      const results: string[] = [];

      // Generate each continuation sequentially
      for (let i = 0; i < settings.num_continuations; i++) {
        // Use completions API if configured, otherwise use chat API
        if (this.config.api_type === 'completions') {
          const text = await this.generateCompletion(prompt, settings);
          results.push(text);
        } else {
          const text = await this.generateSingle(prompt, settings);
          results.push(text);
        }
      }

      return results;
    } catch (error) {
      console.error('Generation error:', error);
      throw error;
    }
  }

  private async generateCompletion(
    prompt: string,
    settings: GenerationSettings
  ): Promise<string> {
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
      stream: false,
    };

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add API key - use model-specific key or global key
    const apiKey = this.config.api_key ||
      (this.config.provider === 'openai' ? this.globalApiKeys.openai :
       this.config.provider === 'anthropic' ? this.globalApiKeys.anthropic : '');

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // Make the request
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Completions API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.text || '';
  }

  private async generateSingle(
    prompt: string,
    settings: GenerationSettings
  ): Promise<string> {
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

    // Collect the full response
    for await (const textPart of result.textStream) {
      fullText += textPart;
    }

    return fullText;
  }
}
