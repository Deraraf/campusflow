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
import { CreateDepartmentDto } from './dto/create-department.dto.js';
import { UpdateDepartmentDto } from './dto/update-department.dto.js';
import { DepartmentsService } from './departments.service.js';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get('departments')
  @Roles('ADMIN')
  list() {
    return this.departmentsService.list();
  }

  @Get('departments/:id')
  @Roles('ADMIN')
  getById(@Param('id') id: string) {
    return this.departmentsService.getById(id);
  }

  @Post('departments')
  @Roles('ADMIN')
  create(@Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(dto);
  }

  @Patch('departments/:id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.departmentsService.update(id, dto);
  }

  @Delete('departments/:id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.departmentsService.remove(id);
  }

  @Get('colleges/:collegeId/departments')
  @Roles('ADMIN')
  listByCollege(@Param('collegeId') collegeId: string) {
    return this.departmentsService.listByCollege(collegeId);
  }
}
