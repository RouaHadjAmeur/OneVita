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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const notification_schema_1 = require("./schemas/notification.schema");
let NotificationsService = class NotificationsService {
    constructor(notificationModel) {
        this.notificationModel = notificationModel;
    }
    async create(createNotificationDto) {
        const notification = new this.notificationModel({
            recipient: new mongoose_2.Types.ObjectId(createNotificationDto.recipientId),
            sender: createNotificationDto.senderId
                ? new mongoose_2.Types.ObjectId(createNotificationDto.senderId)
                : new mongoose_2.Types.ObjectId(createNotificationDto.recipientId),
            type: createNotificationDto.type,
            title: createNotificationDto.title,
            message: createNotificationDto.message,
            booking: createNotificationDto.bookingId
                ? new mongoose_2.Types.ObjectId(createNotificationDto.bookingId)
                : undefined,
            messageRef: createNotificationDto.messageRefId
                ? new mongoose_2.Types.ObjectId(createNotificationDto.messageRefId)
                : undefined,
            metadata: createNotificationDto.metadata,
            read: false,
        });
        return notification.save();
    }
    async createOneHealthAlertIfNew(userId, alertKey, title, message, metadata) {
        const recipient = new mongoose_2.Types.ObjectId(userId);
        const existing = await this.notificationModel
            .exists({
            recipient,
            type: 'one_health_alert',
            'metadata.alertKey': alertKey,
        })
            .exec();
        if (existing)
            return;
        await this.create({
            recipientId: userId,
            senderId: userId,
            type: 'one_health_alert',
            title,
            message,
            metadata: { ...metadata, alertKey },
        });
    }
    async findAll(userId, unreadOnly = false) {
        const query = { recipient: new mongoose_2.Types.ObjectId(userId) };
        if (unreadOnly) {
            query.read = false;
        }
        const notifications = await this.notificationModel
            .find(query)
            .populate([
            { path: 'sender', select: 'name email profileImage' },
            {
                path: 'booking',
                populate: { path: 'owner provider', select: 'name email' },
            },
        ])
            .sort({ createdAt: -1 })
            .exec();
        return notifications;
    }
    async getUnreadCount(userId) {
        return this.notificationModel
            .countDocuments({
            recipient: new mongoose_2.Types.ObjectId(userId),
            read: false,
        })
            .exec();
    }
    async markAsRead(id, userId) {
        const notification = await this.notificationModel.findById(id).exec();
        if (!notification) {
            throw new common_1.NotFoundException(`Notification with ID ${id} not found`);
        }
        const recipientId = String(notification.recipient);
        if (recipientId !== userId) {
            throw new common_1.NotFoundException('Notification not found');
        }
        notification.read = true;
        notification.readAt = new Date();
        return notification.save();
    }
    async markAllAsRead(userId) {
        await this.notificationModel
            .updateMany({
            recipient: new mongoose_2.Types.ObjectId(userId),
            read: false,
        }, {
            $set: {
                read: true,
                readAt: new Date(),
            },
        })
            .exec();
    }
    async remove(id, userId) {
        const notification = await this.notificationModel.findById(id).exec();
        if (!notification) {
            throw new common_1.NotFoundException(`Notification with ID ${id} not found`);
        }
        const recipientId = String(notification.recipient);
        if (recipientId !== userId) {
            throw new common_1.NotFoundException('Notification not found');
        }
        await this.notificationModel.findByIdAndDelete(id).exec();
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(notification_schema_1.Notification.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map