import { OnModuleInit } from '@nestjs/common';
import { Model } from 'mongoose';
import { UserDocument } from '../users/schemas/user.schema';
import { FcmService } from '../fcm/fcm.service';
export declare class ChatNotificationsService implements OnModuleInit {
    private readonly fcmService;
    private readonly userModel;
    private readonly logger;
    private readonly startedAt;
    constructor(fcmService: FcmService, userModel: Model<UserDocument>);
    onModuleInit(): void;
    private handleNewMessage;
}
