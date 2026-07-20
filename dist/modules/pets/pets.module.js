"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PetsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const pets_controller_1 = require("./pets.controller");
const pets_service_1 = require("./pets.service");
const pet_schema_1 = require("./schemas/pet.schema");
const user_schema_1 = require("../users/schemas/user.schema");
const medical_history_schema_1 = require("./schemas/medical-history.schema");
const cloudinary_module_1 = require("../cloudinary/cloudinary.module");
const ai_module_1 = require("../ai/ai.module");
const booking_schema_1 = require("../bookings/schemas/booking.schema");
let PetsModule = class PetsModule {
};
exports.PetsModule = PetsModule;
exports.PetsModule = PetsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: pet_schema_1.Pet.name, schema: pet_schema_1.PetSchema },
                { name: user_schema_1.User.name, schema: user_schema_1.UserSchema },
                { name: medical_history_schema_1.MedicalHistory.name, schema: medical_history_schema_1.MedicalHistorySchema },
                { name: booking_schema_1.Booking.name, schema: booking_schema_1.BookingSchema },
            ]),
            cloudinary_module_1.CloudinaryModule,
            ai_module_1.AiModule,
        ],
        controllers: [pets_controller_1.PetsController],
        providers: [pets_service_1.PetsService],
        exports: [pets_service_1.PetsService],
    })
], PetsModule);
//# sourceMappingURL=pets.module.js.map