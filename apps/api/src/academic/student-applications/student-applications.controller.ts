import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import type { UserResponse } from '../../users/entities/user.entity.js';
import { ApproveStudentApplicationDto } from './dto/approve-student-application.dto.js';
import { CreateStudentApplicationDto } from './dto/create-student-application.dto.js';
import { RejectStudentApplicationDto } from './dto/reject-student-application.dto.js';
import { StudentApplicationsService } from './student-applications.service.js';

@Controller('student-applications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentApplicationsController {
  constructor(
    private readonly applicationsService: StudentApplicationsService,
  ) {}

  @Post()
  @Roles('STUDENT')
  create(
    @CurrentUser() user: UserResponse,
    @Body() dto: CreateStudentApplicationDto,
  ) {
    return this.applicationsService.create(user, dto);
  }

  @Get('me')
  @Roles('STUDENT')
  listMine(@CurrentUser() user: UserResponse) {
    return this.applicationsService.listMine(user.id);
  }

  @Get('me/:id')
  @Roles('STUDENT')
  getMine(@CurrentUser() user: UserResponse, @Param('id') id: string) {
    return this.applicationsService.getMine(user.id, id);
  }

  @Post(':id/cancel')
  @Roles('STUDENT')
  cancel(@CurrentUser() user: UserResponse, @Param('id') id: string) {
    return this.applicationsService.cancel(user.id, id);
  }

  @Get()
  @Roles('ADMIN')
  listAll() {
    return this.applicationsService.listAll();
  }

  @Get(':id')
  @Roles('ADMIN')
  getById(@Param('id') id: string) {
    return this.applicationsService.getById(id);
  }

  @Post(':id/review')
  @Roles('ADMIN')
  review(@Param('id') id: string) {
    return this.applicationsService.review(id);
  }

  @Post(':id/approve')
  @Roles('ADMIN')
  approve(@Param('id') id: string, @Body() dto: ApproveStudentApplicationDto) {
    return this.applicationsService.approve(id, dto);
  }

  @Post(':id/reject')
  @Roles('ADMIN')
  reject(@Param('id') id: string, @Body() dto: RejectStudentApplicationDto) {
    return this.applicationsService.reject(id, dto);
  }
}
