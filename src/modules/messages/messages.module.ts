// src/modules/messages/messages.module.ts
//
// Chat messages/conversations are no longer stored in MongoDB — the app
// reads/writes them directly in Firestore. This module now only hosts the
// Firestore -> FCM notification bridge (see chat-notifications.service.ts).

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { FcmModule } from '../fcm/fcm.module';
import { ChatNotificationsService } from './chat-notifications.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    FcmModule,
  ],
  providers: [ChatNotificationsService],
})
export class MessagesModule {}
