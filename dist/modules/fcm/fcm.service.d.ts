import { OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';
export declare class FcmService implements OnModuleInit {
    private configService;
    private readonly logger;
    private firebaseApp;
    constructor(configService: ConfigService);
    onModuleInit(): void;
    private initializeFirebase;
    sendNotification(fcmToken: string, title: string, body: string, data?: Record<string, any>): Promise<void>;
    sendMessageNotification(fcmToken: string, senderName: string, messageContent: string, conversationId: string, messageId: string): Promise<void>;
    mintCustomToken(uid: string): Promise<string>;
    getFirestore(): admin.firestore.Firestore;
    sendMulticastNotification(fcmTokens: string[], title: string, body: string, data?: Record<string, any>): Promise<admin.messaging.BatchResponse | null>;
}
