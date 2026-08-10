"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const users_module_1 = require("./modules/users/users.module");
const auth_module_1 = require("./modules/auth/auth.module");
const pets_module_1 = require("./modules/pets/pets.module");
const veterinarians_module_1 = require("./modules/veterinarians/veterinarians.module");
const pet_sitters_module_1 = require("./modules/pet-sitters/pet-sitters.module");
const mongoose_1 = require("@nestjs/mongoose");
const config_1 = require("@nestjs/config");
const mail_module_1 = require("./modules/mail/mail.module");
const messages_module_1 = require("./modules/messages/messages.module");
const bookings_module_1 = require("./modules/bookings/bookings.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const ai_module_1 = require("./modules/ai/ai.module");
const fcm_module_1 = require("./modules/fcm/fcm.module");
const chatbot_module_1 = require("./modules/chatbot/chatbot.module");
const community_module_1 = require("./modules/community/community.module");
const human_health_module_1 = require("./modules/human-health/human-health.module");
const environment_care_module_1 = require("./modules/environment-care/environment-care.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            mongoose_1.MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://localhost/rifq'),
            users_module_1.UsersModule,
            auth_module_1.AuthModule,
            pets_module_1.PetsModule,
            veterinarians_module_1.VeterinariansModule,
            pet_sitters_module_1.PetSittersModule,
            mail_module_1.MailModule,
            messages_module_1.MessagesModule,
            notifications_module_1.NotificationsModule,
            bookings_module_1.BookingsModule,
            ai_module_1.AiModule,
            fcm_module_1.FcmModule,
            chatbot_module_1.ChatbotModule,
            community_module_1.CommunityModule,
            human_health_module_1.HumanHealthModule,
            environment_care_module_1.EnvironmentCareModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map