// src/modules/subscriptions/subscriptions.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  Subscription,
  SubscriptionDocument,
  SubscriptionStatus,
} from './schemas/subscription.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import {
  SubscriptionResponseDto,
  CreateSubscriptionResponseDto,
  CancelSubscriptionResponseDto,
} from './dto/subscription-response.dto';
import { VeterinariansService } from '../veterinarians/veterinarians.service';
import { PetSittersService } from '../pet-sitters/pet-sitters.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class SubscriptionsService {
  private stripe: Stripe;
  private readonly subscriptionPriceId: string;

  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
    private readonly veterinariansService: VeterinariansService,
    private readonly petSittersService: PetSittersService,
    private readonly mailService: MailService,
  ) {
    // Initialize Stripe
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      console.warn(
        '⚠️ STRIPE_SECRET_KEY not found. Stripe features will be disabled.',
      );
    } else {
      console.log('✅ Initializing Stripe with secret key...');
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2025-11-17.clover',
      });
      console.log('✅ Stripe initialized successfully');
    }

    // Get subscription price ID from config (or use default test price)
    this.subscriptionPriceId = this.configService.get<string>(
      'STRIPE_SUBSCRIPTION_PRICE_ID',
      'price_test_monthly_30', // Default test price ID
    );
    console.log(`📋 Using Stripe Price ID: ${this.subscriptionPriceId}`);
  }

  /**
   * Create a new subscription for a user
   */
  async create(
    userId: string,
    createSubscriptionDto: CreateSubscriptionDto,
  ): Promise<CreateSubscriptionResponseDto> {
    // Check if user exists
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user already has an active or expires_soon subscription
    // Check for any existing active subscription
    const existingSubscription = await this.subscriptionModel.findOne({
      userId: user._id,
      status: {
        $in: [
          SubscriptionStatus.ACTIVE,
          SubscriptionStatus.EXPIRES_SOON,
        ],
      },
    });

    if (existingSubscription) {
      throw new ConflictException(
        'User already has an active subscription',
      );
    }

    // No role required during subscription creation - user will choose role after payment

    // Check if user has a canceled, expired, or pending subscription - we'll reuse it
    // This allows users to resubscribe after cancellation or abandoned payments
    const canceledOrExpiredSubscription = await this.subscriptionModel.findOne({
      userId: user._id,
      status: {
        $in: [
          SubscriptionStatus.CANCELED, 
          SubscriptionStatus.EXPIRED,
          SubscriptionStatus.PENDING, // Include pending to handle abandoned payments
        ],
      },
    });

    // In test mode, create subscription without Stripe (for development)
    // Force production mode to always use Stripe for testing payment flow
    const isTestMode = !this.stripe;  // Only test mode if Stripe is not initialized

    console.log(`🔍 Subscription Creation Mode: ${isTestMode ? 'TEST MODE' : 'PRODUCTION MODE'}`);
    console.log(`🔍 NODE_ENV: ${this.configService.get<string>('NODE_ENV')}`);
    console.log(`🔍 Stripe initialized: ${!!this.stripe}`);

    let stripeSubscriptionId: string | undefined;
    let stripeCustomerId: string | undefined;
    let stripePaymentIntentId: string | undefined;
    let clientSecret: string | undefined;
    let currentPeriodStart: Date;
    let currentPeriodEnd: Date;

    if (isTestMode || !this.stripe) {
      // Test mode: Create subscription without Stripe - activate immediately
      console.log('⚠️ Running in TEST MODE - Subscription activated immediately');
      currentPeriodStart = new Date();
      currentPeriodEnd = new Date();
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1); // 1 month from now
    } else {
      // Production: Create Stripe customer and subscription
      console.log('💳 Running in PRODUCTION MODE - Creating Stripe subscription...');
      try {
        // Create or retrieve Stripe customer
        let customer: Stripe.Customer;
        if (user.email) {
          const existingCustomers = await this.stripe.customers.list({
            email: user.email,
            limit: 1,
          });

          if (existingCustomers.data.length > 0) {
            customer = existingCustomers.data[0];
          } else {
            customer = await this.stripe.customers.create({
              email: user.email,
              name: user.name,
              metadata: {
                userId: user._id.toString(),
              },
            });
          }
        } else {
          throw new BadRequestException(
            'User email is required for subscription',
          );
        }

        stripeCustomerId = customer.id;

        // Create a PaymentIntent instead of subscription for one-time payment
        // After payment succeeds, webhook will create the actual subscription
        const paymentIntent = await this.stripe.paymentIntents.create({
          amount: 3000, // $30.00 in cents
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

        // Set temporary period (will be updated when subscription is created after payment)
        currentPeriodStart = new Date();
        currentPeriodEnd = new Date();
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

        console.log(`💳 Created PaymentIntent ${paymentIntent.id} for user ${user._id}`);
      } catch (error) {
        console.error('Stripe subscription creation error:', error);
        throw new BadRequestException(
          `Failed to create Stripe subscription: ${error.message}`,
        );
      }
    }

    // If there's a canceled/expired subscription, update it instead of creating a new one
    let savedSubscription;
    const finalStatus = (isTestMode || !this.stripe) ? SubscriptionStatus.ACTIVE : SubscriptionStatus.PENDING;
    
    if (canceledOrExpiredSubscription) {
      // Update existing canceled/expired subscription
      canceledOrExpiredSubscription.role = createSubscriptionDto.role || 'premium'; // Default to 'premium'
      canceledOrExpiredSubscription.status = finalStatus;
      canceledOrExpiredSubscription.stripeSubscriptionId = stripeSubscriptionId;
      canceledOrExpiredSubscription.stripeCustomerId = stripeCustomerId;
      canceledOrExpiredSubscription.stripePaymentIntentId = stripePaymentIntentId;
      canceledOrExpiredSubscription.currentPeriodStart = currentPeriodStart;
      canceledOrExpiredSubscription.currentPeriodEnd = currentPeriodEnd;
      canceledOrExpiredSubscription.cancelAtPeriodEnd = false;

      savedSubscription = await canceledOrExpiredSubscription.save();
    } else {
      // Create new subscription record in database
      const subscription = new this.subscriptionModel({
        userId: user._id,
        role: createSubscriptionDto.role || 'premium', // Default to 'premium' if not specified
        status: finalStatus, // PENDING for production (requires payment), ACTIVE for test mode
        stripeSubscriptionId,
        stripeCustomerId,
        stripePaymentIntentId,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
      });

      savedSubscription = await subscription.save();
    }

    // Update user's hasActiveSubscription flag only if immediately active (test mode)
    if (finalStatus === SubscriptionStatus.ACTIVE) {
      console.log(`✅ Subscription activated immediately (test mode) for user ${userId}`);
      await this.userModel.findByIdAndUpdate(userId, {
        hasActiveSubscription: true,
      });
    } else {
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

  /**
   * Get user's subscription
   */
  async findByUserId(userId: string): Promise<SubscriptionResponseDto | null> {
    // Convert string userId to ObjectId for query
    const userObjectId = new Types.ObjectId(userId);
    const subscription = await this.subscriptionModel.findOne({
      userId: userObjectId,
    });

    if (!subscription) {
      return null;
    }

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    // Check if subscription has expired
    if (
      (subscription.status === SubscriptionStatus.ACTIVE ||
        subscription.status === SubscriptionStatus.EXPIRES_SOON) &&
      subscription.currentPeriodEnd &&
      new Date() > subscription.currentPeriodEnd
    ) {
      // Auto-expire subscription
      subscription.status = SubscriptionStatus.EXPIRED;
      await subscription.save();

      // Downgrade user role to owner and remove subscription flag
      await this.userModel.findByIdAndUpdate(userId, { 
        role: 'owner',
        hasActiveSubscription: false,
      });
    }
    // Check if subscription is expiring soon (within 7 days)
    else if (
      subscription.status === SubscriptionStatus.ACTIVE &&
      subscription.currentPeriodEnd &&
      subscription.currentPeriodEnd <= sevenDaysFromNow &&
      subscription.currentPeriodEnd > now
    ) {
      // Mark as expires soon
      subscription.status = SubscriptionStatus.EXPIRES_SOON;
      await subscription.save();
    }
    // If subscription was expires_soon but is no longer within 7 days, revert to active
    else if (
      subscription.status === SubscriptionStatus.EXPIRES_SOON &&
      subscription.currentPeriodEnd &&
      subscription.currentPeriodEnd > sevenDaysFromNow
    ) {
      subscription.status = SubscriptionStatus.ACTIVE;
      await subscription.save();
    }

    return this.mapToResponseDto(subscription);
  }

  /**
   * Find subscription by Stripe customer ID
   * Used by webhook handler when metadata is missing
   */
  async findByCustomerId(customerId: string): Promise<SubscriptionResponseDto | null> {
    const subscription = await this.subscriptionModel.findOne({
      stripeCustomerId: customerId,
    });

    if (!subscription) {
      return null;
    }

    return this.mapToResponseDto(subscription);
  }

  /**
   * Activate subscription (called after email verification)
   */
  async activate(userId: string): Promise<SubscriptionResponseDto> {
    const userObjectId = new Types.ObjectId(userId);
    const subscription = await this.subscriptionModel.findOne({
      userId: userObjectId,
    });
    if (!subscription) {
      console.log(
        `⚠️ Cannot activate: No subscription found for userId: ${userId}`,
      );
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status === SubscriptionStatus.ACTIVE) {
      return this.mapToResponseDto(subscription);
    }

    // Update subscription status
    subscription.status = SubscriptionStatus.ACTIVE;
    await subscription.save();

    // Update user role
    await this.userModel.findByIdAndUpdate(userId, { role: subscription.role });

    return this.mapToResponseDto(subscription);
  }

  /**
   * Verify email with code for subscription activation
   * This is subscription-specific verification that activates the subscription
   * Note: This allows verification even if user is already verified (for subscription activation)
   */
  async verifyEmail(userId: string, code: string): Promise<SubscriptionResponseDto> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has a pending subscription
    const subscription = await this.subscriptionModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (!subscription) {
      throw new NotFoundException('No subscription found');
    }

    if (subscription.status !== SubscriptionStatus.PENDING) {
      throw new BadRequestException(
        `Subscription is not pending. Current status: ${subscription.status}`,
      );
    }

    // Verify the code
    const now = new Date();
    if (
      !user.verificationCode ||
      user.verificationCode !== code ||
      !user.verificationCodeExpires ||
      user.verificationCodeExpires < now
    ) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    // Clear verification code
    await this.userModel.findByIdAndUpdate(userId, {
      verificationCode: undefined,
      verificationCodeExpires: undefined,
    });

    // Activate subscription
    subscription.status = SubscriptionStatus.ACTIVE;
    await subscription.save();

    // Update user role
    await this.userModel.findByIdAndUpdate(userId, { role: subscription.role });

    return this.mapToResponseDto(subscription);
  }

  /**
   * Resend verification code for subscription activation
   * This works even if user is already verified (for subscription activation)
   */
  async resendVerificationCode(userId: string): Promise<{ message: string }> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has a pending subscription
    const subscription = await this.subscriptionModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (!subscription) {
      throw new NotFoundException('No subscription found');
    }

    if (subscription.status !== SubscriptionStatus.PENDING) {
      throw new BadRequestException(
        `Subscription is not pending. Current status: ${subscription.status}`,
      );
    }

    // Generate a new verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update user with new verification code - DON'T change isVerified status
    // User is already verified from registration
    await this.userModel.findByIdAndUpdate(userId, {
      verificationCode,
      verificationCodeExpires: expiresAt,
      // isVerified stays true
    });

    // Send verification code via email
    try {
      await this.mailService.sendVerificationCode(user.email, verificationCode);
      console.log(
        `✅ Subscription verification code resent to ${user.email}`,
      );
      return { message: 'Verification code sent to your email' };
    } catch (error) {
      console.error(
        'Failed to send subscription verification code:',
        error instanceof Error ? error.message : error,
      );
      throw new BadRequestException(
        'Failed to send verification code. Please try again later.',
      );
    }
  }

  /**
   * Renew/Extend subscription (for expires_soon or active subscriptions)
   */
  async renew(userId: string): Promise<SubscriptionResponseDto> {
    const userObjectId = new Types.ObjectId(userId);
    const subscription = await this.subscriptionModel.findOne({
      userId: userObjectId,
    });
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Only allow renewing active or expires_soon subscriptions
    if (
      subscription.status !== SubscriptionStatus.ACTIVE &&
      subscription.status !== SubscriptionStatus.EXPIRES_SOON
    ) {
      throw new BadRequestException(
        'Only active or expires soon subscriptions can be renewed',
      );
    }

    // Extend the subscription period by 1 month
    const now = new Date();
    const newPeriodStart = subscription.currentPeriodEnd || now;
    const newPeriodEnd = new Date(newPeriodStart);
    newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

    // Update Stripe subscription if exists
    if (subscription.stripeSubscriptionId && this.stripe) {
      try {
        // In production, you might want to create a new invoice or extend the subscription
        // For now, we'll just update the local record
        // Stripe will handle billing automatically for active subscriptions
      } catch (error) {
        console.error('Stripe renewal error:', error);
        // Continue with local renewal even if Stripe fails
      }
    }

    subscription.currentPeriodStart = newPeriodStart;
    subscription.currentPeriodEnd = newPeriodEnd;
    subscription.cancelAtPeriodEnd = false;

    // Update status based on new expiration date
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (newPeriodEnd <= sevenDaysFromNow) {
      subscription.status = SubscriptionStatus.EXPIRES_SOON;
    } else {
      subscription.status = SubscriptionStatus.ACTIVE;
    }

    await subscription.save();

    // Ensure user role is set correctly
    await this.userModel.findByIdAndUpdate(userId, { role: subscription.role });

    return this.mapToResponseDto(subscription);
  }

  /**
   * Update subscription role (vet or sitter) after payment
   * Used when user subscribes first, then chooses their professional role
   */
  async updateSubscriptionRole(userId: string, role: string): Promise<SubscriptionResponseDto> {
    const userObjectId = new Types.ObjectId(userId);
    const subscription = await this.subscriptionModel.findOne({
      userId: userObjectId,
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('Only active subscriptions can update role');
    }

    if (role !== 'vet' && role !== 'sitter') {
      throw new BadRequestException('Role must be either "vet" or "sitter"');
    }

    // Update subscription role
    subscription.role = role;
    await subscription.save();

    // Update user role
    await this.userModel.findByIdAndUpdate(userId, { 
      role: role,
      hasActiveSubscription: true,
    });

    console.log(`✅ Updated subscription role to ${role} for user ${userId}`);

    return this.mapToResponseDto(subscription);
  }

  /**
   * Cancel subscription immediately
   */
  async cancel(userId: string): Promise<CancelSubscriptionResponseDto> {
    const userObjectId = new Types.ObjectId(userId);
    const subscription = await this.subscriptionModel.findOne({
      userId: userObjectId,
    });
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (
      subscription.status !== SubscriptionStatus.ACTIVE &&
      subscription.status !== SubscriptionStatus.EXPIRES_SOON &&
      subscription.status !== SubscriptionStatus.PENDING
    ) {
      throw new BadRequestException(
        'Only active, expires soon, or pending subscriptions can be canceled',
      );
    }

    // Cancel at Stripe if exists
    if (subscription.stripeSubscriptionId && this.stripe) {
      try {
        // Cancel immediately in Stripe
        await this.stripe.subscriptions.cancel(
          subscription.stripeSubscriptionId,
        );
      } catch (error) {
        console.error('Stripe cancellation error:', error);
        // Continue with local cancellation even if Stripe fails
      }
    }

    // Update subscription status to canceled
    subscription.status = SubscriptionStatus.CANCELED;
    subscription.cancelAtPeriodEnd = false;
    await subscription.save();

    // Downgrade user role to owner and remove subscription flag
    await this.userModel.findByIdAndUpdate(userId, { 
      role: 'owner',
      hasActiveSubscription: false,
    });

    // Remove veterinarian or pet sitter record based on subscription role
    try {
      if (subscription.role === 'vet') {
        await this.veterinariansService.remove(userId);
        console.log(`✅ Removed veterinarian record for user ${userId}`);
      } else if (subscription.role === 'sitter') {
        await this.petSittersService.remove(userId);
        console.log(`✅ Removed pet sitter record for user ${userId}`);
      }
    } catch (error) {
      // Log error but don't fail the cancellation if record doesn't exist
      console.warn(
        `⚠️ Could not remove ${subscription.role} record for user ${userId}:`,
        error,
      );
    }

    return {
      subscription: this.mapToResponseDto(subscription),
      message:
        'Subscription has been canceled. Your role has been downgraded to owner and your clinic/sitter profile has been removed.',
    };
  }

  /**
   * Reactivate canceled subscription
   */
  async reactivate(userId: string): Promise<SubscriptionResponseDto> {
    const userObjectId = new Types.ObjectId(userId);
    const subscription = await this.subscriptionModel.findOne({
      userId: userObjectId,
    });
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Allow reactivation if subscription is active or expires_soon (even if scheduled to cancel)
    if (
      (subscription.status === SubscriptionStatus.ACTIVE ||
        subscription.status === SubscriptionStatus.EXPIRES_SOON) &&
      !subscription.cancelAtPeriodEnd
    ) {
      // Already active/expires_soon and not scheduled to cancel, nothing to do
      return this.mapToResponseDto(subscription);
    }

    // If subscription is expired or canceled, we need to create a new one
    if (
      subscription.status === SubscriptionStatus.EXPIRED ||
      subscription.status === SubscriptionStatus.CANCELED
    ) {
      throw new BadRequestException(
        'Cannot reactivate expired or canceled subscription. Please create a new subscription.',
      );
    }

    // Reactivate at Stripe if exists
    if (subscription.stripeSubscriptionId && this.stripe) {
      try {
        await this.stripe.subscriptions.update(
          subscription.stripeSubscriptionId,
          {
            cancel_at_period_end: false,
          },
        );
      } catch (error) {
        console.error('Stripe reactivation error:', error);
        // Continue with local reactivation even if Stripe fails
      }
    }

    // Remove cancellation flag
    subscription.cancelAtPeriodEnd = false;
    await subscription.save();

    return this.mapToResponseDto(subscription);
  }

  /**
   * Handle Stripe webhook events
   */
  async handleStripeWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        // Handle PaymentIntent success - activate subscription immediately
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
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
        const invoice = event.data.object as any;
        if (invoice.subscription) {
          const subscription = await this.stripe.subscriptions.retrieve(
            invoice.subscription as string,
          );
          await this.updateSubscriptionFromStripe(subscription);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        if (invoice.subscription) {
          // Handle payment failure - you might want to notify the user
          console.warn(
            `Payment failed for subscription: ${invoice.subscription}`,
          );
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  /**
   * Handle PaymentIntent succeeded - activate subscription immediately
   */
  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    const userId = paymentIntent.metadata?.userId;
    const subscriptionRole = paymentIntent.metadata?.subscriptionRole || 'premium';

    if (!userId) {
      console.warn('No userId in PaymentIntent metadata');
      return;
    }

    console.log(`✅ Payment succeeded for user ${userId}. Activating subscription...`);

    // Find the pending subscription
    const subscription = await this.subscriptionModel.findOne({
      userId: new Types.ObjectId(userId),
      status: SubscriptionStatus.PENDING,
    });

    if (!subscription) {
      console.warn(`No pending subscription found for user ${userId}`);
      return;
    }

    // Activate the subscription immediately
    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.role = subscriptionRole;
    await subscription.save();

    // Update user's hasActiveSubscription flag AND role
    await this.userModel.findByIdAndUpdate(userId, {
      hasActiveSubscription: true,
      role: subscriptionRole, // Also update user's role
    });

    console.log(`✅ Subscription activated for user ${userId} with role ${subscriptionRole}`);
    console.log(`✅ User role updated to ${subscriptionRole}`);
  }

  /**
   * Manually activate pending subscription (for testing)
   */
  async activatePendingSubscription(userId: string): Promise<SubscriptionResponseDto> {
    const userObjectId = new Types.ObjectId(userId);
    const subscription = await this.subscriptionModel.findOne({
      userId: userObjectId,
      status: SubscriptionStatus.PENDING,
    });

    if (!subscription) {
      throw new NotFoundException('No pending subscription found');
    }

    // Activate the subscription
    subscription.status = SubscriptionStatus.ACTIVE;
    await subscription.save();

    // Update user's hasActiveSubscription flag
    await this.userModel.findByIdAndUpdate(userId, {
      hasActiveSubscription: true,
      role: subscription.role,
    });

    console.log(`✅ Manually activated subscription for user ${userId}`);
    return this.mapToResponseDto(subscription);
  }

  /**
   * Extract the current billing period from a Stripe subscription.
   *
   * Newer Stripe API versions moved current_period_start/end off the
   * Subscription object and onto each SubscriptionItem, so the top-level
   * fields are undefined here. Fall back to a computed 1-month period if
   * neither is available, rather than saving an Invalid Date.
   */
  private getSubscriptionPeriod(
    stripeSubscription: Stripe.Subscription,
  ): { start: Date; end: Date } {
    const item = stripeSubscription.items?.data?.[0] as any;
    const startSec =
      item?.current_period_start ?? (stripeSubscription as any).current_period_start;
    const endSec =
      item?.current_period_end ?? (stripeSubscription as any).current_period_end;

    if (startSec && endSec) {
      return { start: new Date(startSec * 1000), end: new Date(endSec * 1000) };
    }

    const start = new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    return { start, end };
  }

  /**
   * Update subscription from Stripe webhook
   */
  private async updateSubscriptionFromStripe(
    stripeSubscription: Stripe.Subscription,
  ): Promise<void> {
    const subscription = await this.subscriptionModel.findOne({
      stripeSubscriptionId: stripeSubscription.id,
    });

    if (!subscription) {
      console.warn(
        `Subscription not found for Stripe ID: ${stripeSubscription.id}`,
      );
      return;
    }

    // Update subscription details
    const sub = stripeSubscription as any; // Type assertion for Stripe subscription
    const period = this.getSubscriptionPeriod(stripeSubscription);
    subscription.currentPeriodStart = period.start;
    subscription.currentPeriodEnd = period.end;
    subscription.cancelAtPeriodEnd = sub.cancel_at_period_end || false;

    // Update status based on Stripe status
    switch (stripeSubscription.status) {
      case 'active':
        subscription.status = SubscriptionStatus.ACTIVE;
        // Update user role
        await this.userModel.findByIdAndUpdate(subscription.userId, {
          role: subscription.role,
        });
        break;
      case 'canceled':
      case 'unpaid':
      case 'past_due':
        subscription.status = SubscriptionStatus.EXPIRED;
        // Downgrade user role
        await this.userModel.findByIdAndUpdate(subscription.userId, {
          role: 'owner',
        });
        break;
    }

    await subscription.save();
  }

  /**
   * Handle subscription deletion from Stripe
   */
  private async handleSubscriptionDeleted(
    stripeSubscription: Stripe.Subscription,
  ): Promise<void> {
    const subscription = await this.subscriptionModel.findOne({
      stripeSubscriptionId: stripeSubscription.id,
    });

    if (!subscription) {
      return;
    }

    // Mark as expired and downgrade user
    subscription.status = SubscriptionStatus.EXPIRED;
    await subscription.save();

    // Downgrade user role to owner
    await this.userModel.findByIdAndUpdate(subscription.userId, {
      role: 'owner',
    });
  }

  /**
   * Check and expire subscriptions that have passed their period end
   */
  async checkAndExpireSubscriptions(): Promise<void> {
    const now = new Date();
    const expiredSubscriptions = await this.subscriptionModel.find({
      status: {
        $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.EXPIRES_SOON],
      },
      currentPeriodEnd: { $lt: now },
    });

    for (const subscription of expiredSubscriptions) {
      subscription.status = SubscriptionStatus.EXPIRED;
      await subscription.save();

      // Downgrade user role
      await this.userModel.findByIdAndUpdate(subscription.userId, {
        role: 'owner',
      });
    }
  }

  /**
   * Automatically cancel subscriptions that have been expired for more than 3 days
   */
  async checkAndCancelExpiredSubscriptions(): Promise<void> {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago

    // Find subscriptions that are expired and have been expired for more than 3 days
    // We check currentPeriodEnd to see when the subscription expired (3 days after period end)
    const expiredSubscriptions = await this.subscriptionModel.find({
      status: SubscriptionStatus.EXPIRED,
      currentPeriodEnd: { $lt: threeDaysAgo }, // Period ended more than 3 days ago
    });

    for (const subscription of expiredSubscriptions) {
      // Mark as canceled
      subscription.status = SubscriptionStatus.CANCELED;
      await subscription.save();

      // Remove veterinarian or pet sitter record
      try {
        if (subscription.role === 'vet') {
          await this.veterinariansService.remove(
            subscription.userId.toString(),
          );
          console.log(
            `✅ Auto-canceled: Removed veterinarian record for user ${subscription.userId}`,
          );
        } else if (subscription.role === 'sitter') {
          await this.petSittersService.remove(subscription.userId.toString());
          console.log(
            `✅ Auto-canceled: Removed pet sitter record for user ${subscription.userId}`,
          );
        }
      } catch (error) {
        // Log error but don't fail if record doesn't exist
        console.warn(
          `⚠️ Auto-cancel: Could not remove ${subscription.role} record for user ${subscription.userId}:`,
          error,
        );
      }

      console.log(
        `✅ Auto-canceled subscription for userId: ${subscription.userId} (expired for more than 3 days)`,
      );
    }

    if (expiredSubscriptions.length > 0) {
      console.log(
        `✅ Auto-canceled ${expiredSubscriptions.length} subscription(s) that were expired for more than 3 days`,
      );
    }
  }

  /**
   * Map subscription document to response DTO
   */
  private mapToResponseDto(
    subscription: SubscriptionDocument,
  ): SubscriptionResponseDto {
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

  /**
   * Activate subscription by Stripe subscription ID (called from webhook)
   */
  async activateSubscriptionByStripeId(stripeSubscriptionId: string): Promise<void> {
    const subscription = await this.subscriptionModel.findOne({
      stripeSubscriptionId,
    });

    if (!subscription) {
      console.warn(`⚠️ No subscription found for Stripe ID: ${stripeSubscriptionId}`);
      return;
    }

    if (subscription.status === SubscriptionStatus.ACTIVE) {
      console.log(`ℹ️ Subscription ${subscription._id} is already active`);
      return;
    }

    // Activate subscription
    subscription.status = SubscriptionStatus.ACTIVE;
    await subscription.save();

    // Update user's hasActiveSubscription flag
    await this.userModel.findByIdAndUpdate(subscription.userId, {
      hasActiveSubscription: true,
    });

    console.log(`✅ Activated subscription ${subscription._id} for user ${subscription.userId}`);
  }

  /**
   * Create Stripe subscription after payment is confirmed (called from webhook)
   */
  async createSubscriptionAfterPayment(
    userId: string,
    customerId: string,
    role: string,
    paymentMethodId: string,
  ): Promise<void> {
    console.log(`💳 Creating subscription after payment for user ${userId}`);

    // Find the pending subscription
    const subscription = await this.subscriptionModel.findOne({
      userId: new Types.ObjectId(userId),
      status: SubscriptionStatus.PENDING,
    });

    if (!subscription) {
      console.warn(`⚠️ No pending subscription found for user ${userId}`);
      return;
    }

    try {
      // Attach the payment method to the customer and set as default
      if (paymentMethodId) {
        try {
          // Retrieve payment method to check its current state
          const paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);
          
          // Attach payment method to customer if not already attached
          if (!paymentMethod.customer || paymentMethod.customer !== customerId) {
            await this.stripe.paymentMethods.attach(paymentMethodId, {
              customer: customerId,
            });
            console.log(`✅ Attached payment method ${paymentMethodId} to customer ${customerId}`);
          } else {
            console.log(`ℹ️ Payment method ${paymentMethodId} already attached to customer ${customerId}`);
          }

          // Set as default payment method for the customer
          await this.stripe.customers.update(customerId, {
            invoice_settings: {
              default_payment_method: paymentMethodId,
            },
          });
          console.log(`✅ Set payment method ${paymentMethodId} as default for customer ${customerId}`);
        } catch (pmError: any) {
          // If payment method is already attached, that's fine - continue
          if (pmError.code === 'resource_already_exists' || pmError.message?.includes('already attached')) {
            console.log(`ℹ️ Payment method already attached, setting as default...`);
            try {
              await this.stripe.customers.update(customerId, {
                invoice_settings: {
                  default_payment_method: paymentMethodId,
                },
              });
            } catch (updateError: any) {
              console.warn(`⚠️ Could not set default payment method: ${updateError.message}`);
            }
          } else {
            console.warn(`⚠️ Could not attach payment method: ${pmError.message}`);
            // Continue anyway - subscription creation might still work
          }
        }
      }

      // Reuse an existing active Stripe subscription for this customer if one
      // exists (e.g. a previous attempt created it at Stripe but crashed
      // before saving locally) instead of creating — and billing — a duplicate.
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

      // Update our subscription record
      const period = this.getSubscriptionPeriod(stripeSubscription);
      subscription.stripeSubscriptionId = stripeSubscription.id;
      subscription.stripeCustomerId = customerId;
      subscription.currentPeriodStart = period.start;
      subscription.currentPeriodEnd = period.end;
      subscription.status = SubscriptionStatus.ACTIVE;
      subscription.role = role;
      await subscription.save();

      // Update user's hasActiveSubscription flag and role
      await this.userModel.findByIdAndUpdate(userId, {
        hasActiveSubscription: true,
        role: role,
      });

      console.log(`✅ Created and activated subscription ${stripeSubscription.id} for user ${userId}`);
    } catch (error) {
      console.error(`❌ Failed to create subscription after payment for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Confirm payment and activate immediately (called by the client right after
   * Stripe.instance.presentPaymentSheet() succeeds).
   *
   * This makes activation synchronous with the payment flow instead of relying
   * solely on the async Stripe webhook, which may be delayed or unreachable
   * (e.g. no webhook listener forwarding to a local dev backend). The webhook
   * handler remains in place as a fallback/reconciliation path.
   */
  async confirmPayment(userId: string): Promise<SubscriptionResponseDto> {
    const userObjectId = new Types.ObjectId(userId);
    const subscription = await this.subscriptionModel.findOne({
      userId: userObjectId,
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status === SubscriptionStatus.ACTIVE) {
      // Webhook (or a previous call) already activated it.
      return this.mapToResponseDto(subscription);
    }

    if (subscription.status !== SubscriptionStatus.PENDING) {
      throw new BadRequestException(
        `Subscription is not pending. Current status: ${subscription.status}`,
      );
    }

    if (!subscription.stripePaymentIntentId || !this.stripe) {
      throw new BadRequestException('No payment found to confirm for this subscription');
    }

    const paymentIntent = await this.stripe.paymentIntents.retrieve(
      subscription.stripePaymentIntentId,
    );

    if (paymentIntent.status !== 'succeeded') {
      throw new BadRequestException(
        `Payment has not completed yet (status: ${paymentIntent.status})`,
      );
    }

    const customerId = paymentIntent.customer as string;
    const paymentMethodId = paymentIntent.payment_method as string;
    const role = paymentIntent.metadata?.subscriptionRole || subscription.role;

    await this.createSubscriptionAfterPayment(userId, customerId, role, paymentMethodId);

    const updated = await this.subscriptionModel.findOne({ userId: userObjectId });
    return this.mapToResponseDto(updated!);
  }

  /**
   * Create a Stripe SetupIntent so the client can collect a new card.
   * Returns { clientSecret } which the mobile app passes to the Stripe SDK.
   */
  async createSetupIntent(userId: string): Promise<{ clientSecret: string }> {
    const subscription = await this.subscriptionModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!subscription?.stripeCustomerId) {
      throw new BadRequestException('No active subscription or Stripe customer found');
    }
    if (!this.stripe) throw new BadRequestException('Stripe is not configured');

    const setupIntent = await this.stripe.setupIntents.create({
      customer: subscription.stripeCustomerId,
      payment_method_types: ['card'],
      usage: 'off_session',
    });

    return { clientSecret: setupIntent.client_secret! };
  }

  /**
   * Update the default payment method on the Stripe customer + subscription.
   * Body: { paymentMethodId: string }
   */
  async updatePaymentMethod(userId: string, paymentMethodId: string): Promise<SubscriptionResponseDto> {
    const subscription = await this.subscriptionModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!subscription?.stripeCustomerId) {
      throw new BadRequestException('No active subscription found');
    }
    if (!this.stripe) throw new BadRequestException('Stripe is not configured');

    // Attach the payment method to the customer
    try {
      const pm = await this.stripe.paymentMethods.retrieve(paymentMethodId);
      if (!pm.customer || pm.customer !== subscription.stripeCustomerId) {
        await this.stripe.paymentMethods.attach(paymentMethodId, {
          customer: subscription.stripeCustomerId,
        });
      }
    } catch {
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: subscription.stripeCustomerId,
      });
    }

    // Set as default on customer
    await this.stripe.customers.update(subscription.stripeCustomerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // Also set on the subscription if it exists
    if (subscription.stripeSubscriptionId) {
      await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        default_payment_method: paymentMethodId,
      });
    }

    return this.mapToResponseDto(subscription);
  }

  /**
   * Return the last 10 Stripe invoices for this user as a plain list.
   */
  async getBillingHistory(userId: string): Promise<{ invoices: any[] }> {
    const subscription = await this.subscriptionModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!subscription?.stripeCustomerId) return { invoices: [] };
    if (!this.stripe) return { invoices: [] };

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
}
