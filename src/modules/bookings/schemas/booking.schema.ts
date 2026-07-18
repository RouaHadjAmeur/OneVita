import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BookingDocument = Booking & Document;

@Schema({ timestamps: true })
export class Booking {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  owner: Types.ObjectId; // Pet owner who made the booking

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  provider: Types.ObjectId; // Vet or Pet Sitter who will provide the service

  @Prop({ required: true, type: String, enum: ['vet', 'sitter'] })
  providerType: string; // 'vet' or 'sitter'

  @Prop({ type: Types.ObjectId, ref: 'Pet' })
  pet?: Types.ObjectId; // Optional: specific pet for the booking

  @Prop({ required: true })
  serviceType: string; // e.g., "Cabinet", "Home Visit", "Video Call", "At Home", "Visit"

  @Prop()
  description?: string; // Optional booking description/message

  @Prop({ required: true })
  dateTime: Date; // Scheduled date and time

  @Prop()
  duration?: number; // Duration in minutes (optional)

  @Prop()
  price?: number; // Booking price (optional)

  @Prop({
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
    default: 'pending',
  })
  status: string;

  @Prop()
  rejectionReason?: string; // If rejected, reason for rejection

  @Prop({ type: Date })
  completedAt?: Date; // When the service was completed

  @Prop({ type: Date })
  cancelledAt?: Date; // When the booking was cancelled

  @Prop({ type: String })
  cancellationReason?: string; // Reason for cancellation

  @Prop({ type: String, maxlength: 2000 })
  providerNote?: string; // Appointment/pet note written by the provider
}

export const BookingSchema = SchemaFactory.createForClass(Booking);
