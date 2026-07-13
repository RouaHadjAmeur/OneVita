import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { UserDocument } from '../users/schemas/user.schema';
import { UserRole } from '../users/dto/create-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeEmailDto } from './dto/change-email.dto';
import { VerifyNewEmailDto } from './dto/verify-new-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
export interface Tokens {
    accessToken: string;
    refreshToken: string;
}
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    private readonly configService;
    private readonly mailService;
    private readonly subscriptionsService;
    private readonly accessSecret;
    private readonly refreshSecret;
    private readonly accessExpiresIn;
    private readonly refreshExpiresIn;
    private jwks;
    private appleJwks;
    constructor(usersService: UsersService, jwtService: JwtService, configService: ConfigService, mailService: MailService, subscriptionsService: SubscriptionsService);
    private hashToken;
    private compareToken;
    private createAccessSignOptions;
    private createRefreshSignOptions;
    private generateTokensForUser;
    register(email: string, name: string, password: string, role?: UserRole): Promise<{
        message: string;
    }>;
    verifyEmail(email: string, code: string): Promise<{
        message: string;
    }>;
    login(email: string, password: string): Promise<{
        user: Partial<UserDocument>;
        tokens: Tokens;
    }>;
    refreshTokens(userId: string, refreshToken: string): Promise<Tokens>;
    logout(userId: string): Promise<{
        message: string;
    }>;
    resendVerificationCode(email: string): Promise<{
        message: string;
    }>;
    getProfile(userId: string): Promise<Partial<UserDocument> & {
        subscription?: any;
    }>;
    checkEmailExists(email: string): Promise<UserDocument | null>;
    forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    changeEmail(userId: string, changeEmailDto: ChangeEmailDto): Promise<{
        message: string;
    }>;
    verifyNewEmail(userId: string, verifyDto: VerifyNewEmailDto): Promise<{
        message: string;
    }>;
    changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    signInWithGoogle(idToken: string): Promise<{
        user: {
            id: any;
            email: any;
            name: any;
            profileImage: any;
            isVerified: any;
        };
        tokens: {
            accessToken: string;
            refreshToken: string;
        };
    }>;
    signInWithApple(identityToken: string, clientName?: string): Promise<{
        user: {
            id: any;
            email: any;
            name: any;
            isVerified: any;
        };
        tokens: {
            accessToken: string;
            refreshToken: string;
        };
    }>;
}
