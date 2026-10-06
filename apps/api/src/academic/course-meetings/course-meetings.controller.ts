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
import { CreateCourseMeetingDto } from './dto/create-course-meeting.dto.js';
import { UpdateCourseMeetingDto } from './dto/update-course-meeting.dto.js';
import {
  CourseMeetingResponse,
  CourseMeetingsService,
} from './course-meetings.service.js';

@Controller('course-offerings/:offeringId/meetings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CourseMeetingsController {
  constructor(private readonly meetingsService: CourseMeetingsService) {}

  @Get()
  @Roles('ADMIN')
  list(@Param('offeringId') offeringId: string) {
    return this.meetingsService.list(offeringId);
  }

  @Post()
  @Roles('ADMIN')
  create(
    @Param('offeringId') offeringId: string,
    @Body() dto: CreateCourseMeetingDto,
  ): Promise<CourseMeetingResponse> {
    return this.meetingsService.create(offeringId, dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @Param('offeringId') offeringId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCourseMeetingDto,
  ): Promise<CourseMeetingResponse> {
    return this.meetingsService.update(offeringId, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('offeringId') offeringId: string, @Param('id') id: string) {
    return this.meetingsService.remove(offeringId, id);
  }
}
