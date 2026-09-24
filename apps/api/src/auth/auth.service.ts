import {
  ConflictException,
  ForbiddenException,
  Injectable,
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
    const existingUser = await this.usersService.findByEmail(registerDto.email);

    if (existingUser !== null) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await argon2.hash(registerDto.password, {
      type: argon2.argon2id,
    });

    const user = await this.usersService.createWithPasswordHash({
      email: registerDto.email,
      passwordHash,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
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

    await this.mailService.sendVerificationEmail(
      user.email,
      verificationUrl,
      user.id,
    );

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
      throw new Error('Pending user does not have a verification token');
    }

    const verificationBaseUrl =
      process.env.EMAIL_VERIFICATION_BASE_URL ??
      `${process.env.WEB_ORIGIN ?? 'http://localhost:3000'}/verify-email`;

    const verificationUrl = `${verificationBaseUrl}?token=${encodeURIComponent(rawToken)}`;

    await this.mailService.sendVerificationEmail(
      user.email,
      verificationUrl,
      user.id,
    );

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

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmailForAuth(loginDto.email);

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
