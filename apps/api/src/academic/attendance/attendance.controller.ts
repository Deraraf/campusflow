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
import { CreateAttendanceDto } from './dto/create-attendance.dto.js';
import { UpdateAttendanceDto } from './dto/update-attendance.dto.js';
import { AttendanceService } from './attendance.service.js';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  @Roles('ADMIN', 'INSTRUCTOR', 'STUDENT')
  list(@CurrentUser() user: UserResponse) {
    return this.attendanceService.list(user);
  }

  @Get(':id')
  @Roles('ADMIN', 'INSTRUCTOR', 'STUDENT')
  getById(@Param('id') id: string, @CurrentUser() user: UserResponse) {
    return this.attendanceService.getById(id, user);
  }

  @Patch(':id')
  @Roles('ADMIN', 'INSTRUCTOR')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAttendanceDto,
    @CurrentUser() user: UserResponse,
  ) {
    return this.attendanceService.update(id, dto, user);
  }
}

@Controller('course-offerings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CourseOfferingsAttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get(':offeringId/attendance')
  @Roles('ADMIN', 'INSTRUCTOR', 'STUDENT')
  listForOffering(
    @Param('offeringId') offeringId: string,
    @CurrentUser() user: UserResponse,
  ) {
    return this.attendanceService.listForOffering(offeringId, user);
  }

  @Post(':offeringId/attendance')
  @Roles('INSTRUCTOR')
  create(
    @Param('offeringId') offeringId: string,
    @Body() dto: CreateAttendanceDto,
    @CurrentUser() user: UserResponse,
  ) {
    return this.attendanceService.create(offeringId, dto, user);
  }
}

@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentAttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('me/attendance')
  @Roles('STUDENT')
  getMyAttendance(@CurrentUser() user: UserResponse) {
    return this.attendanceService.getMyAttendance(user);
  }

  @Get(':studentId/attendance')
  @Roles('ADMIN')
  getStudentAttendance(
    @Param('studentId') studentId: string,
    @CurrentUser() user: UserResponse,
  ) {
    return this.attendanceService.getStudentAttendance(studentId, user);
  }
}
