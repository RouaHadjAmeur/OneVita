import { Document, Types } from 'mongoose';
export type BookingDocument = Booking & Document;
export declare class Booking {
    owner: Types.ObjectId;
    provider: Types.ObjectId;
    providerType: string;
    pet?: Types.ObjectId;
    serviceType: string;
    description?: string;
    dateTime: Date;
    duration?: number;
    price?: number;
    paymentStatus?: string;
    status: string;
    rejectionReason?: string;
    completedAt?: Date;
    cancelledAt?: Date;
    cancellationReason?: string;
    providerNote?: string;
    rescheduleProposedAt?: Date;
    ownerRespondedAt?: Date;
}
export declare const BookingSchema: import("mongoose").Schema<Booking, import("mongoose").Model<Booking, any, any, any, Document<unknown, any, Booking, any, {}> & Booking & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Booking, Document<unknown, {}, import("mongoose").FlatRecord<Booking>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<Booking> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
