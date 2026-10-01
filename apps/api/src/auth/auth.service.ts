import {
  ConflictException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import {
  UserCredentials,
  UserResponse,
} from '../users/entities/user.entity.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { MailService } from './mail.service.js';
import { UsersService } from '../users/users.service.js';

export type AuthResponse = {
  accessToken: string;
  user: UserResponse;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
  ) {}

  async register(registerDto: RegisterDto): Promise<UserResponse> {
    const normalizedEmail = registerDto.email.trim().toLowerCase();
    const existingUser = await this.usersService.findByEmail(normalizedEmail);

    if (existingUser !== null) {
      if (existingUser.status === 'PENDING_VERIFICATION') {
        throw new ConflictException(
          'An account with this email is pending verification. Please check your inbox or request a new verification link.',
        );
      }
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await argon2.hash(registerDto.password, {
      type: argon2.argon2id,
    });

    const user = await this.usersService.createWithPasswordHash({
      email: normalizedEmail,
      passwordHash,
      firstName: registerDto.firstName.trim(),
      lastName: registerDto.lastName.trim(),
    });

    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hashVerificationToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await this.usersService.createEmailVerificationToken({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const verificationBaseUrl =
      process.env.EMAIL_VERIFICATION_BASE_URL ??
      `${process.env.WEB_ORIGIN ?? 'http://localhost:3000'}/verify-email`;
    const verificationUrl = `${verificationBaseUrl}?token=${encodeURIComponent(rawToken)}`;

    try {
      await this.mailService.sendVerificationEmail(
        user.email,
        verificationUrl,
        user.id,
      );
    } catch {
      await this.usersService.remove(user.id);
      throw new ServiceUnavailableException(
        'We were unable to send your verification email. Please check your email configuration and try again.',
      );
    }

    return this.toResponse(user);
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.trim().toLowerCase();

    const genericMessage =
      'If an account with this email exists and still needs verification, a new verification link has been sent.';

    const user = await this.usersService.findByEmailForAuth(normalizedEmail);

    if (user === null || user.status !== 'PENDING_VERIFICATION') {
      return { message: genericMessage };
    }

    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hashVerificationToken(rawToken);

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const refreshedToken =
      await this.usersService.refreshEmailVerificationToken({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

    if (refreshedToken === null) {
      throw new ServiceUnavailableException(
        'Failed to generate verification token',
      );
    }

    const verificationBaseUrl =
      process.env.EMAIL_VERIFICATION_BASE_URL ??
      `${process.env.WEB_ORIGIN ?? 'http://localhost:3000'}/verify-email`;

    const verificationUrl = `${verificationBaseUrl}?token=${encodeURIComponent(rawToken)}`;

    try {
      await this.mailService.sendVerificationEmail(
        user.email,
        verificationUrl,
        user.id,
      );
    } catch {
      throw new ServiceUnavailableException(
        'We were unable to send your verification email. Please check your email configuration and try again.',
      );
    }

    return { message: genericMessage };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<UserResponse> {
    const tokenHash = this.hashVerificationToken(verifyEmailDto.token);
    const token = await this.usersService.findEmailVerificationToken(tokenHash);

    if (
      token === null ||
      token.usedAt !== null ||
      new Date(token.expiresAt).getTime() <= Date.now()
    ) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    const tokenConsumed = await this.usersService.consumeEmailVerificationToken(
      token.id,
    );

    if (!tokenConsumed) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    const user = await this.usersService.activateUserFromEmailVerification(
      token.userId,
    );

    if (user === null) {
      throw new UnauthorizedException('Invalid verification token');
    }

    return user;
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    const normalizedEmail = forgotPasswordDto.email.trim().toLowerCase();
    const genericMessage =
      'If an account with this email exists and is active, a password reset link has been sent.';

    const user = await this.usersService.findByEmailForAuth(normalizedEmail);

    if (user === null || user.status !== 'ACTIVE') {
      return { message: genericMessage };
    }

    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hashVerificationToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const resetToken = await this.usersService.refreshPasswordResetToken({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    if (resetToken === null) {
      throw new ServiceUnavailableException(
        'Failed to generate a password reset token',
      );
    }

    const resetBaseUrl =
      process.env.PASSWORD_RESET_BASE_URL ??
      `${process.env.WEB_ORIGIN ?? 'http://localhost:3000'}/reset-password`;
    const resetUrl = `${resetBaseUrl}?token=${encodeURIComponent(rawToken)}`;

    try {
      await this.mailService.sendPasswordResetEmail(
        user.email,
        resetUrl,
        user.id,
      );
    } catch {
      throw new ServiceUnavailableException(
        'We were unable to send your password reset email. Please try again later.',
      );
    }

    return { message: genericMessage };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const tokenHash = this.hashVerificationToken(resetPasswordDto.token);
    const token = await this.usersService.findPasswordResetToken(tokenHash);

    if (
      token === null ||
      token.usedAt !== null ||
      new Date(token.expiresAt).getTime() <= Date.now()
    ) {
      throw new UnauthorizedException('Invalid or expired password reset token');
    }

    const user = await this.usersService.findOne(token.userId);

    if (user === null) {
      throw new UnauthorizedException('Invalid password reset token');
    }

    const passwordHash = await argon2.hash(resetPasswordDto.password, {
      type: argon2.argon2id,
    });

    const updated = await this.usersService.updatePassword(user.id, passwordHash);

    if (!updated) {
      throw new UnauthorizedException('Invalid password reset token');
    }

    const tokenConsumed = await this.usersService.consumePasswordResetToken(
      token.id,
    );

    if (!tokenConsumed) {
      throw new UnauthorizedException('Invalid or expired password reset token');
    }

    return { message: 'Your password has been reset successfully.' };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const normalizedEmail = loginDto.email.trim().toLowerCase();
    const user = await this.usersService.findByEmailForAuth(normalizedEmail);

    if (user === null) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await argon2.verify(
      user.passwordHash,
      loginDto.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'SUSPENDED') {
      throw new ForbiddenException('This account is suspended');
    }

    if (user.status === 'PENDING_VERIFICATION') {
      throw new ForbiddenException(
        'Email verification is required before login',
      );
    }

    return this.createAuthResponse(user);
  }

  private createAuthResponse(user: UserCredentials): AuthResponse {
    return {
      accessToken: this.jwtService.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
        sessionVersion: user.sessionVersion,
      }),
      user: this.toResponse(user),
    };
  }

  private toResponse(user: UserCredentials): UserResponse {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private hashVerificationToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
