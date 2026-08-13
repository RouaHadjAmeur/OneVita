import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { Booking, BookingSchema } from './schemas/booking.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Pet, PetSchema } from '../pets/schemas/pet.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import {
  PetSitter,
  PetSitterSchema,
} from '../pet-sitters/schemas/pet-sitter.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Booking.name, schema: BookingSchema },
      { name: User.name, schema: UserSchema },
      { name: Pet.name, schema: PetSchema },
      { name: PetSitter.name, schema: PetSitterSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
