"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ChatbotGeminiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatbotGeminiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
let ChatbotGeminiService = ChatbotGeminiService_1 = class ChatbotGeminiService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(ChatbotGeminiService_1.name);
        this.baseURL = 'https://generativelanguage.googleapis.com/v1beta';
        this.cachedModelName = null;
        this.maxRequestsPerMinute = 2;
        this.requestWindowMs = 60000;
        this.requestTimestamps = [];
        this.requestQueue = [];
        this.isProcessingQueue = false;
        this.apiKey =
            this.configService.get('GEMINI_CHATBOT_API_KEY') ||
                this.configService.get('GEMINI_API_KEY') ||
                '';
        if (!this.apiKey) {
            this.logger.warn('GEMINI_CHATBOT_API_KEY and GEMINI_API_KEY not found in environment variables');
        }
        else if (this.apiKey === this.configService.get('GEMINI_API_KEY')) {
            this.logger.warn('GEMINI_CHATBOT_API_KEY not set, using shared GEMINI_API_KEY (may cause rate limiting)');
        }
        else {
            this.logger.log('Using dedicated GEMINI_CHATBOT_API_KEY for chatbot');
        }
        this.axiosInstance = axios_1.default.create({
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
    async waitForRateLimit() {
        const now = Date.now();
        this.requestTimestamps = this.requestTimestamps.filter((timestamp) => now - timestamp < this.requestWindowMs);
        if (this.requestTimestamps.length >= this.maxRequestsPerMinute) {
            const oldestRequest = this.requestTimestamps[0];
            const waitTime = this.requestWindowMs - (now - oldestRequest) + 2000;
            if (waitTime > 0) {
                this.logger.log(`Rate limit: Waiting ${Math.ceil(waitTime / 1000)}s before API call (${this.requestTimestamps.length}/${this.maxRequestsPerMinute} requests in last minute)`);
                await new Promise((resolve) => setTimeout(resolve, waitTime));
                const afterWait = Date.now();
                this.requestTimestamps = this.requestTimestamps.filter((timestamp) => afterWait - timestamp < this.requestWindowMs);
            }
        }
        if (this.requestTimestamps.length > 0) {
            const lastRequest = this.requestTimestamps[this.requestTimestamps.length - 1];
            const timeSinceLastRequest = now - lastRequest;
            const minInterval = 30000;
            if (timeSinceLastRequest < minInterval) {
                const waitTime = minInterval - timeSinceLastRequest;
                this.logger.log(`Enforcing minimum interval: Waiting ${Math.ceil(waitTime / 1000)}s (${timeSinceLastRequest}ms since last request)`);
                await new Promise((resolve) => setTimeout(resolve, waitTime));
            }
        }
        this.requestTimestamps.push(Date.now());
    }
    async processQueue() {
        if (this.isProcessingQueue || this.requestQueue.length === 0) {
            return;
        }
        this.isProcessingQueue = true;
        while (this.requestQueue.length > 0) {
            const request = this.requestQueue.shift();
            if (!request)
                break;
            try {
                if (request.imageData) {
                    if (request.options.petPhotos &&
                        request.options.petPhotos.length > 0) {
                        let userImageData;
                        try {
                            const parsed = JSON.parse(request.imageData);
                            userImageData = parsed.userImage || request.imageData;
                        }
                        catch {
                            userImageData = request.imageData;
                        }
                        const result = await this.analyzeImageWithPetPhotosInternal(userImageData, request.prompt, request.options.petPhotos, request.options);
                        request.resolve(result);
                    }
                    else {
                        const result = await this.analyzeImageInternal(request.imageData, request.prompt, request.options);
                        request.resolve(result);
                    }
                }
                else {
                    const result = await this.generateTextInternal(request.prompt, request.options);
                    request.resolve(result);
                }
            }
            catch (error) {
                request.reject(error);
            }
        }
        this.isProcessingQueue = false;
    }
    async getAvailableModel() {
        if (this.cachedModelName) {
            return this.cachedModelName;
        }
        try {
            const response = await this.axiosInstance.get(`${this.baseURL}/models?key=${this.apiKey}`);
            if (response.status === 200 && response.data.models) {
                const models = response.data.models.filter((model) => (model.supportedGenerationMethods ?? []).includes('generateContent'));
                const configuredModel = this.configService
                    .get('AI_MODEL')
                    ?.trim()
                    .replace(/^models\//, '');
                const retiredForNewAccounts = /gemini-2\.5-/i;
                if (configuredModel && !retiredForNewAccounts.test(configuredModel)) {
                    const configured = models.find((model) => model.name.replace(/^models\//, '') === configuredModel);
                    if (configured) {
                        this.cachedModelName = configuredModel;
                        this.logger.log(`Using configured Gemini model: ${configuredModel}`);
                        return configuredModel;
                    }
                    this.logger.warn(`Configured AI_MODEL "${configuredModel}" is unavailable; selecting an available Flash model`);
                }
                const preferredNames = [
                    'gemini-flash-latest',
                    'gemini-3.5-flash',
                    'gemini-3-flash',
                    'gemini-2.0-flash',
                ];
                for (const preferredName of preferredNames) {
                    const model = models.find((m) => m.name.includes(preferredName) ||
                        m.name.includes(preferredName.replace(/-/g, '_')));
                    if (model) {
                        const modelName = model.name.split('/').pop() || model.name;
                        this.cachedModelName = modelName;
                        this.logger.log(`Using Gemini model: ${modelName}`);
                        return modelName;
                    }
                }
                const usableModels = models.filter((model) => !retiredForNewAccounts.test(model.name));
                const fallbackModel = usableModels.find((model) => /flash/i.test(model.name)) ??
                    usableModels[0];
                if (fallbackModel) {
                    const modelName = fallbackModel.name.split('/').pop() || fallbackModel.name;
                    this.cachedModelName = modelName;
                    this.logger.log(`Using available Gemini model: ${modelName}`);
                    return modelName;
                }
            }
        }
        catch (error) {
            this.logger.warn(`Failed to list Gemini models: ${this.safeErrorMessage(error)}`);
        }
        throw new Error('No Gemini model supporting generateContent is available for this API key');
    }
    safeErrorMessage(error) {
        if (axios_1.default.isAxiosError(error)) {
            const status = error.response?.status;
            const providerMessage = error.response?.data?.error?.message;
            return `Gemini request failed${status ? ` (${status})` : ''}${providerMessage ? `: ${providerMessage}` : ''}`;
        }
        return error instanceof Error ? error.message : String(error);
    }
    async generateTextInternal(prompt, options = {}) {
        let { temperature = 0.7, maxTokens = 500 } = options;
        const { maxRetries = 3 } = options;
        if (!this.apiKey) {
            throw new Error('GEMINI_CHATBOT_API_KEY is not configured');
        }
        await this.waitForRateLimit();
        const modelName = await this.getAvailableModel();
        const url = `${this.baseURL}/models/${modelName}:generateContent?key=${this.apiKey}`;
        const requestBody = {
            contents: [
                {
                    parts: [{ text: prompt }],
                },
            ],
            generationConfig: {
                temperature,
                maxOutputTokens: maxTokens,
            },
        };
        this.logger.log(`📤 Sending chatbot prompt to Gemini API (${prompt.length} chars, maxTokens: ${maxTokens})`);
        let lastError = null;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    const delay = Math.min(attempt * 1.0, 5.0) * 1000;
                    this.logger.log(`Retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                }
                const response = await this.axiosInstance.post(url, requestBody);
                this.logger.log(`📥 API Response status: ${response.status}`);
                if (response.data.error) {
                    this.logger.error(`Gemini API error: ${JSON.stringify(response.data.error)}`);
                    throw new Error(`Gemini API error: ${response.data.error.message} (code: ${response.data.error.code})`);
                }
                if (!response.data.candidates ||
                    response.data.candidates.length === 0) {
                    this.logger.error(`❌ No candidates in response: ${JSON.stringify(response.data, null, 2)}`);
                    throw new Error('No candidates in Gemini API response');
                }
                const candidate = response.data.candidates[0];
                if (response.data.usageMetadata) {
                    const usage = response.data.usageMetadata;
                    const outputTokens = (usage.totalTokenCount || 0) - (usage.promptTokenCount || 0);
                    this.logger.log(`📊 Token usage: ${usage.promptTokenCount} prompt + ${outputTokens} output = ${usage.totalTokenCount} total`);
                    if (usage.thoughtsTokenCount) {
                        const actualOutputTokens = outputTokens - (usage.thoughtsTokenCount || 0);
                        this.logger.warn(`⚠️ Thoughts tokens used: ${usage.thoughtsTokenCount} (leaves only ${actualOutputTokens} tokens for actual output)`);
                    }
                }
                const text = candidate.content?.parts?.[0]?.text;
                if (candidate.finishReason && candidate.finishReason !== 'STOP') {
                    this.logger.warn(`⚠️ Finish reason: ${candidate.finishReason}`);
                    if (candidate.finishReason === 'MAX_TOKENS' &&
                        (!text || text.trim().length === 0) &&
                        attempt < maxRetries - 1) {
                        const thoughtsTokens = response.data.usageMetadata?.thoughtsTokenCount || 0;
                        const newMaxTokens = Math.min(Math.max(thoughtsTokens + 500, maxTokens * 2), 8000);
                        this.logger.log(`🔄 MAX_TOKENS hit with no output. Increasing maxOutputTokens from ${maxTokens} to ${newMaxTokens} for retry`);
                        requestBody.generationConfig = {
                            ...requestBody.generationConfig,
                            maxOutputTokens: newMaxTokens,
                        };
                        maxTokens = newMaxTokens;
                        continue;
                    }
                }
                if (!text || text.trim().length === 0) {
                    this.logger.error(`❌ Empty text in response`);
                    throw new Error('Empty response from Gemini API');
                }
                this.logger.log(`✅ Successfully generated chatbot text (${text.length} chars)`);
                return text.trim();
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (axios_1.default.isAxiosError(error)) {
                    const status = error.response?.status;
                    const errorData = error.response?.data;
                    if (status === 429) {
                        const errorMessage = errorData?.error?.message || '';
                        const errorCode = errorData?.error?.code;
                        const isDailyQuota = errorMessage.includes('RESOURCE_EXHAUSTED') ||
                            errorMessage.includes('quota') ||
                            errorMessage.includes('daily limit') ||
                            errorMessage.includes('exceeded') ||
                            errorCode === 429;
                        if (isDailyQuota && errorMessage.toLowerCase().includes('quota')) {
                            this.logger.error(`❌ Daily quota exhausted (429). Error: ${errorMessage}. Do not retry.`);
                            throw new Error(`AI_DAILY_QUOTA_EXCEEDED: Daily quota exceeded. Please try again tomorrow or contact support.`);
                        }
                        let retryAfter = 60000;
                        if (errorData?.error?.details) {
                            for (const detail of errorData.error.details) {
                                if (detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo') {
                                    const retryDelay = detail.retryDelay;
                                    if (typeof retryDelay === 'string') {
                                        const match = retryDelay.match(/(\d+\.?\d*)\s*s/);
                                        if (match) {
                                            retryAfter =
                                                Math.ceil(parseFloat(match[1]) * 1000) + 2000;
                                        }
                                        else {
                                            const seconds = parseFloat(retryDelay.replace(/[^0-9.]/g, ''));
                                            if (!isNaN(seconds)) {
                                                retryAfter = Math.ceil(seconds * 1000) + 2000;
                                            }
                                        }
                                    }
                                    else if (typeof retryDelay === 'object' &&
                                        retryDelay.seconds) {
                                        retryAfter = Math.ceil(retryDelay.seconds * 1000) + 2000;
                                    }
                                }
                            }
                        }
                        if (errorData?.error?.message) {
                            const messageMatch = errorData.error.message.match(/retry in ([\d.]+)s/i);
                            if (messageMatch) {
                                const seconds = parseFloat(messageMatch[1]);
                                if (!isNaN(seconds)) {
                                    retryAfter = Math.ceil(seconds * 1000) + 2000;
                                }
                            }
                        }
                        retryAfter = Math.max(retryAfter, 30000);
                        this.logger.warn(`Rate limit exceeded (429). Waiting ${Math.ceil(retryAfter / 1000)}s before retry (attempt ${attempt + 1}/${maxRetries})...`);
                        if (attempt < maxRetries - 1) {
                            this.requestTimestamps = [];
                            await new Promise((resolve) => setTimeout(resolve, retryAfter));
                            continue;
                        }
                        else {
                            throw new Error(`Rate limit exceeded. Please try again in ${Math.ceil(retryAfter / 1000)} seconds.`);
                        }
                    }
                    else if (status &&
                        status >= 400 &&
                        status < 500 &&
                        status !== 429) {
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
    async analyzeImageInternal(imageData, prompt, options = {}) {
        const { temperature = 0.7, maxTokens = 500, maxRetries = 3 } = options;
        if (!this.apiKey) {
            throw new Error('GEMINI_CHATBOT_API_KEY is not configured');
        }
        await this.waitForRateLimit();
        const modelName = await this.getAvailableModel();
        const url = `${this.baseURL}/models/${modelName}:generateContent?key=${this.apiKey}`;
        let base64Data;
        let mimeType;
        if (imageData.startsWith('data:')) {
            const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
            if (!matches) {
                throw new Error('Invalid base64 image format');
            }
            mimeType = matches[1];
            base64Data = matches[2];
        }
        else {
            base64Data = imageData;
            mimeType = 'image/jpeg';
        }
        const requestBody = {
            contents: [
                {
                    parts: [
                        {
                            inlineData: {
                                mimeType,
                                data: base64Data,
                            },
                        },
                        { text: prompt },
                    ],
                },
            ],
            generationConfig: {
                temperature,
                maxOutputTokens: maxTokens,
            },
        };
        this.logger.log(`📤 Analyzing image with Gemini Vision API (${base64Data.length} bytes, prompt: ${prompt.length} chars)`);
        let lastError = null;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    const delay = Math.min(attempt * 1.0, 5.0) * 1000;
                    this.logger.log(`Retrying image analysis after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                }
                const response = await this.axiosInstance.post(url, requestBody);
                if (response.data.error) {
                    this.logger.error(`Gemini Vision API error: ${JSON.stringify(response.data.error)}`);
                    throw new Error(`Gemini API error: ${response.data.error.message} (code: ${response.data.error.code})`);
                }
                if (!response.data.candidates ||
                    response.data.candidates.length === 0) {
                    throw new Error('No candidates in Gemini Vision API response');
                }
                const candidate = response.data.candidates[0];
                const text = candidate.content?.parts?.[0]?.text;
                if (!text || text.trim().length === 0) {
                    throw new Error('Empty response from Gemini Vision API');
                }
                this.logger.log(`✅ Successfully analyzed image (${text.length} chars)`);
                return text.trim();
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (axios_1.default.isAxiosError(error)) {
                    const status = error.response?.status;
                    const errorData = error.response?.data;
                    if (status === 429) {
                        const errorMessage = errorData?.error?.message || '';
                        if (errorMessage.toLowerCase().includes('quota')) {
                            this.logger.error(`❌ Daily quota exhausted for image analysis. Error: ${errorMessage}`);
                            throw new Error(`AI_DAILY_QUOTA_EXCEEDED: Daily quota exceeded. Please try again tomorrow or contact support.`);
                        }
                        let retryAfter = 60000;
                        if (errorData?.error?.details) {
                            for (const detail of errorData.error.details) {
                                if (detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo') {
                                    const retryDelay = detail.retryDelay;
                                    if (typeof retryDelay === 'string') {
                                        const match = retryDelay.match(/(\d+\.?\d*)\s*s/);
                                        if (match) {
                                            retryAfter =
                                                Math.ceil(parseFloat(match[1]) * 1000) + 2000;
                                        }
                                    }
                                }
                            }
                        }
                        retryAfter = Math.max(retryAfter, 30000);
                        this.logger.warn(`Rate limit exceeded for image analysis. Waiting ${Math.ceil(retryAfter / 1000)}s...`);
                        if (attempt < maxRetries - 1) {
                            this.requestTimestamps = [];
                            await new Promise((resolve) => setTimeout(resolve, retryAfter));
                            continue;
                        }
                        else {
                            throw new Error(`Rate limit exceeded. Please try again in ${Math.ceil(retryAfter / 1000)} seconds.`);
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
    async analyzeImageWithPetPhotosInternal(userImageData, prompt, petPhotos, options = {}) {
        const { temperature = 0.7, maxTokens = 500, maxRetries = 3 } = options;
        if (!this.apiKey) {
            throw new Error('GEMINI_CHATBOT_API_KEY is not configured');
        }
        await this.waitForRateLimit();
        const modelName = await this.getAvailableModel();
        const url = `${this.baseURL}/models/${modelName}:generateContent?key=${this.apiKey}`;
        let userBase64Data;
        let userMimeType;
        if (userImageData.startsWith('data:')) {
            const matches = userImageData.match(/^data:([^;]+);base64,(.+)$/);
            if (!matches) {
                throw new Error('Invalid base64 image format');
            }
            userMimeType = matches[1];
            userBase64Data = matches[2];
        }
        else {
            userBase64Data = userImageData;
            userMimeType = 'image/jpeg';
        }
        const parts = [];
        parts.push({
            inlineData: {
                mimeType: userMimeType,
                data: userBase64Data,
            },
        });
        for (const { petName, photoBase64 } of petPhotos) {
            let petBase64Data;
            let petMimeType;
            if (photoBase64.startsWith('data:')) {
                const matches = photoBase64.match(/^data:([^;]+);base64,(.+)$/);
                if (matches) {
                    petMimeType = matches[1];
                    petBase64Data = matches[2];
                }
                else {
                    continue;
                }
            }
            else {
                petBase64Data = photoBase64;
                petMimeType = 'image/jpeg';
            }
            parts.push({
                text: `Reference photo of ${petName}:`,
            });
            parts.push({
                inlineData: {
                    mimeType: petMimeType,
                    data: petBase64Data,
                },
            });
        }
        parts.push({ text: prompt });
        const requestBody = {
            contents: [
                {
                    parts,
                },
            ],
            generationConfig: {
                temperature,
                maxOutputTokens: maxTokens,
            },
        };
        this.logger.log(`📤 Analyzing image with ${petPhotos.length} pet reference photos (user image: ${userBase64Data.length} bytes, prompt: ${prompt.length} chars)`);
        let lastError = null;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    const delay = Math.min(attempt * 1.0, 5.0) * 1000;
                    this.logger.log(`Retrying image analysis with pet photos after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                }
                const response = await this.axiosInstance.post(url, requestBody);
                if (response.data.error) {
                    this.logger.error(`Gemini Vision API error: ${JSON.stringify(response.data.error)}`);
                    throw new Error(`Gemini API error: ${response.data.error.message} (code: ${response.data.error.code})`);
                }
                if (!response.data.candidates ||
                    response.data.candidates.length === 0) {
                    throw new Error('No candidates in Gemini Vision API response');
                }
                const candidate = response.data.candidates[0];
                const text = candidate.content?.parts?.[0]?.text;
                if (!text || text.trim().length === 0) {
                    throw new Error('Empty response from Gemini Vision API');
                }
                this.logger.log(`✅ Successfully analyzed image with pet photos (${text.length} chars)`);
                return text.trim();
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (axios_1.default.isAxiosError(error)) {
                    const status = error.response?.status;
                    const errorData = error.response?.data;
                    if (status === 429) {
                        const errorMessage = errorData?.error?.message || '';
                        if (errorMessage.toLowerCase().includes('quota')) {
                            this.logger.error(`❌ Daily quota exhausted for image analysis. Error: ${errorMessage}`);
                            throw new Error(`AI_DAILY_QUOTA_EXCEEDED: Daily quota exceeded. Please try again tomorrow or contact support.`);
                        }
                        let retryAfter = 60000;
                        if (errorData?.error?.details) {
                            for (const detail of errorData.error.details) {
                                if (detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo') {
                                    const retryDelay = detail.retryDelay;
                                    if (typeof retryDelay === 'string') {
                                        const match = retryDelay.match(/(\d+\.?\d*)\s*s/);
                                        if (match) {
                                            retryAfter =
                                                Math.ceil(parseFloat(match[1]) * 1000) + 2000;
                                        }
                                    }
                                }
                            }
                        }
                        retryAfter = Math.max(retryAfter, 30000);
                        this.logger.warn(`Rate limit exceeded for image analysis. Waiting ${Math.ceil(retryAfter / 1000)}s...`);
                        if (attempt < maxRetries - 1) {
                            this.requestTimestamps = [];
                            await new Promise((resolve) => setTimeout(resolve, retryAfter));
                            continue;
                        }
                        else {
                            throw new Error(`Rate limit exceeded. Please try again in ${Math.ceil(retryAfter / 1000)} seconds.`);
                        }
                    }
                }
                if (attempt === maxRetries - 1) {
                    throw lastError;
                }
            }
        }
        throw (lastError ||
            new Error('Failed to analyze image with pet photos after retries'));
    }
    async generateText(prompt, options = {}) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({
                resolve,
                reject,
                prompt,
                options,
            });
            void this.processQueue();
        });
    }
    async analyzeImage(imageData, prompt, options = {}) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({
                resolve,
                reject,
                prompt,
                imageData,
                options,
            });
            void this.processQueue();
        });
    }
    async analyzeImageWithPetPhotos(userImageData, prompt, petPhotos, options = {}) {
        return new Promise((resolve, reject) => {
            const combinedImageData = {
                userImage: userImageData,
                petPhotos,
            };
            this.requestQueue.push({
                resolve,
                reject,
                prompt,
                imageData: JSON.stringify(combinedImageData),
                options: {
                    ...options,
                    petPhotos,
                },
            });
            void this.processQueue();
        });
    }
};
exports.ChatbotGeminiService = ChatbotGeminiService;
exports.ChatbotGeminiService = ChatbotGeminiService = ChatbotGeminiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ChatbotGeminiService);
//# sourceMappingURL=chatbot-gemini.service.js.map