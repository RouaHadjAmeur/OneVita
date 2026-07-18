// src/modules/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { UserDocument } from '../users/schemas/user.schema';
import { CreateUserDto, UserRole } from '../users/dto/create-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeEmailDto } from './dto/change-email.dto';
import { VerifyNewEmailDto } from './dto/verify-new-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import * as bcrypt from 'bcryptjs';

import { jwtVerify, createRemoteJWKSet } from 'jose';
const GOOGLE_ISS = 'https://accounts.google.com';
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshExpiresIn: string;

  private jwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {
    // Fail fast if missing
    this.accessSecret =
      this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.refreshSecret =
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    // read expirations as strings (env var)
    this.accessExpiresIn =
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';
    this.refreshExpiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';
  }

  // ---------- Helpers ----------
  private async hashToken(token: string): Promise<string> {
    return bcrypt.hash(token, 10);
  }

  private async compareToken(
    token: string,
    hashed: string | undefined,
  ): Promise<boolean> {
    if (!hashed) return false;
    return bcrypt.compare(token, hashed);
  }

  private createAccessSignOptions(): JwtSignOptions {
    return {
      secret: this.accessSecret,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expiresIn: this.accessExpiresIn as any,
    };
  }

  private createRefreshSignOptions(): JwtSignOptions {
    return {
      secret: this.refreshSecret,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expiresIn: this.refreshExpiresIn as any,
    };
  }

  private async generateTokensForUser(user: UserDocument): Promise<Tokens> {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, this.createAccessSignOptions()),
      this.jwtService.signAsync(payload, this.createRefreshSignOptions()),
    ]);

    return { accessToken, refreshToken };
  }

  // ---------- Public API ----------
  async register(
    email: string,
    name: string,
    password: string,
    role: UserRole = UserRole.OWNER,
  ): Promise<{ message: string }> {
    const normalized = email.toLowerCase();

    const existing = await this.usersService.findByEmail(normalized);
    if (existing) throw new BadRequestException('Email already registered');

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();

    const createDto: CreateUserDto = {
      email: normalized,
      name,
      password: hashedPassword,
      role,
      isVerified: false,
      verificationCode,
      verificationCodeExpires: new Date(Date.now() + 10 * 60 * 1000),
    } as unknown as CreateUserDto;

    await this.usersService.create(createDto);

    // best-effort email sending; log error but don't block registration
    try {
      await this.mailService.sendVerificationCode(normalized, verificationCode);
    } catch (err: unknown) {
      // type-safe logging
      if (err instanceof Error) {
        console.error('sendVerificationCode failed:', err.message);
      } else {
        console.error('sendVerificationCode failed (unknown error)');
      }
    }

    return { message: 'Verification code sent to your email' };
  }

  async verifyEmail(email: string, code: string): Promise<{ message: string }> {
    const normalized = email.toLowerCase();
    const user = await this.usersService.findByEmail(normalized);
    if (!user) throw new NotFoundException('User not found');

    if (user.isVerified) return { message: 'Email already verified' };

    const now = new Date();
    if (
      !user.verificationCode ||
      user.verificationCode !== code ||
      !user.verificationCodeExpires ||
      user.verificationCodeExpires < now
    ) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    await this.usersService.update(String(user._id), {
      isVerified: true,
      verificationCode: undefined,
      verificationCodeExpires: undefined,
    } as Partial<CreateUserDto>);

    // Activate subscription if user has a pending subscription
    try {
      const subscription = await this.subscriptionsService.findByUserId(
        String(user._id),
      );
      if (subscription && subscription.status === 'pending') {
        await this.subscriptionsService.activate(String(user._id));
      }
    } catch (error) {
      // Log error but don't fail email verification if subscription activation fails
      console.error(
        'Failed to activate subscription after email verification:',
        error,
      );
    }

    return { message: 'Email verified successfully' };
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ user: Partial<UserDocument>; tokens: Tokens }> {
    const normalized = email.toLowerCase();
    const user = await this.usersService.findByEmail(normalized);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // password exists on UserDocument per schema
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) throw new UnauthorizedException('Invalid credentials');

    if (!user.isVerified)
      throw new UnauthorizedException('Please verify your email first');

    const tokens = await this.generateTokensForUser(user);

    // store hashed refresh token
    const hashed = await this.hashToken(tokens.refreshToken);
    await this.usersService.updateRefreshToken(String(user._id), hashed);

    // return a safe user object (strip sensitive fields)
    const safeUser = {
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      isVerified: user.isVerified,
      pets: user.pets,
      // add other public fields you want to expose
    } as Partial<UserDocument>;

    return { user: safeUser, tokens };
  }

  async refreshTokens(userId: string, refreshToken: string): Promise<Tokens> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('Access denied');

    // compare provided refresh token with hashed stored one
    const isValid = await this.compareToken(
      refreshToken,
      user.hashedRefreshToken,
    );
    if (!isValid) throw new UnauthorizedException('Invalid refresh token');

    const tokens = await this.generateTokensForUser(user);

    // replace hashed refresh token
    const hashed = await this.hashToken(tokens.refreshToken);
    await this.usersService.updateRefreshToken(String(user._id), hashed);

    return tokens;
  }

  async logout(userId: string): Promise<{ message: string }> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    await this.usersService.updateRefreshToken(String(user._id), undefined);
    return { message: 'Logged out successfully' };
  }

  async resendVerificationCode(email: string): Promise<{ message: string }> {
    const normalized = email.toLowerCase();
    const user = await this.usersService.findByEmail(normalized);
    if (!user) throw new NotFoundException('User not found');
    // For non-Google accounts, bail out if already verified (legacy behavior).
    // For Google accounts, we allow sending a new code each time as an extra
    // verification step when signing in with Google.
    if (user.isVerified && user.provider !== 'google') {
      throw new BadRequestException('User already verified');
    }

    // Prevent spamming resend if a code is still valid
    if (
      user.verificationCodeExpires &&
      user.verificationCodeExpires > new Date()
    ) {
      throw new BadRequestException(
        'Verification code still valid. Please wait before requesting a new code.',
      );
    }

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    await this.usersService.update(String(user._id), {
      verificationCode: newCode,
      verificationCodeExpires: new Date(Date.now() + 10 * 60 * 1000),
    } as Partial<CreateUserDto>);

    try {
      await this.mailService.sendVerificationCode(user.email, newCode);
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error('Failed to send verification email:', err.message);
      } else {
        console.error('Failed to send verification email (unknown error)');
      }
    }

    return { message: 'New verification code sent to your email' };
  }

  async getProfile(
    userId: string,
  ): Promise<Partial<UserDocument> & { subscription?: any }> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    // Get subscription if exists
    let subscription = null;
    try {
      subscription = await this.subscriptionsService.findByUserId(userId);
    } catch (error) {
      // Subscription not found or error - continue without it
      console.error('Error fetching subscription:', error);
    }

    // remove sensitive fields
    const safe = {
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      isVerified: user.isVerified,
      pets: user.pets,
      profileImage: user.profileImage,
      phone: user.phoneNumber,
      country: user.country,
      city: user.city,
      latitude: user.latitude,
      longitude: user.longitude,
      subscription: subscription || undefined,
    } as Partial<UserDocument> & { subscription?: any };

    return safe;
  }

  async checkEmailExists(email: string): Promise<UserDocument | null> {
    const normalized = email.toLowerCase().trim();
    return this.usersService.findByEmail(normalized);
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    const normalized = forgotPasswordDto.email.toLowerCase();
    const user = await this.usersService.findByEmail(normalized);

    // Don't reveal if user exists or not for security
    if (!user) {
      return {
        message:
          'If an account exists, a password reset code has been sent to your email.',
      };
    }

    // Check if user has a password (Google users don't have passwords)
    if (!user.password) {
      return {
        message:
          'If an account exists, a password reset code has been sent to your email.',
      };
    }

    // Generate reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store reset code
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await this.usersService.update(String(user._id), {
      passwordResetCode: resetCode,
      passwordResetCodeExpires: expires,
    } as any);

    // Send reset code via email
    try {
      await this.mailService.sendVerificationCode(user.email, resetCode);
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error('Failed to send password reset email:', err.message);
      }
    }

    return {
      message:
        'If an account exists, a password reset code has been sent to your email.',
    };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const normalized = resetPasswordDto.email.toLowerCase();
    const user = await this.usersService.findByEmail(normalized);

    if (!user) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    // Verify reset code
    const now = new Date();
    if (
      !user.passwordResetCode ||
      user.passwordResetCode !== resetPasswordDto.code ||
      !user.passwordResetCodeExpires ||
      user.passwordResetCodeExpires < now
    ) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10);

    // Update password and clear reset code
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await this.usersService.update(String(user._id), {
      password: hashedPassword,
      passwordResetCode: undefined,
      passwordResetCodeExpires: undefined,
    } as any);

    // Invalidate all refresh tokens (logout all devices for security)
    await this.usersService.updateRefreshToken(String(user._id), null);

    return {
      message:
        'Password reset successfully. Please login with your new password.',
    };
  }

  async changeEmail(
    userId: string,
    changeEmailDto: ChangeEmailDto,
  ): Promise<{ message: string }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify password (required for security)
    if (!user.password) {
      throw new BadRequestException(
        'Cannot change email for accounts signed in with Google',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      changeEmailDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Password is incorrect');
    }

    // Check if new email is already in use
    const normalizedNewEmail = changeEmailDto.newEmail.toLowerCase();
    const existingUser =
      await this.usersService.findByEmail(normalizedNewEmail);
    if (existingUser) {
      throw new BadRequestException('Email is already in use');
    }

    // Generate verification code for new email
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store pending email change
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await this.usersService.update(String(user._id), {
      pendingEmail: normalizedNewEmail,
      emailChangeCode: verificationCode,
      emailChangeCodeExpires: expires,
    } as any);

    // Send verification code to new email
    try {
      await this.mailService.sendVerificationCode(
        normalizedNewEmail,
        verificationCode,
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error('Failed to send email change verification:', err.message);
      }
      throw new BadRequestException(
        'Failed to send verification code to new email',
      );
    }

    return {
      message: `Verification code sent to ${normalizedNewEmail}. Please verify to complete email change.`,
    };
  }

  async verifyNewEmail(
    userId: string,
    verifyDto: VerifyNewEmailDto,
  ): Promise<{ message: string }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const normalizedEmail = verifyDto.newEmail.toLowerCase();

    // Verify the code matches and hasn't expired
    if (
      !user.pendingEmail ||
      user.pendingEmail !== normalizedEmail ||
      !user.emailChangeCode ||
      user.emailChangeCode !== verifyDto.code ||
      !user.emailChangeCodeExpires ||
      user.emailChangeCodeExpires < new Date()
    ) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    // Check again if email is still available (race condition check)
    const existingUser = await this.usersService.findByEmail(normalizedEmail);
    if (existingUser && String(existingUser._id) !== String(user._id)) {
      throw new BadRequestException('Email is already in use');
    }

    // Update email and clear pending fields
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await this.usersService.update(String(user._id), {
      email: normalizedEmail,
      pendingEmail: undefined,
      emailChangeCode: undefined,
      emailChangeCodeExpires: undefined,
    } as any);

    // Invalidate all refresh tokens (logout all devices for security)
    await this.usersService.updateRefreshToken(String(user._id), null);

    return {
      message:
        'Email changed successfully. Please login again with your new email.',
    };
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has a password (might be Google-only user)
    if (!user.password) {
      throw new BadRequestException(
        'Cannot change password for accounts signed in with Google',
      );
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    // Update password and clear refresh token (invalidates all sessions)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await this.usersService.update(String(user._id), {
      password: hashedPassword,
    } as any);

    // Invalidate all refresh tokens by clearing hashedRefreshToken
    await this.usersService.updateRefreshToken(String(user._id), null);

    return {
      message:
        'Password changed successfully. Please login again with your new password.',
    };
  }

  /** Sign in with Google */
  async signInWithGoogle(idToken: string) {
    const expectedAudienceRaw = this.configService.get<string>(
      'GOOGLE_IOS_CLIENT_ID',
    );
    // Normalize to avoid invisible Unicode chars / stray spaces from copy‑paste
    const expectedAudience = expectedAudienceRaw
      ? expectedAudienceRaw.replace(/[^\x20-\x7E]/g, '').trim()
      : undefined;

    if (!expectedAudience) {
      console.error('GOOGLE_IOS_CLIENT_ID environment variable is not set');
      throw new UnauthorizedException(
        'Google authentication not configured. Missing GOOGLE_IOS_CLIENT_ID',
      );
    }

    let payload: any;

    try {
      // Verify signature and issuer first, then manually check audience
      const verified = await jwtVerify(idToken, this.jwks, {
        issuer: GOOGLE_ISS,
        // Don't validate audience here - we'll check it manually
      });
      payload = verified.payload;

      // Manually verify audience - check both 'aud' and 'azp' claims.
      // Google tokens can have audience in either field.
      const rawAud = payload.aud as string | string[] | undefined;
      const rawAzp = payload.azp as string | undefined;

      const normalize = (val: string | undefined) =>
        val ? val.replace(/[^\x20-\x7E]/g, '').trim() : undefined;

      const tokenAud =
        Array.isArray(rawAud) && rawAud.length > 0
          ? rawAud.map((v) => normalize(v)).filter(Boolean)
          : rawAud
            ? [normalize(rawAud as string)]
            : [];
      const tokenAzp = normalize(rawAzp);

      const audienceMatches =
        tokenAud.includes(expectedAudience) || tokenAzp === expectedAudience;

      if (!audienceMatches) {
        console.error(
          `Audience mismatch. Expected: ${expectedAudience}, got aud: ${JSON.stringify(tokenAud)}, azp: ${tokenAzp}`,
        );
        throw new UnauthorizedException(
          `Invalid Google token: audience mismatch. Expected ${expectedAudience}`,
        );
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('Google token verification failed:', error);
      throw new UnauthorizedException(
        `Invalid Google token: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { sub, email, email_verified, name, picture } = payload;
    if (!email || email_verified !== true) {
      throw new UnauthorizedException('Email not verified with Google');
    }

    // 1) Find existing user by provider or email
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    let user = (this.usersService as any).findByProvider
      ? // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await (this.usersService as any).findByProvider('google', sub)
      : null;

    if (!user) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      user = await this.usersService.findByEmail(email);
    }

    // 2) Create or update user
    if (!user) {
      // First-time Google user → require email verification
      const verificationCode = Math.floor(
        100000 + Math.random() * 900000,
      ).toString();
      const expires = new Date(Date.now() + 10 * 60 * 1000);

      user = await this.usersService.create({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        email,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        name,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        profileImage: picture,
        provider: 'google',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        providerId: sub,
        isVerified: false,
        verificationCode,
        verificationCodeExpires: expires,
        // role: UserRole.OWNER, // if you want to force a role
      } as unknown as CreateUserDto);

      // Send code (best effort)
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        await this.mailService.sendVerificationCode(email, verificationCode);
      } catch (e) {
        console.error(
          'sendVerificationCode failed:',
          (e as Error)?.message ?? e,
        );
      }
    } else {
      // Keep provider linkage up to date
      const needsUpdate =
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        user.provider !== 'google' ||
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        user.providerId !== sub ||
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        user.profileImage !== picture ||
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        user.name !== name;

      if (needsUpdate) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        user = await this.usersService.update(user._id, {
          provider: 'google',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          providerId: sub,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          profileImage: picture ?? user.profileImage,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          name: name ?? user.name,
        });
      }
    }

    // 3) Issue tokens (same as password login)
    const { accessToken, refreshToken } =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await this.generateTokensForUser(user);

    // 4) Store only hashed refresh token
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    user.hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (typeof user.save === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await user.save();
    } else if (
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      typeof (this.usersService as any).saveRefreshHash === 'function'
    ) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await (this.usersService as any).saveRefreshHash(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        user._id,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        user.hashedRefreshToken,
      );
    }

    // 5) Return same shape as /auth/login
    return {
      user: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        id: user._id,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        email: user.email,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        name: user.name,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        profileImage: user.profileImage,
        // Optionally include isVerified so the app can branch without calling /auth/me
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        isVerified: user.isVerified,
      },
      tokens: { accessToken, refreshToken },
    };
  }
}
