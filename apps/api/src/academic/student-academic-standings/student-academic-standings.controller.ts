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
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { CreateStudentAcademicStandingDto } from './dto/create-student-academic-standing.dto.js';
import { UpdateStudentAcademicStandingDto } from './dto/update-student-academic-standing.dto.js';
import { StudentAcademicStandingsService } from './student-academic-standings.service.js';

@Controller('students/:studentId/academic-standings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentAcademicStandingsController {
  constructor(
    private readonly standingsService: StudentAcademicStandingsService,
  ) {}

  @Get('current')
  @Roles('ADMIN')
  getCurrent(@Param('studentId') studentId: string) {
    return this.standingsService.getCurrent(studentId);
  }

  @Get()
  @Roles('ADMIN')
  list(@Param('studentId') studentId: string) {
    return this.standingsService.list(studentId);
  }

  @Post()
  @Roles('ADMIN')
  create(
    @Param('studentId') studentId: string,
    @Body() dto: CreateStudentAcademicStandingDto,
  ) {
    return this.standingsService.create(studentId, dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @Param('studentId') studentId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStudentAcademicStandingDto,
  ) {
    return this.standingsService.update(studentId, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('studentId') studentId: string, @Param('id') id: string) {
    return this.standingsService.remove(studentId, id);
  }
}
