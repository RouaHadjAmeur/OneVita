import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ _id: true, timestamps: true })
export class HealthMetric {
  _id: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 80 })
  type: string;

  @Prop({ required: true })
  value: number;

  @Prop({ required: true, trim: true, maxlength: 30 })
  unit: string;

  @Prop({ required: true, type: Date })
  recordedAt: Date;
}

export const HealthMetricSchema = SchemaFactory.createForClass(HealthMetric);

@Schema({ _id: true, timestamps: true })
export class HumanMedication {
  _id: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 160 })
  name: string;

  @Prop({ required: true, trim: true, maxlength: 100 })
  dosage: string;

  @Prop({ required: true, trim: true, maxlength: 160 })
  schedule: string;

  @Prop({ trim: true, maxlength: 1000 })
  notes?: string;

  @Prop({ default: true })
  active: boolean;

  @Prop({ type: [Date], default: [] })
  adherenceHistory: Date[];
}

export const HumanMedicationSchema =
  SchemaFactory.createForClass(HumanMedication);

@Schema({ _id: true, timestamps: true })
export class HumanMedicalRecord {
  _id: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 80 })
  category: string;

  @Prop({ required: true, trim: true, maxlength: 200 })
  title: string;

  @Prop({ trim: true, maxlength: 5000, default: '' })
  details: string;

  @Prop({ required: true, type: Date })
  date: Date;
}

export const HumanMedicalRecordSchema =
  SchemaFactory.createForClass(HumanMedicalRecord);

@Schema({ _id: true, timestamps: true })
export class HumanAppointment {
  _id: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 200 })
  provider: string;

  @Prop({ required: true, trim: true, maxlength: 1000 })
  reason: string;

  @Prop({ required: true, type: Date })
  date: Date;

  @Prop({ trim: true, maxlength: 300 })
  location?: string;
}

export const HumanAppointmentSchema =
  SchemaFactory.createForClass(HumanAppointment);

@Schema({ _id: false })
export class EmergencyHealthProfile {
  @Prop({ trim: true, maxlength: 10, default: '' })
  bloodType: string;

  @Prop({ type: [String], default: [] })
  allergies: string[];

  @Prop({ type: [String], default: [] })
  chronicConditions: string[];

  @Prop({ trim: true, maxlength: 160, default: '' })
  emergencyContactName: string;

  @Prop({ trim: true, maxlength: 40, default: '' })
  emergencyContactPhone: string;
}

export const EmergencyHealthProfileSchema = SchemaFactory.createForClass(
  EmergencyHealthProfile,
);

@Schema({ timestamps: true, collection: 'human_health_profiles' })
export class HumanHealthProfile {
  @Prop({
    required: true,
    type: Types.ObjectId,
    ref: 'User',
    unique: true,
    index: true,
  })
  user: Types.ObjectId;

  @Prop({ type: [HealthMetricSchema], default: [] })
  metrics: HealthMetric[];

  @Prop({ type: [HumanMedicationSchema], default: [] })
  medications: HumanMedication[];

  @Prop({ type: [HumanMedicalRecordSchema], default: [] })
  records: HumanMedicalRecord[];

  @Prop({ type: [HumanAppointmentSchema], default: [] })
  appointments: HumanAppointment[];

  @Prop({
    type: EmergencyHealthProfileSchema,
    default: () => ({}),
  })
  emergencyProfile: EmergencyHealthProfile;
}

export type HumanHealthProfileDocument = HydratedDocument<HumanHealthProfile>;
export const HumanHealthProfileSchema =
  SchemaFactory.createForClass(HumanHealthProfile);

HumanHealthProfileSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_document, result) => {
    delete result.user;
    return result;
  },
});
