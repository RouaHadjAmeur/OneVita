"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HumanHealthModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const human_health_controller_1 = require("./human-health.controller");
const human_health_service_1 = require("./human-health.service");
const human_health_profile_schema_1 = require("./schemas/human-health-profile.schema");
const pet_schema_1 = require("../pets/schemas/pet.schema");
const medical_history_schema_1 = require("../pets/schemas/medical-history.schema");
const ai_module_1 = require("../ai/ai.module");
const notifications_module_1 = require("../notifications/notifications.module");
let HumanHealthModule = class HumanHealthModule {
};
exports.HumanHealthModule = HumanHealthModule;
exports.HumanHealthModule = HumanHealthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: human_health_profile_schema_1.HumanHealthProfile.name, schema: human_health_profile_schema_1.HumanHealthProfileSchema },
                { name: pet_schema_1.Pet.name, schema: pet_schema_1.PetSchema },
                { name: medical_history_schema_1.MedicalHistory.name, schema: medical_history_schema_1.MedicalHistorySchema },
            ]),
            ai_module_1.AiModule,
            notifications_module_1.NotificationsModule,
        ],
        controllers: [human_health_controller_1.HumanHealthController],
        providers: [human_health_service_1.HumanHealthService],
        exports: [human_health_service_1.HumanHealthService],
    })
], HumanHealthModule);
//# sourceMappingURL=human-health.module.js.map