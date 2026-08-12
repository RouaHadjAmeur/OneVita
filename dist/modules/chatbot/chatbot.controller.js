"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatbotController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const user_schema_1 = require("../users/schemas/user.schema");
const chatbot_service_1 = require("./chatbot.service");
const chatbot_image_analysis_dto_1 = require("./dto/chatbot-image-analysis.dto");
let ChatbotController = class ChatbotController {
    constructor(chatbotService) {
        this.chatbotService = chatbotService;
    }
    async sendMessage(user, body, imageFile) {
        const userId = String(user._id ?? user.id);
        let imageBase64;
        if (imageFile) {
            imageBase64 = `data:${imageFile.mimetype};base64,${imageFile.buffer.toString('base64')}`;
        }
        else if (body?.image && typeof body.image === 'string') {
            imageBase64 = body.image;
        }
        const messageDto = {
            message: body.message,
            context: body.context,
            mode: body.mode ?? 'global',
            ...(imageBase64 && { image: imageBase64 }),
        };
        return this.chatbotService.processMessage(userId, messageDto);
    }
    async analyzeImage(user, body, imageFile) {
        const userId = String(user._id ?? user.id);
        let imageBase64;
        if (imageFile) {
            imageBase64 = `data:${imageFile.mimetype};base64,${imageFile.buffer.toString('base64')}`;
        }
        else if (body?.image && typeof body.image === 'string') {
            imageBase64 = body.image;
        }
        else {
            throw new common_1.BadRequestException('Image is required. Provide either a file upload (multipart/form-data) or base64 string in body.');
        }
        const imageAnalysisDto = {
            image: imageBase64,
            prompt: body?.prompt,
        };
        return this.chatbotService.analyzeImage(userId, imageAnalysisDto);
    }
    async analyzeImageBase64(user, imageAnalysisDto) {
        const userId = String(user._id ?? user.id);
        return this.chatbotService.analyzeImage(userId, imageAnalysisDto);
    }
    async getHistory(user, limit, offset) {
        const userId = String(user._id ?? user.id);
        return this.chatbotService.getHistory(userId, limit, offset);
    }
    async clearHistory(user) {
        const userId = String(user._id ?? user.id);
        return this.chatbotService.clearHistory(userId);
    }
};
exports.ChatbotController = ChatbotController;
__decorate([
    (0, common_1.Post)('message'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('image')),
    (0, swagger_1.ApiConsumes)('multipart/form-data', 'application/json'),
    (0, swagger_1.ApiOperation)({
        summary: 'Send a text message to the chatbot (with optional image)',
        description: 'Get an AI-powered response to a text message. Can include an image for analysis. The chatbot has access to your pet information and conversation history for context.',
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                message: {
                    type: 'string',
                    description: 'User message text',
                    example: 'What should I feed my dog?',
                },
                image: {
                    type: 'string',
                    format: 'binary',
                    description: 'Optional image file to analyze along with the message',
                },
                context: {
                    type: 'string',
                    description: 'Optional conversation context',
                },
                mode: {
                    type: 'string',
                    enum: ['global', 'pet', 'human', 'environment'],
                    description: 'Care mode; global can route across all OneVita modules',
                },
            },
            required: ['message'],
        },
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_schema_1.User, Object, Object]),
    __metadata("design:returntype", Promise)
], ChatbotController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Post)('analyze-image'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('image')),
    (0, swagger_1.ApiConsumes)('multipart/form-data', 'application/json'),
    (0, swagger_1.ApiOperation)({
        summary: 'Analyze a pet image',
        description: 'Upload an image and get AI-powered analysis of pet health, appearance, and recommendations.',
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                image: {
                    type: 'string',
                    format: 'binary',
                    description: 'Image file to analyze',
                },
                prompt: {
                    type: 'string',
                    description: 'Optional prompt/question about the image',
                    example: 'What health issues do you see?',
                },
            },
        },
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_schema_1.User, Object, Object]),
    __metadata("design:returntype", Promise)
], ChatbotController.prototype, "analyzeImage", null);
__decorate([
    (0, common_1.Post)('analyze-image-base64'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Analyze a pet image from base64 string',
        description: 'Send an image as base64 and get AI-powered analysis. Alternative to multipart upload.',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_schema_1.User,
        chatbot_image_analysis_dto_1.ChatbotImageAnalysisDto]),
    __metadata("design:returntype", Promise)
], ChatbotController.prototype, "analyzeImageBase64", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Get conversation history',
        description: 'Retrieve the conversation history for the current user. Messages are returned in chronological order.',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Maximum number of messages to return (default: 50)',
        example: 50,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'offset',
        required: false,
        type: Number,
        description: 'Number of messages to skip (for pagination, default: 0)',
        example: 0,
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(50), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('offset', new common_1.DefaultValuePipe(0), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_schema_1.User, Number, Number]),
    __metadata("design:returntype", Promise)
], ChatbotController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Delete)('history'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Clear conversation history',
        description: 'Delete all conversation history for the current user. This action cannot be undone.',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_schema_1.User]),
    __metadata("design:returntype", Promise)
], ChatbotController.prototype, "clearHistory", null);
exports.ChatbotController = ChatbotController = __decorate([
    (0, swagger_1.ApiTags)('chatbot'),
    (0, common_1.Controller)('chatbot'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [chatbot_service_1.ChatbotService])
], ChatbotController);
//# sourceMappingURL=chatbot.controller.js.map