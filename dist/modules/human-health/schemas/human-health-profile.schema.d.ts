import { HydratedDocument, Types } from 'mongoose';
export declare class HealthMetric {
    _id: Types.ObjectId;
    type: string;
    value: number;
    unit: string;
    recordedAt: Date;
}
export declare const HealthMetricSchema: import("mongoose").Schema<HealthMetric, import("mongoose").Model<HealthMetric, any, any, any, import("mongoose").Document<unknown, any, HealthMetric, any, {}> & HealthMetric & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, HealthMetric, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<HealthMetric>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<HealthMetric> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class HumanMedication {
    _id: Types.ObjectId;
    name: string;
    dosage: string;
    schedule: string;
    notes?: string;
    active: boolean;
    adherenceHistory: Date[];
}
export declare const HumanMedicationSchema: import("mongoose").Schema<HumanMedication, import("mongoose").Model<HumanMedication, any, any, any, import("mongoose").Document<unknown, any, HumanMedication, any, {}> & HumanMedication & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, HumanMedication, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<HumanMedication>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<HumanMedication> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class HumanMedicalRecord {
    _id: Types.ObjectId;
    category: string;
    title: string;
    details: string;
    date: Date;
}
export declare const HumanMedicalRecordSchema: import("mongoose").Schema<HumanMedicalRecord, import("mongoose").Model<HumanMedicalRecord, any, any, any, import("mongoose").Document<unknown, any, HumanMedicalRecord, any, {}> & HumanMedicalRecord & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, HumanMedicalRecord, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<HumanMedicalRecord>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<HumanMedicalRecord> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class HumanAppointment {
    _id: Types.ObjectId;
    provider: string;
    reason: string;
    date: Date;
    location?: string;
}
export declare const HumanAppointmentSchema: import("mongoose").Schema<HumanAppointment, import("mongoose").Model<HumanAppointment, any, any, any, import("mongoose").Document<unknown, any, HumanAppointment, any, {}> & HumanAppointment & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, HumanAppointment, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<HumanAppointment>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<HumanAppointment> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class EmergencyHealthProfile {
    bloodType: string;
    allergies: string[];
    chronicConditions: string[];
    emergencyContactName: string;
    emergencyContactPhone: string;
}
export declare const EmergencyHealthProfileSchema: import("mongoose").Schema<EmergencyHealthProfile, import("mongoose").Model<EmergencyHealthProfile, any, any, any, import("mongoose").Document<unknown, any, EmergencyHealthProfile, any, {}> & EmergencyHealthProfile & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, EmergencyHealthProfile, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<EmergencyHealthProfile>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<EmergencyHealthProfile> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export declare class HumanHealthProfile {
    user: Types.ObjectId;
    metrics: HealthMetric[];
    medications: HumanMedication[];
    records: HumanMedicalRecord[];
    appointments: HumanAppointment[];
    emergencyProfile: EmergencyHealthProfile;
}
export type HumanHealthProfileDocument = HydratedDocument<HumanHealthProfile>;
export declare const HumanHealthProfileSchema: import("mongoose").Schema<HumanHealthProfile, import("mongoose").Model<HumanHealthProfile, any, any, any, import("mongoose").Document<unknown, any, HumanHealthProfile, any, {}> & HumanHealthProfile & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, HumanHealthProfile, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<HumanHealthProfile>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<HumanHealthProfile> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
