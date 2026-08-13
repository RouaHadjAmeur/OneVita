// src/modules/pet-sitters/schemas/pet-sitter.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PetSitterDocument = PetSitter & Document;

@Schema({ timestamps: true, collection: 'pet-sitters' })
export class PetSitter {
  _id: Types.ObjectId;

  // Reference to User (owner can also be a sitter)
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  user: Types.ObjectId;

  // Sitter-specific required fields
  @Prop({ required: true })
  hourlyRate: number;

  @Prop({ required: true })
  sitterAddress: string;

  // Sitter-specific optional fields
  @Prop({ type: [String], default: [] })
  services?: string[];

  @Prop()
  yearsOfExperience?: number;

  @Prop({ default: false })
  availableWeekends?: boolean;

  @Prop({ default: false })
  canHostPets?: boolean;

  @Prop({ type: [Date], default: [] })
  availability?: Date[];

  @Prop()
  latitude?: number;

  @Prop()
  longitude?: number;

  @Prop()
  bio?: string;

  @Prop({ min: 0, max: 23, default: 8 })
  workdayStartHour?: number;

  @Prop({ min: 1, max: 24, default: 18 })
  workdayEndHour?: number;
}

export const PetSitterSchema = SchemaFactory.createForClass(PetSitter);
