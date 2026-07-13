"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VeterinariansModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const veterinarians_service_1 = require("./veterinarians.service");
const veterinarians_controller_1 = require("./veterinarians.controller");
const user_schema_1 = require("../users/schemas/user.schema");
const veterinarian_schema_1 = require("./schemas/veterinarian.schema");
const users_module_1 = require("../users/users.module");
const mail_module_1 = require("../mail/mail.module");
const cloudinary_module_1 = require("../cloudinary/cloudinary.module");
let VeterinariansModule = class VeterinariansModule {
};
exports.VeterinariansModule = VeterinariansModule;
exports.VeterinariansModule = VeterinariansModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: user_schema_1.User.name, schema: user_schema_1.UserSchema },
                { name: veterinarian_schema_1.Veterinarian.name, schema: veterinarian_schema_1.VeterinarianSchema },
            ]),
            users_module_1.UsersModule,
            mail_module_1.MailModule,
            cloudinary_module_1.CloudinaryModule,
        ],
        controllers: [veterinarians_controller_1.VeterinariansController],
        providers: [veterinarians_service_1.VeterinariansService],
        exports: [veterinarians_service_1.VeterinariansService],
    })
], VeterinariansModule);
//# sourceMappingURL=veterinarians.module.js.map