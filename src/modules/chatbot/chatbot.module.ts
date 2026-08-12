// src/modules/chatbot/chatbot.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { ChatbotGeminiService } from './chatbot-gemini.service';
import { AiModule } from '../ai/ai.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { Pet, PetSchema } from '../pets/schemas/pet.schema';
import {
  MedicalHistory,
  MedicalHistorySchema,
} from '../pets/schemas/medical-history.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import {
  ChatbotMessage,
  ChatbotMessageSchema,
} from './schemas/chatbot-message.schema';
import {
  HumanHealthProfile,
  HumanHealthProfileSchema,
} from '../human-health/schemas/human-health-profile.schema';
import {
  EnvironmentReport,
  EnvironmentReportSchema,
  FoodSafetyReport,
  FoodSafetyReportSchema,
} from '../environment-care/schemas/environment-report.schema';

@Module({
  imports: [
    AiModule, // Provides GeminiService
    CloudinaryModule, // Provides CloudinaryService for image uploads
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Pet.name, schema: PetSchema },
      { name: MedicalHistory.name, schema: MedicalHistorySchema },
      { name: ChatbotMessage.name, schema: ChatbotMessageSchema },
      { name: HumanHealthProfile.name, schema: HumanHealthProfileSchema },
      { name: EnvironmentReport.name, schema: EnvironmentReportSchema },
      { name: FoodSafetyReport.name, schema: FoodSafetyReportSchema },
    ]),
  ],
  controllers: [ChatbotController],
  providers: [ChatbotService, ChatbotGeminiService],
  exports: [ChatbotService],
})
export class ChatbotModule {}
