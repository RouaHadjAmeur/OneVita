// src/modules/messages/chat-notifications.service.ts
//
// Chat messages now live entirely in Firestore — the Flutter app writes and
// listens to them directly (see conversations/{id}/messages/{id}). This
// service is the one thing that still needs to run on the backend: it
// watches Firestore for new messages and triggers the existing FCM push
// pipeline, since a client-only write can't know who needs to be notified
// while their app is backgrounded/closed.

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as admin from 'firebase-admin';
import { UserDocument } from '../users/schemas/user.schema';
import { FcmService } from '../fcm/fcm.service';

@Injectable()
export class ChatNotificationsService implements OnModuleInit {
  private readonly logger = new Logger(ChatNotificationsService.name);
  private readonly startedAt = admin.firestore.Timestamp.now();

  constructor(
    private readonly fcmService: FcmService,
    @InjectModel('User') private readonly userModel: Model<UserDocument>,
  ) {}

  onModuleInit() {
    this.fcmService
      .getFirestore()
      .collectionGroup('messages')
      .where('createdAt', '>', this.startedAt)
      .onSnapshot(
        (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type !== 'added') return;
            this.handleNewMessage(change.doc).catch((error) =>
              this.logger.error('Failed to process new chat message', error),
            );
          });
        },
        (error) => {
          this.logger.error('Firestore chat messages listener error', error);
        },
      );

    this.logger.log('Listening for new Firestore chat messages');
  }

  private async handleNewMessage(
    doc: admin.firestore.QueryDocumentSnapshot,
  ): Promise<void> {
    const data = doc.data();
    const recipientId = data.recipientId as string | undefined;
    const senderId = data.senderId as string | undefined;
    const content = (data.content as string | undefined) ?? '';
    const conversationId = doc.ref.parent.parent?.id;

    if (!recipientId || !senderId || !conversationId) return;

    const recipient = await this.userModel
      .findById(recipientId)
      .select('fcmToken')
      .exec();
    if (!recipient?.fcmToken) return;

    const senderName =
      (data.senderName as string | undefined) ||
      (await this.userModel.findById(senderId).select('name').exec())
        ?.name ||
      'Someone';

    try {
      await this.fcmService.sendMessageNotification(
        recipient.fcmToken,
        senderName,
        content,
        conversationId,
        doc.id,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send chat push notification to ${recipientId}`,
        error,
      );
    }
  }
}
