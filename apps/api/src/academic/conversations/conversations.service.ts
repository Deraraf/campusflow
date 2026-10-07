import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import type { UserResponse } from '../../users/entities/user.entity.js';
import { CreateConversationDto } from './dto/create-conversation.dto.js';
import { UpdateConversationDto } from './dto/update-conversation.dto.js';
import { CreateMessageDto } from './dto/create-message.dto.js';

@Injectable()
export class ConversationsService {
  constructor(private readonly database: DatabaseService) {}

  async list(user: UserResponse) {
    const rows = await this.database.client.orm.public.Conversation.where({
      userId: user.id,
    })
      .select('id', 'userId', 'title', 'createdAt', 'updatedAt')
      .all();

    return rows.map((row) => this.serializeConversation(row));
  }

  async getById(id: string, user: UserResponse) {
    const conversation = await this.requireOwnership(id, user);
    return this.serializeConversation(conversation);
  }

  async create(dto: CreateConversationDto, user: UserResponse) {
    const title = dto.title === undefined ? null : dto.title.trim();

    if (title !== null && !title) {
      throw new BadRequestException('Conversation title cannot be blank');
    }

    const created = await this.database.client.orm.public.Conversation.create({
      userId: user.id,
      title: title ?? null,
    });

    return this.serializeConversation(created);
  }

  async update(id: string, dto: UpdateConversationDto, user: UserResponse) {
    const conversation = await this.requireOwnership(id, user);

    if (dto.title === undefined) {
      return this.serializeConversation(conversation);
    }

    const title = dto.title.trim();
    if (!title) {
      throw new BadRequestException('Conversation title cannot be blank');
    }

    const updated = await this.database.client.orm.public.Conversation.where({
      id,
    }).update({
      title,
    });

    if (updated === null) {
      throw new NotFoundException('Conversation not found');
    }

    return this.serializeConversation(updated);
  }

  async remove(id: string, user: UserResponse) {
    const conversation = await this.requireOwnership(id, user);

    const messages = await this.database.client.orm.public.Message.where({
      conversationId: conversation.id,
    })
      .select('id')
      .all();

    for (const message of messages) {
      await this.database.client.orm.public.Message.where({
        id: message.id,
      }).delete();
    }

    const removed = await this.database.client.orm.public.Conversation.where({
      id: conversation.id,
    }).delete();

    if (removed === null) {
      throw new NotFoundException('Conversation not found');
    }

    return {
      deleted: true,
      id: removed.id,
    };
  }

  async listMessages(conversationId: string, user: UserResponse) {
    const conversation = await this.requireOwnership(conversationId, user);

    const rows = await this.database.client.orm.public.Message.where({
      conversationId: conversation.id,
    })
      .select('id', 'role', 'content', 'createdAt')
      .all();

    return rows.map((row) => ({
      id: row.id,
      role: row.role,
      content: row.content,
      createdAt: row.createdAt,
    }));
  }

  async createMessage(
    conversationId: string,
    dto: CreateMessageDto,
    user: UserResponse,
  ) {
    const conversation = await this.requireOwnership(conversationId, user);

    if (dto.role !== 'USER') {
      throw new BadRequestException(
        'Only USER messages can be created from the client',
      );
    }

    const content = dto.content.trim();
    if (!content) {
      throw new BadRequestException('Message content is required');
    }

    const created = await this.database.client.orm.public.Message.create({
      conversationId: conversation.id,
      role: 'USER',
      content,
    });

    return {
      id: created.id,
      conversationId: conversation.id,
      role: created.role,
      content: created.content,
      createdAt: created.createdAt,
    };
  }

  async createInternalMessage(
    conversationId: string,
    role: 'ASSISTANT' | 'SYSTEM',
    content: string,
  ) {
    const trimmed = content.trim();
    if (!trimmed) {
      throw new BadRequestException('Message content is required');
    }

    const conversation = await this.database.client.orm.public.Conversation.where({
      id: conversationId,
    })
      .select('id', 'userId')
      .all()
      .first();

    if (conversation === null) {
      throw new NotFoundException('Conversation not found');
    }

    const created = await this.database.client.orm.public.Message.create({
      conversationId: conversation.id,
      role,
      content: trimmed,
    });

    return {
      id: created.id,
      conversationId: conversation.id,
      role: created.role,
      content: created.content,
      createdAt: created.createdAt,
    };
  }

  private async requireOwnership(id: string, user: UserResponse) {
    const conversation = await this.database.client.orm.public.Conversation.where({
      id,
    })
      .select('id', 'userId', 'title', 'createdAt', 'updatedAt')
      .all()
      .first();

    if (conversation === null) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.userId !== user.id) {
      throw new ForbiddenException('You do not have access to this conversation');
    }

    return conversation;
  }

  private serializeConversation(conversation: Record<string, any>) {
    return {
      id: conversation.id,
      userId: conversation.userId,
      title: conversation.title ?? null,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }
}
