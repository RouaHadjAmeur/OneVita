import { Model } from 'mongoose';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { BookingDocument } from './schemas/booking.schema';
import { PetDocument } from '../pets/schemas/pet.schema';
import { NotificationsService } from '../notifications/notifications.service';
export declare class BookingsService {
    private readonly bookingModel;
    private readonly petModel;
    private readonly notificationsService;
    constructor(bookingModel: Model<BookingDocument>, petModel: Model<PetDocument>, notificationsService: NotificationsService);
    create(userId: string, createBookingDto: CreateBookingDto): Promise<BookingDocument>;
    findAll(userId: string, role?: 'owner' | 'provider'): Promise<BookingDocument[]>;
    findOne(id: string, userId: string): Promise<BookingDocument>;
    update(id: string, userId: string, updateBookingDto: UpdateBookingDto): Promise<BookingDocument>;
    remove(id: string, userId: string): Promise<void>;
}
