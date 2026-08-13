import { ConfigService } from '@nestjs/config';
export declare class ChatbotGeminiService {
    private configService;
    private readonly logger;
    private readonly apiKey;
    private readonly baseURL;
    private readonly axiosInstance;
    private cachedModelName;
    private readonly maxRequestsPerMinute;
    private readonly requestWindowMs;
    private requestTimestamps;
    private requestQueue;
    private isProcessingQueue;
    constructor(configService: ConfigService);
    private waitForRateLimit;
    private processQueue;
    private getAvailableModel;
    private safeErrorMessage;
    private generateTextInternal;
    private analyzeImageInternal;
    private analyzeImageWithPetPhotosInternal;
    generateText(prompt: string, options?: {
        temperature?: number;
        maxTokens?: number;
        maxRetries?: number;
    }): Promise<string>;
    analyzeImage(imageData: string, prompt: string, options?: {
        temperature?: number;
        maxTokens?: number;
        maxRetries?: number;
    }): Promise<string>;
    analyzeImageWithPetPhotos(userImageData: string, prompt: string, petPhotos: Array<{
        petName: string;
        photoBase64: string;
    }>, options?: {
        temperature?: number;
        maxTokens?: number;
        maxRetries?: number;
    }): Promise<string>;
}
