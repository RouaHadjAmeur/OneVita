export declare class UpdateBookingDto {
    status?: 'pending' | 'reschedule_pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
    rejectionReason?: string;
    cancellationReason?: string;
    providerNote?: string;
    dateTime?: string;
}
