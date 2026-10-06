import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { DatabaseModule } from '../../database/database.module.js';
import { CourseMeetingsModule } from '../course-meetings/course-meetings.module.js';
import {
  CourseOfferingsController,
  CourseOfferingsByCourseController,
  CourseOfferingsByTermController,
} from './course-offerings.controller.js';
import { CourseOfferingsService } from './course-offerings.service.js';

@Module({
  imports: [
    DatabaseModule,
    CourseMeetingsModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [
    CourseOfferingsController,
    CourseOfferingsByCourseController,
    CourseOfferingsByTermController,
  ],
  providers: [CourseOfferingsService],
})
export class CourseOfferingsModule {}
