import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HumanHealthController } from './human-health.controller';
import { HumanHealthService } from './human-health.service';
import {
  HumanHealthProfile,
  HumanHealthProfileSchema,
} from './schemas/human-health-profile.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: HumanHealthProfile.name, schema: HumanHealthProfileSchema },
    ]),
  ],
  controllers: [HumanHealthController],
  providers: [HumanHealthService],
  exports: [HumanHealthService],
})
export class HumanHealthModule {}
