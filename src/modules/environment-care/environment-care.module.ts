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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Pet.name, schema: PetSchema },
      { name: HumanHealthProfile.name, schema: HumanHealthProfileSchema },
    ]),
  ],
  controllers: [EnvironmentCareController],
  providers: [EnvironmentCareService],
})
export class EnvironmentCareModule {}
