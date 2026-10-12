import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { UpdateInstructorDto } from './dto/update-instructor.dto.js';
import { InstructorsService } from './instructors.service';

@Controller('instructors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InstructorsController {
  constructor(private readonly instructorsService: InstructorsService) {}

  @Get()
  @Roles('ADMIN')
  list() {
    return this.instructorsService.list();
  }

  @Get(':id')
  @Roles('ADMIN')
  getById(@Param('id') id: string) {
    return this.instructorsService.getById(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateInstructorDto) {
    return this.instructorsService.update(id, dto);
  }

  @Get('departments/:departmentId')
  @Roles('ADMIN')
  listByDepartment(@Param('departmentId') departmentId: string) {
    return this.instructorsService.listByDepartment(departmentId);
  }

  @Get('department/:departmentId')
  @Roles('ADMIN')
  listByDepartmentAlias(@Param('departmentId') departmentId: string) {
    return this.instructorsService.listByDepartment(departmentId);
  }
}
