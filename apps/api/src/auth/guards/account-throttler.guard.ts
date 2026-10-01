import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AccountThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(request: Record<string, any>): Promise<string> {
    const body = request.body as { email?: unknown } | undefined;

    if (typeof body?.email === 'string') {
      const normalizedEmail = body.email.trim().toLowerCase();
      return createHash('sha256').update(normalizedEmail).digest('hex');
    }

    return super.getTracker(request);
  }
}