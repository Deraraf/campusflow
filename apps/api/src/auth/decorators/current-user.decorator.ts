import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UserResponse } from '../../users/entities/user.entity.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UserResponse => {
    const request = context.switchToHttp().getRequest<{ user: UserResponse }>();

    return request.user;
  },
);
