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
import { CollegesService } from './colleges.service.js';
import { CreateCollegeDto } from './dto/create-college.dto.js';
import { UpdateCollegeDto } from './dto/update-college.dto.js';

@Controller('colleges')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CollegesController {
  constructor(private readonly collegesService: CollegesService) {}

  @Get()
  @Roles('ADMIN')
  list() {
    return this.collegesService.list();
  }

  @Get(':id')
  @Roles('ADMIN')
  getById(@Param('id') id: string) {
    return this.collegesService.getById(id);
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateCollegeDto) {
    return this.collegesService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateCollegeDto) {
    return this.collegesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.collegesService.remove(id);
  }
}
