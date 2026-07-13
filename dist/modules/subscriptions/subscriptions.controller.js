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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionsController = void 0;
const common_1 = require("@nestjs/common");
const subscriptions_service_1 = require("./subscriptions.service");
const create_subscription_dto_1 = require("./dto/create-subscription.dto");
const verify_email_dto_1 = require("./dto/verify-email.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const subscription_schema_1 = require("./schemas/subscription.schema");
const stripe_1 = __importDefault(require("stripe"));
const config_1 = require("@nestjs/config");
let SubscriptionsController = class SubscriptionsController {
    constructor(subscriptionsService, configService) {
        this.subscriptionsService = subscriptionsService;
        this.configService = configService;
        this.stripeWebhookSecret =
            this.configService.get('STRIPE_WEBHOOK_SECRET') || '';
    }
    async create(user, createSubscriptionDto) {
        return this.subscriptionsService.create(user._id.toString(), createSubscriptionDto);
    }
    async getMySubscription(user) {
        const subscription = await this.subscriptionsService.findByUserId(user._id.toString());
        if (!subscription) {
            return {
                id: '',
                userId: user._id.toString(),
                role: user.role || 'owner',
                status: subscription_schema_1.SubscriptionStatus.NONE,
                stripeSubscriptionId: null,
                stripeCustomerId: null,
                currentPeriodStart: null,
                currentPeriodEnd: null,
                cancelAtPeriodEnd: null,
                createdAt: null,
                updatedAt: null,
            };
        }
        return subscription;
    }
    async cancel(user) {
        return this.subscriptionsService.cancel(user._id.toString());
    }
    async confirm(user) {
        return this.subscriptionsService.confirmPayment(user._id.toString());
    }
    async reactivate(user) {
        return this.subscriptionsService.reactivate(user._id.toString());
    }
    async renew(user) {
        return this.subscriptionsService.renew(user._id.toString());
    }
    async updateRole(user, body) {
        return this.subscriptionsService.updateSubscriptionRole(user._id.toString(), body.role);
    }
    async activatePending(user) {
        return this.subscriptionsService.activatePendingSubscription(user._id.toString());
    }
    async verifyEmail(user, verifyEmailDto) {
        const subscription = await this.subscriptionsService.findByUserId(user._id.toString());
        if (!subscription) {
            return {
                success: false,
                message: 'No subscription found',
                subscription: undefined,
            };
        }
        return {
            success: true,
            message: 'Subscription is already active. Email verification is no longer required.',
            subscription,
        };
    }
    async resendVerification(user) {
        return {
            message: 'Email verification is no longer required. Your subscription will activate automatically upon payment.',
        };
    }
    async getBillingHistory(user) {
        return this.subscriptionsService.getBillingHistory(user._id.toString());
    }
    async createSetupIntent(user) {
        return this.subscriptionsService.createSetupIntent(user._id.toString());
    }
    async updatePaymentMethod(user, body) {
        return this.subscriptionsService.updatePaymentMethod(user._id.toString(), body.paymentMethodId);
    }
    async handleWebhook(req) {
        const sig = req.headers['stripe-signature'];
        if (!sig) {
            console.error('Missing stripe-signature header');
            return { received: false };
        }
        if (!this.stripeWebhookSecret) {
            console.warn('STRIPE_WEBHOOK_SECRET not configured. Webhook verification skipped.');
            return { received: true };
        }
        let event;
        try {
            const stripe = new stripe_1.default(this.configService.get('STRIPE_SECRET_KEY') || '', { apiVersion: '2025-11-17.clover' });
            const rawBody = req.rawBody;
            if (!rawBody) {
                throw new Error('Missing raw body');
            }
            event = stripe.webhooks.constructEvent(rawBody, sig, this.stripeWebhookSecret);
        }
        catch (err) {
            console.error('Webhook signature verification failed:', err.message);
            return { received: false };
        }
        try {
            await this.subscriptionsService.handleStripeWebhook(event);
        }
        catch (error) {
            console.error('Error handling webhook event:', error);
            return { received: true };
        }
        return { received: true };
    }
};
exports.SubscriptionsController = SubscriptionsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_subscription_dto_1.CreateSubscriptionDto]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getMySubscription", null);
__decorate([
    (0, common_1.Post)('cancel'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)('confirm'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "confirm", null);
__decorate([
    (0, common_1.Post)('reactivate'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "reactivate", null);
__decorate([
    (0, common_1.Post)('renew'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "renew", null);
__decorate([
    (0, common_1.Post)('update-role'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "updateRole", null);
__decorate([
    (0, common_1.Post)('activate-pending'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "activatePending", null);
__decorate([
    (0, common_1.Post)('verify-email'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, verify_email_dto_1.VerifyEmailDto]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "verifyEmail", null);
__decorate([
    (0, common_1.Post)('resend-verification'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "resendVerification", null);
__decorate([
    (0, common_1.Get)('billing-history'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getBillingHistory", null);
__decorate([
    (0, common_1.Post)('setup-intent'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "createSetupIntent", null);
__decorate([
    (0, common_1.Post)('update-payment-method'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "updatePaymentMethod", null);
__decorate([
    (0, common_1.Post)('webhook'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "handleWebhook", null);
exports.SubscriptionsController = SubscriptionsController = __decorate([
    (0, common_1.Controller)('subscriptions'),
    __metadata("design:paramtypes", [subscriptions_service_1.SubscriptionsService,
        config_1.ConfigService])
], SubscriptionsController);
//# sourceMappingURL=subscriptions.controller.js.map