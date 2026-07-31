// src/modules/ai/gemini.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

interface GeminiRequest {
  contents: Array<{
    parts: Array<{
      text?: string;
      inlineData?: {
        mimeType: string;
        data: string; // base64 encoded image
      };
    }>;
  }>;
  generationConfig?: {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
  };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      role?: string;
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
    index?: number;
  }>;
  error?: {
    message: string;
    code: number;
    status?: string;
    details?: Array<{
      '@type'?: string;
      retryDelay?: string | { seconds?: number };
      [key: string]: any;
    }>;
  };
  usageMetadata?: {
    promptTokenCount?: number;
    totalTokenCount?: number;
    promptTokensDetails?: Array<{
      modality?: string;
      tokenCount?: number;
    }>;
    thoughtsTokenCount?: number;
  };
  modelVersion?: string;
  responseId?: string;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey: string;
  private readonly baseURL = 'https://generativelanguage.googleapis.com/v1beta';
  private readonly axiosInstance: AxiosInstance;
  private cachedModelName: string | null = null;

  // Rate limiting: Free tier allows 2 requests per minute
  private readonly maxRequestsPerMinute = 2;
  private readonly requestWindowMs = 60000; // 1 minute
  private requestTimestamps: number[] = [];
  private requestQueue: Array<{
    resolve: (value: string) => void;
    reject: (error: Error) => void;
    prompt: string;
    options: { temperature?: number; maxTokens?: number; maxRetries?: number };
  }> = [];
  private isProcessingQueue = false;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    if (!this.apiKey) {
      this.logger.warn('GEMINI_API_KEY not found in environment variables');
    }

    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Wait for rate limit before making request
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();

    // Remove timestamps older than 1 minute
    this.requestTimestamps = this.requestTimestamps.filter(
      (timestamp) => now - timestamp < this.requestWindowMs,
    );

    // Never hold an API request open while waiting for free-tier quota. Callers
    // can immediately use their local fallback instead.
    if (this.requestTimestamps.length >= this.maxRequestsPerMinute) {
      throw new Error('AI_RATE_LIMITED: use local fallback');
    }

    // Record this request
    this.requestTimestamps.push(Date.now());
  }

  /**
   * Process the request queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (!request) break;

      try {
        await this.waitForRateLimit();
        const result = await this.makeApiRequest(
          request.prompt,
          request.options,
        );
        request.resolve(result);
      } catch (error) {
        request.reject(
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Get available Gemini model name
   */
  private async getAvailableModel(): Promise<string> {
    if (this.cachedModelName) {
      return this.cachedModelName;
    }

    try {
      const response = await this.axiosInstance.get(
        `${this.baseURL}/models?key=${this.apiKey}`,
      );

      if (response.status === 200 && response.data.models) {
        const models = response.data.models as Array<{ name: string }>;
        // Prioritize Flash models (more generous free tier quotas)
        const preferredNames = [
          'gemini-3.1-flash-lite',
        ];

        for (const preferredName of preferredNames) {
          const model = models.find(
            (m) => (m.name.split('/').pop() || m.name) === preferredName,
          );
          if (model) {
            const modelName = model.name.split('/').pop() || model.name;
            this.cachedModelName = modelName;
            this.logger.log(`Using Gemini model: ${modelName}`);
            return modelName;
          }
        }

      }
    } catch (error) {
      this.logger.warn(
        `Failed to list Gemini models; using the configured fallback (${error instanceof Error ? error.message : 'unknown error'})`,
      );
    }

    this.cachedModelName = 'gemini-3.1-flash-lite';
    this.logger.log('Using fallback model: gemini-3.1-flash-lite');
    return 'gemini-3.1-flash-lite';
  }

  /**
   * Make the actual API request (internal method)
   */
  private async makeApiRequest(
    prompt: string,
    options: {
      temperature?: number;
      maxTokens?: number;
      maxRetries?: number;
    } = {},
  ): Promise<string> {
    let { temperature = 0.7, maxTokens = 1000, maxRetries = 3 } = options;

    const modelName = await this.getAvailableModel();
    const url = `${this.baseURL}/models/${modelName}:generateContent?key=${this.apiKey}`;

    const requestBody: GeminiRequest = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    };

    // Log the prompt being sent
    this.logger.log(
      `📤 Sending prompt to Gemini API (${prompt.length} chars, maxTokens: ${maxTokens})`,
    );
    this.logger.debug(
      `📝 Prompt: ${prompt.substring(0, 500)}${prompt.length > 500 ? '...' : ''}`,
    );

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Small delay between retries
          const delay = Math.min(attempt * 1.0, 5.0) * 1000;
          this.logger.log(
            `Retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        const response = await this.axiosInstance.post<GeminiResponse>(
          url,
          requestBody,
        );

        // Log full response for debugging
        this.logger.log(`📥 API Response status: ${response.status}`);
        this.logger.log(
          `📥 API Response data keys: ${Object.keys(response.data || {}).join(', ')}`,
        );
        this.logger.debug(
          `📥 Full API Response: ${JSON.stringify(response.data, null, 2)}`,
        );

        if (response.data.error) {
          this.logger.error(
            `Gemini API error: ${JSON.stringify(response.data.error)}`,
          );
          throw new Error(
            `Gemini API error: ${response.data.error.message} (code: ${response.data.error.code})`,
          );
        }

        // Check for candidates
        if (
          !response.data.candidates ||
          response.data.candidates.length === 0
        ) {
          this.logger.error(
            `❌ No candidates in response: ${JSON.stringify(response.data, null, 2)}`,
          );
          throw new Error('No candidates in Gemini API response');
        }

        const candidate = response.data.candidates[0];

        // Log usage metadata if available
        if (response.data.usageMetadata) {
          const usage = response.data.usageMetadata;
          const outputTokens =
            (usage.totalTokenCount || 0) - (usage.promptTokenCount || 0);
          this.logger.log(
            `📊 Token usage: ${usage.promptTokenCount} prompt + ${outputTokens} output = ${usage.totalTokenCount} total`,
          );
          if (usage.thoughtsTokenCount) {
            const actualOutputTokens =
              outputTokens - (usage.thoughtsTokenCount || 0);
            this.logger.warn(
              `⚠️ Thoughts tokens used: ${usage.thoughtsTokenCount} (leaves only ${actualOutputTokens} tokens for actual output)`,
            );
          }
        }

        // Extract text first to check if we have content
        const text = candidate.content?.parts?.[0]?.text;

        // Check for finish reason
        if (candidate.finishReason && candidate.finishReason !== 'STOP') {
          this.logger.warn(`⚠️ Finish reason: ${candidate.finishReason}`);

          // If MAX_TOKENS and no text, increase token limit for next attempt
          if (
            candidate.finishReason === 'MAX_TOKENS' &&
            (!text || text.trim().length === 0) &&
            attempt < maxRetries - 1
          ) {
            // Calculate how much we need: thoughts tokens + reasonable output
            const thoughtsTokens =
              response.data.usageMetadata?.thoughtsTokenCount || 0;
            const newMaxTokens = Math.min(
              Math.max(thoughtsTokens + 500, maxTokens * 2),
              8000,
            );
            this.logger.log(
              `🔄 MAX_TOKENS hit with no output. Increasing maxOutputTokens from ${maxTokens} to ${newMaxTokens} for retry`,
            );
            requestBody.generationConfig = {
              ...requestBody.generationConfig,
              maxOutputTokens: newMaxTokens,
            };
            // Update maxTokens for next iteration
            maxTokens = newMaxTokens;
            continue;
          }
        }

        if (!text || text.trim().length === 0) {
          this.logger.error(`❌ Empty text in response`);
          this.logger.error(
            `📥 Full response: ${JSON.stringify(response.data, null, 2)}`,
          );

          // If MAX_TOKENS and no text, try with more tokens
          if (
            candidate.finishReason === 'MAX_TOKENS' &&
            attempt < maxRetries - 1
          ) {
            const thoughtsTokens =
              response.data.usageMetadata?.thoughtsTokenCount || 0;
            const newMaxTokens = Math.min(
              Math.max(thoughtsTokens + 500, maxTokens * 2),
              8000,
            );
            this.logger.log(
              `🔄 Retrying with increased maxOutputTokens: ${maxTokens} -> ${newMaxTokens} (accounting for ${thoughtsTokens} thoughts tokens)`,
            );
            requestBody.generationConfig = {
              ...requestBody.generationConfig,
              maxOutputTokens: newMaxTokens,
            };
            maxTokens = newMaxTokens;
            continue;
          }

          throw new Error('Empty response from Gemini API');
        }

        this.logger.log(
          `✅ Successfully generated text (${text.length} chars)`,
        );
        this.logger.debug(
          `📝 Generated text: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`,
        );
        return text.trim();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          const errorData = error.response?.data;
          const safeMessage =
            errorData?.error?.message ?? error.message ?? 'Request failed';
          lastError = new Error(
            `Gemini API request failed${status ? ` (${status})` : ''}: ${safeMessage}`,
          );

          if (status === 429) {
            // Check if it's daily quota exhaustion vs rate limiting
            const errorMessage = errorData?.error?.message || '';
            const errorCode = errorData?.error?.code;
            const isDailyQuota =
              errorMessage.includes('RESOURCE_EXHAUSTED') ||
              errorMessage.includes('quota') ||
              errorMessage.includes('daily limit') ||
              errorMessage.includes('exceeded') ||
              errorCode === 429; // 429 can mean either, but if message suggests quota, treat as daily

            if (isDailyQuota && errorMessage.toLowerCase().includes('quota')) {
              // Daily quota exhausted - don't retry, fail immediately
              this.logger.error(
                `❌ Daily quota exhausted (429). Error: ${errorMessage}. Do not retry.`,
              );
              throw new Error(
                `AI_DAILY_QUOTA_EXCEEDED: Daily quota exceeded. Please try again tomorrow or contact support.`,
              );
            }

            // Otherwise, it's a rate limit (per-minute) - handle with retry
            // Parse retry delay from API response
            let retryAfter = 60000; // Default 60 seconds

            if (errorData?.error?.details) {
              for (const detail of errorData.error.details) {
                if (
                  detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo'
                ) {
                  const retryDelay = detail.retryDelay;
                  if (typeof retryDelay === 'string') {
                    // Parse "59s" or "6.333907741s" format
                    const match = retryDelay.match(/(\d+\.?\d*)\s*s/);
                    if (match) {
                      const seconds = parseFloat(match[1]);
                      retryAfter = Math.ceil(seconds * 1000); // Convert to milliseconds, round up
                      // Add 2 second buffer
                      retryAfter += 2000;
                    } else {
                      // Try simple parse
                      const seconds = parseFloat(
                        retryDelay.replace(/[^0-9.]/g, ''),
                      );
                      if (!isNaN(seconds)) {
                        retryAfter = Math.ceil(seconds * 1000) + 2000;
                      }
                    }
                  } else if (
                    typeof retryDelay === 'object' &&
                    retryDelay.seconds
                  ) {
                    retryAfter = Math.ceil(retryDelay.seconds * 1000) + 2000;
                  }
                }
              }
            }

            // Also check error message for retry time
            if (errorData?.error?.message) {
              const messageMatch =
                errorData.error.message.match(/retry in ([\d.]+)s/i);
              if (messageMatch) {
                const seconds = parseFloat(messageMatch[1]);
                if (!isNaN(seconds)) {
                  retryAfter = Math.ceil(seconds * 1000) + 2000;
                }
              }
            }

            // Ensure minimum wait time (at least 30 seconds for rate limit)
            retryAfter = Math.max(retryAfter, 30000);

            this.logger.warn(
              `Rate limit exceeded (429). Waiting ${Math.ceil(retryAfter / 1000)}s before retry (attempt ${attempt + 1}/${maxRetries})...`,
            );

            if (attempt < maxRetries - 1) {
              // Clear recent requests since we're waiting
              this.requestTimestamps = [];
              await new Promise((resolve) => setTimeout(resolve, retryAfter));
              continue;
            } else {
              // Last attempt failed due to rate limit
              throw new Error(
                `Rate limit exceeded. Please try again in ${Math.ceil(retryAfter / 1000)} seconds.`,
              );
            }
          } else if (
            status &&
            status >= 400 &&
            status < 500 &&
            status !== 429
          ) {
            // Client errors (except 429) - don't retry
            throw lastError;
          }
        }

        if (attempt === maxRetries - 1) {
          throw lastError;
        }
      }
    }

    throw lastError || new Error('Failed to generate text after retries');
  }

  /**
   * Generate text using Gemini API (with rate limiting queue)
   */
  async generateText(
    prompt: string,
    options: {
      temperature?: number;
      maxTokens?: number;
      maxRetries?: number;
    } = {},
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    // Queue the request to ensure rate limiting
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        resolve,
        reject,
        prompt,
        options,
      });

      // Start processing queue if not already processing
      this.processQueue().catch((error) => {
        this.logger.error(
          `Error processing Gemini request queue: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
      });
    });
  }

  /**
   * Analyze image with text prompt using Gemini Vision API
   */
  async analyzeImage(
    imageBase64: string,
    prompt: string,
    options: {
      temperature?: number;
      maxTokens?: number;
      maxRetries?: number;
    } = {},
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    // Remove data URI prefix if present
    const base64Data = imageBase64.includes(',')
      ? imageBase64.split(',')[1]
      : imageBase64;

    // Detect MIME type from base64 or default to jpeg
    let mimeType = 'image/jpeg';
    if (imageBase64.includes('data:image/')) {
      const match = imageBase64.match(/data:image\/([^;]+)/);
      if (match) {
        mimeType = `image/${match[1]}`;
      }
    }

    const modelName = await this.getAvailableModel();
    const url = `${this.baseURL}/models/${modelName}:generateContent?key=${this.apiKey}`;

    const requestBody: GeminiRequest = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: options.temperature || 0.7,
        maxOutputTokens: options.maxTokens || 2000,
      },
    };

    this.logger.log(
      `📤 Analyzing image with Gemini Vision API (${base64Data.length} bytes, prompt: ${prompt.length} chars)`,
    );

    let lastError: Error | null = null;
    const maxRetries = options.maxRetries || 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = Math.min(attempt * 1.0, 5.0) * 1000;
          this.logger.log(
            `Retrying image analysis after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        await this.waitForRateLimit();

        const response = await this.axiosInstance.post<GeminiResponse>(
          url,
          requestBody,
        );

        if (response.data.error) {
          this.logger.error(
            `Gemini Vision API error: ${JSON.stringify(response.data.error)}`,
          );
          throw new Error(
            `Gemini API error: ${response.data.error.message} (code: ${response.data.error.code})`,
          );
        }

        if (
          !response.data.candidates ||
          response.data.candidates.length === 0
        ) {
          throw new Error('No candidates in Gemini Vision API response');
        }

        const candidate = response.data.candidates[0];
        const text = candidate.content?.parts?.[0]?.text;

        if (!text || text.trim().length === 0) {
          throw new Error('Empty response from Gemini Vision API');
        }

        this.logger.log(
          `✅ Successfully analyzed image (${text.length} chars)`,
        );
        return text.trim();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          if (status === 429) {
            const retryAfter = 60000; // 60 seconds
            this.logger.warn(
              `Rate limit exceeded for image analysis. Waiting ${Math.ceil(retryAfter / 1000)}s...`,
            );
            if (attempt < maxRetries - 1) {
              this.requestTimestamps = [];
              await new Promise((resolve) => setTimeout(resolve, retryAfter));
              continue;
            }
          }
        }

        if (attempt === maxRetries - 1) {
          throw lastError;
        }
      }
    }

    throw lastError || new Error('Failed to analyze image after retries');
  }
}
