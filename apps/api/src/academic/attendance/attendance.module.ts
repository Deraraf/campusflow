import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { DatabaseModule } from '../../database/database.module.js';
import {
  AttendanceController,
  CourseOfferingsAttendanceController,
  StudentAttendanceController,
} from './attendance.controller.js';
import { AttendanceService } from './attendance.service.js';

@Module({
  imports: [
    DatabaseModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [
    AttendanceController,
    CourseOfferingsAttendanceController,
    StudentAttendanceController,
  ],
  providers: [AttendanceService],
})
export class AttendanceModule {}
