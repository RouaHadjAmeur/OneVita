// src/modules/veterinarians/veterinarians.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VeterinariansService } from './veterinarians.service';
import { VeterinariansController } from './veterinarians.controller';
import { User, UserSchema } from '../users/schemas/user.schema';
import {
  Veterinarian,
  VeterinarianSchema,
} from './schemas/veterinarian.schema';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Veterinarian.name, schema: VeterinarianSchema },
    ]),
    UsersModule,
    MailModule,
    CloudinaryModule,
  ],
  controllers: [VeterinariansController],
  providers: [VeterinariansService],
  exports: [VeterinariansService],
})
export class VeterinariansModule {}
