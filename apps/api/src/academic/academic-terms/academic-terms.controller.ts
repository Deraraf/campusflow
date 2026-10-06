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
import { AcademicTermsService } from './academic-terms.service.js';
import { CreateAcademicTermDto } from './dto/create-academic-term.dto.js';
import { UpdateAcademicTermDto } from './dto/update-academic-term.dto.js';

@Controller('academic-years')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AcademicTermsController {
  constructor(private readonly academicTermsService: AcademicTermsService) {}

  @Get(':academicYearId/terms')
  @Roles('ADMIN')
  listByAcademicYear(@Param('academicYearId') academicYearId: string) {
    return this.academicTermsService.listByAcademicYear(academicYearId);
  }

  @Get(':academicYearId/terms/:id')
  @Roles('ADMIN')
  getById(
    @Param('academicYearId') academicYearId: string,
    @Param('id') id: string,
  ) {
    return this.academicTermsService.getById(academicYearId, id);
  }

  @Post(':academicYearId/terms')
  @Roles('ADMIN')
  create(
    @Param('academicYearId') academicYearId: string,
    @Body() dto: CreateAcademicTermDto,
  ) {
    return this.academicTermsService.create(academicYearId, dto);
  }

  @Patch(':academicYearId/terms/:id')
  @Roles('ADMIN')
  update(
    @Param('academicYearId') academicYearId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAcademicTermDto,
  ) {
    return this.academicTermsService.update(academicYearId, id, dto);
  }

  @Delete(':academicYearId/terms/:id')
  @Roles('ADMIN')
  remove(
    @Param('academicYearId') academicYearId: string,
    @Param('id') id: string,
  ) {
    return this.academicTermsService.remove(academicYearId, id);
  }
}

@Controller('academic-terms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AcademicTermCurrentController {
  constructor(private readonly academicTermsService: AcademicTermsService) {}

  @Get('current')
  @Roles('ADMIN')
  getCurrent() {
    return this.academicTermsService.getCurrent();
  }
}
