import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { DatabaseModule } from '../../database/database.module.js';
import {
  AssignmentSubmissionsController,
  SubmissionGradeController,
  SubmissionsController,
} from './submissions.controller.js';
import { SubmissionsService } from './submissions.service.js';

@Module({
  imports: [
    DatabaseModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [
    SubmissionsController,
    AssignmentSubmissionsController,
    SubmissionGradeController,
  ],
  providers: [SubmissionsService],
})
export class SubmissionsModule {}
