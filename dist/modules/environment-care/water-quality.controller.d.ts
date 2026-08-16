import { WaterQualityService } from './water-quality.service';
export declare class WaterQualityController {
    private readonly waterQuality;
    constructor(waterQuality: WaterQualityService);
    get(lat: string, lng: string): Promise<{
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
            status: "WARNING" | "NORMAL" | "MODERATE" | "HIGH_RISK";
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
}
