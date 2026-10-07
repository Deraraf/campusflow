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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import type { UserResponse } from '../../users/entities/user.entity.js';
import { CreateExamDto } from './dto/create-exam.dto.js';
import { UpdateExamDto } from './dto/update-exam.dto.js';
import { ExamsService } from './exams.service.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Get()
  @Roles('ADMIN', 'INSTRUCTOR', 'STUDENT')
  list(@CurrentUser() user: UserResponse) {
    return this.examsService.list(user);
  }

  @Get(':id')
  @Roles('ADMIN', 'INSTRUCTOR', 'STUDENT')
  getById(@Param('id') id: string, @CurrentUser() user: UserResponse) {
    return this.examsService.getById(id, user);
  }

  @Patch(':id')
  @Roles('ADMIN', 'INSTRUCTOR')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateExamDto,
    @CurrentUser() user: UserResponse,
  ) {
    return this.examsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('INSTRUCTOR')
  remove(@Param('id') id: string, @CurrentUser() user: UserResponse) {
    return this.examsService.remove(id, user);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('course-offerings')
export class CourseOfferingsExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Get(':offeringId/exams')
  @Roles('ADMIN', 'INSTRUCTOR', 'STUDENT')
  listForOffering(
    @Param('offeringId') offeringId: string,
    @CurrentUser() user: UserResponse,
  ) {
    return this.examsService.listForOffering(offeringId, user);
  }

  @Post(':offeringId/exams')
  @Roles('INSTRUCTOR')
  create(
    @Param('offeringId') offeringId: string,
    @Body() dto: CreateExamDto,
    @CurrentUser() user: UserResponse,
  ) {
    return this.examsService.create(offeringId, dto, user);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('students')
export class StudentExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Get('me/exams')
  @Roles('STUDENT')
  getMyExams(@CurrentUser() user: UserResponse) {
    return this.examsService.getMyExams(user);
  }
}
