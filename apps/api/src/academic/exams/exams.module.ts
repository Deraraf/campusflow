import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { DatabaseModule } from '../../database/database.module.js';
import {
  ExamsController,
  CourseOfferingsExamsController,
  StudentExamsController,
} from './exams.controller.js';
import { ExamsService } from './exams.service.js';

@Module({
  imports: [
    DatabaseModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [
    ExamsController,
    CourseOfferingsExamsController,
    StudentExamsController,
  ],
  providers: [ExamsService],
})
export class ExamsModule {}
