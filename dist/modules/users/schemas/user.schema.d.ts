import { Document, Types } from 'mongoose';
export type UserDocument = User & Document;
export declare class User extends Document {
    _id: Types.ObjectId;
    email: string;
    phoneNumber?: string;
    country?: string;
    city?: string;
    name: string;
    password: string;
    profileImage?: string;
    hasPhoto?: boolean;
    role: string;
    balance: number;
    isVerified: boolean;
    hasActiveSubscription: boolean;
    verificationCode?: string;
    verificationCodeExpires?: Date;
    pendingEmail?: string;
    emailChangeCode?: string;
    emailChangeCodeExpires?: Date;
    passwordResetCode?: string;
    passwordResetCodeExpires?: Date;
    refreshToken?: string;
    hashedRefreshToken?: string;
    specializations?: string[];
    clinicName?: string;
    clinicAddress?: string;
    Location?: string;
    licenseNumber?: string;
    yearsOfExperience?: number;
    bio?: string;
    latitude?: number;
    longitude?: number;
    services?: string[];
    hourlyRate?: number;
    availableWeekends?: boolean;
    canHostPets?: boolean;
    availability?: Date[];
    pets: Types.ObjectId[];
    hasPets?: boolean;
    provider: 'local' | 'google' | 'apple';
    providerId?: string;
    fcmToken?: string;
}
export declare const UserSchema: import("mongoose").Schema<User, import("mongoose").Model<User, any, any, any, Document<unknown, any, User, any, {}> & User & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, User, Document<unknown, {}, import("mongoose").FlatRecord<User>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<User> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
