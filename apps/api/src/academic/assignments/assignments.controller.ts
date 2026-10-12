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
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import type { UserResponse } from '../../users/entities/user.entity.js';
import { CreateAssignmentDto } from './dto/create-assignment.dto.js';
import { UpdateAssignmentDto } from './dto/update-assignment.dto.js';
import { AssignmentsService } from './assignments.service.js';

@Controller('assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get()
  list(@CurrentUser() user: UserResponse) {
    return this.assignmentsService.list(user);
  }

  @Get(':id')
  getById(@Param('id') id: string, @CurrentUser() user: UserResponse) {
    return this.assignmentsService.getById(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAssignmentDto,
    @CurrentUser() user: UserResponse,
  ) {
    return this.assignmentsService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: UserResponse) {
    return this.assignmentsService.remove(id, user);
  }
}

@Controller('course-offerings/:offeringId/assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CourseOfferingsAssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get()
  listByOffering(
    @Param('offeringId') offeringId: string,
    @CurrentUser() user: UserResponse,
  ) {
    return this.assignmentsService.listByOffering(offeringId, user);
  }

  @Post()
  @Roles('INSTRUCTOR')
  create(
    @Param('offeringId') offeringId: string,
    @Body() dto: CreateAssignmentDto,
    @CurrentUser() user: UserResponse,
  ) {
    return this.assignmentsService.create(offeringId, dto, user);
  }
}
