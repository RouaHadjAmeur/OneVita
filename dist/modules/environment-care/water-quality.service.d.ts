import { Model } from 'mongoose';
import { EnvironmentReportDocument } from './schemas/environment-report.schema';
type WaterStatus = 'NORMAL' | 'MODERATE' | 'WARNING' | 'HIGH_RISK';
export declare class WaterQualityService {
    private readonly reports;
    private readonly collectionId;
    private token?;
    constructor(reports: Model<EnvironmentReportDocument>);
    getConditions(latitude: number, longitude: number): Promise<{
        requestedLocation: {
            latitude: number;
            longitude: number;
        };
        waterBodies: {
            id: string;
            name: string;
            latitude: number;
            longitude: number;
            observationDate: any;
            source: {
                provider: string;
                product: string;
                collectionId: string;
                resolutionMeters: number;
            };
            status: WaterStatus;
            statusMethod: string;
            indicators: {
                turbidity: {
                    name: string;
                    value: number;
                    unit: string;
                    available: boolean;
                };
                chlorophyllA: {
                    name: string;
                    value: number;
                    unit: string;
                    available: boolean;
                };
                suspendedMatter: {
                    name: string;
                    value: number;
                    unit: string;
                    available: boolean;
                };
                trophicStateIndex: {
                    name: string;
                    value: number;
                    unit: string;
                    available: boolean;
                };
                cyanobacteriaProbability: {
                    name: string;
                    value: number;
                    unit: string;
                    available: boolean;
                };
                waterClarity: {
                    name: string;
                    value: number;
                    unit: string;
                    available: boolean;
                };
                validObservations: {
                    name: string;
                    value: number;
                    unit: string;
                    available: boolean;
                };
            };
            limitations: string[];
        }[];
        citizenReports: {
            id: string;
            category: any;
            status: any;
            severity: any;
            latitude: any;
            longitude: any;
            address: any;
            mediaUrl: any;
            createdAt: any;
        }[];
        officialMonitoring: any[];
        disclaimer: string;
        generatedAt: string;
    }>;
    private accessToken;
    private fetchCopernicus;
    private latestIndicators;
    private indicator;
    private status;
    private nearbyCitizenReports;
}
export {};
