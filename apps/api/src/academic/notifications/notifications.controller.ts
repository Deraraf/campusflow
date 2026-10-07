import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import type { UserResponse } from '../../users/entities/user.entity.js';
import { CreateNotificationDto } from './dto/create-notification.dto.js';
import { NotificationsService } from './notifications.service.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: UserResponse) {
    return this.notificationsService.list(user);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: UserResponse) {
    return this.notificationsService.getUnreadCount(user);
  }

  @Get(':id')
  getById(@Param('id') id: string, @CurrentUser() user: UserResponse) {
    return this.notificationsService.getById(id, user);
  }

  @Post()
  @Roles('ADMIN')
  create(
    @Body() dto: CreateNotificationDto,
    @CurrentUser() user: UserResponse,
  ) {
    return this.notificationsService.create(dto, user);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: UserResponse) {
    return this.notificationsService.markRead(id, user);
  }

  @Patch(':id/unread')
  markUnread(@Param('id') id: string, @CurrentUser() user: UserResponse) {
    return this.notificationsService.markUnread(id, user);
  }
}
