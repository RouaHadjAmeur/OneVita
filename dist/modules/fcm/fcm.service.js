"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var FcmService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FcmService = void 0;
const common_1 = require("@nestjs/common");
const admin = __importStar(require("firebase-admin"));
const config_1 = require("@nestjs/config");
let FcmService = FcmService_1 = class FcmService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(FcmService_1.name);
    }
    onModuleInit() {
        this.initializeFirebase();
    }
    initializeFirebase() {
        try {
            try {
                this.firebaseApp = admin.app();
                this.logger.log('Firebase Admin already initialized');
                return;
            }
            catch {
            }
            const projectId = this.configService.get('FIREBASE_PROJECT_ID');
            const privateKey = this.configService
                .get('FIREBASE_PRIVATE_KEY')
                ?.replace(/\\n/g, '\n');
            const clientEmail = this.configService.get('FIREBASE_CLIENT_EMAIL');
            if (projectId && privateKey && clientEmail) {
                this.firebaseApp = admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId,
                        privateKey,
                        clientEmail,
                    }),
                });
                this.logger.log('Firebase Admin initialized with environment variables');
                return;
            }
            throw new Error('Missing Firebase environment variables. Please set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL in your .env file.');
        }
        catch (error) {
            this.logger.error('Failed to initialize Firebase Admin SDK', error);
            this.logger.warn('FCM notifications will not work until Firebase is properly configured');
        }
    }
    async sendNotification(fcmToken, title, body, data) {
        if (!this.firebaseApp) {
            this.logger.warn('Firebase not initialized, skipping notification');
            return;
        }
        try {
            const message = {
                token: fcmToken,
                notification: {
                    title,
                    body,
                },
                data: data
                    ? Object.entries(data).reduce((acc, [key, value]) => {
                        acc[key] = String(value);
                        return acc;
                    }, {})
                    : undefined,
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                            badge: 1,
                        },
                    },
                },
                android: {
                    priority: 'high',
                    notification: {
                        sound: 'default',
                        channelId: 'messages',
                    },
                },
            };
            const response = await admin.messaging().send(message);
            this.logger.log(`Successfully sent notification: ${response}`);
        }
        catch (error) {
            this.logger.error('Error sending FCM notification', error);
            if (typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                [
                    'messaging/invalid-registration-token',
                    'messaging/registration-token-not-registered',
                ].includes(error.code)) {
                this.logger.warn(`Invalid FCM token: ${fcmToken}`);
                throw new Error('INVALID_TOKEN');
            }
            throw error;
        }
    }
    async sendMessageNotification(fcmToken, senderName, messageContent, conversationId, messageId) {
        const notificationTitle = senderName;
        const notificationBody = messageContent.length > 100
            ? `${messageContent.substring(0, 100)}...`
            : messageContent;
        await this.sendNotification(fcmToken, notificationTitle, notificationBody, {
            type: 'message',
            conversationId,
            messageId,
            senderName,
        });
    }
    async mintCustomToken(uid) {
        if (!this.firebaseApp) {
            throw new Error('Firebase not initialized');
        }
        try {
            this.logger.log(`Minting Firebase custom token for uid=${uid}`);
            return await this.firebaseApp.auth().createCustomToken(uid);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : JSON.stringify(error);
            const stack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Failed to mint Firebase custom token for uid=${uid}: ${message}`, stack);
            throw error;
        }
    }
    getFirestore() {
        if (!this.firebaseApp) {
            throw new Error('Firebase not initialized');
        }
        return admin.firestore();
    }
    async sendMulticastNotification(fcmTokens, title, body, data) {
        if (!this.firebaseApp) {
            this.logger.warn('Firebase not initialized, skipping notification');
            throw new Error('Firebase not initialized');
        }
        if (fcmTokens.length === 0) {
            this.logger.warn('No FCM tokens provided');
            return null;
        }
        const validTokens = [...new Set(fcmTokens)].filter((token) => token && token.trim() !== '');
        if (validTokens.length === 0) {
            this.logger.warn('No valid FCM tokens provided');
            return null;
        }
        try {
            const message = {
                tokens: validTokens,
                notification: {
                    title,
                    body,
                },
                data: data
                    ? Object.entries(data).reduce((acc, [key, value]) => {
                        acc[key] = String(value);
                        return acc;
                    }, {})
                    : undefined,
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                            badge: 1,
                        },
                    },
                },
                android: {
                    priority: 'high',
                    notification: {
                        sound: 'default',
                        channelId: 'messages',
                    },
                },
            };
            const response = await admin.messaging().sendEachForMulticast(message);
            this.logger.log(`Successfully sent ${response.successCount} notifications, ${response.failureCount} failed`);
            if (response.failureCount > 0) {
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        const token = validTokens[idx];
                        if (resp.error?.code === 'messaging/invalid-registration-token' ||
                            resp.error?.code === 'messaging/registration-token-not-registered') {
                            this.logger.warn(`Invalid FCM token: ${token}`);
                        }
                    }
                });
            }
            return response;
        }
        catch (error) {
            this.logger.error('Error sending multicast FCM notification', error);
            throw error;
        }
    }
};
exports.FcmService = FcmService;
exports.FcmService = FcmService = FcmService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], FcmService);
//# sourceMappingURL=fcm.service.js.map