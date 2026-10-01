import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

type CookieRequest = Request & {
  cookies?: Record<string, string | undefined>;
};

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<CookieRequest>();

    if (
      !MUTATING_METHODS.has(request.method.toUpperCase()) ||
      !request.cookies?.access_token ||
      request.headers.authorization?.startsWith('Bearer ')
    ) {
      return true;
    }

    const originHeader = request.headers.origin ?? request.headers.referer;
    const expectedOrigin = new URL(
      process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    ).origin;

    if (!originHeader) {
      throw new ForbiddenException('A valid request origin is required');
    }

    let requestOrigin: string;
    try {
      requestOrigin = new URL(originHeader).origin;
    } catch {
      throw new ForbiddenException('Request origin is not allowed');
    }

    if (requestOrigin !== expectedOrigin) {
      throw new ForbiddenException('Request origin is not allowed');
    }

    return true;
  }
}