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
import { AcademicYearsService } from './academic-years.service.js';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto.js';
import { UpdateAcademicYearDto } from './dto/update-academic-year.dto.js';

@Controller('academic-years')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AcademicYearsController {
  constructor(private readonly academicYearsService: AcademicYearsService) {}

  @Get()
  @Roles('ADMIN')
  list() {
    return this.academicYearsService.list();
  }

  @Get('current')
  @Roles('ADMIN')
  getCurrent() {
    return this.academicYearsService.getCurrent();
  }

  @Get(':id')
  @Roles('ADMIN')
  getById(@Param('id') id: string) {
    return this.academicYearsService.getById(id);
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateAcademicYearDto) {
    return this.academicYearsService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateAcademicYearDto) {
    return this.academicYearsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.academicYearsService.remove(id);
  }
}
