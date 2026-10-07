import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import type { UserResponse } from '../../users/entities/user.entity.js';
import { CreateConversationDto } from './dto/create-conversation.dto.js';
import { UpdateConversationDto } from './dto/update-conversation.dto.js';
import { CreateMessageDto } from './dto/create-message.dto.js';
import { ConversationsService } from './conversations.service.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  list(@CurrentUser() user: UserResponse) {
    return this.conversationsService.list(user);
  }

  @Get(':id')
  getById(@Param('id') id: string, @CurrentUser() user: UserResponse) {
    return this.conversationsService.getById(id, user);
  }

  @Post()
  create(
    @Body() dto: CreateConversationDto,
    @CurrentUser() user: UserResponse,
  ) {
    return this.conversationsService.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
    @CurrentUser() user: UserResponse,
  ) {
    return this.conversationsService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: UserResponse) {
    return this.conversationsService.remove(id, user);
  }

  @Get(':conversationId/messages')
  listMessages(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: UserResponse,
  ) {
    return this.conversationsService.listMessages(conversationId, user);
  }

  @Post(':conversationId/messages')
  createMessage(
    @Param('conversationId') conversationId: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser() user: UserResponse,
  ) {
    return this.conversationsService.createMessage(conversationId, dto, user);
  }
}
