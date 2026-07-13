import { Document, Types } from 'mongoose';
export type SubscriptionDocument = Subscription & Document;
export declare enum SubscriptionStatus {
    PENDING = "pending",
    ACTIVE = "active",
    EXPIRES_SOON = "expires_soon",
    CANCELED = "canceled",
    EXPIRED = "expired",
    NONE = "none"
}
export declare class Subscription extends Document {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    role: string;
    status: SubscriptionStatus;
    stripeSubscriptionId?: string;
    stripeCustomerId?: string;
    stripePaymentIntentId?: string;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
export declare const SubscriptionSchema: import("mongoose").Schema<Subscription, import("mongoose").Model<Subscription, any, any, any, Document<unknown, any, Subscription, any, {}> & Subscription & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Subscription, Document<unknown, {}, import("mongoose").FlatRecord<Subscription>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<Subscription> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
