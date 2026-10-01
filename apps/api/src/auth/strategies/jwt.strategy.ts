import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service.js';
import type { UserResponse } from '../../users/entities/user.entity.js';
import type { JwtPayload } from '../types/jwt-payload.js';
import { getJwtSecret } from '../jwt-secret.js';

const cookieExtractor = (request: Request): string | null =>
  request.cookies?.access_token ?? null;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  async validate(payload: JwtPayload): Promise<UserResponse> {
    const user = await this.usersService.findOneForAuth(payload.sub);

    if (
      user === null ||
      user.status === 'SUSPENDED' ||
      user.status === 'PENDING_VERIFICATION' ||
      user.sessionVersion !== payload.sessionVersion
    ) {
      throw new UnauthorizedException('User is not authorized');
    }

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
}
