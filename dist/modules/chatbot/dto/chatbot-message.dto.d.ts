export declare class ChatbotMessageDto {
    message: string;
    mode?: 'global' | 'pet' | 'human' | 'environment';
    context?: string;
    image?: string;
}
