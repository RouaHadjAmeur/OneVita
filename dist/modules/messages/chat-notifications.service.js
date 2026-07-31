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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ChatNotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatNotificationsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const admin = __importStar(require("firebase-admin"));
const fcm_service_1 = require("../fcm/fcm.service");
let ChatNotificationsService = ChatNotificationsService_1 = class ChatNotificationsService {
    constructor(fcmService, userModel) {
        this.fcmService = fcmService;
        this.userModel = userModel;
        this.logger = new common_1.Logger(ChatNotificationsService_1.name);
        this.startedAt = admin.firestore.Timestamp.now();
    }
    onModuleInit() {
        const firestore = this.fcmService.getFirestore();
        if (!firestore) {
            this.logger.warn('Chat push listener disabled because Firebase is not configured');
            return;
        }
        firestore
            .collectionGroup('messages')
            .where('createdAt', '>', this.startedAt)
            .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type !== 'added')
                    return;
                this.handleNewMessage(change.doc).catch((error) => this.logger.error('Failed to process new chat message', error));
            });
        }, (error) => {
            this.logger.error('Firestore chat messages listener error', error);
        });
        this.logger.log('Listening for new Firestore chat messages');
    }
    async handleNewMessage(doc) {
        const data = doc.data();
        const recipientId = data.recipientId;
        const senderId = data.senderId;
        const content = data.content ?? '';
        const conversationId = doc.ref.parent.parent?.id;
        if (!recipientId || !senderId || !conversationId)
            return;
        const recipient = await this.userModel
            .findById(recipientId)
            .select('fcmToken')
            .exec();
        if (!recipient?.fcmToken)
            return;
        const senderName = data.senderName ||
            (await this.userModel.findById(senderId).select('name').exec())?.name ||
            'Someone';
        try {
            await this.fcmService.sendMessageNotification(recipient.fcmToken, senderName, content, conversationId, doc.id);
        }
        catch (error) {
            this.logger.error(`Failed to send chat push notification to ${recipientId}`, error);
        }
    }
};
exports.ChatNotificationsService = ChatNotificationsService;
exports.ChatNotificationsService = ChatNotificationsService = ChatNotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, mongoose_1.InjectModel)('User')),
    __metadata("design:paramtypes", [fcm_service_1.FcmService,
        mongoose_2.Model])
], ChatNotificationsService);
//# sourceMappingURL=chat-notifications.service.js.map