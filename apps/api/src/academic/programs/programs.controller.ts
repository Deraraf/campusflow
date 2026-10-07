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
import { CreateCurriculumCourseDto } from './dto/create-curriculum-course.dto.js';
import { CreateProgramDto } from './dto/create-program.dto.js';
import { UpdateCurriculumCourseDto } from './dto/update-curriculum-course.dto.js';
import { UpdateProgramDto } from './dto/update-program.dto.js';
import { CurriculumService } from './curriculum.service';
import { ProgramsService } from './programs.service';

@Controller('programs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Get()
  @Roles('ADMIN')
  list() {
    return this.programsService.list();
  }

  @Get(':id')
  @Roles('ADMIN')
  getById(@Param('id') id: string) {
    return this.programsService.getById(id);
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateProgramDto) {
    return this.programsService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateProgramDto) {
    return this.programsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.programsService.remove(id);
  }
}

@Controller('departments/:departmentId/programs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DepartmentProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Get()
  @Roles('ADMIN')
  listByDepartment(@Param('departmentId') departmentId: string) {
    return this.programsService.listByDepartment(departmentId);
  }
}

@Controller('programs/:programId/curriculum')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CurriculumController {
  constructor(private readonly curriculumService: CurriculumService) {}

  @Get()
  @Roles('ADMIN')
  list(@Param('programId') programId: string) {
    return this.curriculumService.list(programId);
  }

  @Post()
  @Roles('ADMIN')
  create(
    @Param('programId') programId: string,
    @Body() dto: CreateCurriculumCourseDto,
  ) {
    return this.curriculumService.create(programId, dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @Param('programId') programId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCurriculumCourseDto,
  ) {
    return this.curriculumService.update(programId, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('programId') programId: string, @Param('id') id: string) {
    return this.curriculumService.remove(programId, id);
  }
}
