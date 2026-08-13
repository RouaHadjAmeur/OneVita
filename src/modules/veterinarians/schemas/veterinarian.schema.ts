// src/modules/veterinarians/schemas/veterinarian.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VeterinarianDocument = Veterinarian & Document;

@Schema({ timestamps: true, collection: 'veterinarians', strict: true })
export class Veterinarian {
  _id: Types.ObjectId;

  // Reference to User (owner can also be a vet)
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  user: Types.ObjectId;

  // Vet-specific required fields
  @Prop({ required: true })
  licenseNumber: string;

  @Prop({ required: true })
  clinicName: string;

  @Prop({ required: true })
  clinicAddress: string;

  // Vet-specific optional fields
  @Prop({ type: [String], default: [] })
  specializations?: string[];

  @Prop()
  yearsOfExperience?: number;

  @Prop()
  latitude?: number;

  @Prop()
  longitude?: number;

  @Prop()
  bio?: string;

  @Prop()
  education?: string;

  @Prop({ type: [String], default: [] })
  languages?: string[];

  @Prop({ min: 0 })
  consultationFee?: number;

  @Prop()
  licenseImageUrl?: string;

  @Prop()
  clinicImageUrl?: string;
}

export const VeterinarianSchema = SchemaFactory.createForClass(Veterinarian);

// Explicitly ensure only the user field has a unique index
// Note: The user field already has unique: true in @Prop decorator above

// Prevent email field from being added (in case of old data or migration issues)
VeterinarianSchema.pre('save', function (next) {
  // Remove email field if it somehow got added
  if (this.isNew && (this as any).email !== undefined) {
    delete (this as any).email;
  }
  next();
});
