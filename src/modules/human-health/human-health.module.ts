import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HumanHealthController } from './human-health.controller';
import { HumanHealthService } from './human-health.service';
import {
  HumanHealthProfile,
  HumanHealthProfileSchema,
} from './schemas/human-health-profile.schema';
import { Pet, PetSchema } from '../pets/schemas/pet.schema';
import {
  MedicalHistory,
  MedicalHistorySchema,
} from '../pets/schemas/medical-history.schema';
import { AiModule } from '../ai/ai.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: HumanHealthProfile.name, schema: HumanHealthProfileSchema },
      { name: Pet.name, schema: PetSchema },
      { name: MedicalHistory.name, schema: MedicalHistorySchema },
    ]),
    AiModule,
    NotificationsModule,
  ],
  controllers: [HumanHealthController],
  providers: [HumanHealthService],
  exports: [HumanHealthService],
})
export class HumanHealthModule {}
