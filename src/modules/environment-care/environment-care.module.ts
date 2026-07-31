import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Pet, PetSchema } from '../pets/schemas/pet.schema';
import {
  HumanHealthProfile,
  HumanHealthProfileSchema,
} from '../human-health/schemas/human-health-profile.schema';
import { EnvironmentCareController } from './environment-care.controller';
import { EnvironmentCareService } from './environment-care.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import {
  EnvironmentReport,
  EnvironmentReportSchema,
  FoodSafetyReport,
  FoodSafetyReportSchema,
} from './schemas/environment-report.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Pet.name, schema: PetSchema },
      { name: HumanHealthProfile.name, schema: HumanHealthProfileSchema },
      { name: EnvironmentReport.name, schema: EnvironmentReportSchema },
      { name: FoodSafetyReport.name, schema: FoodSafetyReportSchema },
    ]),
    CloudinaryModule,
  ],
  controllers: [EnvironmentCareController],
  providers: [EnvironmentCareService],
})
export class EnvironmentCareModule {}
