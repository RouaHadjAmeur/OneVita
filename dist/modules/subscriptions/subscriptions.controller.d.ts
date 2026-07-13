import { RawBodyRequest } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { SubscriptionResponseDto, CreateSubscriptionResponseDto, CancelSubscriptionResponseDto, VerifyEmailResponseDto } from './dto/subscription-response.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { UserDocument } from '../users/schemas/user.schema';
import { ConfigService } from '@nestjs/config';
export declare class SubscriptionsController {
    private readonly subscriptionsService;
    private readonly configService;
    private readonly stripeWebhookSecret;
    constructor(subscriptionsService: SubscriptionsService, configService: ConfigService);
    create(user: UserDocument, createSubscriptionDto: CreateSubscriptionDto): Promise<CreateSubscriptionResponseDto>;
    getMySubscription(user: UserDocument): Promise<SubscriptionResponseDto>;
    cancel(user: UserDocument): Promise<CancelSubscriptionResponseDto>;
    confirm(user: UserDocument): Promise<SubscriptionResponseDto>;
    reactivate(user: UserDocument): Promise<SubscriptionResponseDto>;
    renew(user: UserDocument): Promise<SubscriptionResponseDto>;
    updateRole(user: UserDocument, body: {
        role: string;
    }): Promise<SubscriptionResponseDto>;
    activatePending(user: UserDocument): Promise<SubscriptionResponseDto>;
    verifyEmail(user: UserDocument, verifyEmailDto: VerifyEmailDto): Promise<VerifyEmailResponseDto>;
    resendVerification(user: UserDocument): Promise<{
        message: string;
    }>;
    getBillingHistory(user: UserDocument): Promise<{
        invoices: any[];
    }>;
    createSetupIntent(user: UserDocument): Promise<{
        clientSecret: string;
    }>;
    updatePaymentMethod(user: UserDocument, body: {
        paymentMethodId: string;
    }): Promise<any>;
    handleWebhook(req: RawBodyRequest<Request>): Promise<{
        received: boolean;
    }>;
}
