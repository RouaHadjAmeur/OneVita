// src/modules/fcm/fcm.service.ts

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private firebaseApp: admin.app.App;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      // Check if Firebase is already initialized
      try {
        this.firebaseApp = admin.app();
        this.logger.log('Firebase Admin already initialized');
        return;
      } catch {
        // Not initialized yet, continue
      }

      // Only use individual environment variables
      const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
      const privateKey = this.configService
        .get<string>('FIREBASE_PRIVATE_KEY')
        ?.replace(/\\n/g, '\n');
      const clientEmail = this.configService.get<string>(
        'FIREBASE_CLIENT_EMAIL',
      );

      if (projectId && privateKey && clientEmail) {
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            privateKey,
            clientEmail,
          }),
        });
        this.logger.log(
          'Firebase Admin initialized with environment variables',
        );
        return;
      }

      throw new Error(
        'Missing Firebase environment variables. Please set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL in your .env file.',
      );
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK', error);
      this.logger.warn(
        'FCM notifications will not work until Firebase is properly configured',
      );
    }
  }

  /**
   * Send a push notification to a single device using FCM token
   */
  async sendNotification(
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void> {
    if (!this.firebaseApp) {
      this.logger.warn('Firebase not initialized, skipping notification');
      return;
    }

    try {
      const message: admin.messaging.Message = {
        token: fcmToken,
        notification: {
          title,
          body,
        },
        data: data
          ? Object.entries(data).reduce(
              (acc, [key, value]) => {
                acc[key] = String(value);
                return acc;
              },
              {} as Record<string, string>,
            )
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
    } catch (error) {
      this.logger.error('Error sending FCM notification', error);

      // Handle invalid token errors
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        [
          'messaging/invalid-registration-token',
          'messaging/registration-token-not-registered',
        ].includes((error as { code?: string }).code)
      ) {
        this.logger.warn(`Invalid FCM token: ${fcmToken}`);
        // You might want to delete the token from the database here
        throw new Error('INVALID_TOKEN');
      }

      throw error;
    }
  }

  /**
   * Send a message notification to a recipient
   */
  async sendMessageNotification(
    fcmToken: string,
    senderName: string,
    messageContent: string,
    conversationId: string,
    messageId: string,
  ): Promise<void> {
    const notificationTitle = senderName;
    const notificationBody =
      messageContent.length > 100
        ? `${messageContent.substring(0, 100)}...`
        : messageContent;

    await this.sendNotification(fcmToken, notificationTitle, notificationBody, {
      type: 'message',
      conversationId,
      messageId,
      senderName,
    });
  }

  /**
   * Mint a Firebase custom auth token for an already-authenticated user, so
   * the Flutter app can sign into Firebase (and satisfy Firestore security
   * rules) without a separate Firebase sign-up/login flow. The uid is our
   * own Mongo user id, keeping identity consistent across both systems.
   */
  async mintCustomToken(uid: string): Promise<string> {
    if (!this.firebaseApp) {
      throw new Error('Firebase not initialized');
    }
    return admin.auth().createCustomToken(uid);
  }

  /**
   * Firestore handle for services that need to read/listen to chat data
   * written directly by clients (e.g. to trigger a push notification).
   */
  getFirestore(): admin.firestore.Firestore {
    if (!this.firebaseApp) {
      throw new Error('Firebase not initialized');
    }
    return admin.firestore();
  }

  /**
   * Send notifications to multiple devices
   */
  async sendMulticastNotification(
    fcmTokens: string[],
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<admin.messaging.BatchResponse | null> {
    if (!this.firebaseApp) {
      this.logger.warn('Firebase not initialized, skipping notification');
      throw new Error('Firebase not initialized');
    }

    if (fcmTokens.length === 0) {
      this.logger.warn('No FCM tokens provided');
      return null;
    }

    // Remove duplicates and invalid tokens
    const validTokens = [...new Set(fcmTokens)].filter(
      (token) => token && token.trim() !== '',
    );

    if (validTokens.length === 0) {
      this.logger.warn('No valid FCM tokens provided');
      return null;
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens: validTokens,
        notification: {
          title,
          body,
        },
        data: data
          ? Object.entries(data).reduce(
              (acc, [key, value]) => {
                acc[key] = String(value);
                return acc;
              },
              {} as Record<string, string>,
            )
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
      this.logger.log(
        `Successfully sent ${response.successCount} notifications, ${response.failureCount} failed`,
      );

      // Handle invalid tokens
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const token = validTokens[idx];
            if (
              resp.error?.code === 'messaging/invalid-registration-token' ||
              resp.error?.code === 'messaging/registration-token-not-registered'
            ) {
              this.logger.warn(`Invalid FCM token: ${token}`);
            }
          }
        });
      }

      return response;
    } catch (error) {
      this.logger.error('Error sending multicast FCM notification', error);
      throw error;
    }
  }
}
