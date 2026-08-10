"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvironmentCareModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const user_schema_1 = require("../users/schemas/user.schema");
const pet_schema_1 = require("../pets/schemas/pet.schema");
const human_health_profile_schema_1 = require("../human-health/schemas/human-health-profile.schema");
const environment_care_controller_1 = require("./environment-care.controller");
const environment_care_service_1 = require("./environment-care.service");
const cloudinary_module_1 = require("../cloudinary/cloudinary.module");
const environment_report_schema_1 = require("./schemas/environment-report.schema");
let EnvironmentCareModule = class EnvironmentCareModule {
};
exports.EnvironmentCareModule = EnvironmentCareModule;
exports.EnvironmentCareModule = EnvironmentCareModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: user_schema_1.User.name, schema: user_schema_1.UserSchema },
                { name: pet_schema_1.Pet.name, schema: pet_schema_1.PetSchema },
                { name: human_health_profile_schema_1.HumanHealthProfile.name, schema: human_health_profile_schema_1.HumanHealthProfileSchema },
                { name: environment_report_schema_1.EnvironmentReport.name, schema: environment_report_schema_1.EnvironmentReportSchema },
                { name: environment_report_schema_1.FoodSafetyReport.name, schema: environment_report_schema_1.FoodSafetyReportSchema },
            ]),
            cloudinary_module_1.CloudinaryModule,
        ],
        controllers: [environment_care_controller_1.EnvironmentCareController],
        providers: [environment_care_service_1.EnvironmentCareService],
    })
], EnvironmentCareModule);
//# sourceMappingURL=environment-care.module.js.map