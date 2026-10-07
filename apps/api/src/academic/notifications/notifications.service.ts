import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import type { UserResponse } from '../../users/entities/user.entity.js';
import { CreateNotificationDto } from './dto/create-notification.dto.js';

@Injectable()
export class NotificationsService {
  constructor(private readonly database: DatabaseService) {}

  async list(user: UserResponse) {
    const rows = await this.database.client.orm.public.Notification.where({
      userId: user.id,
    })
      .select('id', 'userId', 'title', 'message', 'isRead', 'createdAt', 'updatedAt')
      .all();

    return rows.map((row) => this.serialize(row));
  }

  async getById(id: string, user: UserResponse) {
    const notification = await this.database.client.orm.public.Notification.where({
      id,
    })
      .select('id', 'userId', 'title', 'message', 'isRead', 'createdAt', 'updatedAt')
      .all()
      .first();

    if (notification === null) {
      throw new NotFoundException('Notification not found');
    }

    if (user.role !== 'ADMIN' && notification.userId !== user.id) {
      throw new ForbiddenException('You do not have access to this notification');
    }

    return this.serialize(notification);
  }

  async create(dto: CreateNotificationDto, user: UserResponse) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can create notifications');
    }

    const userExists = await this.database.client.orm.public.User.where({
      id: dto.userId,
    })
      .select('id')
      .all()
      .first();

    if (userExists === null) {
      throw new NotFoundException('User not found');
    }

    const title = dto.title.trim();
    if (!title) {
      throw new BadRequestException('Notification title is required');
    }

    const message = dto.message.trim();
    if (!message) {
      throw new BadRequestException('Notification message is required');
    }

    const created = await this.database.client.orm.public.Notification.create({
      userId: dto.userId,
      title,
      message,
      isRead: false,
    });

    return this.serialize(created);
  }

  async markRead(id: string, user: UserResponse) {
    await this.requireOwnership(id, user);

    const updated = await this.database.client.orm.public.Notification.where({
      id,
    }).update({
      isRead: true,
    });

    if (updated === null) {
      throw new NotFoundException('Notification not found');
    }

    return this.serialize(updated);
  }

  async markUnread(id: string, user: UserResponse) {
    await this.requireOwnership(id, user);

    const updated = await this.database.client.orm.public.Notification.where({
      id,
    }).update({
      isRead: false,
    });

    if (updated === null) {
      throw new NotFoundException('Notification not found');
    }

    return this.serialize(updated);
  }

  async getUnreadCount(user: UserResponse) {
    const rows = await this.database.client.orm.public.Notification.where({
      userId: user.id,
      isRead: false,
    })
      .select('id')
      .all();

    return { count: rows.length };
  }

  private async requireOwnership(id: string, user: UserResponse) {
    const notification = await this.database.client.orm.public.Notification.where({
      id,
    })
      .select('id', 'userId', 'title', 'message', 'isRead', 'createdAt', 'updatedAt')
      .all()
      .first();

    if (notification === null) {
      throw new NotFoundException('Notification not found');
    }

    if (user.role !== 'ADMIN' && notification.userId !== user.id) {
      throw new ForbiddenException('You do not have access to this notification');
    }

    return notification;
  }

  private serialize(notification: Record<string, any>) {
    return {
      id: notification.id,
      userId: notification.userId,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }
}
