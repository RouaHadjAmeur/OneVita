export declare class UpdateBookingDto {
    status?: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
    rejectionReason?: string;
    cancellationReason?: string;
    providerNote?: string;
    dateTime?: string;
}
