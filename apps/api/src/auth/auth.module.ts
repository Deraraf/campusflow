import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { UsersModule } from '../users/users.module.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { MailService } from './mail.service.js';
import { getJwtSecret } from './jwt-secret.js';
import { ThrottlerModule } from '@nestjs/throttler';
import { CsrfGuard } from './guards/csrf.guard.js';
import { AccountThrottlerGuard } from './guards/account-throttler.guard.js';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: getJwtSecret(),
      signOptions: { expiresIn: '1h' },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 5 }]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    MailService,
    CsrfGuard,
    AccountThrottlerGuard,
  ],
  exports: [JwtStrategy],
})
export class AuthModule {}
