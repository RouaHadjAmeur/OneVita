import { Document, Types } from 'mongoose';
export type EnvironmentReportDocument = EnvironmentReport & Document;
export declare class EnvironmentReport {
    reporter: Types.ObjectId;
    category: string;
    description: string;
    mediaUrl: string;
    mediaUploadStatus: string;
    mediaType: string;
    latitude: number;
    longitude: number;
    status: string;
    severity: string;
    authorityNote?: string;
}
export declare const EnvironmentReportSchema: import("mongoose").Schema<EnvironmentReport, import("mongoose").Model<EnvironmentReport, any, any, any, Document<unknown, any, EnvironmentReport, any, {}> & EnvironmentReport & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, EnvironmentReport, Document<unknown, {}, import("mongoose").FlatRecord<EnvironmentReport>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<EnvironmentReport> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export declare class FoodSafetyReport {
    reporter: Types.ObjectId;
    barcode: string;
    productName?: string;
    issueType: string;
    batchNumber?: string;
    purchaseLocation?: string;
    purchaseState?: string;
    description?: string;
    symptoms?: string;
    photoUrl?: string;
    status: string;
}
export type FoodSafetyReportDocument = FoodSafetyReport & Document;
export declare const FoodSafetyReportSchema: import("mongoose").Schema<FoodSafetyReport, import("mongoose").Model<FoodSafetyReport, any, any, any, Document<unknown, any, FoodSafetyReport, any, {}> & FoodSafetyReport & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, FoodSafetyReport, Document<unknown, {}, import("mongoose").FlatRecord<FoodSafetyReport>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<FoodSafetyReport> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
