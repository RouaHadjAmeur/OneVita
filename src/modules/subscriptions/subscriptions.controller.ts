// src/modules/subscriptions/subscriptions.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  RawBodyRequest,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import {
  SubscriptionResponseDto,
  CreateSubscriptionResponseDto,
  CancelSubscriptionResponseDto,
  VerifyEmailResponseDto,
} from './dto/subscription-response.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserDocument } from '../users/schemas/user.schema';
import { SubscriptionStatus } from './schemas/subscription.schema';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';

@Controller('subscriptions')
export class SubscriptionsController {
  private readonly stripeWebhookSecret: string;

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly configService: ConfigService,
  ) {
    this.stripeWebhookSecret =
      this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '';
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: UserDocument,
    @Body() createSubscriptionDto: CreateSubscriptionDto,
  ): Promise<CreateSubscriptionResponseDto> {
    return this.subscriptionsService.create(
      user._id.toString(),
      createSubscriptionDto,
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMySubscription(
    @CurrentUser() user: UserDocument,
  ): Promise<SubscriptionResponseDto> {
    const subscription = await this.subscriptionsService.findByUserId(
      user._id.toString(),
    );
    if (!subscription) {
      // Return a default "none" subscription response
      return {
        id: '',
        userId: user._id.toString(),
        role: user.role || 'owner',
        status: SubscriptionStatus.NONE,
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

  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async cancel(
    @CurrentUser() user: UserDocument,
  ): Promise<CancelSubscriptionResponseDto> {
    return this.subscriptionsService.cancel(user._id.toString());
  }

  /**
   * POST /subscriptions/confirm — called by the client immediately after
   * Stripe.instance.presentPaymentSheet() succeeds, to activate the
   * subscription synchronously instead of waiting on the Stripe webhook.
   */
  @Post('confirm')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async confirm(
    @CurrentUser() user: UserDocument,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.confirmPayment(user._id.toString());
  }

  @Post('reactivate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async reactivate(
    @CurrentUser() user: UserDocument,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.reactivate(user._id.toString());
  }

  @Post('renew')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async renew(
    @CurrentUser() user: UserDocument,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.renew(user._id.toString());
  }

  @Post('update-role')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateRole(
    @CurrentUser() user: UserDocument,
    @Body() body: { role: string },
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.updateSubscriptionRole(user._id.toString(), body.role);
  }

  @Post('activate-pending')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async activatePending(
    @CurrentUser() user: UserDocument,
  ): Promise<SubscriptionResponseDto> {
    // Manually activate pending subscription (for testing when webhook doesn't fire)
    return this.subscriptionsService.activatePendingSubscription(user._id.toString());
  }

  // DEPRECATED: Email verification is no longer required for subscription activation
  // Subscriptions are now activated automatically upon successful payment via webhook
  // Keeping this endpoint for backward compatibility but it will return success immediately
  @Post('verify-email')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @CurrentUser() user: UserDocument,
    @Body() verifyEmailDto: VerifyEmailDto,
  ): Promise<VerifyEmailResponseDto> {
    // For backward compatibility, just return the current subscription status
    const subscription = await this.subscriptionsService.findByUserId(
      user._id.toString(),
    );
    
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

  // DEPRECATED: Email verification is no longer required
  @Post('resend-verification')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async resendVerification(
    @CurrentUser() user: UserDocument,
  ): Promise<{ message: string }> {
    return {
      message: 'Email verification is no longer required. Your subscription will activate automatically upon payment.',
    };
  }

  /** GET /subscriptions/billing-history — last 10 invoices */
  @Get('billing-history')
  @UseGuards(JwtAuthGuard)
  async getBillingHistory(
    @CurrentUser() user: UserDocument,
  ): Promise<{ invoices: any[] }> {
    return this.subscriptionsService.getBillingHistory(user._id.toString());
  }

  /** POST /subscriptions/setup-intent — create Stripe SetupIntent for card collection */
  @Post('setup-intent')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async createSetupIntent(
    @CurrentUser() user: UserDocument,
  ): Promise<{ clientSecret: string }> {
    return this.subscriptionsService.createSetupIntent(user._id.toString());
  }

  /** POST /subscriptions/update-payment-method — attach & set new default card */
  @Post('update-payment-method')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updatePaymentMethod(
    @CurrentUser() user: UserDocument,
    @Body() body: { paymentMethodId: string },
  ): Promise<any> {
    return this.subscriptionsService.updatePaymentMethod(user._id.toString(), body.paymentMethodId);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ received: boolean }> {
    const sig = req.headers['stripe-signature'] as string;

    if (!sig) {
      console.error('Missing stripe-signature header');
      return { received: false };
    }

    if (!this.stripeWebhookSecret) {
      console.warn(
        'STRIPE_WEBHOOK_SECRET not configured. Webhook verification skipped.',
      );
      // In test mode, we might not have webhook secret
      return { received: true };
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      const stripe = new Stripe(
        this.configService.get<string>('STRIPE_SECRET_KEY') || '',
        { apiVersion: '2025-11-17.clover' },
      );

      const rawBody = req.rawBody;
      if (!rawBody) {
        throw new Error('Missing raw body');
      }

      event = stripe.webhooks.constructEvent(
        rawBody,
        sig,
        this.stripeWebhookSecret,
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return { received: false };
    }

    // Handle the event
    try {
      await this.subscriptionsService.handleStripeWebhook(event);
    } catch (error) {
      console.error('Error handling webhook event:', error);
      // Return success to Stripe even if we had an error (to avoid retries)
      return { received: true };
    }

    return { received: true };
  }
}
