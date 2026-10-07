import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import type { UserResponse } from '../../users/entities/user.entity.js';
import { CreateGradeDto } from './dto/create-grade.dto.js';
import { UpdateGradeDto } from './dto/update-grade.dto.js';
import { GradesService } from './grades.service.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('grades')
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Get()
  @Roles('ADMIN', 'INSTRUCTOR', 'STUDENT')
  list(@CurrentUser() user: UserResponse) {
    return this.gradesService.list(user);
  }

  @Get(':id')
  @Roles('ADMIN', 'INSTRUCTOR', 'STUDENT')
  getById(@Param('id') id: string, @CurrentUser() user: UserResponse) {
    return this.gradesService.getById(id, user);
  }

  @Patch(':id')
  @Roles('ADMIN', 'INSTRUCTOR')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateGradeDto,
    @CurrentUser() user: UserResponse,
  ) {
    return this.gradesService.update(id, dto, user);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('enrollments')
export class EnrollmentsGradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Post(':enrollmentId/grade')
  @Roles('INSTRUCTOR')
  create(
    @Param('enrollmentId') enrollmentId: string,
    @Body() dto: CreateGradeDto,
    @CurrentUser() user: UserResponse,
  ) {
    return this.gradesService.create(enrollmentId, dto, user);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('students')
export class StudentGradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Get('me/grades')
  @Roles('STUDENT')
  getMyGrades(@CurrentUser() user: UserResponse) {
    return this.gradesService.getMyGrades(user);
  }

  @Get(':studentId/grades')
  @Roles('ADMIN')
  getStudentGrades(
    @Param('studentId') studentId: string,
    @CurrentUser() user: UserResponse,
  ) {
    return this.gradesService.getStudentGrades(studentId, user);
  }
}
