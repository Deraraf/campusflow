import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import type { UserResponse } from '../users/entities/user.entity.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { ResendVerificationDto } from './dto/resend-verification.dto.js';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CsrfGuard } from './guards/csrf.guard.js';
import { AccountThrottlerGuard } from './guards/account-throttler.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseGuards(ThrottlerGuard, AccountThrottlerGuard)
  async register(@Body() registerDto: RegisterDto): Promise<UserResponse> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @UseGuards(ThrottlerGuard, AccountThrottlerGuard)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserResponse> {
    const authResponse = await this.authService.login(loginDto);
    this.setAccessTokenCookie(response, authResponse.accessToken);
    return authResponse.user;
  }

  @Post('resend-verification')
  @UseGuards(ThrottlerGuard, AccountThrottlerGuard)
  resendVerification(
    @Body() resendVerificationDto: ResendVerificationDto,
  ): Promise<{ message: string }> {
    return this.authService.resendVerification(resendVerificationDto.email);
  }

  @Post('verify-email')
  @UseGuards(ThrottlerGuard)
  verifyEmail(@Body() verifyEmailDto: VerifyEmailDto): Promise<UserResponse> {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Post('forgot-password')
  @UseGuards(ThrottlerGuard, AccountThrottlerGuard)
  forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @UseGuards(ThrottlerGuard)
  resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getCurrentUser(@CurrentUser() user: UserResponse): UserResponse {
    return user;
  }

  @Post('logout')
  @UseGuards(CsrfGuard)
  logout(@Res({ passthrough: true }) response: Response): void {
    response.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
  }

  private setAccessTokenCookie(response: Response, accessToken: string): void {
    response.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000,
    });
  }
}
