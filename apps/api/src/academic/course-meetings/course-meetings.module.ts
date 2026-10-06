import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { DatabaseModule } from '../../database/database.module.js';
import { CourseMeetingsController } from './course-meetings.controller.js';
import { CourseMeetingsService } from './course-meetings.service.js';

@Module({
  imports: [
    DatabaseModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [CourseMeetingsController],
  providers: [CourseMeetingsService],
  exports: [CourseMeetingsService],
})
export class CourseMeetingsModule {}
