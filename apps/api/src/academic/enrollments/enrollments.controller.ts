import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import type { UserResponse } from '../../users/entities/user.entity.js';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto.js';
import { UpdateEnrollmentStatusDto } from './dto/update-enrollment-status.dto.js';
import { EnrollmentsService } from './enrollments.service.js';

@Controller('enrollments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get()
  @Roles('ADMIN')
  list(
    @Query('studentId') studentId?: string,
    @Query('offeringId') offeringId?: string,
    @Query('status') status?: string,
  ) {
    return this.enrollmentsService.list({ studentId, offeringId, status });
  }

  @Get(':id')
  @Roles('ADMIN')
  getById(@Param('id') id: string) {
    return this.enrollmentsService.getById(id);
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateEnrollmentDto) {
    return this.enrollmentsService.create(dto);
  }

  @Patch(':id/status')
  @Roles('ADMIN')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEnrollmentStatusDto,
  ) {
    return this.enrollmentsService.updateStatus(id, dto);
  }
}

@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentEnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get('me/enrollments')
  @Roles('STUDENT')
  getMyEnrollments(@CurrentUser() user: UserResponse) {
    return this.enrollmentsService.getMyEnrollments(user.id);
  }

  @Get(':studentId/enrollments')
  @Roles('ADMIN')
  getStudentEnrollments(@Param('studentId') studentId: string) {
    return this.enrollmentsService.getStudentEnrollments(studentId);
  }
}
