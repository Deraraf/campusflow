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
import {
  CurriculumController,
  DepartmentProgramsController,
  ProgramsController,
} from './programs.controller.js';

function createContext(
  handler: (...args: string[]) => unknown,
  controller: new (...args: never[]) => unknown,
  user?: { role: 'ADMIN' | 'INSTRUCTOR' | 'STUDENT' },
) {
  return {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({
      getRequest: () => (user === undefined ? {} : { user }),
    }),
  } as unknown as ExecutionContext;
}

describe('Program and Curriculum authorization', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  it('requires ADMIN for Program endpoints', () => {
    expect(
      reflector.getAllAndOverride(ROLES_KEY, [
        ProgramsController.prototype.list,
        ProgramsController,
      ]),
    ).toEqual(['ADMIN']);
  });

  it('requires ADMIN for Department program listing', () => {
    expect(
      reflector.getAllAndOverride(ROLES_KEY, [
        DepartmentProgramsController.prototype.listByDepartment,
        DepartmentProgramsController,
      ]),
    ).toEqual(['ADMIN']);
  });

  it('requires ADMIN for Curriculum endpoints', () => {
    expect(
      reflector.getAllAndOverride(ROLES_KEY, [
        CurriculumController.prototype.create,
        CurriculumController,
      ]),
    ).toEqual(['ADMIN']);
  });

  it('rejects authenticated non-admin users', () => {
    expect(() =>
      guard.canActivate(
        createContext(ProgramsController.prototype.list, ProgramsController, {
          role: 'STUDENT',
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('rejects unauthenticated requests', () => {
    expect(() =>
      guard.canActivate(
        createContext(
          CurriculumController.prototype.list,
          CurriculumController,
        ),
      ),
    ).toThrow(UnauthorizedException);
  });
});
