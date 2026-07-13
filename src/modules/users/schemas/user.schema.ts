// src/modules/users/schemas/user.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema()
export class User extends Document {
  _id: Types.ObjectId;

  // Common user fields
  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  phoneNumber?: string;

  @Prop()
  country?: string;

  @Prop()
  city?: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  password: string;

  @Prop()
  profileImage?: string;

  @Prop({ default: false })
  hasPhoto?: boolean;

  // By default, every user is an "owner"
  @Prop({ default: 'owner', enum: ['owner', 'vet', 'admin', 'sitter'] })
  role: string;

  @Prop({ default: 0 })
  balance: number;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: false })
  hasActiveSubscription: boolean; // Track if user has active subscription for verified badge

  @Prop()
  verificationCode?: string;

  @Prop()
  verificationCodeExpires?: Date;

  @Prop()
  pendingEmail?: string;

  @Prop()
  emailChangeCode?: string;

  @Prop()
  emailChangeCodeExpires?: Date;

  @Prop()
  passwordResetCode?: string;

  @Prop()
  passwordResetCodeExpires?: Date;

  @Prop()
  refreshToken?: string;

  @Prop()
  hashedRefreshToken?: string;

  // Vet-specific fields (optional)
  @Prop({ type: [String], default: [] })
  specializations?: string[]; // Array of specialties: general, surgery, dermatology, etc.

  @Prop()
  clinicName?: string;

  @Prop()
  clinicAddress?: string;

  @Prop()
  Location?: string;

  @Prop()
  licenseNumber?: string;

  @Prop()
  yearsOfExperience?: number;

  @Prop()
  bio?: string;

  // Location coordinates (for both vets and sitters)
  @Prop()
  latitude?: number;

  @Prop()
  longitude?: number;

  // Pet Sitter-specific fields (optional)
  @Prop({ type: [String], default: [] })
  services?: string[]; // Array of services: walking, homeVisits, daycare, etc.

  @Prop()
  hourlyRate?: number;

  @Prop({ default: false })
  availableWeekends?: boolean;

  @Prop({ default: false })
  canHostPets?: boolean;

  @Prop({ type: [Date], default: [] })
  availability?: Date[]; // Array of available dates

  // Relationship: one owner can have many pets
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Pet' }], default: [] })
  pets: Types.ObjectId[];

  @Prop({ default: false })
  hasPets?: boolean;

  @Prop({ default: 'local' })
  provider: 'local' | 'google' | 'apple';

  @Prop()
  providerId?: string; // Google "sub" field (user unique ID)

  @Prop()
  fcmToken?: string; // Firebase Cloud Messaging token for push notifications
}

export const UserSchema = SchemaFactory.createForClass(User);
