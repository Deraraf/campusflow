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
import { CreateCourseOfferingDto } from './dto/create-course-offering.dto.js';
import { UpdateCourseOfferingDto } from './dto/update-course-offering.dto.js';
import { CourseOfferingsService } from './course-offerings.service.js';

@Controller('course-offerings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CourseOfferingsController {
  constructor(private readonly offeringsService: CourseOfferingsService) {}

  @Get()
  @Roles('ADMIN')
  list() {
    return this.offeringsService.list();
  }

  @Get(':id')
  @Roles('ADMIN')
  getById(@Param('id') id: string) {
    return this.offeringsService.getById(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateCourseOfferingDto) {
    return this.offeringsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.offeringsService.remove(id);
  }
}

@Controller('courses/:courseId/offerings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CourseOfferingsByCourseController {
  constructor(private readonly offeringsService: CourseOfferingsService) {}

  @Post()
  @Roles('ADMIN')
  create(
    @Param('courseId') courseId: string,
    @Body() dto: CreateCourseOfferingDto,
  ) {
    return this.offeringsService.create(courseId, dto);
  }
}

@Controller('academic-terms/:academicTermId/course-offerings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CourseOfferingsByTermController {
  constructor(private readonly offeringsService: CourseOfferingsService) {}

  @Get()
  @Roles('ADMIN')
  listByTerm(@Param('academicTermId') academicTermId: string) {
    return this.offeringsService.listByTerm(academicTermId);
  }
}
