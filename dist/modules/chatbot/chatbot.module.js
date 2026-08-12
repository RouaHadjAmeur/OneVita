"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatbotModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const chatbot_controller_1 = require("./chatbot.controller");
const chatbot_service_1 = require("./chatbot.service");
const chatbot_gemini_service_1 = require("./chatbot-gemini.service");
const ai_module_1 = require("../ai/ai.module");
const cloudinary_module_1 = require("../cloudinary/cloudinary.module");
const pet_schema_1 = require("../pets/schemas/pet.schema");
const medical_history_schema_1 = require("../pets/schemas/medical-history.schema");
const user_schema_1 = require("../users/schemas/user.schema");
const chatbot_message_schema_1 = require("./schemas/chatbot-message.schema");
const human_health_profile_schema_1 = require("../human-health/schemas/human-health-profile.schema");
const environment_report_schema_1 = require("../environment-care/schemas/environment-report.schema");
let ChatbotModule = class ChatbotModule {
};
exports.ChatbotModule = ChatbotModule;
exports.ChatbotModule = ChatbotModule = __decorate([
    (0, common_1.Module)({
        imports: [
            ai_module_1.AiModule,
            cloudinary_module_1.CloudinaryModule,
            mongoose_1.MongooseModule.forFeature([
                { name: user_schema_1.User.name, schema: user_schema_1.UserSchema },
                { name: pet_schema_1.Pet.name, schema: pet_schema_1.PetSchema },
                { name: medical_history_schema_1.MedicalHistory.name, schema: medical_history_schema_1.MedicalHistorySchema },
                { name: chatbot_message_schema_1.ChatbotMessage.name, schema: chatbot_message_schema_1.ChatbotMessageSchema },
                { name: human_health_profile_schema_1.HumanHealthProfile.name, schema: human_health_profile_schema_1.HumanHealthProfileSchema },
                { name: environment_report_schema_1.EnvironmentReport.name, schema: environment_report_schema_1.EnvironmentReportSchema },
                { name: environment_report_schema_1.FoodSafetyReport.name, schema: environment_report_schema_1.FoodSafetyReportSchema },
            ]),
        ],
        controllers: [chatbot_controller_1.ChatbotController],
        providers: [chatbot_service_1.ChatbotService, chatbot_gemini_service_1.ChatbotGeminiService],
        exports: [chatbot_service_1.ChatbotService],
    })
], ChatbotModule);
//# sourceMappingURL=chatbot.module.js.map