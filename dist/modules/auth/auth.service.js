"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const users_service_1 = require("../users/users.service");
const mail_service_1 = require("../mail/mail.service");
const create_user_dto_1 = require("../users/dto/create-user.dto");
const subscriptions_service_1 = require("../subscriptions/subscriptions.service");
const bcrypt = __importStar(require("bcryptjs"));
const jose_1 = require("jose");
const GOOGLE_ISS = 'https://accounts.google.com';
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const APPLE_ISS = 'https://appleid.apple.com';
const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
let AuthService = class AuthService {
    constructor(usersService, jwtService, configService, mailService, subscriptionsService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.configService = configService;
        this.mailService = mailService;
        this.subscriptionsService = subscriptionsService;
        this.jwks = (0, jose_1.createRemoteJWKSet)(new URL(GOOGLE_JWKS_URL));
        this.appleJwks = (0, jose_1.createRemoteJWKSet)(new URL(APPLE_JWKS_URL));
        this.accessSecret =
            this.configService.getOrThrow('JWT_ACCESS_SECRET');
        this.refreshSecret =
            this.configService.getOrThrow('JWT_REFRESH_SECRET');
        this.accessExpiresIn =
            this.configService.get('JWT_ACCESS_EXPIRES_IN') ?? '15m';
        this.refreshExpiresIn =
            this.configService.get('JWT_REFRESH_EXPIRES_IN') ?? '7d';
    }
    async hashToken(token) {
        return bcrypt.hash(token, 10);
    }
    async compareToken(token, hashed) {
        if (!hashed)
            return false;
        return bcrypt.compare(token, hashed);
    }
    createAccessSignOptions() {
        return {
            secret: this.accessSecret,
            expiresIn: this.accessExpiresIn,
        };
    }
    createRefreshSignOptions() {
        return {
            secret: this.refreshSecret,
            expiresIn: this.refreshExpiresIn,
        };
    }
    async generateTokensForUser(user) {
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
    async register(email, name, password, role = create_user_dto_1.UserRole.OWNER) {
        const normalized = email.toLowerCase();
        const existing = await this.usersService.findByEmail(normalized);
        if (existing)
            throw new common_1.BadRequestException('Email already registered');
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const isDev = process.env.NODE_ENV !== 'production';
        const createDto = {
            email: normalized,
            name,
            password: hashedPassword,
            role,
            isVerified: isDev ? true : false,
            verificationCode: isDev ? undefined : verificationCode,
            verificationCodeExpires: isDev ? undefined : new Date(Date.now() + 10 * 60 * 1000),
        };
        await this.usersService.create(createDto);
        if (isDev) {
            console.log(`[DEV] Auto-verified user ${normalized} — email verification skipped in development`);
            return { message: 'Registration successful' };
        }
        console.log(`[DEV] Verification code for ${normalized}: ${verificationCode}`);
        try {
            await this.mailService.sendVerificationCode(normalized, verificationCode);
        }
        catch (err) {
            if (err instanceof Error) {
                console.error('sendVerificationCode failed:', err.message);
            }
            else {
                console.error('sendVerificationCode failed (unknown error)');
            }
        }
        return { message: 'Verification code sent to your email' };
    }
    async verifyEmail(email, code) {
        const normalized = email.toLowerCase();
        const user = await this.usersService.findByEmail(normalized);
        if (!user)
            throw new common_1.NotFoundException('User not found');
        if (user.isVerified)
            return { message: 'Email already verified' };
        const now = new Date();
        if (!user.verificationCode ||
            user.verificationCode !== code ||
            !user.verificationCodeExpires ||
            user.verificationCodeExpires < now) {
            throw new common_1.BadRequestException('Invalid or expired verification code');
        }
        await this.usersService.update(String(user._id), {
            isVerified: true,
            verificationCode: undefined,
            verificationCodeExpires: undefined,
        });
        try {
            const subscription = await this.subscriptionsService.findByUserId(String(user._id));
            if (subscription && subscription.status === 'pending') {
                await this.subscriptionsService.activate(String(user._id));
            }
        }
        catch (error) {
            console.error('Failed to activate subscription after email verification:', error);
        }
        return { message: 'Email verified successfully' };
    }
    async login(email, password) {
        const normalized = email.toLowerCase();
        const user = await this.usersService.findByEmail(normalized);
        if (!user)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const passwordValid = await bcrypt.compare(password, user.password);
        if (!passwordValid)
            throw new common_1.UnauthorizedException('Invalid credentials');
        if (!user.isVerified)
            throw new common_1.UnauthorizedException('Please verify your email first');
        const tokens = await this.generateTokensForUser(user);
        const hashed = await this.hashToken(tokens.refreshToken);
        await this.usersService.updateRefreshToken(String(user._id), hashed);
        const safeUser = {
            _id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            isVerified: user.isVerified,
            pets: user.pets,
        };
        return { user: safeUser, tokens };
    }
    async refreshTokens(userId, refreshToken) {
        const user = await this.usersService.findById(userId);
        if (!user)
            throw new common_1.UnauthorizedException('Access denied');
        const isValid = await this.compareToken(refreshToken, user.hashedRefreshToken);
        if (!isValid)
            throw new common_1.UnauthorizedException('Invalid refresh token');
        const tokens = await this.generateTokensForUser(user);
        const hashed = await this.hashToken(tokens.refreshToken);
        await this.usersService.updateRefreshToken(String(user._id), hashed);
        return tokens;
    }
    async logout(userId) {
        const user = await this.usersService.findById(userId);
        if (!user)
            throw new common_1.NotFoundException('User not found');
        await this.usersService.updateRefreshToken(String(user._id), undefined);
        return { message: 'Logged out successfully' };
    }
    async resendVerificationCode(email) {
        const normalized = email.toLowerCase();
        const user = await this.usersService.findByEmail(normalized);
        if (!user)
            throw new common_1.NotFoundException('User not found');
        if (user.isVerified && user.provider !== 'google') {
            throw new common_1.BadRequestException('User already verified');
        }
        if (user.verificationCodeExpires &&
            user.verificationCodeExpires > new Date()) {
            throw new common_1.BadRequestException('Verification code still valid. Please wait before requesting a new code.');
        }
        const newCode = Math.floor(100000 + Math.random() * 900000).toString();
        await this.usersService.update(String(user._id), {
            verificationCode: newCode,
            verificationCodeExpires: new Date(Date.now() + 10 * 60 * 1000),
        });
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[DEV] Resend verification code for ${user.email}: ${newCode}`);
        }
        try {
            await this.mailService.sendVerificationCode(user.email, newCode);
        }
        catch (err) {
            if (err instanceof Error) {
                console.error('Failed to send verification email:', err.message);
            }
            else {
                console.error('Failed to send verification email (unknown error)');
            }
        }
        return { message: 'New verification code sent to your email' };
    }
    async getProfile(userId) {
        const user = await this.usersService.findById(userId);
        if (!user)
            throw new common_1.NotFoundException('User not found');
        let subscription = null;
        try {
            subscription = await this.subscriptionsService.findByUserId(userId);
        }
        catch (error) {
            console.error('Error fetching subscription:', error);
        }
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
        };
        return safe;
    }
    async checkEmailExists(email) {
        const normalized = email.toLowerCase().trim();
        return this.usersService.findByEmail(normalized);
    }
    async forgotPassword(forgotPasswordDto) {
        const normalized = forgotPasswordDto.email.toLowerCase();
        const user = await this.usersService.findByEmail(normalized);
        if (!user) {
            return {
                message: 'If an account exists, a password reset code has been sent to your email.',
            };
        }
        if (!user.password) {
            return {
                message: 'If an account exists, a password reset code has been sent to your email.',
            };
        }
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 10 * 60 * 1000);
        await this.usersService.update(String(user._id), {
            passwordResetCode: resetCode,
            passwordResetCodeExpires: expires,
        });
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[DEV] Password reset code for ${user.email}: ${resetCode}`);
        }
        try {
            await this.mailService.sendVerificationCode(user.email, resetCode);
        }
        catch (err) {
            if (err instanceof Error) {
                console.error('Failed to send password reset email:', err.message);
            }
        }
        return {
            message: 'If an account exists, a password reset code has been sent to your email.',
        };
    }
    async resetPassword(resetPasswordDto) {
        const normalized = resetPasswordDto.email.toLowerCase();
        const user = await this.usersService.findByEmail(normalized);
        if (!user) {
            throw new common_1.BadRequestException('Invalid or expired reset code');
        }
        const now = new Date();
        if (!user.passwordResetCode ||
            user.passwordResetCode !== resetPasswordDto.code ||
            !user.passwordResetCodeExpires ||
            user.passwordResetCodeExpires < now) {
            throw new common_1.BadRequestException('Invalid or expired reset code');
        }
        const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10);
        await this.usersService.update(String(user._id), {
            password: hashedPassword,
            passwordResetCode: undefined,
            passwordResetCodeExpires: undefined,
        });
        await this.usersService.updateRefreshToken(String(user._id), null);
        return {
            message: 'Password reset successfully. Please login with your new password.',
        };
    }
    async changeEmail(userId, changeEmailDto) {
        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (!user.password) {
            throw new common_1.BadRequestException('Cannot change email for accounts signed in with Google');
        }
        const isPasswordValid = await bcrypt.compare(changeEmailDto.password, user.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Password is incorrect');
        }
        const normalizedNewEmail = changeEmailDto.newEmail.toLowerCase();
        const existingUser = await this.usersService.findByEmail(normalizedNewEmail);
        if (existingUser) {
            throw new common_1.BadRequestException('Email is already in use');
        }
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 10 * 60 * 1000);
        await this.usersService.update(String(user._id), {
            pendingEmail: normalizedNewEmail,
            emailChangeCode: verificationCode,
            emailChangeCodeExpires: expires,
        });
        try {
            await this.mailService.sendVerificationCode(normalizedNewEmail, verificationCode);
        }
        catch (err) {
            if (err instanceof Error) {
                console.error('Failed to send email change verification:', err.message);
            }
            throw new common_1.BadRequestException('Failed to send verification code to new email');
        }
        return {
            message: `Verification code sent to ${normalizedNewEmail}. Please verify to complete email change.`,
        };
    }
    async verifyNewEmail(userId, verifyDto) {
        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const normalizedEmail = verifyDto.newEmail.toLowerCase();
        if (!user.pendingEmail ||
            user.pendingEmail !== normalizedEmail ||
            !user.emailChangeCode ||
            user.emailChangeCode !== verifyDto.code ||
            !user.emailChangeCodeExpires ||
            user.emailChangeCodeExpires < new Date()) {
            throw new common_1.BadRequestException('Invalid or expired verification code');
        }
        const existingUser = await this.usersService.findByEmail(normalizedEmail);
        if (existingUser && String(existingUser._id) !== String(user._id)) {
            throw new common_1.BadRequestException('Email is already in use');
        }
        await this.usersService.update(String(user._id), {
            email: normalizedEmail,
            pendingEmail: undefined,
            emailChangeCode: undefined,
            emailChangeCodeExpires: undefined,
        });
        await this.usersService.updateRefreshToken(String(user._id), null);
        return {
            message: 'Email changed successfully. Please login again with your new email.',
        };
    }
    async changePassword(userId, changePasswordDto) {
        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (!user.password) {
            throw new common_1.BadRequestException('Cannot change password for accounts signed in with Google');
        }
        const isPasswordValid = await bcrypt.compare(changePasswordDto.currentPassword, user.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Current password is incorrect');
        }
        const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);
        await this.usersService.update(String(user._id), {
            password: hashedPassword,
        });
        await this.usersService.updateRefreshToken(String(user._id), null);
        return {
            message: 'Password changed successfully. Please login again with your new password.',
        };
    }
    async signInWithGoogle(idToken) {
        const expectedAudienceRaw = this.configService.get('GOOGLE_IOS_CLIENT_ID');
        const expectedAudience = expectedAudienceRaw
            ? expectedAudienceRaw.replace(/[^\x20-\x7E]/g, '').trim()
            : undefined;
        if (!expectedAudience) {
            console.error('GOOGLE_IOS_CLIENT_ID environment variable is not set');
            throw new common_1.UnauthorizedException('Google authentication not configured. Missing GOOGLE_IOS_CLIENT_ID');
        }
        let payload;
        try {
            const verified = await (0, jose_1.jwtVerify)(idToken, this.jwks, {
                issuer: GOOGLE_ISS,
            });
            payload = verified.payload;
            const rawAud = payload.aud;
            const rawAzp = payload.azp;
            const normalize = (val) => val ? val.replace(/[^\x20-\x7E]/g, '').trim() : undefined;
            const tokenAud = Array.isArray(rawAud) && rawAud.length > 0
                ? rawAud.map((v) => normalize(v)).filter(Boolean)
                : rawAud
                    ? [normalize(rawAud)]
                    : [];
            const tokenAzp = normalize(rawAzp);
            const audienceMatches = tokenAud.includes(expectedAudience) || tokenAzp === expectedAudience;
            if (!audienceMatches) {
                console.error(`Audience mismatch. Expected: ${expectedAudience}, got aud: ${JSON.stringify(tokenAud)}, azp: ${tokenAzp}`);
                throw new common_1.UnauthorizedException(`Invalid Google token: audience mismatch. Expected ${expectedAudience}`);
            }
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            console.error('Google token verification failed:', error);
            throw new common_1.UnauthorizedException(`Invalid Google token: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        const { sub, email, email_verified, name, picture } = payload;
        if (!email || email_verified !== true) {
            throw new common_1.UnauthorizedException('Email not verified with Google');
        }
        let user = this.usersService.findByProvider
            ?
                await this.usersService.findByProvider('google', sub)
            : null;
        if (!user) {
            user = await this.usersService.findByEmail(email);
        }
        if (!user) {
            const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
            const expires = new Date(Date.now() + 10 * 60 * 1000);
            user = await this.usersService.create({
                email,
                name,
                profileImage: picture,
                provider: 'google',
                providerId: sub,
                isVerified: false,
                verificationCode,
                verificationCodeExpires: expires,
            });
            try {
                await this.mailService.sendVerificationCode(email, verificationCode);
            }
            catch (e) {
                console.error('sendVerificationCode failed:', e?.message ?? e);
            }
        }
        else {
            const needsUpdate = user.provider !== 'google' ||
                user.providerId !== sub ||
                user.profileImage !== picture ||
                user.name !== name;
            if (needsUpdate) {
                user = await this.usersService.update(user._id, {
                    provider: 'google',
                    providerId: sub,
                    profileImage: picture ?? user.profileImage,
                    name: name ?? user.name,
                });
            }
        }
        const { accessToken, refreshToken } = await this.generateTokensForUser(user);
        user.hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
        if (typeof user.save === 'function') {
            await user.save();
        }
        else if (typeof this.usersService.saveRefreshHash === 'function') {
            await this.usersService.saveRefreshHash(user._id, user.hashedRefreshToken);
        }
        return {
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                profileImage: user.profileImage,
                isVerified: user.isVerified,
            },
            tokens: { accessToken, refreshToken },
        };
    }
    async signInWithApple(identityToken, clientName) {
        const bundleId = this.configService.get('APPLE_BUNDLE_ID');
        if (!bundleId) {
            throw new common_1.UnauthorizedException('Apple authentication not configured. Missing APPLE_BUNDLE_ID');
        }
        let payload;
        try {
            const { payload: verified } = await (0, jose_1.jwtVerify)(identityToken, this.appleJwks, {
                issuer: APPLE_ISS,
                audience: bundleId,
            });
            payload = verified;
        }
        catch (error) {
            console.error('Apple token verification failed:', error);
            throw new common_1.UnauthorizedException(`Invalid Apple token: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        const { sub, email, email_verified } = payload;
        if (!sub) {
            throw new common_1.UnauthorizedException('Apple token missing user identifier');
        }
        const emailVerified = email_verified === true || email_verified === 'true';
        let user = this.usersService.findByProvider
            ?
                await this.usersService.findByProvider('apple', sub)
            : null;
        if (!user && email) {
            user = await this.usersService.findByEmail(email);
        }
        if (!user) {
            const userName = clientName || (email ? email.split('@')[0] : 'Apple User');
            user = await this.usersService.create({
                email: email || `apple_${sub}@privaterelay.appleid.com`,
                name: userName,
                provider: 'apple',
                providerId: sub,
                isVerified: emailVerified,
            });
        }
        else {
            const needsUpdate = user.provider !== 'apple' || user.providerId !== sub;
            if (needsUpdate) {
                user = await this.usersService.update(user._id, {
                    provider: 'apple',
                    providerId: sub,
                });
            }
        }
        const { accessToken, refreshToken } = await this.generateTokensForUser(user);
        user.hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
        if (typeof user.save === 'function') {
            await user.save();
        }
        return {
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                isVerified: user.isVerified,
            },
            tokens: { accessToken, refreshToken },
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        config_1.ConfigService,
        mail_service_1.MailService,
        subscriptions_service_1.SubscriptionsService])
], AuthService);
//# sourceMappingURL=auth.service.js.map