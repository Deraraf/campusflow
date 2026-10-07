import { Controller, Get, Param, Patch, Body, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import type { UserResponse } from '../../users/entities/user.entity.js';
import { UpdateStudentStatusDto } from './dto/update-student-status.dto.js';
import { StudentsService } from './students.service.js';

@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get('me')
  @Roles('STUDENT')
  getMine(@CurrentUser() user: UserResponse) {
    return this.studentsService.getMine(user.id);
  }

  @Get()
  @Roles('ADMIN')
  list() {
    return this.studentsService.list();
  }

  @Get(':id')
  @Roles('ADMIN')
  getById(@Param('id') id: string) {
    return this.studentsService.getById(id);
  }

  @Patch(':id/status')
  @Roles('ADMIN')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStudentStatusDto) {
    return this.studentsService.updateStatus(id, dto.status);
  }
}
