export declare class CreateBookingDto {
    providerId: string;
    providerType: 'vet' | 'sitter';
    petId: string;
    serviceType: string;
    description?: string;
    dateTime: string;
    duration?: number;
    price?: number;
}
