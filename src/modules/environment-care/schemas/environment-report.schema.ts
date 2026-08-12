import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EnvironmentReportDocument = EnvironmentReport & Document;

@Schema({ timestamps: true, collection: 'environment_reports' })
export class EnvironmentReport {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  reporter: Types.ObjectId;

  @Prop({ required: true, enum: ['illegal_waste', 'water_pollution', 'unsafe_drinking_water', 'unsafe_food', 'air_pollution', 'dead_animal', 'chemical_spill', 'burning_waste', 'oil_leakage', 'construction_waste', 'noise_pollution', 'other'] })
  category: string;

  @Prop({ required: true, maxlength: 2000 })
  description: string;

  @Prop({ default: '' })
  mediaUrl: string;

  @Prop({ enum: ['uploaded', 'pending'], default: 'uploaded' })
  mediaUploadStatus: string;

  @Prop({ enum: ['image', 'video'], default: 'image' })
  mediaType: string;

  @Prop({ required: true, min: -90, max: 90 })
  latitude: number;

  @Prop({ required: true, min: -180, max: 180 })
  longitude: number;

  @Prop({ maxlength: 1000, default: '' })
  address: string;

  @Prop({ enum: ['submitted', 'under_review', 'confirmed', 'resolved', 'rejected'], default: 'submitted', index: true })
  status: string;

  @Prop({ enum: ['low', 'moderate', 'high', 'critical'], default: 'moderate' })
  severity: string;

  @Prop()
  authorityNote?: string;
}

export const EnvironmentReportSchema = SchemaFactory.createForClass(EnvironmentReport);
EnvironmentReportSchema.index({ latitude: 1, longitude: 1, createdAt: -1 });

@Schema({ timestamps: true, collection: 'food_safety_reports' })
export class FoodSafetyReport {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  reporter: Types.ObjectId;
  @Prop({ required: true }) barcode: string;
  @Prop() productName?: string;
  @Prop({ required: true, enum: ['strange_smell', 'expired', 'wrong_packaging', 'mold', 'foreign_object', 'fake_product', 'food_poisoning', 'other'] }) issueType: string;
  @Prop() batchNumber?: string;
  @Prop() purchaseLocation?: string;
  @Prop() purchaseState?: string;
  @Prop({ maxlength: 2000 }) description?: string;
  @Prop() symptoms?: string;
  @Prop() photoUrl?: string;
  @Prop({ enum: ['submitted', 'under_review', 'confirmed', 'resolved', 'rejected'], default: 'submitted' }) status: string;
}

export type FoodSafetyReportDocument = FoodSafetyReport & Document;
export const FoodSafetyReportSchema = SchemaFactory.createForClass(FoodSafetyReport);
FoodSafetyReportSchema.index({ barcode: 1, status: 1, createdAt: -1 });
