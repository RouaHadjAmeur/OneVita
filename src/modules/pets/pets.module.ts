// src/modules/pets/pets.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PetsController } from './pets.controller';
import { PetsService } from './pets.service';
import { Pet, PetSchema } from './schemas/pet.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import {
  MedicalHistory,
  MedicalHistorySchema,
} from './schemas/medical-history.schema';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { AiModule } from '../ai/ai.module';
import { Booking, BookingSchema } from '../bookings/schemas/booking.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Pet.name, schema: PetSchema },
      { name: User.name, schema: UserSchema },
      { name: MedicalHistory.name, schema: MedicalHistorySchema },
      { name: Booking.name, schema: BookingSchema },
    ]),
    CloudinaryModule,
    AiModule,
  ],
  controllers: [PetsController],
  providers: [PetsService],
  exports: [PetsService],
})
export class PetsModule {}
