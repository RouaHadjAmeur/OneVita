import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateNotificationDto } from './dto/create-notification.dto';
import {
  Notification,
  NotificationDocument,
} from './schemas/notification.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async create(
    createNotificationDto: CreateNotificationDto,
  ): Promise<NotificationDocument> {
    const notification = new this.notificationModel({
      recipient: new Types.ObjectId(createNotificationDto.recipientId),
      sender: createNotificationDto.senderId
        ? new Types.ObjectId(createNotificationDto.senderId)
        : new Types.ObjectId(createNotificationDto.recipientId),
      type: createNotificationDto.type,
      title: createNotificationDto.title,
      message: createNotificationDto.message,
      booking: createNotificationDto.bookingId
        ? new Types.ObjectId(createNotificationDto.bookingId)
        : undefined,
      messageRef: createNotificationDto.messageRefId
        ? new Types.ObjectId(createNotificationDto.messageRefId)
        : undefined,
      metadata: createNotificationDto.metadata,
      read: false,
    });

    return notification.save();
  }

  async createOneHealthAlertIfNew(
    userId: string,
    alertKey: string,
    title: string,
    message: string,
    metadata: Record<string, any>,
  ): Promise<void> {
    const recipient = new Types.ObjectId(userId);
    const existing = await this.notificationModel
      .exists({
        recipient,
        type: 'one_health_alert',
        'metadata.alertKey': alertKey,
      })
      .exec();
    if (existing) return;
    await this.create({
      recipientId: userId,
      senderId: userId,
      type: 'one_health_alert',
      title,
      message,
      metadata: { ...metadata, alertKey },
    });
  }

  async findAll(
    userId: string,
    unreadOnly: boolean = false,
  ): Promise<NotificationDocument[]> {
    const query: any = { recipient: new Types.ObjectId(userId) };

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

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel
      .countDocuments({
        recipient: new Types.ObjectId(userId),
        read: false,
      })
      .exec();
  }

  async markAsRead(id: string, userId: string): Promise<NotificationDocument> {
    const notification = await this.notificationModel.findById(id).exec();

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    // Verify user is the recipient
    const recipientId = String(notification.recipient);
    if (recipientId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    notification.read = true;
    notification.readAt = new Date();
    return notification.save();
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel
      .updateMany(
        {
          recipient: new Types.ObjectId(userId),
          read: false,
        },
        {
          $set: {
            read: true,
            readAt: new Date(),
          },
        },
      )
      .exec();
  }

  async remove(id: string, userId: string): Promise<void> {
    const notification = await this.notificationModel.findById(id).exec();

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    // Verify user is the recipient
    const recipientId = String(notification.recipient);
    if (recipientId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    await this.notificationModel.findByIdAndDelete(id).exec();
  }
}
