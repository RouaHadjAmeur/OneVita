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
exports.SubscriptionsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const config_1 = require("@nestjs/config");
const stripe_1 = __importDefault(require("stripe"));
const subscription_schema_1 = require("./schemas/subscription.schema");
const user_schema_1 = require("../users/schemas/user.schema");
const veterinarians_service_1 = require("../veterinarians/veterinarians.service");
const pet_sitters_service_1 = require("../pet-sitters/pet-sitters.service");
const mail_service_1 = require("../mail/mail.service");
let SubscriptionsService = class SubscriptionsService {
    constructor(subscriptionModel, userModel, configService, veterinariansService, petSittersService, mailService) {
        this.subscriptionModel = subscriptionModel;
        this.userModel = userModel;
        this.configService = configService;
        this.veterinariansService = veterinariansService;
        this.petSittersService = petSittersService;
        this.mailService = mailService;
        const stripeSecretKey = this.configService.get('STRIPE_SECRET_KEY');
        if (!stripeSecretKey) {
            console.warn('⚠️ STRIPE_SECRET_KEY not found. Stripe features will be disabled.');
        }
        else {
            console.log('✅ Initializing Stripe with secret key...');
            this.stripe = new stripe_1.default(stripeSecretKey, {
                apiVersion: '2025-11-17.clover',
            });
            console.log('✅ Stripe initialized successfully');
        }
        this.subscriptionPriceId = this.configService.get('STRIPE_SUBSCRIPTION_PRICE_ID', 'price_test_monthly_30');
        console.log(`📋 Using Stripe Price ID: ${this.subscriptionPriceId}`);
    }
    async create(userId, createSubscriptionDto) {
        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const existingSubscription = await this.subscriptionModel.findOne({
            userId: user._id,
            status: {
                $in: [
                    subscription_schema_1.SubscriptionStatus.ACTIVE,
                    subscription_schema_1.SubscriptionStatus.EXPIRES_SOON,
                ],
            },
        });
        if (existingSubscription) {
            throw new common_1.ConflictException('User already has an active subscription');
        }
        const canceledOrExpiredSubscription = await this.subscriptionModel.findOne({
            userId: user._id,
            status: {
                $in: [
                    subscription_schema_1.SubscriptionStatus.CANCELED,
                    subscription_schema_1.SubscriptionStatus.EXPIRED,
                    subscription_schema_1.SubscriptionStatus.PENDING,
                ],
            },
        });
        const isTestMode = !this.stripe;
        console.log(`🔍 Subscription Creation Mode: ${isTestMode ? 'TEST MODE' : 'PRODUCTION MODE'}`);
        console.log(`🔍 NODE_ENV: ${this.configService.get('NODE_ENV')}`);
        console.log(`🔍 Stripe initialized: ${!!this.stripe}`);
        let stripeSubscriptionId;
        let stripeCustomerId;
        let stripePaymentIntentId;
        let clientSecret;
        let currentPeriodStart;
        let currentPeriodEnd;
        if (isTestMode || !this.stripe) {
            console.log('⚠️ Running in TEST MODE - Subscription activated immediately');
            currentPeriodStart = new Date();
            currentPeriodEnd = new Date();
            currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
        }
        else {
            console.log('💳 Running in PRODUCTION MODE - Creating Stripe subscription...');
            try {
                let customer;
                if (user.email) {
                    const existingCustomers = await this.stripe.customers.list({
                        email: user.email,
                        limit: 1,
                    });
                    if (existingCustomers.data.length > 0) {
                        customer = existingCustomers.data[0];
                    }
                    else {
                        customer = await this.stripe.customers.create({
                            email: user.email,
                            name: user.name,
                            metadata: {
                                userId: user._id.toString(),
                            },
                        });
                    }
                }
                else {
                    throw new common_1.BadRequestException('User email is required for subscription');
                }
                stripeCustomerId = customer.id;
                const paymentIntent = await this.stripe.paymentIntents.create({
                    amount: 3000,
                    currency: 'usd',
                    customer: customer.id,
                    setup_future_usage: 'off_session',
                    metadata: {
                        userId: user._id.toString(),
                        subscriptionRole: createSubscriptionDto.role || 'premium',
                    },
                    automatic_payment_methods: {
                        enabled: true,
                    },
                });
                clientSecret = paymentIntent.client_secret || undefined;
                stripePaymentIntentId = paymentIntent.id;
                currentPeriodStart = new Date();
                currentPeriodEnd = new Date();
                currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
                console.log(`💳 Created PaymentIntent ${paymentIntent.id} for user ${user._id}`);
            }
            catch (error) {
                console.error('Stripe subscription creation error:', error);
                throw new common_1.BadRequestException(`Failed to create Stripe subscription: ${error.message}`);
            }
        }
        let savedSubscription;
        const finalStatus = (isTestMode || !this.stripe) ? subscription_schema_1.SubscriptionStatus.ACTIVE : subscription_schema_1.SubscriptionStatus.PENDING;
        if (canceledOrExpiredSubscription) {
            canceledOrExpiredSubscription.role = createSubscriptionDto.role || 'premium';
            canceledOrExpiredSubscription.status = finalStatus;
            canceledOrExpiredSubscription.stripeSubscriptionId = stripeSubscriptionId;
            canceledOrExpiredSubscription.stripeCustomerId = stripeCustomerId;
            canceledOrExpiredSubscription.stripePaymentIntentId = stripePaymentIntentId;
            canceledOrExpiredSubscription.currentPeriodStart = currentPeriodStart;
            canceledOrExpiredSubscription.currentPeriodEnd = currentPeriodEnd;
            canceledOrExpiredSubscription.cancelAtPeriodEnd = false;
            savedSubscription = await canceledOrExpiredSubscription.save();
        }
        else {
            const subscription = new this.subscriptionModel({
                userId: user._id,
                role: createSubscriptionDto.role || 'premium',
                status: finalStatus,
                stripeSubscriptionId,
                stripeCustomerId,
                stripePaymentIntentId,
                currentPeriodStart,
                currentPeriodEnd,
                cancelAtPeriodEnd: false,
            });
            savedSubscription = await subscription.save();
        }
        if (finalStatus === subscription_schema_1.SubscriptionStatus.ACTIVE) {
            console.log(`✅ Subscription activated immediately (test mode) for user ${userId}`);
            await this.userModel.findByIdAndUpdate(userId, {
                hasActiveSubscription: true,
            });
        }
        else {
            console.log(`⏳ Subscription pending payment confirmation for user ${userId}`);
            console.log(`💡 Subscription will be activated automatically via webhook when payment succeeds`);
        }
        return {
            subscription: this.mapToResponseDto(savedSubscription),
            clientSecret,
            message: clientSecret
                ? 'Please complete payment to activate your subscription. Your subscription will be activated immediately upon successful payment.'
                : 'Subscription activated successfully!',
        };
    }
    async findByUserId(userId) {
        const userObjectId = new mongoose_2.Types.ObjectId(userId);
        const subscription = await this.subscriptionModel.findOne({
            userId: userObjectId,
        });
        if (!subscription) {
            return null;
        }
        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        if ((subscription.status === subscription_schema_1.SubscriptionStatus.ACTIVE ||
            subscription.status === subscription_schema_1.SubscriptionStatus.EXPIRES_SOON) &&
            subscription.currentPeriodEnd &&
            new Date() > subscription.currentPeriodEnd) {
            subscription.status = subscription_schema_1.SubscriptionStatus.EXPIRED;
            await subscription.save();
            await this.userModel.findByIdAndUpdate(userId, {
                role: 'owner',
                hasActiveSubscription: false,
            });
        }
        else if (subscription.status === subscription_schema_1.SubscriptionStatus.ACTIVE &&
            subscription.currentPeriodEnd &&
            subscription.currentPeriodEnd <= sevenDaysFromNow &&
            subscription.currentPeriodEnd > now) {
            subscription.status = subscription_schema_1.SubscriptionStatus.EXPIRES_SOON;
            await subscription.save();
        }
        else if (subscription.status === subscription_schema_1.SubscriptionStatus.EXPIRES_SOON &&
            subscription.currentPeriodEnd &&
            subscription.currentPeriodEnd > sevenDaysFromNow) {
            subscription.status = subscription_schema_1.SubscriptionStatus.ACTIVE;
            await subscription.save();
        }
        return this.mapToResponseDto(subscription);
    }
    async findByCustomerId(customerId) {
        const subscription = await this.subscriptionModel.findOne({
            stripeCustomerId: customerId,
        });
        if (!subscription) {
            return null;
        }
        return this.mapToResponseDto(subscription);
    }
    async activate(userId) {
        const userObjectId = new mongoose_2.Types.ObjectId(userId);
        const subscription = await this.subscriptionModel.findOne({
            userId: userObjectId,
        });
        if (!subscription) {
            console.log(`⚠️ Cannot activate: No subscription found for userId: ${userId}`);
            throw new common_1.NotFoundException('Subscription not found');
        }
        if (subscription.status === subscription_schema_1.SubscriptionStatus.ACTIVE) {
            return this.mapToResponseDto(subscription);
        }
        subscription.status = subscription_schema_1.SubscriptionStatus.ACTIVE;
        await subscription.save();
        await this.userModel.findByIdAndUpdate(userId, { role: subscription.role });
        return this.mapToResponseDto(subscription);
    }
    async verifyEmail(userId, code) {
        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const subscription = await this.subscriptionModel.findOne({
            userId: new mongoose_2.Types.ObjectId(userId),
        });
        if (!subscription) {
            throw new common_1.NotFoundException('No subscription found');
        }
        if (subscription.status !== subscription_schema_1.SubscriptionStatus.PENDING) {
            throw new common_1.BadRequestException(`Subscription is not pending. Current status: ${subscription.status}`);
        }
        const now = new Date();
        if (!user.verificationCode ||
            user.verificationCode !== code ||
            !user.verificationCodeExpires ||
            user.verificationCodeExpires < now) {
            throw new common_1.BadRequestException('Invalid or expired verification code');
        }
        await this.userModel.findByIdAndUpdate(userId, {
            verificationCode: undefined,
            verificationCodeExpires: undefined,
        });
        subscription.status = subscription_schema_1.SubscriptionStatus.ACTIVE;
        await subscription.save();
        await this.userModel.findByIdAndUpdate(userId, { role: subscription.role });
        return this.mapToResponseDto(subscription);
    }
    async resendVerificationCode(userId) {
        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const subscription = await this.subscriptionModel.findOne({
            userId: new mongoose_2.Types.ObjectId(userId),
        });
        if (!subscription) {
            throw new common_1.NotFoundException('No subscription found');
        }
        if (subscription.status !== subscription_schema_1.SubscriptionStatus.PENDING) {
            throw new common_1.BadRequestException(`Subscription is not pending. Current status: ${subscription.status}`);
        }
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await this.userModel.findByIdAndUpdate(userId, {
            verificationCode,
            verificationCodeExpires: expiresAt,
        });
        try {
            await this.mailService.sendVerificationCode(user.email, verificationCode);
            console.log(`✅ Subscription verification code resent to ${user.email}`);
            return { message: 'Verification code sent to your email' };
        }
        catch (error) {
            console.error('Failed to send subscription verification code:', error instanceof Error ? error.message : error);
            throw new common_1.BadRequestException('Failed to send verification code. Please try again later.');
        }
    }
    async renew(userId) {
        const userObjectId = new mongoose_2.Types.ObjectId(userId);
        const subscription = await this.subscriptionModel.findOne({
            userId: userObjectId,
        });
        if (!subscription) {
            throw new common_1.NotFoundException('Subscription not found');
        }
        if (subscription.status !== subscription_schema_1.SubscriptionStatus.ACTIVE &&
            subscription.status !== subscription_schema_1.SubscriptionStatus.EXPIRES_SOON) {
            throw new common_1.BadRequestException('Only active or expires soon subscriptions can be renewed');
        }
        const now = new Date();
        const newPeriodStart = subscription.currentPeriodEnd || now;
        const newPeriodEnd = new Date(newPeriodStart);
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
        if (subscription.stripeSubscriptionId && this.stripe) {
            try {
            }
            catch (error) {
                console.error('Stripe renewal error:', error);
            }
        }
        subscription.currentPeriodStart = newPeriodStart;
        subscription.currentPeriodEnd = newPeriodEnd;
        subscription.cancelAtPeriodEnd = false;
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        if (newPeriodEnd <= sevenDaysFromNow) {
            subscription.status = subscription_schema_1.SubscriptionStatus.EXPIRES_SOON;
        }
        else {
            subscription.status = subscription_schema_1.SubscriptionStatus.ACTIVE;
        }
        await subscription.save();
        await this.userModel.findByIdAndUpdate(userId, { role: subscription.role });
        return this.mapToResponseDto(subscription);
    }
    async updateSubscriptionRole(userId, role) {
        const userObjectId = new mongoose_2.Types.ObjectId(userId);
        const subscription = await this.subscriptionModel.findOne({
            userId: userObjectId,
        });
        if (!subscription) {
            throw new common_1.NotFoundException('Subscription not found');
        }
        if (subscription.status !== subscription_schema_1.SubscriptionStatus.ACTIVE) {
            throw new common_1.BadRequestException('Only active subscriptions can update role');
        }
        if (role !== 'vet' && role !== 'sitter') {
            throw new common_1.BadRequestException('Role must be either "vet" or "sitter"');
        }
        subscription.role = role;
        await subscription.save();
        await this.userModel.findByIdAndUpdate(userId, {
            role: role,
            hasActiveSubscription: true,
        });
        console.log(`✅ Updated subscription role to ${role} for user ${userId}`);
        return this.mapToResponseDto(subscription);
    }
    async cancel(userId) {
        const userObjectId = new mongoose_2.Types.ObjectId(userId);
        const subscription = await this.subscriptionModel.findOne({
            userId: userObjectId,
        });
        if (!subscription) {
            throw new common_1.NotFoundException('Subscription not found');
        }
        if (subscription.status !== subscription_schema_1.SubscriptionStatus.ACTIVE &&
            subscription.status !== subscription_schema_1.SubscriptionStatus.EXPIRES_SOON &&
            subscription.status !== subscription_schema_1.SubscriptionStatus.PENDING) {
            throw new common_1.BadRequestException('Only active, expires soon, or pending subscriptions can be canceled');
        }
        if (subscription.stripeSubscriptionId && this.stripe) {
            try {
                await this.stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
            }
            catch (error) {
                console.error('Stripe cancellation error:', error);
            }
        }
        subscription.status = subscription_schema_1.SubscriptionStatus.CANCELED;
        subscription.cancelAtPeriodEnd = false;
        await subscription.save();
        await this.userModel.findByIdAndUpdate(userId, {
            role: 'owner',
            hasActiveSubscription: false,
        });
        try {
            if (subscription.role === 'vet') {
                await this.veterinariansService.remove(userId);
                console.log(`✅ Removed veterinarian record for user ${userId}`);
            }
            else if (subscription.role === 'sitter') {
                await this.petSittersService.remove(userId);
                console.log(`✅ Removed pet sitter record for user ${userId}`);
            }
        }
        catch (error) {
            console.warn(`⚠️ Could not remove ${subscription.role} record for user ${userId}:`, error);
        }
        return {
            subscription: this.mapToResponseDto(subscription),
            message: 'Subscription has been canceled. Your role has been downgraded to owner and your clinic/sitter profile has been removed.',
        };
    }
    async reactivate(userId) {
        const userObjectId = new mongoose_2.Types.ObjectId(userId);
        const subscription = await this.subscriptionModel.findOne({
            userId: userObjectId,
        });
        if (!subscription) {
            throw new common_1.NotFoundException('Subscription not found');
        }
        if ((subscription.status === subscription_schema_1.SubscriptionStatus.ACTIVE ||
            subscription.status === subscription_schema_1.SubscriptionStatus.EXPIRES_SOON) &&
            !subscription.cancelAtPeriodEnd) {
            return this.mapToResponseDto(subscription);
        }
        if (subscription.status === subscription_schema_1.SubscriptionStatus.EXPIRED ||
            subscription.status === subscription_schema_1.SubscriptionStatus.CANCELED) {
            throw new common_1.BadRequestException('Cannot reactivate expired or canceled subscription. Please create a new subscription.');
        }
        if (subscription.stripeSubscriptionId && this.stripe) {
            try {
                await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
                    cancel_at_period_end: false,
                });
            }
            catch (error) {
                console.error('Stripe reactivation error:', error);
            }
        }
        subscription.cancelAtPeriodEnd = false;
        await subscription.save();
        return this.mapToResponseDto(subscription);
    }
    async handleStripeWebhook(event) {
        switch (event.type) {
            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object;
                await this.handlePaymentIntentSucceeded(paymentIntent);
                break;
            }
            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                await this.updateSubscriptionFromStripe(subscription);
                break;
            }
            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                await this.handleSubscriptionDeleted(subscription);
                break;
            }
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object;
                if (invoice.subscription) {
                    const subscription = await this.stripe.subscriptions.retrieve(invoice.subscription);
                    await this.updateSubscriptionFromStripe(subscription);
                }
                break;
            }
            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                if (invoice.subscription) {
                    console.warn(`Payment failed for subscription: ${invoice.subscription}`);
                }
                break;
            }
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
    }
    async handlePaymentIntentSucceeded(paymentIntent) {
        const userId = paymentIntent.metadata?.userId;
        const subscriptionRole = paymentIntent.metadata?.subscriptionRole || 'premium';
        if (!userId) {
            console.warn('No userId in PaymentIntent metadata');
            return;
        }
        console.log(`✅ Payment succeeded for user ${userId}. Activating subscription...`);
        const subscription = await this.subscriptionModel.findOne({
            userId: new mongoose_2.Types.ObjectId(userId),
            status: subscription_schema_1.SubscriptionStatus.PENDING,
        });
        if (!subscription) {
            console.warn(`No pending subscription found for user ${userId}`);
            return;
        }
        subscription.status = subscription_schema_1.SubscriptionStatus.ACTIVE;
        subscription.role = subscriptionRole;
        await subscription.save();
        await this.userModel.findByIdAndUpdate(userId, {
            hasActiveSubscription: true,
            role: subscriptionRole,
        });
        console.log(`✅ Subscription activated for user ${userId} with role ${subscriptionRole}`);
        console.log(`✅ User role updated to ${subscriptionRole}`);
    }
    async activatePendingSubscription(userId) {
        const userObjectId = new mongoose_2.Types.ObjectId(userId);
        const subscription = await this.subscriptionModel.findOne({
            userId: userObjectId,
            status: subscription_schema_1.SubscriptionStatus.PENDING,
        });
        if (!subscription) {
            throw new common_1.NotFoundException('No pending subscription found');
        }
        subscription.status = subscription_schema_1.SubscriptionStatus.ACTIVE;
        await subscription.save();
        await this.userModel.findByIdAndUpdate(userId, {
            hasActiveSubscription: true,
            role: subscription.role,
        });
        console.log(`✅ Manually activated subscription for user ${userId}`);
        return this.mapToResponseDto(subscription);
    }
    getSubscriptionPeriod(stripeSubscription) {
        const item = stripeSubscription.items?.data?.[0];
        const startSec = item?.current_period_start ?? stripeSubscription.current_period_start;
        const endSec = item?.current_period_end ?? stripeSubscription.current_period_end;
        if (startSec && endSec) {
            return { start: new Date(startSec * 1000), end: new Date(endSec * 1000) };
        }
        const start = new Date();
        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        return { start, end };
    }
    async updateSubscriptionFromStripe(stripeSubscription) {
        const subscription = await this.subscriptionModel.findOne({
            stripeSubscriptionId: stripeSubscription.id,
        });
        if (!subscription) {
            console.warn(`Subscription not found for Stripe ID: ${stripeSubscription.id}`);
            return;
        }
        const sub = stripeSubscription;
        const period = this.getSubscriptionPeriod(stripeSubscription);
        subscription.currentPeriodStart = period.start;
        subscription.currentPeriodEnd = period.end;
        subscription.cancelAtPeriodEnd = sub.cancel_at_period_end || false;
        switch (stripeSubscription.status) {
            case 'active':
                subscription.status = subscription_schema_1.SubscriptionStatus.ACTIVE;
                await this.userModel.findByIdAndUpdate(subscription.userId, {
                    role: subscription.role,
                });
                break;
            case 'canceled':
            case 'unpaid':
            case 'past_due':
                subscription.status = subscription_schema_1.SubscriptionStatus.EXPIRED;
                await this.userModel.findByIdAndUpdate(subscription.userId, {
                    role: 'owner',
                });
                break;
        }
        await subscription.save();
    }
    async handleSubscriptionDeleted(stripeSubscription) {
        const subscription = await this.subscriptionModel.findOne({
            stripeSubscriptionId: stripeSubscription.id,
        });
        if (!subscription) {
            return;
        }
        subscription.status = subscription_schema_1.SubscriptionStatus.EXPIRED;
        await subscription.save();
        await this.userModel.findByIdAndUpdate(subscription.userId, {
            role: 'owner',
        });
    }
    async checkAndExpireSubscriptions() {
        const now = new Date();
        const expiredSubscriptions = await this.subscriptionModel.find({
            status: {
                $in: [subscription_schema_1.SubscriptionStatus.ACTIVE, subscription_schema_1.SubscriptionStatus.EXPIRES_SOON],
            },
            currentPeriodEnd: { $lt: now },
        });
        for (const subscription of expiredSubscriptions) {
            subscription.status = subscription_schema_1.SubscriptionStatus.EXPIRED;
            await subscription.save();
            await this.userModel.findByIdAndUpdate(subscription.userId, {
                role: 'owner',
            });
        }
    }
    async checkAndCancelExpiredSubscriptions() {
        const now = new Date();
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        const expiredSubscriptions = await this.subscriptionModel.find({
            status: subscription_schema_1.SubscriptionStatus.EXPIRED,
            currentPeriodEnd: { $lt: threeDaysAgo },
        });
        for (const subscription of expiredSubscriptions) {
            subscription.status = subscription_schema_1.SubscriptionStatus.CANCELED;
            await subscription.save();
            try {
                if (subscription.role === 'vet') {
                    await this.veterinariansService.remove(subscription.userId.toString());
                    console.log(`✅ Auto-canceled: Removed veterinarian record for user ${subscription.userId}`);
                }
                else if (subscription.role === 'sitter') {
                    await this.petSittersService.remove(subscription.userId.toString());
                    console.log(`✅ Auto-canceled: Removed pet sitter record for user ${subscription.userId}`);
                }
            }
            catch (error) {
                console.warn(`⚠️ Auto-cancel: Could not remove ${subscription.role} record for user ${subscription.userId}:`, error);
            }
            console.log(`✅ Auto-canceled subscription for userId: ${subscription.userId} (expired for more than 3 days)`);
        }
        if (expiredSubscriptions.length > 0) {
            console.log(`✅ Auto-canceled ${expiredSubscriptions.length} subscription(s) that were expired for more than 3 days`);
        }
    }
    mapToResponseDto(subscription) {
        return {
            id: subscription._id.toString(),
            userId: subscription.userId.toString(),
            role: subscription.role,
            status: subscription.status,
            stripeSubscriptionId: subscription.stripeSubscriptionId,
            stripeCustomerId: subscription.stripeCustomerId,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            createdAt: subscription.createdAt,
            updatedAt: subscription.updatedAt,
        };
    }
    async activateSubscriptionByStripeId(stripeSubscriptionId) {
        const subscription = await this.subscriptionModel.findOne({
            stripeSubscriptionId,
        });
        if (!subscription) {
            console.warn(`⚠️ No subscription found for Stripe ID: ${stripeSubscriptionId}`);
            return;
        }
        if (subscription.status === subscription_schema_1.SubscriptionStatus.ACTIVE) {
            console.log(`ℹ️ Subscription ${subscription._id} is already active`);
            return;
        }
        subscription.status = subscription_schema_1.SubscriptionStatus.ACTIVE;
        await subscription.save();
        await this.userModel.findByIdAndUpdate(subscription.userId, {
            hasActiveSubscription: true,
        });
        console.log(`✅ Activated subscription ${subscription._id} for user ${subscription.userId}`);
    }
    async createSubscriptionAfterPayment(userId, customerId, role, paymentMethodId) {
        console.log(`💳 Creating subscription after payment for user ${userId}`);
        const subscription = await this.subscriptionModel.findOne({
            userId: new mongoose_2.Types.ObjectId(userId),
            status: subscription_schema_1.SubscriptionStatus.PENDING,
        });
        if (!subscription) {
            console.warn(`⚠️ No pending subscription found for user ${userId}`);
            return;
        }
        try {
            if (paymentMethodId) {
                try {
                    const paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);
                    if (!paymentMethod.customer || paymentMethod.customer !== customerId) {
                        await this.stripe.paymentMethods.attach(paymentMethodId, {
                            customer: customerId,
                        });
                        console.log(`✅ Attached payment method ${paymentMethodId} to customer ${customerId}`);
                    }
                    else {
                        console.log(`ℹ️ Payment method ${paymentMethodId} already attached to customer ${customerId}`);
                    }
                    await this.stripe.customers.update(customerId, {
                        invoice_settings: {
                            default_payment_method: paymentMethodId,
                        },
                    });
                    console.log(`✅ Set payment method ${paymentMethodId} as default for customer ${customerId}`);
                }
                catch (pmError) {
                    if (pmError.code === 'resource_already_exists' || pmError.message?.includes('already attached')) {
                        console.log(`ℹ️ Payment method already attached, setting as default...`);
                        try {
                            await this.stripe.customers.update(customerId, {
                                invoice_settings: {
                                    default_payment_method: paymentMethodId,
                                },
                            });
                        }
                        catch (updateError) {
                            console.warn(`⚠️ Could not set default payment method: ${updateError.message}`);
                        }
                    }
                    else {
                        console.warn(`⚠️ Could not attach payment method: ${pmError.message}`);
                    }
                }
            }
            const existingSubscriptions = await this.stripe.subscriptions.list({
                customer: customerId,
                status: 'active',
                limit: 1,
            });
            const stripeSubscription = existingSubscriptions.data.length > 0
                ? existingSubscriptions.data[0]
                : await this.stripe.subscriptions.create({
                    customer: customerId,
                    items: [{ price: this.subscriptionPriceId }],
                    default_payment_method: paymentMethodId || undefined,
                });
            const period = this.getSubscriptionPeriod(stripeSubscription);
            subscription.stripeSubscriptionId = stripeSubscription.id;
            subscription.stripeCustomerId = customerId;
            subscription.currentPeriodStart = period.start;
            subscription.currentPeriodEnd = period.end;
            subscription.status = subscription_schema_1.SubscriptionStatus.ACTIVE;
            subscription.role = role;
            await subscription.save();
            await this.userModel.findByIdAndUpdate(userId, {
                hasActiveSubscription: true,
                role: role,
            });
            console.log(`✅ Created and activated subscription ${stripeSubscription.id} for user ${userId}`);
        }
        catch (error) {
            console.error(`❌ Failed to create subscription after payment for user ${userId}:`, error);
            throw error;
        }
    }
    async confirmPayment(userId) {
        const userObjectId = new mongoose_2.Types.ObjectId(userId);
        const subscription = await this.subscriptionModel.findOne({
            userId: userObjectId,
        });
        if (!subscription) {
            throw new common_1.NotFoundException('Subscription not found');
        }
        if (subscription.status === subscription_schema_1.SubscriptionStatus.ACTIVE) {
            return this.mapToResponseDto(subscription);
        }
        if (subscription.status !== subscription_schema_1.SubscriptionStatus.PENDING) {
            throw new common_1.BadRequestException(`Subscription is not pending. Current status: ${subscription.status}`);
        }
        if (!subscription.stripePaymentIntentId || !this.stripe) {
            throw new common_1.BadRequestException('No payment found to confirm for this subscription');
        }
        const paymentIntent = await this.stripe.paymentIntents.retrieve(subscription.stripePaymentIntentId);
        if (paymentIntent.status !== 'succeeded') {
            throw new common_1.BadRequestException(`Payment has not completed yet (status: ${paymentIntent.status})`);
        }
        const customerId = paymentIntent.customer;
        const paymentMethodId = paymentIntent.payment_method;
        const role = paymentIntent.metadata?.subscriptionRole || subscription.role;
        await this.createSubscriptionAfterPayment(userId, customerId, role, paymentMethodId);
        const updated = await this.subscriptionModel.findOne({ userId: userObjectId });
        return this.mapToResponseDto(updated);
    }
    async createSetupIntent(userId) {
        const subscription = await this.subscriptionModel.findOne({ userId: new mongoose_2.Types.ObjectId(userId) });
        if (!subscription?.stripeCustomerId) {
            throw new common_1.BadRequestException('No active subscription or Stripe customer found');
        }
        if (!this.stripe)
            throw new common_1.BadRequestException('Stripe is not configured');
        const setupIntent = await this.stripe.setupIntents.create({
            customer: subscription.stripeCustomerId,
            payment_method_types: ['card'],
            usage: 'off_session',
        });
        return { clientSecret: setupIntent.client_secret };
    }
    async updatePaymentMethod(userId, paymentMethodId) {
        const subscription = await this.subscriptionModel.findOne({ userId: new mongoose_2.Types.ObjectId(userId) });
        if (!subscription?.stripeCustomerId) {
            throw new common_1.BadRequestException('No active subscription found');
        }
        if (!this.stripe)
            throw new common_1.BadRequestException('Stripe is not configured');
        try {
            const pm = await this.stripe.paymentMethods.retrieve(paymentMethodId);
            if (!pm.customer || pm.customer !== subscription.stripeCustomerId) {
                await this.stripe.paymentMethods.attach(paymentMethodId, {
                    customer: subscription.stripeCustomerId,
                });
            }
        }
        catch {
            await this.stripe.paymentMethods.attach(paymentMethodId, {
                customer: subscription.stripeCustomerId,
            });
        }
        await this.stripe.customers.update(subscription.stripeCustomerId, {
            invoice_settings: { default_payment_method: paymentMethodId },
        });
        if (subscription.stripeSubscriptionId) {
            await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
                default_payment_method: paymentMethodId,
            });
        }
        return this.mapToResponseDto(subscription);
    }
    async getBillingHistory(userId) {
        const subscription = await this.subscriptionModel.findOne({ userId: new mongoose_2.Types.ObjectId(userId) });
        if (!subscription?.stripeCustomerId)
            return { invoices: [] };
        if (!this.stripe)
            return { invoices: [] };
        const invoiceList = await this.stripe.invoices.list({
            customer: subscription.stripeCustomerId,
            limit: 10,
        });
        const invoices = invoiceList.data.map((inv) => ({
            id: inv.id,
            amountPaid: inv.amount_paid / 100,
            currency: inv.currency.toUpperCase(),
            status: inv.status,
            date: new Date(inv.created * 1000).toISOString(),
            invoiceUrl: inv.hosted_invoice_url,
            pdfUrl: inv.invoice_pdf,
            description: inv.lines?.data?.[0]?.description ?? 'Subscription',
        }));
        return { invoices };
    }
};
exports.SubscriptionsService = SubscriptionsService;
exports.SubscriptionsService = SubscriptionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(subscription_schema_1.Subscription.name)),
    __param(1, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        config_1.ConfigService,
        veterinarians_service_1.VeterinariansService,
        pet_sitters_service_1.PetSittersService,
        mail_service_1.MailService])
], SubscriptionsService);
//# sourceMappingURL=subscriptions.service.js.map