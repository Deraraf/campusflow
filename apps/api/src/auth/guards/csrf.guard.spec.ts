import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CsrfGuard } from './csrf.guard.js';

function contextFor(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;
}

describe('CsrfGuard', () => {
  beforeEach(() => {
    vi.stubEnv('WEB_ORIGIN', 'https://campusflow.test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('allows cookie-authenticated writes from the configured origin', () => {
    const request = {
      method: 'PATCH',
      cookies: { access_token: 'session-token' },
      headers: { origin: 'https://campusflow.test' },
    };

    expect(new CsrfGuard().canActivate(contextFor(request))).toBe(true);
  });

  it('rejects cookie-authenticated writes from another origin', () => {
    const request = {
      method: 'DELETE',
      cookies: { access_token: 'session-token' },
      headers: { origin: 'https://attacker.test' },
    };

    expect(() => new CsrfGuard().canActivate(contextFor(request))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects cookie-authenticated writes without an origin or referer', () => {
    const request = {
      method: 'POST',
      cookies: { access_token: 'session-token' },
      headers: {},
    };

    expect(() => new CsrfGuard().canActivate(contextFor(request))).toThrow(
      ForbiddenException,
    );
  });

  it('does not require an origin for safe methods or bearer authentication', () => {
    const safeRequest = {
      method: 'GET',
      cookies: { access_token: 'session-token' },
      headers: {},
    };
    const bearerRequest = {
      method: 'PATCH',
      cookies: { access_token: 'session-token' },
      headers: { authorization: 'Bearer api-token' },
    };

    expect(new CsrfGuard().canActivate(contextFor(safeRequest))).toBe(true);
    expect(new CsrfGuard().canActivate(contextFor(bearerRequest))).toBe(true);
  });
});