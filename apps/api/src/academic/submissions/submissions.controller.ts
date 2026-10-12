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
import { CreateSubmissionDto } from './dto/create-submission.dto.js';
import { GradeSubmissionDto } from './dto/grade-submission.dto.js';
import { UpdateSubmissionDto } from './dto/update-submission.dto.js';
import { SubmissionsService } from './submissions.service';

@Controller('submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get(':id')
  getById(@Param('id') id: string, @CurrentUser() user: UserResponse) {
    return this.submissionsService.getById(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSubmissionDto,
    @CurrentUser() user: UserResponse,
  ) {
    return this.submissionsService.update(id, dto, user);
  }
}

@Controller('assignments/:assignmentId/submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssignmentSubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get()
  list(@Param('assignmentId') assignmentId: string, @CurrentUser() user: UserResponse) {
    return this.submissionsService.listForAssignment(assignmentId, user);
  }

  @Post()
  @Roles('STUDENT')
  create(
    @Param('assignmentId') assignmentId: string,
    @Body() dto: CreateSubmissionDto,
    @CurrentUser() user: UserResponse,
  ) {
    return this.submissionsService.create(assignmentId, dto, user);
  }
}

@Controller('submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubmissionGradeController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post(':id/grade')
  @Roles('INSTRUCTOR')
  grade(
    @Param('id') id: string,
    @Body() dto: GradeSubmissionDto,
    @CurrentUser() user: UserResponse,
  ) {
    return this.submissionsService.grade(id, dto, user);
  }
}
