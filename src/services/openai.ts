import OpenAI from 'openai';
import type { GenerationSettings, GenerationResponse, TokenData, ModelConfig } from '@/types';

export class OpenAIService {
  private client: OpenAI;
  private config: ModelConfig;

  constructor(config: ModelConfig) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.api_key || import.meta.env.VITE_OPENAI_API_KEY || '',
      baseURL: config.api_base,
      dangerouslyAllowBrowser: true, // Note: In production, use a backend proxy
    });
  }

  async generate(
    prompt: string,
    settings: GenerationSettings
  ): Promise<GenerationResponse> {
    const isChat = this.config.type === 'openai-chat';

    try {
      if (isChat) {
        return await this.generateChat(prompt, settings);
      } else {
        return await this.generateCompletion(prompt, settings);
      }
    } catch (error) {
      console.error('Generation error:', error);
      throw error;
    }
  }

  async generateStreaming(
    prompt: string,
    settings: GenerationSettings,
    onChunk: (completionIndex: number, text: string, done: boolean) => void
  ): Promise<void> {
    const isChat = this.config.type === 'openai-chat';

    try {
      // Generate each continuation sequentially with streaming
      for (let i = 0; i < settings.num_continuations; i++) {
        if (isChat) {
          await this.generateChatStreaming(prompt, settings, i, onChunk);
        } else {
          await this.generateCompletionStreaming(prompt, settings, i, onChunk);
        }
      }
    } catch (error) {
      console.error('Streaming generation error:', error);
      throw error;
    }
  }

  private async generateChatStreaming(
    prompt: string,
    settings: GenerationSettings,
    completionIndex: number,
    onChunk: (completionIndex: number, text: string, done: boolean) => void
  ): Promise<void> {
    const stream = await this.client.chat.completions.create({
      model: settings.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: settings.temperature,
      max_tokens: settings.response_length,
      top_p: settings.top_p,
      stop: settings.stop,
      stream: true,
    });

    let fullText = '';

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullText += delta;
        onChunk(completionIndex, fullText, false);
      }
    }

    // Signal completion
    onChunk(completionIndex, fullText, true);
  }

  private async generateCompletionStreaming(
    prompt: string,
    settings: GenerationSettings,
    completionIndex: number,
    onChunk: (completionIndex: number, text: string, done: boolean) => void
  ): Promise<void> {
    const stream = await this.client.completions.create({
      model: settings.model,
      prompt: prompt,
      temperature: settings.temperature,
      max_tokens: settings.response_length,
      top_p: settings.top_p,
      stop: settings.stop,
      logit_bias: settings.logit_bias,
      stream: true,
    });

    let fullText = '';

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.text;
      if (delta) {
        fullText += delta;
        onChunk(completionIndex, fullText, false);
      }
    }

    // Signal completion
    onChunk(completionIndex, fullText, true);
  }

  private async generateChat(
    prompt: string,
    settings: GenerationSettings
  ): Promise<GenerationResponse> {
    const response = await this.client.chat.completions.create({
      model: settings.model,
      messages: [{ role: 'assistant', content: prompt }],
      temperature: settings.temperature,
      max_tokens: settings.response_length,
      top_p: settings.top_p,
      n: settings.num_continuations,
      stop: settings.stop,
      logprobs: true,
      top_logprobs: Math.max(1, settings.logprobs), // Must be at least 1
    });

    return this.formatChatResponse(response, prompt);
  }

  private async generateCompletion(
    prompt: string,
    settings: GenerationSettings
  ): Promise<GenerationResponse> {
    const response = await this.client.completions.create({
      model: settings.model,
      prompt: prompt,
      temperature: settings.temperature,
      max_tokens: settings.response_length,
      top_p: settings.top_p,
      n: settings.num_continuations,
      stop: settings.stop,
      logprobs: settings.logprobs,
      echo: true,
      logit_bias: settings.logit_bias,
    });

    return this.formatCompletionResponse(response, prompt);
  }

  private formatChatResponse(
    response: OpenAI.Chat.Completions.ChatCompletion,
    prompt: string
  ): GenerationResponse {
    const completions = response.choices.map((choice) => {
      const tokens: TokenData[] = [];

      if (choice.logprobs?.content) {
        choice.logprobs.content.forEach((tokenData, i) => {
          tokens.push({
            generatedToken: {
              token: tokenData.token,
              logprob: tokenData.logprob,
            },
            position: i,
            counterfactuals: tokenData.top_logprobs?.reduce(
              (acc, top) => ({
                ...acc,
                [top.token]: top.logprob,
              }),
              {}
            ),
          });
        });
      }

      return {
        text: choice.message.content || '',
        tokens,
        finishReason: choice.finish_reason,
      };
    });

    return {
      completions,
      prompt: {
        text: prompt,
        tokens: null,
      },
      id: response.id,
      model: response.model,
      timestamp: Date.now(),
    };
  }

  private formatCompletionResponse(
    response: OpenAI.Completions.Completion,
    prompt: string
  ): GenerationResponse {
    const promptEndIndex = response.usage?.prompt_tokens || 0;

    const completions = response.choices.map((choice) => {
      const tokens: TokenData[] = [];
      const promptOffset = prompt.length;

      if (choice.logprobs?.tokens) {
        const tokensArray = choice.logprobs.tokens.slice(promptEndIndex);
        const logprobsArray = choice.logprobs.token_logprobs.slice(promptEndIndex);
        const topLogprobs = choice.logprobs.top_logprobs?.slice(promptEndIndex);

        tokensArray.forEach((token, i) => {
          tokens.push({
            generatedToken: {
              token,
              logprob: logprobsArray[i] || 0,
            },
            position: promptOffset + i,
            counterfactuals: topLogprobs?.[i] || undefined,
          });
        });
      }

      return {
        text: choice.text.substring(promptOffset),
        tokens,
        finishReason: choice.finish_reason || 'unknown',
      };
    });

    // Format prompt tokens
    const promptTokens: TokenData[] = [];
    const firstChoice = response.choices[0];
    if (firstChoice.logprobs?.tokens) {
      const tokensArray = firstChoice.logprobs.tokens.slice(0, promptEndIndex);
      const logprobsArray = firstChoice.logprobs.token_logprobs.slice(0, promptEndIndex);
      const topLogprobs = firstChoice.logprobs.top_logprobs?.slice(0, promptEndIndex);

      tokensArray.forEach((token, i) => {
        promptTokens.push({
          generatedToken: {
            token,
            logprob: logprobsArray[i] || 0,
          },
          position: i,
          counterfactuals: topLogprobs?.[i] || undefined,
        });
      });
    }

    return {
      completions,
      prompt: {
        text: prompt,
        tokens: promptTokens,
      },
      id: response.id,
      model: response.model,
      timestamp: Date.now(),
    };
  }
}
