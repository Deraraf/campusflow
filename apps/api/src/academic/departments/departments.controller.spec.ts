import 'reflect-metadata';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { DepartmentsController } from './departments.controller.js';

function createContext(user?: { role: 'ADMIN' | 'INSTRUCTOR' | 'STUDENT' }) {
  return {
    getHandler: () => DepartmentsController.prototype.list,
    getClass: () => DepartmentsController,
    switchToHttp: () => ({
      getRequest: () => (user === undefined ? {} : { user }),
    }),
  } as unknown as ExecutionContext;
}

describe('DepartmentsController authorization', () => {
  const guard = new RolesGuard(new Reflector());

  it('requires the ADMIN role for Department endpoints', () => {
    expect(
      new Reflector().getAllAndOverride(ROLES_KEY, [
        DepartmentsController.prototype.list,
        DepartmentsController,
      ]),
    ).toEqual(['ADMIN']);
  });

  it('rejects authenticated non-admin users', () => {
    expect(() =>
      guard.canActivate(createContext({ role: 'INSTRUCTOR' })),
    ).toThrow(ForbiddenException);
  });

  it('rejects unauthenticated requests', () => {
    expect(() => guard.canActivate(createContext())).toThrow(
      UnauthorizedException,
    );
  });
});
