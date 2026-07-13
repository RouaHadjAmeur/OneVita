import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { SubscriptionDocument } from './schemas/subscription.schema';
import { UserDocument } from '../users/schemas/user.schema';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { SubscriptionResponseDto, CreateSubscriptionResponseDto, CancelSubscriptionResponseDto } from './dto/subscription-response.dto';
import { VeterinariansService } from '../veterinarians/veterinarians.service';
import { PetSittersService } from '../pet-sitters/pet-sitters.service';
import { MailService } from '../mail/mail.service';
export declare class SubscriptionsService {
    private readonly subscriptionModel;
    private readonly userModel;
    private readonly configService;
    private readonly veterinariansService;
    private readonly petSittersService;
    private readonly mailService;
    private stripe;
    private readonly subscriptionPriceId;
    constructor(subscriptionModel: Model<SubscriptionDocument>, userModel: Model<UserDocument>, configService: ConfigService, veterinariansService: VeterinariansService, petSittersService: PetSittersService, mailService: MailService);
    create(userId: string, createSubscriptionDto: CreateSubscriptionDto): Promise<CreateSubscriptionResponseDto>;
    findByUserId(userId: string): Promise<SubscriptionResponseDto | null>;
    findByCustomerId(customerId: string): Promise<SubscriptionResponseDto | null>;
    activate(userId: string): Promise<SubscriptionResponseDto>;
    verifyEmail(userId: string, code: string): Promise<SubscriptionResponseDto>;
    resendVerificationCode(userId: string): Promise<{
        message: string;
    }>;
    renew(userId: string): Promise<SubscriptionResponseDto>;
    updateSubscriptionRole(userId: string, role: string): Promise<SubscriptionResponseDto>;
    cancel(userId: string): Promise<CancelSubscriptionResponseDto>;
    reactivate(userId: string): Promise<SubscriptionResponseDto>;
    handleStripeWebhook(event: Stripe.Event): Promise<void>;
    private handlePaymentIntentSucceeded;
    activatePendingSubscription(userId: string): Promise<SubscriptionResponseDto>;
    private getSubscriptionPeriod;
    private updateSubscriptionFromStripe;
    private handleSubscriptionDeleted;
    checkAndExpireSubscriptions(): Promise<void>;
    checkAndCancelExpiredSubscriptions(): Promise<void>;
    private mapToResponseDto;
    activateSubscriptionByStripeId(stripeSubscriptionId: string): Promise<void>;
    createSubscriptionAfterPayment(userId: string, customerId: string, role: string, paymentMethodId: string): Promise<void>;
    confirmPayment(userId: string): Promise<SubscriptionResponseDto>;
    createSetupIntent(userId: string): Promise<{
        clientSecret: string;
    }>;
    updatePaymentMethod(userId: string, paymentMethodId: string): Promise<SubscriptionResponseDto>;
    getBillingHistory(userId: string): Promise<{
        invoices: any[];
    }>;
}
